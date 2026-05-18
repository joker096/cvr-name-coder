import { useState, useRef, useCallback, useEffect } from "react";

export type VoiceErrorCode = "not-supported" | "no-permission" | "no-microphone" | "network" | "unknown";

export interface VoiceError {
  code: VoiceErrorCode;
  message: string;
}

interface UseVoiceInputOptions {
  language?: string;
  autoSend?: boolean;
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onSend?: () => void;
  onError?: (error: VoiceError) => void;
}

export const useVoiceInput = ({
  language = "en-US",
  autoSend = false,
  onTranscript,
  onSend,
  onError,
}: UseVoiceInputOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<VoiceError | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const autoSendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSupported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const clearAutoSendTimeout = useCallback(() => {
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearAutoSendTimeout();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors from stopping an already stopped recognition
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, [clearAutoSendTimeout]);

  const handleError = useCallback(
    (code: VoiceErrorCode, message: string) => {
      const err: VoiceError = { code, message };
      setError(err);
      onError?.(err);
      stopListening();
    },
    [onError, stopListening]
  );

  const startListening = useCallback(() => {
    if (!isSupported) {
      handleError("not-supported", "Speech recognition is not supported in this browser.");
      return;
    }

    clearAutoSendTimeout();
    setError(null);

    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      handleError("not-supported", "Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i]?.[0]?.transcript ?? "";
        if (event.results[i]?.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript, true);
      } else if (interimTranscript) {
        onTranscript(interimTranscript, false);
      }

      // Set up auto-send after silence if enabled
      if (autoSend) {
        clearAutoSendTimeout();
        autoSendTimeoutRef.current = setTimeout(() => {
          if (finalTranscript || interimTranscript) {
            onSend?.();
          }
        }, 2000);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let code: VoiceErrorCode = "unknown";
      let message = "An unknown error occurred during speech recognition.";

      switch (event.error) {
        case "not-allowed":
          code = "no-permission";
          message = "Microphone permission denied. Please allow microphone access.";
          break;
        case "audio-capture":
          code = "no-microphone";
          message = "No microphone detected. Please connect a microphone.";
          break;
        case "network":
          code = "network";
          message = "Network error occurred. Please check your connection.";
          break;
        case "aborted":
          // User aborted, not an error
          return;
        default:
          break;
      }

      handleError(code, message);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      handleError("unknown", "Failed to start speech recognition.");
    }
  }, [isSupported, language, autoSend, onTranscript, onSend, handleError, clearAutoSendTimeout]);

  useEffect(() => {
    return () => {
      clearAutoSendTimeout();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [clearAutoSendTimeout]);

  return {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
  };
};

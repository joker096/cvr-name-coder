import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { cn } from "../../utils/cn";
import { COMMAND_LIST } from "../../utils/commands";
import { useVoiceInput } from "../../hooks/useVoiceInput";
import { CommandPalette } from "./CommandPalette";
import { VoiceInputButton } from "./VoiceInputButton";
import { ImageUploadArea } from "./ImageUploadArea";
import { TextInputArea } from "./TextInputArea";
import { SendButton } from "./SendButton";

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (images?: string[]) => void;
  onCancel?: (() => void) | undefined;
  isLooming?: boolean;
  placeholder?: string;
  lang?: string;
  disabled?: boolean;
  className?: string;
  voiceEnabled?: boolean | undefined;
  voiceLanguage?: string | undefined;
  voiceAutoSend?: boolean | undefined;
  visionEnabled?: boolean | undefined;
  t?: any;
}

export const InputArea: React.FC<InputAreaProps> = memo(({
  value,
  onChange,
  onSend,
  onCancel,
  isLooming = false,
  placeholder = "Type your message...",
  lang: _lang = "en",
  disabled = false,
  className,
  voiceEnabled = false,
  voiceLanguage = "en-US",
  voiceAutoSend = false,
  visionEnabled = false,
  t = {},
}) => {
  const [showCommands, setShowCommands] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const committedTextRef = useRef(value);

  const handleTranscript = useCallback(
    (transcript: string, isFinal: boolean) => {
      if (isFinal) {
        committedTextRef.current += transcript;
        onChange(committedTextRef.current);
      } else {
        onChange(committedTextRef.current + transcript);
      }
    },
    [onChange]
  );

  const { isListening, isSupported, error, startListening, stopListening } = useVoiceInput({
    language: voiceLanguage,
    autoSend: voiceAutoSend,
    onTranscript: handleTranscript,
    onSend: () => onSend(images),
  });

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      committedTextRef.current = value;
      startListening();
    }
  };

  const filteredCommands = React.useMemo(() => {
    const trimmed = value.trimStart();
    if (!trimmed.startsWith("/")) return [];
    const query = trimmed.slice(1).toLowerCase();
    return COMMAND_LIST.filter(
      (cmd) =>
        cmd.command.includes(query) ||
        cmd.label.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query)
    );
  }, [value]);

  useEffect(() => {
    setShowCommands(filteredCommands.length > 0);
  }, [filteredCommands]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowCommands(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCommand = useCallback((command: string) => {
    onChange(command);
    const textarea = containerRef.current?.querySelector("textarea") as HTMLTextAreaElement | null;
    if (textarea) {
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(command.length, command.length);
      }, 0);
    }
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSend(images.length > 0 ? images : undefined);
      setImages([]);
    }
  }, [onSend, images]);

  const handleSend = useCallback(() => {
    onSend(images.length > 0 ? images : undefined);
    setImages([]);
  }, [onSend, images]);

  const handleImagesSelected = useCallback((newImages: string[]) => {
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const canSend = value.trim().length > 0 || images.length > 0;

  return (
    <div ref={containerRef} className={cn("flex flex-col gap-1.5 relative", className)}>
      {images.length > 0 && !isLooming && (
        <ImageUploadArea
          images={images}
          onImagesSelected={handleImagesSelected}
          onRemoveImage={handleRemoveImage}
          disabled={disabled}
          visionEnabled={visionEnabled}
        />
      )}
      <div className="flex items-end gap-1.5 relative">
        <div className="relative flex-1">
          <TextInputArea
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
          />
          {showCommands && (
            <CommandPalette
              value={value}
              onSelect={handleSelectCommand}
              onClose={() => setShowCommands(false)}
            />
          )}
        </div>
        {!isLooming && visionEnabled && (
          <ImageUploadArea
            images={[]}
            onImagesSelected={handleImagesSelected}
            onRemoveImage={handleRemoveImage}
            disabled={disabled}
            visionEnabled={visionEnabled}
          />
        )}
        {!isLooming && voiceEnabled && (
          <VoiceInputButton
            isListening={isListening}
            isSupported={isSupported}
            disabled={disabled}
            onClick={handleMicClick}
            error={error as Error | null}
            title={isListening ? (t.stopRecording || "Stop recording") : (t.voiceInput || "Voice input")}
          />
        )}
        <SendButton
          isLooming={isLooming}
          canSend={canSend}
          disabled={disabled}
          onSend={handleSend}
          onCancel={onCancel ?? undefined}
        />
      </div>
    </div>
  );
});

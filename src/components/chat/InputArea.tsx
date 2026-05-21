import React, { useState, useRef, useEffect, useCallback } from "react";
import { CornerDownLeft, X, Terminal, Mic, MicOff } from "lucide-react";
import { cn } from "../../utils/cn";
import { COMMAND_LIST, type SlashCommand } from "../../utils/commands";
import { useVoiceInput } from "../../hooks/useVoiceInput";
import { ImageUploadButton } from "./ImageUploadButton";
import { ImagePreview } from "./ImagePreview";

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

export const InputArea: React.FC<InputAreaProps> = ({
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
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

  // Filter commands based on current input
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
    if (filteredCommands.length > 0) {
      setShowCommands(true);
      setSelectedIndex(0);
    } else {
      setShowCommands(false);
    }
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

  const handleSelectCommand = (cmd: SlashCommand) => {
    onChange(cmd + " ");
    setShowCommands(false);
    // Focus textarea
    const textarea = containerRef.current?.querySelector("textarea");
    if (textarea) {
      setTimeout(() => textarea.focus(), 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommands && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        const selectedCmd = filteredCommands[selectedIndex];
        if (selectedCmd) {
          handleSelectCommand(selectedCmd.command);
        }
        return;
      }
      if (e.key === "Escape") {
        setShowCommands(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(images.length > 0 ? images : undefined);
      setImages([]);
    }
  };

  const handleSend = () => {
    onSend(images.length > 0 ? images : undefined);
    setImages([]);
  };

  const handleImagesSelected = (newImages: string[]) => {
    setImages((prev) => [...prev, ...newImages]);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    if (!visionEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!visionEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!visionEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newImages.push(base64);
    }

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const canSend = value.trim().length > 0 || images.length > 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col gap-1.5 relative",
        isDragOver && "ring-2 ring-dash-accent/50 rounded-lg",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {images.length > 0 && (
        <ImagePreview images={images} onRemove={handleRemoveImage} className="px-1" />
      )}
      <div className="flex items-end gap-1.5 relative">
        <div className="relative flex-1">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-transparent border-none focus:ring-0 text-[13px] font-mono p-1 min-h-[32px] max-h-24 resize-none no-scrollbar text-dash-text-primary placeholder:text-dash-text-label disabled:opacity-50"
          />
          {showCommands && filteredCommands.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-full bg-dash-elevated border border-dash-border rounded-lg shadow-2xl overflow-hidden z-50">
              {filteredCommands.map((cmd, index) => (
                <button
                  key={cmd.command}
                  onClick={() => handleSelectCommand(cmd.command)}
                  className={cn(
                    "w-full text-left px-3 py-2 flex items-center gap-2 transition-colors",
                    index === selectedIndex
                      ? "bg-dash-accent/20 text-dash-accent"
                      : "text-dash-text-primary hover:bg-neutral-800/50"
                  )}
                >
                  <Terminal className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-mono font-bold truncate">{cmd.command}</span>
                    <span className="text-[11px] text-dash-text-muted truncate">{cmd.label} — {cmd.description}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {!isLooming && (
          <ImageUploadButton
            onImagesSelected={handleImagesSelected}
            disabled={disabled}
          />
        )}
        {!isLooming && voiceEnabled && isSupported && (
          <button
            onClick={handleMicClick}
            disabled={disabled}
            className={cn(
              "p-1 rounded-md transition-all relative",
              isListening
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-500"
                : "bg-neutral-800 hover:bg-neutral-700 text-dash-text-muted"
            )}
            title={
              isListening
                ? t.stopRecording || "Stop recording"
                : t.voiceInput || "Voice input"
            }
          >
            {isListening ? (
              <>
                <MicOff className="w-3 h-3" />
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              </>
            ) : (
              <Mic className="w-3 h-3" />
            )}
            {error && (
              <span className="sr-only">{error.message}</span>
            )}
          </button>
        )}
        {isLooming ? (
          <button
            onClick={onCancel}
            className="p-1 bg-dash-warning/20 hover:bg-dash-warning/30 border border-dash-warning/30 rounded-md transition-all"
            title={t.cancel || "Cancel"}
          >
            <X className="w-3 h-3 text-dash-warning" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend || disabled}
            className="p-1 bg-dash-accent hover:bg-dash-accent/80 disabled:bg-neutral-800 disabled:text-neutral-700 rounded-md transition-all"
          >
            <CornerDownLeft className="w-3 h-3 text-white" />
          </button>
        )}
      </div>
    </div>
  );
};

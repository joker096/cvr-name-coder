import React from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "../../utils/cn";

interface VoiceInputButtonProps {
  isListening: boolean;
  isSupported: boolean;
  disabled?: boolean;
  onClick: () => void;
  error?: Error | null;
  title?: string;
  className?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  isListening,
  isSupported,
  disabled = false,
  onClick,
  error,
  title,
  className,
}) => {
  if (!isSupported) return null;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-1 rounded-md transition-all relative",
        isListening
          ? "bg-red-500/20 hover:bg-red-500/30 text-red-500"
          : "bg-neutral-800 hover:bg-neutral-700 text-dash-text-muted",
        className
      )}
      title={title}
      type="button"
    >
      {isListening ? (
        <>
          <MicOff className="w-3 h-3" />
          <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
        </>
      ) : (
        <Mic className="w-3 h-3" />
      )}
      {error && <span className="sr-only">{error.message}</span>}
    </button>
  );
};
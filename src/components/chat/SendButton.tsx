import React from "react";
import { CornerDownLeft, X } from "lucide-react";
import { cn } from "../../utils/cn";

interface SendButtonProps {
  isLooming?: boolean;
  canSend: boolean;
  disabled?: boolean;
  onSend: () => void;
  onCancel?: (() => void) | undefined;
  className?: string;
}

export const SendButton: React.FC<SendButtonProps> = ({
  isLooming = false,
  canSend,
  disabled = false,
  onSend,
  onCancel,
  className,
}) => {
  if (isLooming && onCancel) {
    return (
      <button
        onClick={onCancel}
        className={cn(
          "p-1 bg-dash-warning/20 hover:bg-dash-warning/30 border border-dash-warning/30 rounded-md transition-all",
          className
        )}
        title="Cancel"
        type="button"
      >
        <X className="w-3 h-3 text-dash-warning" />
      </button>
    );
  }

  return (
    <button
      onClick={onSend}
      disabled={!canSend || disabled}
      className={cn(
        "p-1 bg-dash-accent hover:bg-dash-accent/80 disabled:bg-neutral-800 disabled:text-neutral-700 rounded-md transition-all",
        className
      )}
      title="Send message"
      type="button"
    >
      <CornerDownLeft className="w-3 h-3 text-white" />
    </button>
  );
};
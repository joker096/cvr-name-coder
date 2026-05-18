import React from "react";
import { CornerDownLeft, X } from "lucide-react";
import { cn } from "../../utils/cn";

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onCancel?: () => void;
  isLooming?: boolean;
  placeholder?: string;
  lang?: string;
  disabled?: boolean;
  className?: string;
}

export const InputArea: React.FC<InputAreaProps> = ({
  value,
  onChange,
  onSend,
  onCancel,
  isLooming = false,
  placeholder = "Type your message...",
  lang = "en",
  disabled = false,
  className,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={cn("flex items-end gap-1.5", className)}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-mono p-1 min-h-[32px] max-h-24 resize-none no-scrollbar text-dash-text-primary placeholder:text-dash-text-label disabled:opacity-50"
      />
      {isLooming ? (
        <button
          onClick={onCancel}
          className="p-1 bg-dash-warning/20 hover:bg-dash-warning/30 border border-dash-warning/30 rounded-md transition-all"
          title={lang === "ru" ? "Отменить" : "Cancel"}
        >
          <X className="w-3 h-3 text-dash-warning" />
        </button>
      ) : (
        <button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className="p-1 bg-dash-accent hover:bg-dash-accent/80 disabled:bg-neutral-800 disabled:text-neutral-700 rounded-md transition-all"
        >
          <CornerDownLeft className="w-3 h-3 text-white" />
        </button>
      )}
    </div>
  );
};

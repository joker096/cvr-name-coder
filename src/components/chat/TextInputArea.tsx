import React, { useRef, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

interface TextInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const TextInputArea: React.FC<TextInputAreaProps> = ({
  value,
  onChange,
  onKeyDown,
  placeholder = "Type your message...",
  disabled = false,
  className,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleClear = () => {
    onChange("");
    textareaRef.current?.focus();
  };

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full bg-transparent border-none focus:ring-0 text-[12px] font-mono p-1 pr-7 min-h-[32px] max-h-24 resize-y no-scrollbar text-dash-text-primary placeholder:text-dash-text-label disabled:opacity-50",
          className
        )}
        rows={1}
      />
      {value && !disabled && (
        <button
          onClick={handleClear}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-0.5 text-dash-text-muted hover:text-dash-text-primary transition-colors"
          title="Clear input"
          type="button"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
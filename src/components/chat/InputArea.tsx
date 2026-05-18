import React, { useState, useRef, useEffect } from "react";
import { CornerDownLeft, X, Terminal } from "lucide-react";
import { cn } from "../../utils/cn";
import { COMMAND_LIST, type SlashCommand } from "../../utils/commands";

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
  const [showCommands, setShowCommands] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
      onSend();
    }
  };

  return (
    <div ref={containerRef} className={cn("flex items-end gap-1.5 relative", className)}>
      <div className="relative flex-1">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent border-none focus:ring-0 text-[15px] font-mono p-1 min-h-[32px] max-h-24 resize-none no-scrollbar text-dash-text-primary placeholder:text-dash-text-label disabled:opacity-50"
        />
        {showCommands && filteredCommands.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-full bg-dash-header border border-dash-border rounded-lg shadow-2xl overflow-hidden z-50">
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

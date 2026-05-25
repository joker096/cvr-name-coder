import React, { useState, useEffect } from "react";
import { Terminal } from "lucide-react";
import { cn } from "../../utils/cn";
import { COMMAND_LIST, type CommandDefinition } from "../../utils/commands";

interface CommandPaletteProps {
  value: string;
  onSelect: (command: string) => void;
  onClose: () => void;
  className?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  value,
  onSelect,
  onClose,
  className,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

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
    setSelectedIndex(0);
  }, [filteredCommands]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (cmd: CommandDefinition) => {
    onSelect(cmd.command + " ");
    onClose();
  };

  if (filteredCommands.length === 0) return null;

  return (
    <div
      className={cn(
        "absolute bottom-full left-0 mb-1 w-full bg-dash-elevated border border-dash-border rounded-lg shadow-2xl overflow-hidden z-50",
        className
      )}
      onKeyDown={handleKeyDown}
    >
      {filteredCommands.map((cmd: CommandDefinition, index: number) => (
        <button
          key={cmd.command}
          onClick={() => handleSelect(cmd)}
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
            <span className="text-[11px] text-dash-text-muted truncate">
              {cmd.label} — {cmd.description}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};
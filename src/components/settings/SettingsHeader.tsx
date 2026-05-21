import React from "react";
import { X } from "lucide-react";

interface SettingsHeaderProps {
  title: string;
  onClose: () => void;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({ title, onClose }) => (
  <div className="flex items-center justify-between p-3 border-b border-dash-border">
    <h2 className="text-sm font-bold text-dash-text-primary">{title}</h2>
    <button
      onClick={onClose}
      className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
      aria-label="Close"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);

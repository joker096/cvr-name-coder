import React from "react";
import { LanguageSelector } from "./LanguageSelector";

interface SettingsFooterProps {
  onClose: () => void;
  onSave: () => void;
  lang: string;
  onLanguageChange: (lang: string) => void;
  t: Record<string, string>;
}

export const SettingsFooter: React.FC<SettingsFooterProps> = ({
  onClose,
  onSave,
  lang,
  onLanguageChange,
  t,
}) => (
  <div className="flex items-center justify-between p-3 border-t border-dash-border">
    <div className="flex items-center gap-4">
      <LanguageSelector currentLang={lang} onLanguageChange={onLanguageChange} t={t} />
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={onClose}
        className="px-3 py-1.5 text-xs text-dash-text-muted hover:text-dash-text-primary transition-colors"
      >
        {t.cancel || "Cancel"}
      </button>
      <button
        onClick={onSave}
        className="px-3 py-1.5 text-xs bg-dash-accent text-white rounded hover:bg-dash-accent/90 transition-colors"
      >
        {t.save || "Save"}
      </button>
    </div>
  </div>
);

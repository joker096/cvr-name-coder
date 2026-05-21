import React from "react";
import { LanguageSelector } from "./LanguageSelector";

interface SettingsFooterProps {
  onClose: () => void;
  onSave: () => void;
  lang: string;
  onLanguageChange: (lang: string) => void;
  t: Record<string, string>;
  isSaving?: boolean;
}

export const SettingsFooter: React.FC<SettingsFooterProps> = ({
  onClose,
  onSave,
  lang,
  onLanguageChange,
  t,
  isSaving,
}) => (
  <div className="flex items-center justify-between p-3 border-t border-dash-border">
    <div className="flex items-center gap-4">
      <LanguageSelector currentLang={lang} onLanguageChange={onLanguageChange} t={t} />
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={onClose}
        disabled={isSaving}
        className="px-3 py-1.5 text-xs text-dash-text-muted hover:text-dash-text-primary transition-colors disabled:text-dash-text-muted/50"
      >
        {t.cancel || "Cancel"}
      </button>
      <button
        onClick={onSave}
        disabled={isSaving}
        className="px-3 py-1.5 text-xs bg-dash-accent text-white rounded hover:bg-dash-accent/90 transition-colors disabled:opacity-50"
      >
        {isSaving ? "Validating..." : t.save || "Save"}
      </button>
    </div>
  </div>
);

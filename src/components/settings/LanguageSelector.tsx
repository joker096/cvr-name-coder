import React from "react";
import { cn } from "../../utils/cn";

interface LanguageSelectorProps {
  currentLang: string;
  onLanguageChange?: (lang: string) => void;
  t: any;
  className?: string;
}

const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLang,
  onLanguageChange,
  t,
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-[14px] uppercase font-bold text-dash-text-muted tracking-widest">
        {t.language || "Language"}
      </label>
      <select
        value={currentLang}
        onChange={(e) => onLanguageChange?.(e.target.value)}
        className="w-full bg-dash-bg border border-dash-border rounded px-3 py-2 text-base text-dash-text-primary focus:border-dash-accent outline-none cursor-pointer"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName} ({lang.name})
          </option>
        ))}
      </select>
    </div>
  );
};

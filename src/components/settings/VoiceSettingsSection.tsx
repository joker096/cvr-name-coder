import React from "react";
import { ToggleSwitch } from "../shared/ToggleSwitch";

interface VoiceSettingsSectionProps {
  voiceEnabled: boolean;
  voiceLanguage: string;
  voiceAutoSend: boolean;
  onToggleVoiceEnabled?: (() => void) | undefined;
  onChangeVoiceLanguage?: ((lang: string) => void) | undefined;
  onToggleVoiceAutoSend?: (() => void) | undefined;
  t: Record<string, string>;
}

const VOICE_LANGUAGES = [
  "en-US", "en-GB", "ru-RU", "es-ES", "fr-FR", "de-DE",
  "it-IT", "pt-BR", "ja-JP", "ko-KR", "zh-CN",
  "ar-SA", "tr-TR", "pl-PL", "uk-UA", "vi-VN", "hi-IN",
];

export const VoiceSettingsSection: React.FC<VoiceSettingsSectionProps> = ({
  voiceEnabled,
  voiceLanguage,
  voiceAutoSend,
  onToggleVoiceEnabled,
  onChangeVoiceLanguage,
  onToggleVoiceAutoSend,
  t,
}) => (
  <div className="pt-2.5 border-t border-dash-border space-y-3">
    <h3 className="text-[10px] font-bold text-dash-text-muted uppercase tracking-widest">
      {t.voiceSettings || "Voice Input"}
    </h3>
    <ToggleSwitch
      checked={voiceEnabled}
      onChange={onToggleVoiceEnabled ?? (() => {})}
      label={t.voiceEnabled || "Enable Voice Input"}
      description={t.voiceEnabledDesc || "Show microphone button in chat input"}
    />
    {voiceEnabled && (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-dash-text-primary mb-2">
            {t.voiceLanguage || "Speech Recognition Language"}
          </label>
          <select
            value={voiceLanguage}
            onChange={(e) => onChangeVoiceLanguage?.(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-dash-bg border border-dash-border rounded text-dash-text-primary focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs"
          >
            {VOICE_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
        <ToggleSwitch
          checked={voiceAutoSend}
          onChange={onToggleVoiceAutoSend ?? (() => {})}
          label={t.voiceAutoSend || "Auto-Send After Silence"}
          description={t.voiceAutoSendDesc || "Automatically send message after detecting silence"}
        />
      </div>
    )}
  </div>
);

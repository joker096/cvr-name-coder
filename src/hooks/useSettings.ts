import { useState, useEffect, useRef } from "react";
import { storageService } from "../services/storageService";
import type { ChatConfig, Preset } from "../types/settings";
import { toPresetId } from "../types/ai";

const STORAGE_KEY = "cvr_settings";

const DEPRECATED_MODELS: Record<string, string> = {
  "gemini-2.5-flash-preview-05-20": "gemini-2.5-flash",
  "gemini-2.5-pro-preview-05-06": "gemini-2.5-pro",
  "claude-3-5-sonnet-20240620": "claude-sonnet-4-20250514",
};

function migrateSettings(settings: Settings): Settings {
  let changed = false;
  const chat = { ...settings.chat };
  if (chat.aiModel && DEPRECATED_MODELS[chat.aiModel] !== undefined) {
    chat.aiModel = DEPRECATED_MODELS[chat.aiModel]!;
    changed = true;
  }
  if (chat.thinkingModel && DEPRECATED_MODELS[chat.thinkingModel] !== undefined) {
    chat.thinkingModel = DEPRECATED_MODELS[chat.thinkingModel]!;
    changed = true;
  }
  if (!chat.providerKeys) {
    chat.providerKeys = {};
    changed = true;
  }
  if (chat.apiKey && !chat.providerKeys[chat.aiProvider]) {
    chat.providerKeys = { ...chat.providerKeys, [chat.aiProvider]: chat.apiKey };
    changed = true;
  }
  if (changed) {
    const migrated = { ...settings, chat };
    storageService.set(STORAGE_KEY, migrated);
    return migrated;
  }
  return settings;
}

const persistToServer = async (settings: Settings) => {
  try {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  } catch {}
};

const loadFromServer = async (): Promise<Settings | null> => {
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object" && data.chat) return data as Settings;
    }
  } catch {}
  return null;
};

interface Settings {
  chat: ChatConfig;
  presets: Preset[];
  autoLoopDelay: number;
  isAutonomous: boolean;
  autoCommit: boolean;
  lang: string;
  voiceEnabled: boolean;
  voiceLanguage: string;
  voiceAutoSend: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  chat: {
    aiProvider: "gemini",
    aiModel: "gemini-2.5-flash",
    apiKey: "",
    localUrl: "",
    localModelName: "",
    customUrl: "",
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: "",
    agent: "build",
    visionEnabled: true,
    maxImageSize: 1024,
    multiModelEnabled: false,
    thinkingProvider: "gemini",
    thinkingModel: "gemini-2.5-flash",
    providerKeys: {},
  },
  presets: [],
  autoLoopDelay: 2000,
  isAutonomous: true,
  autoCommit: false,
  voiceEnabled: false,
  voiceLanguage: "en",
  voiceAutoSend: false,
  lang: "en",
};

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  useEffect(() => {
    const init = async () => {
      try {
        const serverSettings = await loadFromServer();
        if (serverSettings) {
          setSettings({ ...DEFAULT_SETTINGS, ...serverSettings });
          storageService.set(STORAGE_KEY, serverSettings);
        } else {
          const saved = storageService.get<Settings>(STORAGE_KEY);
          if (saved) {
            const migrated = migrateSettings(saved);
            setSettings({ ...DEFAULT_SETTINGS, ...migrated });
            persistToServer(migrated);
          }
        }
      } catch {
        const saved = storageService.get<Settings>(STORAGE_KEY);
        if (saved) {
          const migrated = migrateSettings(saved);
          setSettings({ ...DEFAULT_SETTINGS, ...migrated });
        }
      }
      isInitialized.current = true;
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isInitialized.current) return;
    storageService.set(STORAGE_KEY, settings);
    persistToServer(settings);
  }, [settings]);

  const updateChatConfig = (config: Partial<ChatConfig>) => {
    setSettings((prev) => ({
      ...prev,
      chat: { ...prev.chat, ...config },
    }));
  };

  const updateAutoLoopDelay = (delay: number) => {
    setSettings((prev) => ({ ...prev, autoLoopDelay: delay }));
  };

  const toggleAutonomous = () => {
    setSettings((prev) => ({ ...prev, isAutonomous: !prev.isAutonomous }));
  };

  const toggleAutoCommit = () => {
    setSettings((prev) => ({ ...prev, autoCommit: !prev.autoCommit }));
  };

  const setLanguage = (lang: string) => {
    setSettings((prev) => ({ ...prev, lang }));
  };

  const toggleVoiceEnabled = () => {
    setSettings((prev) => ({ ...prev, voiceEnabled: !prev.voiceEnabled }));
  };

  const setVoiceLanguage = (voiceLanguage: string) => {
    setSettings((prev) => ({ ...prev, voiceLanguage }));
  };

  const toggleVoiceAutoSend = () => {
    setSettings((prev) => ({ ...prev, voiceAutoSend: !prev.voiceAutoSend }));
  };

  const addPreset = (preset: Omit<Preset, "id" | "createdAt">) => {
    const newPreset: Preset = {
      ...preset,
      id: toPresetId(`preset_${Date.now()}`),
      createdAt: Date.now(),
    };
    setSettings((prev) => ({
      ...prev,
      presets: [...prev.presets, newPreset],
    }));
    return newPreset;
  };

  const updatePreset = (id: string, preset: Partial<Preset>) => {
    setSettings((prev) => ({
      ...prev,
      presets: prev.presets.map((p) => (p.id === id ? { ...p, ...preset } : p)),
    }));
  };

  const deletePreset = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      presets: prev.presets.filter((p) => p.id !== id),
    }));
  };

  const loadPreset = (id: string) => {
    const preset = settings.presets.find((p) => p.id === id);
    if (preset) {
      setSettings((prev) => ({
        ...prev,
        chat: preset.config,
      }));
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    isLoading,
    updateChatConfig,
    updateAutoLoopDelay,
    toggleAutonomous,
    toggleAutoCommit,
    setLanguage,
    toggleVoiceEnabled,
    setVoiceLanguage,
    toggleVoiceAutoSend,
    addPreset,
    updatePreset,
    deletePreset,
    loadPreset,
    resetSettings,
  };
};

import { useState, useEffect } from "react";
import { storageService } from "../services/storageService";
import type { ChatConfig, Preset } from "../types/settings";

const STORAGE_KEY = "cvr_settings";

interface Settings {
  chat: ChatConfig;
  presets: Preset[];
  autoLoopDelay: number;
  isAutonomous: boolean;
  lang: "en" | "ru";
}

const DEFAULT_SETTINGS: Settings = {
  chat: {
    aiProvider: "gemini",
    aiModel: "gemini-2.5-pro",
    localUrl: "",
    localModelName: "",
    customKey: "",
    customUrl: "",
  },
  presets: [],
  autoLoopDelay: 2000,
  isAutonomous: true,
  lang: "en",
};

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = storageService.get<Settings>(STORAGE_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
  });

  const [isLoading] = useState(false);

  useEffect(() => {
    storageService.set(STORAGE_KEY, settings);
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

  const setLanguage = (lang: "en" | "ru") => {
    setSettings((prev) => ({ ...prev, lang }));
  };

  const addPreset = (preset: Omit<Preset, "id" | "createdAt">) => {
    const newPreset: Preset = {
      ...preset,
      id: `preset_${Date.now()}`,
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
    setLanguage,
    addPreset,
    updatePreset,
    deletePreset,
    loadPreset,
    resetSettings,
  };
};

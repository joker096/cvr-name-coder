import { useState, useEffect } from "react";
import { storageService } from "../services/storageService";
import type { ChatConfig, Preset } from "../types/settings";
import { toPresetId } from "../types/ai";

const STORAGE_KEY = "cvr_settings";

interface Settings {
  chat: ChatConfig;
  presets: Preset[];
  autoLoopDelay: number;
  isAutonomous: boolean;
  autoCommit: boolean;
  lang: "en" | "ru";
  voiceEnabled: boolean;
  voiceLanguage: string;
  voiceAutoSend: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  chat: {
    aiProvider: "gemini",
    aiModel: "gemini-2.5-flash-preview-05-20",
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
    thinkingModel: "gemini-2.0-flash",
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

  const toggleAutoCommit = () => {
    setSettings((prev) => ({ ...prev, autoCommit: !prev.autoCommit }));
  };

  const setLanguage = (lang: "en" | "ru") => {
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

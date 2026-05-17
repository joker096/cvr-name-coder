import { useState, useEffect } from "react";
import { presetService } from "../services/presetService";
import type { Preset, ChatConfig } from "../types/settings";

export const usePresets = () => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedPresets = await presetService.loadPresets();
      setPresets(loadedPresets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load presets");
    } finally {
      setIsLoading(false);
    }
  };

  const savePreset = async (preset: Omit<Preset, "id" | "createdAt">) => {
    setIsLoading(true);
    setError(null);
    try {
      const newPreset = await presetService.savePreset(preset);
      setPresets((prev) => [...prev, newPreset]);
      return newPreset;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preset");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreset = async (id: string, preset: Partial<Preset>) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedPreset = await presetService.updatePreset(id, preset);
      setPresets((prev) => prev.map((p) => (p.id === id ? updatedPreset : p)));
      return updatedPreset;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update preset");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deletePreset = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await presetService.deletePreset(id);
      setPresets((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete preset");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const applyPreset = (preset: Preset): ChatConfig => {
    return preset.config;
  };

  const getPresetById = (id: string): Preset | undefined => {
    return presets.find((p) => p.id === id);
  };

  return {
    presets,
    isLoading,
    error,
    loadPresets,
    savePreset,
    updatePreset,
    deletePreset,
    applyPreset,
    getPresetById,
  };
};

import { storageService } from './storageService';
import type { Preset } from '../types/settings';
import { STORAGE_KEYS } from '../utils/constants';

export const presetService = {
  STORAGE_KEY: STORAGE_KEYS.PRESETS,

  getAll(): Preset[] {
    const data = storageService.load<Preset[]>(this.STORAGE_KEY);
    return data || [];
  },

  getById(id: string): Preset | null {
    const presets = this.getAll();
    return presets.find(p => p.id === id) || null;
  },

  loadPresets(): Preset[] {
    return this.getAll();
  },

  savePreset(preset: Omit<Preset, "id" | "createdAt">): Preset {
    const newPreset: Preset = {
      ...preset,
      id: `preset_${Date.now()}`,
      createdAt: Date.now(),
    };
    this.save(newPreset);
    return newPreset;
  },

  updatePreset(id: string, updates: Partial<Preset>): Preset {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Preset with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    this.save(updated);
    return updated;
  },

  deletePreset(id: string): void {
    this.delete(id);
  },

  save(preset: Preset): void {
    const presets = this.getAll();
    const existingIndex = presets.findIndex(p => p.id === preset.id);

    if (existingIndex >= 0) {
      presets[existingIndex] = preset;
    } else {
      presets.push(preset);
    }

    storageService.save(this.STORAGE_KEY, presets);
  },

  delete(id: string): void {
    const presets = this.getAll().filter(p => p.id !== id);
    storageService.save(this.STORAGE_KEY, presets);
  },

  validate(preset: Preset): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!preset.name || preset.name.trim().length === 0) {
      errors.name = 'Name is required';
    }

    if (!preset.config || !preset.config.aiModel) {
      errors.config = 'Invalid configuration';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },
};

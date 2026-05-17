import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { presetService } from '../presetService';
import type { Preset } from '../../types/settings';

describe('presetService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save and load preset', () => {
    const preset: Preset = {
      id: 'test-1',
      name: 'Test Preset',
      description: 'Test description',
      config: { aiProvider: 'openai', aiModel: 'gpt-4' },
      createdAt: Date.now(),
    };
    presetService.save(preset);
    const loaded = presetService.getById('test-1');
    expect(loaded).toEqual(preset);
  });

  it('should get all presets', () => {
    const preset1: Preset = {
      id: 'test-1',
      name: 'Preset 1',
      description: 'Description 1',
      config: { aiProvider: 'openai', aiModel: 'gpt-4' },
      createdAt: Date.now(),
    };
    const preset2: Preset = {
      id: 'test-2',
      name: 'Preset 2',
      description: 'Description 2',
      config: { aiProvider: 'gemini', aiModel: 'gemini-2.0-flash' },
      createdAt: Date.now(),
    };
    presetService.save(preset1);
    presetService.save(preset2);
    const all = presetService.getAll();
    expect(all).toHaveLength(2);
  });

  it('should delete preset', () => {
    const preset: Preset = {
      id: 'test-1',
      name: 'Test Preset',
      description: 'Test description',
      config: { aiProvider: 'openai', aiModel: 'gpt-4' },
      createdAt: Date.now(),
    };
    presetService.save(preset);
    presetService.delete('test-1');
    const loaded = presetService.getById('test-1');
    expect(loaded).toBeNull();
  });
});

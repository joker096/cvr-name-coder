import { describe, it, expect } from 'vitest';
import { validateAIConfig, validateAPIKey, validateURL, validateModelName } from '../validationService';
import type { ChatConfig } from '../../types/settings';

describe('validationService', () => {
  describe('validateAIConfig', () => {
    it('should validate valid OpenAI config', () => {
      const config: ChatConfig = {
        aiProvider: 'openai',
        apiKey: 'sk-1234567890abcdef',
        aiModel: 'gpt-4',
      };
      const result = validateAIConfig(config);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should reject OpenAI config without API key', () => {
      const config: ChatConfig = {
        aiProvider: 'openai',
        apiKey: '',
        aiModel: 'gpt-4',
      };
      const result = validateAIConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.apiKey).toBeTruthy();
    });

    it('should reject local config without URL', () => {
      const config: ChatConfig = {
        aiProvider: 'local',
        aiModel: 'llama3',
      };
      const result = validateAIConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.localUrl).toBeTruthy();
    });
  });

  describe('validateAPIKey', () => {
    it('should accept valid API key', () => {
      const result = validateAPIKey('sk-1234567890');
      expect(result.isValid).toBe(true);
    });

    it('should reject short API key', () => {
      const result = validateAPIKey('short');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateURL', () => {
    it('should accept valid URL', () => {
      const result = validateURL('http://localhost:11434');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid URL', () => {
      const result = validateURL('not-a-url');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateModelName', () => {
    it('should accept valid model name', () => {
      const result = validateModelName('gpt-4');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty model name', () => {
      const result = validateModelName('');
      expect(result.isValid).toBe(false);
    });
  });
});

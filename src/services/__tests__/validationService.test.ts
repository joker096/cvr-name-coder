import { describe, it, expect } from 'vitest';
import { validateAIConfig, validateAPIKey, validateURL, validateModelName } from '../validationService';
import type { ChatConfig } from '../../types/settings';

describe('validationService', () => {
  describe('validateAIConfig', () => {
    it('should validate valid OpenAI config', () => {
      const config: ChatConfig = {
        aiProvider: 'openai',
        aiModel: 'gpt-4',
      };
      const result = validateAIConfig(config);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should reject config without model', () => {
      const config: ChatConfig = {
        aiProvider: 'openai',
        aiModel: '',
      };
      const result = validateAIConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.aiModel).toBeTruthy();
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

    it('should accept local config with URL', () => {
      const config: ChatConfig = {
        aiProvider: 'local',
        aiModel: 'llama3',
        localUrl: 'http://localhost:11434',
      };
      const result = validateAIConfig(config);
      expect(result.isValid).toBe(true);
    });

    it('should return errors for empty config', () => {
      const config = {} as ChatConfig;
      const result = validateAIConfig(config);
      expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(1);
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

    it('should reject empty API key', () => {
      const result = validateAPIKey('');
      expect(result.isValid).toBe(false);
    });

    it('should reject whitespace-only API key', () => {
      const result = validateAPIKey('   ');
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

    it('should accept HTTPS URL', () => {
      const result = validateURL('https://api.openai.com');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty URL', () => {
      const result = validateURL('');
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

    it('should accept model name with version suffix', () => {
      const result = validateModelName('deepseek-coder-v2');
      expect(result.isValid).toBe(true);
    });

    it('should accept model name with slash (provider/model pattern)', () => {
      const result = validateModelName('Qwen/Qwen3-235B-A22B');
      expect(result.isValid).toBe(true);
    });
  });
});

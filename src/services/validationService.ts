import type { ChatConfig, ValidationResult, FieldValidation } from '../types/settings';

export const validationService = {
  validateConfig(config: ChatConfig): ValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    if (['local', 'custom'].includes(config.aiProvider)) {
      const urlValidation = this.validateURL(config.localUrl || config.customUrl || '');
      if (!urlValidation.isValid) {
        errors.localUrl = urlValidation.error || 'Invalid URL';
      }
    }

    const modelValidation = this.validateModelName(config.aiModel);
    if (!modelValidation.isValid) {
      errors.aiModel = modelValidation.error || 'Invalid model name';
    }

    if (config.aiProvider === 'local' && config.localUrl && !config.localUrl.includes('localhost')) {
      warnings.localUrl = 'Using non-localhost URL may have security implications';
    }

    const isValid = Object.keys(errors).length === 0;
    return isValid
      ? { isValid: true as const, errors: {}, warnings }
      : { isValid: false as const, errors, warnings };
  },

  validateField(field: string, value: any): FieldValidation {
    switch (field) {
      case 'apiKey':
        return this.validateAPIKey(value);
      case 'localUrl':
      case 'customUrl':
        return this.validateURL(value);
      case 'aiModel':
        return this.validateModelName(value);
      default:
        return { isValid: true };
    }
  },

  validateAPIKey(apiKey: string): FieldValidation {
    if (!apiKey || apiKey.length < 10) {
      return { isValid: false, error: 'API key must be at least 10 characters' };
    }
    return { isValid: true };
  },

  validateURL(url: string): FieldValidation {
    if (!url) {
      return { isValid: false, error: 'URL is required' };
    }
    try {
      new URL(url);
      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Invalid URL format' };
    }
  },

  validateModelName(modelName: string): FieldValidation {
    if (!modelName || modelName.length < 2) {
      return { isValid: false, error: 'Model name must be at least 2 characters' };
    }
    return { isValid: true };
  },
};

export const validateAIConfig = (config: ChatConfig): ValidationResult => {
  return validationService.validateConfig(config);
};

export const validateAPIKey = (apiKey: string): FieldValidation => {
  return validationService.validateAPIKey(apiKey);
};

export const validateURL = (url: string): FieldValidation => {
  return validationService.validateURL(url);
};

export const validateModelName = (modelName: string): FieldValidation => {
  return validationService.validateModelName(modelName);
};

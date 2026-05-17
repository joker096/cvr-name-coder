export interface ChatConfig {
  aiProvider: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'grok' | 'groq' | 'local' | 'custom';
  aiModel: string;
  localUrl?: string;
  localModelName?: string;
  customKey?: string;
  customUrl?: string;
  apiKey?: string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  config: ChatConfig;
  createdAt: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export interface FieldValidation {
  isValid: boolean;
  error?: string;
}

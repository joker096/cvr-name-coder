import type { ChatConfig } from '../types/settings';

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  aiProvider: 'local',
  aiModel: 'llama3',
  localUrl: 'http://localhost:11434/v1',
  localModelName: 'llama3',
};

export const STORAGE_KEYS = {
  AI_CONFIG: 'cvr_aiConfig',
  KERNEL_CONFIG: 'cvr_kernelConfig',
  ACTIVE_AGENT: 'cvr_activeAgent',
  AUTO_LOOP_DELAY: 'cvr_autoLoopDelay',
  LANGUAGE: 'cvr_lang',
  SKILLS: 'cvr_skills',
  PRESETS: 'cvr_presets',
} as const;

export const AI_PROVIDERS = [
  { id: 'gemini', name: 'Gemini', type: 'cloud', requiresApiKey: true, requiresUrl: false },
  { id: 'openai', name: 'OpenAI', type: 'cloud', requiresApiKey: true, requiresUrl: false },
  { id: 'anthropic', name: 'Anthropic', type: 'cloud', requiresApiKey: true, requiresUrl: false },
  { id: 'deepseek', name: 'DeepSeek', type: 'cloud', requiresApiKey: true, requiresUrl: false },
  { id: 'grok', name: 'xAI Grok', type: 'cloud', requiresApiKey: true, requiresUrl: false },
  { id: 'groq', name: 'Groq', type: 'cloud', requiresApiKey: true, requiresUrl: false },
  { id: 'local', name: 'Local Model', type: 'local', requiresApiKey: false, requiresUrl: true },
  { id: 'custom', name: 'Custom', type: 'cloud', requiresApiKey: true, requiresUrl: true },
];

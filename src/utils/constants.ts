import type { ChatConfig } from '../types/settings';

// Server-side constants for timeouts, limits, and defaults
export const TIMEOUT_COMMAND = 30_000; // 30 seconds
export const TIMEOUT_BROWSER = 30_000; // 30 seconds
export const TIMEOUT_PERMISSION = 5 * 60 * 1000; // 5 minutes
export const TIMEOUT_PERMISSION_POLL = 500; // 500ms

export const MAX_HISTORY_MEMORY = 10;
export const MAX_MEMORY_CLUSTERS = 5;
export const MAX_IMAGE_DIMENSION = 1024;

export const MEMORY_SUMMARY_INTERVAL = 5; // every 5 messages
export const MAX_AGENT_LOOP_STEPS = 20;
export const MAX_SUBAGENT_CONCURRENT = 3;

export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 4096;
export const DEFAULT_AUTO_LOOP_DELAY = 2000;

export const RATE_LIMIT_WINDOW_MS = 1 * 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX = 120;

export const PORT = 3000;
export const HOST = "127.0.0.1";

export const BROWSER_VIEWPORT = { width: 1280, height: 720 };

export const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  gemini: "gemini-2.5-flash",
  openai: "gpt-4.1",
  anthropic: "claude-sonnet-4-20250514",
  deepseek: "deepseek-chat",
  grok: "grok-3",
  groq: "meta-llama/llama-4-maverick-17b-128e-instruct",
  baseten: "meta-llama-4-maverick",
  openrouter: "google/gemini-2.5-flash",
  together: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  mistral: "mistral-large-latest",
  local: "local-model",
  custom: "custom-model",
};

export const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  grok: "https://api.x.ai/v1",
  groq: "https://api.groq.com/openai/v1",
  baseten: "https://api.baseten.co/v1",
  openrouter: "https://openrouter.ai/api/v1",
  together: "https://api.together.xyz/v1",
  mistral: "https://api.mistral.ai/v1",
};

// Original exports
export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  aiProvider: "local",
  aiModel: "llama3",
  localUrl: "http://localhost:11434/v1",
  localModelName: "llama3",
};

export const STORAGE_KEYS = {
  AI_CONFIG: "cvr_aiConfig",
  KERNEL_CONFIG: "cvr_kernelConfig",
  ACTIVE_AGENT: "cvr_activeAgent",
  AUTO_LOOP_DELAY: "cvr_autoLoopDelay",
  LANGUAGE: "cvr_lang",
  SKILLS: "cvr_skills",
  PRESETS: "cvr_presets",
};

export const AI_PROVIDERS = [
  { id: "gemini", name: "Gemini", type: "cloud", requiresApiKey: true, requiresUrl: false },
  { id: "openai", name: "OpenAI", type: "cloud", requiresApiKey: true, requiresUrl: false },
  { id: "anthropic", name: "Anthropic", type: "cloud", requiresApiKey: true, requiresUrl: false },
  { id: "deepseek", name: "DeepSeek", type: "cloud", requiresApiKey: true, requiresUrl: false },
  { id: "grok", name: "xAI Grok", type: "cloud", requiresApiKey: true, requiresUrl: false },
  { id: "groq", name: "Groq", type: "cloud", requiresApiKey: true, requiresUrl: false },
  { id: "baseten", name: "Baseten", type: "cloud", requiresApiKey: true, requiresUrl: false },
  { id: "openrouter", name: "OpenRouter", type: "cloud", requiresApiKey: true, requiresUrl: false },
  { id: "together", name: "Together AI", type: "cloud", requiresApiKey: true, requiresUrl: false },
  { id: "mistral", name: "Mistral AI", type: "cloud", requiresApiKey: true, requiresUrl: false },
  { id: "local", name: "Local Model", type: "local", requiresApiKey: false, requiresUrl: true },
  { id: "custom", name: "Custom", type: "cloud", requiresApiKey: true, requiresUrl: true },
];

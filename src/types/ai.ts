// Branded types for domain modeling
type Brand<T, B extends string> = T & { readonly __brand: B };

// Domain-specific branded types
export type MessageId = Brand<string, "MessageId">;
export type MemoryId = Brand<string, "MemoryId">;
export type SkillId = Brand<string, "SkillId">;
export type AgentId = Brand<string, "AgentId">;
export type PresetId = Brand<string, "PresetId">;
export type ModelId = Brand<string, "ModelId">;
export type ProviderId = Brand<string, "ProviderId">;

// Import ChatProviderId from settings
import type { ChatProviderId } from './settings';

// Type-safe constructors
export const toMessageId = (id: string): MessageId => id as MessageId;
export const toMemoryId = (id: string): MemoryId => id as MemoryId;
export const toSkillId = (id: string): SkillId => id as SkillId;
export const toAgentId = (id: string): AgentId => id as AgentId;
export const toPresetId = (id: string): PresetId => id as PresetId;
export const toModelId = (id: string): ModelId => id as ModelId;
export const toProviderId = (id: string): ProviderId => id as ProviderId;

// Helper to convert string to ChatProviderId
export const toChatProviderId = (id: string): ChatProviderId => {
  const validIds: ChatProviderId[] = ['gemini', 'openai', 'anthropic', 'deepseek', 'grok', 'groq', 'baseten', 'openrouter', 'together', 'mistral', 'local', 'custom'];
  if (validIds.includes(id as ChatProviderId)) {
    return id as ChatProviderId;
  }
  return 'custom'; // fallback
};

// Icon type - instead of any
export type IconType =
  | { type: 'lucide'; name: string }
  | { type: 'custom'; component: React.ComponentType<any> };

// Provider type as discriminated union
export type CloudProvider = {
  type: 'cloud';
  id: string;
  name: string;
  requiresApiKey: boolean;
  requiresUrl: false;
  models: AIModel[];
};

export type LocalProvider = {
  type: 'local';
  id: string;
  name: string;
  requiresApiKey: boolean;
  requiresUrl: boolean;
  models: AIModel[];
};

export type AIProvider = CloudProvider | LocalProvider;

// Type guard for provider type
export const isCloudProvider = (provider: AIProvider): provider is CloudProvider => {
  return provider.type === 'cloud';
};

export const isLocalProvider = (provider: AIProvider): provider is LocalProvider => {
  return provider.type === 'local';
};

// Model info with branded type
export interface AIModel {
  id: string;
  name: string;
  size?: number;
  parameters?: number;
}

// AI Response with discriminated union for error handling
export type AIResponseSuccess = {
  status: 'success';
  content: string;
  continueNeeded: boolean;
};

export type AIResponseError = {
  status: 'error';
  error: string;
  continueNeeded: false;
};

export type AIResponse = AIResponseSuccess | AIResponseError;

// Type guard for AI response
export const isSuccessResponse = (response: AIResponse): response is AIResponseSuccess => {
  return response.status === 'success';
};

export const isErrorResponse = (response: AIResponse): response is AIResponseError => {
  return response.status === 'error';
};

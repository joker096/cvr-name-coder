import type { PresetId } from './ai';

// Provider IDs as literal union type
export type ChatProviderId =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'grok'
  | 'groq'
  | 'baseten'
  | 'openrouter'
  | 'together'
  | 'mistral'
  | 'local'
  | 'custom';

export type AgentId = 'build' | 'general' | 'explore' | 'scout' | 'prometheus' | 'hephaestus';

// Chat config with proper types
export interface ChatConfig {
  aiProvider: ChatProviderId;
  aiModel: string;
  apiKey?: string;
  providerKeys?: Record<string, string>;
  localUrl?: string;
  localModelName?: string;
  customUrl?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  agent?: AgentId;
  mode?: "plan" | "build" | "review";
  visionEnabled?: boolean;
  maxImageSize?: number;
  multiModelEnabled?: boolean;
  thinkingProvider?: ChatProviderId;
  thinkingModel?: string;
  thinkingLocalUrl?: string;
}

export type TrackerType = "github" | "jira" | "linear";

export interface TrackerConfig {
  type: TrackerType;
  token: string;
  baseUrl?: string;
  repo?: string;
  project?: string;
}

// Preset with branded ID
export interface Preset {
  id: PresetId;
  name: string;
  description: string;
  config: ChatConfig;
  createdAt: number;
}

// Validation result with discriminated union
export type ValidationResultValid = {
  isValid: true;
  errors: Record<string, never>;
  warnings: Record<string, string>;
};

export type ValidationResultInvalid = {
  isValid: false;
  errors: Record<string, string>;
  warnings: Record<string, string>;
};

export type ValidationResult = ValidationResultValid | ValidationResultInvalid;

// Type guard for validation result
export const isValidResult = (result: ValidationResult): result is ValidationResultValid => {
  return result.isValid === true;
};

export const isInvalidResult = (result: ValidationResult): result is ValidationResultInvalid => {
  return result.isValid === false;
};

// Field validation with discriminated union
export type FieldValidationValid = {
  isValid: true;
};

export type FieldValidationInvalid = {
  isValid: false;
  error: string;
};

export type FieldValidation = FieldValidationValid | FieldValidationInvalid;

// Type guard for field validation
export const isFieldValid = (validation: FieldValidation): validation is FieldValidationValid => {
  return validation.isValid === true;
};

export const isFieldInvalid = (validation: FieldValidation): validation is FieldValidationInvalid => {
  return validation.isValid === false;
};

// Settings state as discriminated union
export type SettingsStateIdle = {
  status: 'idle';
};

export type SettingsStateLoading = {
  status: 'loading';
};

export type SettingsStateSaving = {
  status: 'saving';
};

export type SettingsStateError = {
  status: 'error';
  error: string;
};

export type SettingsState = SettingsStateIdle | SettingsStateLoading | SettingsStateSaving | SettingsStateError;

// Type guards for settings state
export const isSettingsIdle = (state: SettingsState): state is SettingsStateIdle => {
  return state.status === 'idle';
};

export const isSettingsLoading = (state: SettingsState): state is SettingsStateLoading => {
  return state.status === 'loading';
};

export const isSettingsSaving = (state: SettingsState): state is SettingsStateSaving => {
  return state.status === 'saving';
};

export const isSettingsError = (state: SettingsState): state is SettingsStateError => {
  return state.status === 'error';
};

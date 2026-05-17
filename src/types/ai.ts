export interface AIModel {
  id: string;
  name: string;
}

export interface AIProvider {
  id: string;
  name: string;
  type: 'cloud' | 'local';
  requiresApiKey: boolean;
  requiresUrl: boolean;
  models: AIModel[];
}

export interface AIResponse {
  content: string;
  continueNeeded: boolean;
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  size?: number;
}

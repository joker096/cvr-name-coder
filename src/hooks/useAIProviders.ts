import { useState, useCallback } from "react";
import type { AIProvider, AIModel } from "../types/ai";

const PROVIDERS: AIProvider[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    type: "cloud" as const,
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "openai",
    name: "OpenAI",
    type: "cloud" as const,
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    type: "cloud" as const,
    models: [
      { id: "claude-3-opus", name: "Claude 3 Opus" },
      { id: "claude-3-sonnet", name: "Claude 3 Sonnet" },
      { id: "claude-3-haiku", name: "Claude 3 Haiku" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    type: "cloud" as const,
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat" },
      { id: "deepseek-coder", name: "DeepSeek Coder" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "grok",
    name: "xAI Grok",
    type: "cloud" as const,
    models: [
      { id: "grok-2", name: "Grok 2" },
      { id: "grok-1", name: "Grok 1" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "groq",
    name: "Groq",
    type: "cloud" as const,
    models: [
      { id: "llama3-70b", name: "Llama 3 70B" },
      { id: "llama3-8b", name: "Llama 3 8B" },
      { id: "mixtral-8x7b", name: "Mixtral 8x7B" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "baseten",
    name: "Baseten",
    type: "cloud" as const,
    models: [
      { id: "llama-3-1-70b-instruct", name: "Llama 3.1 70B" },
      { id: "llama-3-1-8b-instruct", name: "Llama 3.1 8B" },
      { id: "qwen2-5-72b-instruct", name: "Qwen 2.5 72B" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    type: "cloud" as const,
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)" },
      { id: "deepseek/deepseek-chat:free", name: "DeepSeek V3 (Free)" },
      { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash (Free)" },
      { id: "nvidia/llama-3.1-nemotron-70b-instruct:free", name: "Nemotron 70B (Free)" },
      { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Free)" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "together",
    name: "Together AI",
    type: "cloud" as const,
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "Llama 3.3 70B Turbo" },
      { id: "mistralai/Mixtral-8x22B-Instruct-v0.1", name: "Mixtral 8x22B" },
      { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", name: "Qwen 2.5 72B" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "mistral",
    name: "Mistral AI",
    type: "cloud" as const,
    models: [
      { id: "mistral-large-latest", name: "Mistral Large" },
      { id: "mistral-medium", name: "Mistral Medium" },
      { id: "codestral-latest", name: "Codestral" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "local",
    name: "Local LLM",
    type: "local" as const,
    models: [],
    requiresApiKey: false,
    requiresUrl: true,
  },
  {
    id: "custom",
    name: "Custom Provider",
    type: "local" as const,
    models: [],
    requiresApiKey: true,
    requiresUrl: true,
  },
];

export const useAIProviders = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedModels, setDetectedModels] = useState<AIModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getProviders = useCallback((): AIProvider[] => {
    return PROVIDERS;
  }, []);

  const getProviderById = useCallback((id: string): AIProvider | undefined => {
    return PROVIDERS.find((p) => p.id === id);
  }, []);

  const getModelsForProvider = useCallback((providerId: string): AIModel[] => {
    const provider = getProviderById(providerId);
    return provider?.models || [];
  }, [getProviderById]);

  const detectLocalModels = useCallback(async (url: string): Promise<AIModel[]> => {
    setIsDetecting(true);
    setError(null);

    try {
      const response = await fetch(`${url}/api/tags`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      const models: AIModel[] = (data.models || []).map((model: any) => ({
        id: model.name,
        name: model.name,
      }));

      setDetectedModels(models);
      return models;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to detect models";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const testConnection = useCallback(async (
    providerId: string,
    config: { apiKey?: string; url?: string }
  ): Promise<boolean> => {
    setIsDetecting(true);
    setError(null);

    try {
      const provider = getProviderById(providerId);
      if (!provider) {
        throw new Error("Provider not found");
      }

      if (providerId === "local" || providerId === "custom") {
        if (!config.url) {
          throw new Error("URL is required for this provider");
        }

        const response = await fetch(`${config.url}/api/tags`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          throw new Error(`Connection failed: ${response.statusText}`);
        }

        return true;
      }

      if (provider.requiresApiKey && !config.apiKey) {
        throw new Error("API key is required for this provider");
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Connection test failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsDetecting(false);
    }
  }, [getProviderById]);

  return {
    providers: PROVIDERS,
    isDetecting,
    detectedModels,
    error,
    getProviders,
    getProviderById,
    getModelsForProvider,
    detectLocalModels,
    testConnection,
  };
};

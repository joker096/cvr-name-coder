import { useState, useCallback } from "react";
import type { AIProvider, AIModel } from "../types/ai";

const PROVIDERS: AIProvider[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    type: "cloud" as const,
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "openai",
    name: "OpenAI",
    type: "cloud" as const,
    models: [
      { id: "gpt-4.1", name: "GPT-4.1" },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
      { id: "gpt-4.1-nano", name: "GPT-4.1 Nano" },
      { id: "o4-mini", name: "o4-mini" },
      { id: "gpt-4o", name: "GPT-4o" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    type: "cloud" as const,
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    type: "cloud" as const,
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3" },
      { id: "deepseek-reasoner", name: "DeepSeek R1" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "grok",
    name: "xAI Grok",
    type: "cloud" as const,
    models: [
      { id: "grok-3", name: "Grok 3" },
      { id: "grok-3-mini", name: "Grok 3 Mini" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "groq",
    name: "Groq",
    type: "cloud" as const,
    models: [
      { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick 17B" },
      { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout 17B" },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill 70B" },
      { id: "qwen-qwq-32b", name: "Qwen QwQ 32B" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "baseten",
    name: "Baseten",
    type: "cloud" as const,
    models: [
      { id: "deepseek-ai/DeepSeek-V4-Pro", name: "DeepSeek V4 Pro" },
      { id: "deepseek-ai/DeepSeek-R1-0528", name: "DeepSeek R1 0528" },
      { id: "deepseek-ai/DeepSeek-V3-0324", name: "DeepSeek V3 0324" },
      { id: "meta-llama/Llama-4-Maverick-17B-128E-Instruct", name: "Llama 4 Maverick 17B" },
      { id: "meta-llama/Llama-4-Scout-17B-16E-Instruct", name: "Llama 4 Scout 17B" },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { id: "anthropic/claude-opus-4-20250514", name: "Claude Opus 4" },
      { id: "mistralai/Mistral-Large", name: "Mistral Large" },
      { id: "mistralai/Mistral-Small", name: "Mistral Small" },
      { id: "Qwen/Qwen3-235B-A22B", name: "Qwen 3 235B" },
      { id: "Qwen/Qwen3-Coder-480B-A35B-Instruct", name: "Qwen 3 Coder 480B" },
      { id: "Qwen/QwQ-32B", name: "QwQ 32B" },
      { id: "NousResearch/DeepHermes-3-Llama-3-8B-Preview", name: "DeepHermes 3 8B" },
      { id: "NousResearch/Hermes-3-Llama-3.1-405B", name: "Hermes 3 405B" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    type: "cloud" as const,
    models: [
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { id: "deepseek/deepseek-chat", name: "DeepSeek V3" },
      { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick" },
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
    ],
    requiresApiKey: true,
    requiresUrl: false,
  },
  {
    id: "together",
    name: "Together AI",
    type: "cloud" as const,
    models: [
      { id: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8", name: "Llama 4 Maverick 17B" },
      { id: "meta-llama/Llama-4-Scout-17B-16E-Instruct", name: "Llama 4 Scout 17B" },
      { id: "Qwen/Qwen3-235B-A22B", name: "Qwen 3 235B" },
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
      { id: "mistral-small-latest", name: "Mistral Small" },
      { id: "codestral-latest", name: "Codestral" },
      { id: "mistral-ocr-latest", name: "Mistral OCR" },
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
    type: "cloud" as const,
    models: [],
    requiresApiKey: true,
    requiresUrl: true,
  },
];

export const useAIProviders = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedModels, setDetectedModels] = useState<AIModel[]>([]);
  const [remoteModels, setRemoteModels] = useState<AIModel[]>([]);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
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

  const fetchRemoteModels = useCallback(async (providerId: string, apiKey?: string): Promise<AIModel[]> => {
    setIsRefreshingModels(true);
    setError(null);

    try {
      const params = new URLSearchParams({ provider: providerId });
      if (apiKey) params.set("apiKey", apiKey);

      const response = await fetch(`/api/models?${params.toString()}`, {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Failed to fetch models" }));
        throw new Error((err as any).error || `HTTP ${response.status}`);
      }

      const data = await response.json() as { models: AIModel[] };
      setRemoteModels(data.models || []);
      return data.models || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch models";
      setError(errorMessage);
      return [];
    } finally {
      setIsRefreshingModels(false);
    }
  }, []);

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
    remoteModels,
    isRefreshingModels,
    error,
    getProviders,
    getProviderById,
    getModelsForProvider,
    fetchRemoteModels,
    detectLocalModels,
    testConnection,
  };
};

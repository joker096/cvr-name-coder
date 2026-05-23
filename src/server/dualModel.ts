import type { DualModelConfig } from "./providers.js";

export interface DualModelInput {
  aiProvider?: string;
  localUrl?: string;
  aiModel?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  multiModelEnabled?: boolean;
  thinkingProvider?: string;
  thinkingModel?: string;
  thinkingLocalUrl?: string;
  providerKeys?: Record<string, string>;
}

export function buildDualModelConfig(cfg: DualModelInput): DualModelConfig {
  const result: DualModelConfig = {
    primaryProvider: cfg.aiProvider || "",
  };

  if (cfg.aiModel !== undefined) result.primaryModel = cfg.aiModel;
  if (cfg.localUrl !== undefined) result.primaryLocalUrl = cfg.localUrl;
  if (cfg.multiModelEnabled && cfg.thinkingProvider !== undefined) result.thinkingProvider = cfg.thinkingProvider;
  if (cfg.multiModelEnabled && cfg.thinkingModel !== undefined) result.thinkingModel = cfg.thinkingModel;
  if (cfg.thinkingLocalUrl !== undefined) result.thinkingLocalUrl = cfg.thinkingLocalUrl;

  const providerKey = cfg.providerKeys?.[cfg.aiProvider || ""] || cfg.apiKey;
  if (providerKey !== undefined) result.apiKey = providerKey;
  if (cfg.temperature !== undefined) result.temperature = cfg.temperature;
  if (cfg.maxTokens !== undefined) result.maxTokens = cfg.maxTokens;

  return result;
}

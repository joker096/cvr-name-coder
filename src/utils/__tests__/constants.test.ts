import { describe, it, expect } from "vitest";
import {
  PROVIDER_DEFAULT_MODELS,
  PROVIDER_BASE_URLS,
  AI_PROVIDERS,
  DEFAULT_CHAT_CONFIG,
} from "../constants";

describe("PROVIDER_DEFAULT_MODELS", () => {
  it("should have default models for all cloud providers", () => {
    expect(PROVIDER_DEFAULT_MODELS.gemini).toBe("gemini-2.5-flash");
    expect(PROVIDER_DEFAULT_MODELS.openai).toBe("gpt-4.1");
    expect(PROVIDER_DEFAULT_MODELS.anthropic).toBe("claude-sonnet-4-20250514");
    expect(PROVIDER_DEFAULT_MODELS.deepseek).toBe("deepseek-chat");
    expect(PROVIDER_DEFAULT_MODELS.grok).toBe("grok-3");
    expect(PROVIDER_DEFAULT_MODELS.groq).toBe("meta-llama/llama-4-maverick-17b-128e-instruct");
    expect(PROVIDER_DEFAULT_MODELS.baseten).toBe("meta-llama-4-maverick");
    expect(PROVIDER_DEFAULT_MODELS.openrouter).toBe("google/gemini-2.5-flash");
    expect(PROVIDER_DEFAULT_MODELS.together).toBe("meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8");
    expect(PROVIDER_DEFAULT_MODELS.mistral).toBe("mistral-large-latest");
  });

  it("should have default models for local and custom", () => {
    expect(PROVIDER_DEFAULT_MODELS.local).toBe("local-model");
    expect(PROVIDER_DEFAULT_MODELS.custom).toBe("custom-model");
  });

  it("should have all 12 providers", () => {
    const expected = ["gemini", "openai", "anthropic", "deepseek", "grok", "groq", "baseten", "openrouter", "together", "mistral", "local", "custom"];
    expect(Object.keys(PROVIDER_DEFAULT_MODELS).sort()).toEqual(expected.sort());
  });
});

describe("PROVIDER_BASE_URLS", () => {
  it("should have base URLs for all OpenAI-compatible cloud providers", () => {
    expect(PROVIDER_BASE_URLS.openai).toBe("https://api.openai.com/v1");
    expect(PROVIDER_BASE_URLS.deepseek).toBe("https://api.deepseek.com");
    expect(PROVIDER_BASE_URLS.grok).toBe("https://api.x.ai/v1");
    expect(PROVIDER_BASE_URLS.mistral).toBe("https://api.mistral.ai/v1");
    expect(PROVIDER_BASE_URLS.openrouter).toBe("https://openrouter.ai/api/v1");
    expect(PROVIDER_BASE_URLS.together).toBe("https://api.together.xyz/v1");
    expect(PROVIDER_BASE_URLS.baseten).toBe("https://api.baseten.co/v1");
  });

  it("should have groq base URL", () => {
    expect(PROVIDER_BASE_URLS.groq).toBe("https://api.groq.com/openai/v1");
  });

  it("should have exactly 8 entries (all OpenAI-compatible cloud providers)", () => {
    expect(Object.keys(PROVIDER_BASE_URLS)).toHaveLength(8);
  });

  it("should not include gemini, anthropic, local, or custom", () => {
    expect(PROVIDER_BASE_URLS).not.toHaveProperty("gemini");
    expect(PROVIDER_BASE_URLS).not.toHaveProperty("anthropic");
    expect(PROVIDER_BASE_URLS).not.toHaveProperty("local");
    expect(PROVIDER_BASE_URLS).not.toHaveProperty("custom");
  });

  it("should have valid HTTPS URLs for all entries", () => {
    for (const [provider, url] of Object.entries(PROVIDER_BASE_URLS)) {
      expect(url, `${provider} URL should start with https://`).toMatch(/^https:\/\//);
    }
  });
});

describe("AI_PROVIDERS", () => {
  it("should have 12 providers", () => {
    expect(AI_PROVIDERS).toHaveLength(12);
  });

  it("should have valid provider IDs matching PROVIDER_DEFAULT_MODELS", () => {
    const providerIds = AI_PROVIDERS.map((p) => p.id).sort();
    const modelIds = Object.keys(PROVIDER_DEFAULT_MODELS).sort();
    expect(providerIds).toEqual(modelIds);
  });

  it("should classify local differently from cloud", () => {
    const local = AI_PROVIDERS.find((p) => p.id === "local");
    const cloud = AI_PROVIDERS.find((p) => p.id === "openai");
    expect(local?.type).toBe("local");
    expect(cloud?.type).toBe("cloud");
  });

  it("should set correct requiresApiKey flags", () => {
    for (const p of AI_PROVIDERS) {
      if (p.id === "local") {
        expect(p.requiresApiKey).toBe(false);
      } else {
        expect(p.requiresApiKey).toBe(true);
      }
    }
  });

  it("should set requiresUrl only for local and custom", () => {
    for (const p of AI_PROVIDERS) {
      if (p.id === "local" || p.id === "custom") {
        expect(p.requiresUrl).toBe(true);
      } else {
        expect(p.requiresUrl).toBe(false);
      }
    }
  });

  it("should have unique provider IDs", () => {
    const ids = AI_PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have non-empty names for all providers", () => {
    for (const p of AI_PROVIDERS) {
      expect(p.name.length).toBeGreaterThan(0);
    }
  });
});

describe("DEFAULT_CHAT_CONFIG", () => {
  it("should default to local provider with llama3", () => {
    expect(DEFAULT_CHAT_CONFIG.aiProvider).toBe("local");
    expect(DEFAULT_CHAT_CONFIG.aiModel).toBe("llama3");
    expect(DEFAULT_CHAT_CONFIG.localModelName).toBe("llama3");
    expect(DEFAULT_CHAT_CONFIG.localUrl).toBe("http://localhost:11434/v1");
  });
});

import { describe, it, expect } from "vitest";

const envVarForProvider = (provider: string): string => {
  const map: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    grok: "XAI_API_KEY",
    groq: "GROQ_API_KEY",
    baseten: "BASETEN_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    together: "TOGETHER_API_KEY",
    mistral: "MISTRAL_API_KEY",
    custom: "CUSTOM_API_KEY",
  };
  return map[provider] || "";
};

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com",
  grok: "https://api.x.ai/v1",
  groq: "https://api.groq.com/openai/v1",
  baseten: "https://api.baseten.co/v1",
  openrouter: "https://openrouter.ai/api/v1",
  together: "https://api.together.xyz/v1",
  mistral: "https://api.mistral.ai/v1",
};

describe("envVarForProvider", () => {
  it("should return correct env var for all cloud providers", () => {
    expect(envVarForProvider("openai")).toBe("OPENAI_API_KEY");
    expect(envVarForProvider("deepseek")).toBe("DEEPSEEK_API_KEY");
    expect(envVarForProvider("grok")).toBe("XAI_API_KEY");
    expect(envVarForProvider("groq")).toBe("GROQ_API_KEY");
    expect(envVarForProvider("baseten")).toBe("BASETEN_API_KEY");
    expect(envVarForProvider("openrouter")).toBe("OPENROUTER_API_KEY");
    expect(envVarForProvider("together")).toBe("TOGETHER_API_KEY");
    expect(envVarForProvider("mistral")).toBe("MISTRAL_API_KEY");
    expect(envVarForProvider("custom")).toBe("CUSTOM_API_KEY");
  });

  it("should return empty string for unknown provider", () => {
    expect(envVarForProvider("unknown")).toBe("");
    expect(envVarForProvider("")).toBe("");
  });

  it("should return empty string for gemini (not in map)", () => {
    expect(envVarForProvider("gemini")).toBe("");
  });

  it("should return empty string for anthropic (not in map)", () => {
    expect(envVarForProvider("anthropic")).toBe("");
  });

  it("should return empty string for local (not in map)", () => {
    expect(envVarForProvider("local")).toBe("");
  });
});

describe("PROVIDER_BASE_URLS", () => {
  it("should have groq entry", () => {
    expect(PROVIDER_BASE_URLS.groq).toBeDefined();
    expect(PROVIDER_BASE_URLS.groq).toBe("https://api.groq.com/openai/v1");
  });

  it("should have all OpenAI-compatible providers", () => {
    const expected = ["openai", "deepseek", "grok", "groq", "baseten", "openrouter", "together", "mistral"];
    expect(Object.keys(PROVIDER_BASE_URLS).sort()).toEqual(expected.sort());
  });

  it("should have valid base URLs that when joined produce correct API paths", () => {
    for (const [provider, url] of Object.entries(PROVIDER_BASE_URLS)) {
      const chatUrl = `${url.replace(/\/$/, "")}/chat/completions`;
      expect(chatUrl).toMatch(/^https:\/\/.*\/chat\/completions$/);
    }
  });
});

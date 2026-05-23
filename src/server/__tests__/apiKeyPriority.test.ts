import { describe, it, expect } from "vitest";

interface ChatConfig {
  aiProvider?: string;
  apiKey?: string;
  providerKeys?: Record<string, string>;
  localUrl?: string;
  aiModel?: string;
  localModelName?: string;
}

/**
 * Current production logic from src/server/routes/chat.ts line 145
 * This directly destructures apiKey from config, ignoring providerKeys.
 */
function getApiKeyLegacy(config: ChatConfig): string | undefined {
  return config.apiKey;
}

/**
 * Corrected logic that should prioritize providerKeys[provider] over legacy apiKey.
 * This matches what buildDualConfig does (chat.ts lines 39-53).
 */
function getApiKeyCorrect(config: ChatConfig): string | undefined {
  const provider = config.aiProvider || "";
  return config.providerKeys?.[provider] || config.apiKey;
}

describe("API key resolution priority", () => {
  describe("current buggy behavior (legacy apiKey only)", () => {
    it("returns undefined when apiKey is empty", () => {
      const config: ChatConfig = {
        aiProvider: "baseten",
        providerKeys: { baseten: "correct-key" },
      };
      expect(getApiKeyLegacy(config)).toBeUndefined();
    });

    it("returns wrong key when legacy apiKey is from another provider", () => {
      const config: ChatConfig = {
        aiProvider: "baseten",
        apiKey: "old-openai-key",
        providerKeys: { baseten: "correct-baseten-key" },
      };
      // BUG: returns "old-openai-key" instead of "correct-baseten-key"
      expect(getApiKeyLegacy(config)).toBe("old-openai-key");
    });
  });

  describe("correct behavior (providerKeys priority)", () => {
    it("uses providerKeys[provider] when available", () => {
      const config: ChatConfig = {
        aiProvider: "baseten",
        apiKey: "old-key",
        providerKeys: { baseten: "correct-baseten-key" },
      };
      expect(getApiKeyCorrect(config)).toBe("correct-baseten-key");
    });

    it("falls back to legacy apiKey when providerKeys missing", () => {
      const config: ChatConfig = {
        aiProvider: "deepseek",
        apiKey: "fallback-key",
      };
      expect(getApiKeyCorrect(config)).toBe("fallback-key");
    });

    it("falls back to legacy apiKey when providerKeys has no entry for provider", () => {
      const config: ChatConfig = {
        aiProvider: "groq",
        apiKey: "fallback-key",
        providerKeys: { openai: "openai-key" },
      };
      expect(getApiKeyCorrect(config)).toBe("fallback-key");
    });

    it("prefers provider-specific key for all cloud providers", () => {
      const providers = [
        "openai",
        "deepseek",
        "grok",
        "groq",
        "baseten",
        "openrouter",
        "together",
        "mistral",
      ];

      for (const provider of providers) {
        const config: ChatConfig = {
          aiProvider: provider,
          apiKey: "legacy-key",
          providerKeys: { [provider]: `specific-${provider}-key` },
        };
        expect(getApiKeyCorrect(config)).toBe(`specific-${provider}-key`);
      }
    });

    it("returns empty string when both keys are missing", () => {
      const config: ChatConfig = {
        aiProvider: "openai",
      };
      expect(getApiKeyCorrect(config)).toBeUndefined();
    });
  });
});

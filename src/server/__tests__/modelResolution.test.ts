import { describe, it, expect } from "vitest";

function resolveModelForSummarization(
  provider: string,
  aiModel: string | undefined,
  localModelName: string | undefined
): string | undefined {
  return provider === "local"
    ? (localModelName || aiModel)
    : aiModel;
}

describe("resolveModelForSummarization", () => {
  it("should use localModelName for local provider", () => {
    const result = resolveModelForSummarization("local", "gemini-2.5-flash", "llama3");
    expect(result).toBe("llama3");
  });

  it("should use aiModel for local provider when localModelName is empty", () => {
    const result = resolveModelForSummarization("local", "llama3", undefined);
    expect(result).toBe("llama3");
  });

  it("should use aiModel for cloud provider (openai)", () => {
    const result = resolveModelForSummarization("openai", "gpt-4.1", "llama3");
    expect(result).toBe("gpt-4.1");
  });

  it("should use aiModel for cloud provider (gemini)", () => {
    const result = resolveModelForSummarization("gemini", "gemini-2.5-flash", "llama3");
    expect(result).toBe("gemini-2.5-flash");
  });

  it("should use aiModel for cloud provider even if localModelName is set", () => {
    const result = resolveModelForSummarization("mistral", "mistral-large-latest", "llama3");
    expect(result).toBe("mistral-large-latest");
  });

  it("should handle both undefined", () => {
    const result = resolveModelForSummarization("local", undefined, undefined);
    expect(result).toBeUndefined();
  });

  it("should handle both undefined for cloud provider", () => {
    const result = resolveModelForSummarization("openai", undefined, undefined);
    expect(result).toBeUndefined();
  });

  it("should handle all cloud providers consistently", () => {
    const providers = ["openai", "deepseek", "grok", "groq", "baseten", "openrouter", "together", "mistral", "gemini", "anthropic"];
    for (const provider of providers) {
      const result = resolveModelForSummarization(provider, "cloud-model", "local-model");
      expect(result).toBe("cloud-model");
    }
  });
});

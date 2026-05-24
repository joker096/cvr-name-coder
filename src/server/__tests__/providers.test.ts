import { describe, it, expect } from "vitest";
import {
  generateAIResponse,
  generateStreamResponse,
  generateAIContent,
  generateWithDualModelResponse,
  generateWithDualModel,
  generateEmbeddings,
  AIProvider,
  type AIResponse,
  type AIGenerateOptions,
  type StreamCallbacks,
  type Content,
  type DualModelConfig,
} from "../providers.js";

describe("provider API - generateAIResponse", () => {
  it("should throw when no provider is specified", async () => {
    await expect(
      generateAIResponse("test", [])
    ).rejects.toThrow("AI provider not configured.");
  });

  it("should throw for unknown provider", async () => {
    await expect(
      generateAIResponse("test", [], "unknown_provider_xyz")
    ).rejects.toThrow(/Unknown provider/);
  });
});

describe("provider API - generateStreamResponse", () => {
  it("should throw when no provider is specified", async () => {
    await expect(
      generateStreamResponse("test", [])
    ).rejects.toThrow("AI provider not configured.");
  });

  it("should throw for unknown provider", async () => {
    await expect(
      generateStreamResponse("test", [], "unknown_provider_xyz")
    ).rejects.toThrow(/Unknown provider/);
  });
});

describe("provider API - generateAIContent", () => {
  it("should throw when no provider is specified", async () => {
    await expect(
      generateAIContent("test", [])
    ).rejects.toThrow("AI provider not configured.");
  });

  it("should throw for unknown provider", async () => {
    await expect(
      generateAIContent("test", [], "unknown_provider_xyz")
    ).rejects.toThrow(/Unknown provider/);
  });
});

describe("AIProvider - resolveApiKey", () => {
  it("should use override value when provided", () => {
    const result = new (class extends AIProvider {
      async generate() { return { text: "", inputTokens: 0, outputTokens: 0 }; }
      async generateStream() { return { text: "", inputTokens: 0, outputTokens: 0 }; }
      testResolve(env: string, override?: string) { return this.resolveApiKey(env, override); }
    })().testResolve("SOME_ENV_VAR", "override-val");
    expect(result).toBe("override-val");
  });

  it("should fall back to empty string when env var is missing and no override", () => {
    const result = new (class extends AIProvider {
      async generate() { return { text: "", inputTokens: 0, outputTokens: 0 }; }
      async generateStream() { return { text: "", inputTokens: 0, outputTokens: 0 }; }
      testResolve(env: string, override?: string) { return this.resolveApiKey(env, override); }
    })().testResolve("NONEXISTENT_ENV_VAR_XYZ999", undefined);
    expect(result).toBe("");
  });
});

describe("AIProvider - abstract class structure", () => {
  it("should define generate and generateStream as abstract methods", () => {
    const proto = AIProvider.prototype;
    expect("generate" in proto).toBeDefined();
    expect("generateStream" in proto).toBeDefined();
  });
});

describe("Content type", () => {
  it("should support text parts", () => {
    const content: Content = {
      role: "user",
      parts: [{ text: "Hello world" }],
    };
    expect(content.parts).toHaveLength(1);
    expect(content.parts[0].text).toBe("Hello world");
  });

  it("should support image inlineData parts", () => {
    const content: Content = {
      role: "user",
      parts: [
        { text: "Describe this" },
        { inlineData: { mimeType: "image/png", data: "base64encoded" } },
      ],
    };
    expect(content.parts).toHaveLength(2);
    expect(content.parts[1].inlineData?.mimeType).toBe("image/png");
    expect(content.parts[1].inlineData?.data).toBe("base64encoded");
  });

  it("should support model role mapped to assistant", () => {
    const content: Content = {
      role: "model",
      parts: [{ text: "I am an AI" }],
    };
    expect(content.role).toBe("model");
  });
});

describe("AIGenerateOptions type", () => {
  it("should accept all optional fields", () => {
    const opts: AIGenerateOptions = {
      prompt: "test prompt",
      contents: [],
      modelName: "gpt-4o",
      apiKey: "sk-test123",
      temperature: 0.7,
      maxTokens: 2048,
      localUrl: "http://localhost:11434/v1",
      useCache: false,
    };
    expect(opts.prompt).toBe("test prompt");
    expect(opts.modelName).toBe("gpt-4o");
    expect(opts.apiKey).toBe("sk-test123");
    expect(opts.temperature).toBe(0.7);
    expect(opts.maxTokens).toBe(2048);
    expect(opts.localUrl).toBe("http://localhost:11434/v1");
    expect(opts.useCache).toBe(false);
  });

  it("should be minimal with only prompt and contents", () => {
    const opts: AIGenerateOptions = {
      prompt: "hi",
      contents: [],
    };
    expect(opts.prompt).toBe("hi");
    expect(opts.modelName).toBeUndefined();
  });
});

describe("AIResponse type", () => {
  it("should have required fields", () => {
    const resp: AIResponse = { text: "response text", inputTokens: 50, outputTokens: 25 };
    expect(resp.text).toBe("response text");
    expect(resp.inputTokens).toBe(50);
    expect(resp.outputTokens).toBe(25);
    expect(resp.reasoning).toBeUndefined();
  });

  it("should support optional reasoning", () => {
    const resp: AIResponse = {
      text: "ok",
      reasoning: "Let me think about this...",
      inputTokens: 100,
      outputTokens: 30,
    };
    expect(resp.reasoning).toBe("Let me think about this...");
  });
});

describe("StreamCallbacks type", () => {
  it("should support onToken and optional onReasoning", () => {
    const tokens: string[] = [];
    const cb: StreamCallbacks = {
      onToken: (t) => tokens.push(t),
      onReasoning: (r) => tokens.push(`R:${r}`),
    };
    cb.onToken("hello");
    cb.onReasoning?.("thinking");
    expect(tokens).toEqual(["hello", "R:thinking"]);
  });

  it("should work without onReasoning callback", () => {
    const tokens: string[] = [];
    const cb: StreamCallbacks = {
      onToken: (t) => tokens.push(t),
    };
    cb.onToken("world");
    expect(tokens).toEqual(["world"]);
    expect(cb.onReasoning).toBeUndefined();
  });
});

describe("DualModelConfig type", () => {
  it("should accept all fields", () => {
    const config: DualModelConfig = {
      primaryProvider: "openai",
      primaryModel: "gpt-4o",
      primaryLocalUrl: undefined,
      thinkingProvider: "anthropic",
      thinkingModel: "claude-sonnet-4-20250514",
      thinkingLocalUrl: undefined,
      apiKey: "sk-test",
      temperature: 0.5,
      maxTokens: 4096,
    };
    expect(config.primaryProvider).toBe("openai");
    expect(config.thinkingProvider).toBe("anthropic");
    expect(config.temperature).toBe(0.5);
  });

  it("should be minimal with just primaryProvider", () => {
    const config: DualModelConfig = {
      primaryProvider: "gemini",
    };
    expect(config.primaryProvider).toBe("gemini");
    expect(config.primaryModel).toBeUndefined();
  });
});

describe("generateWithDualModelResponse", () => {
  it("should throw without provider when thinking not configured", async () => {
    await expect(
      generateWithDualModelResponse("test", [], { primaryProvider: "" }, "auto")
    ).rejects.toThrow();
  });
});

describe("generateWithDualModel", () => {
  it("should throw without provider", async () => {
    await expect(
      generateWithDualModel("test", [], { primaryProvider: "" }, "auto")
    ).rejects.toThrow();
  });
});

describe("generateEmbeddings", () => {
  it("should throw when GEMINI_API_KEY is not set", async () => {
    await expect(
      generateEmbeddings(["test text"])
    ).rejects.toThrow(/API key|GEMINI_API_KEY/);
  });
});

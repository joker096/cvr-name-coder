import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();
(global as any).fetch = mockFetch;

async function validateKey(provider: string, apiKey: string) {
  if (!provider || !apiKey) {
    return { valid: false, error: "provider and apiKey required" };
  }

  const PROVIDER_VALIDATION_URLS: Record<string, string> = {
    openai: "https://api.openai.com/v1/models",
    deepseek: "https://api.deepseek.com/v1/models",
    grok: "https://api.x.ai/v1/models",
    groq: "https://api.groq.com/openai/v1/models",
    baseten: "https://api.baseten.co/v1/models",
    openrouter: "https://openrouter.ai/api/v1/models",
    together: "https://api.together.xyz/v1/models",
    mistral: "https://api.mistral.ai/v1/models",
  };

  try {
    if (provider === "gemini") {
      const r = await mockFetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
      if (r.ok) return { valid: true };
      const d = await r.json().catch(() => ({}));
      return { valid: false, error: d.error?.message || `HTTP ${r.status}` };
    }

    if (provider === "anthropic") {
      const r = await mockFetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-3-haiku-20240307", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
      });
      if (r.ok) return { valid: true };
      const d = await r.json().catch(() => ({}));
      const err = d.error?.message || `HTTP ${r.status}`;
      if (d.error?.type === "authentication_error") return { valid: false, error: err };
      if (r.status === 401 || r.status === 403) return { valid: false, error: err };
      return { valid: true };
    }

    const baseUrl = PROVIDER_VALIDATION_URLS[provider];
    if (baseUrl) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const r = await mockFetch(baseUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (r.ok) return { valid: true };
        if (r.status === 401 || r.status === 403) return { valid: false, error: `HTTP ${r.status} — key rejected` };
        return { valid: true, warning: `HTTP ${r.status}` };
      } catch (e: any) {
        clearTimeout(timeout);
        if (e.name === "AbortError") return { valid: false, error: "Timeout" };
        throw e;
      }
    }

    return { valid: false, error: `Unknown provider: ${provider}` };
  } catch (e: any) {
    return { valid: false, error: e.message || "Network error" };
  }
}

describe("validateKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("input validation", () => {
    it("should reject missing provider", async () => {
      const result = await validateKey("", "test-key");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("required");
    });

    it("should reject missing apiKey", async () => {
      const result = await validateKey("openai", "");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("required");
    });

    it("should reject unknown provider", async () => {
      const result = await validateKey("nonexistent", "test-key");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unknown provider");
    });
  });

  describe("OpenAI-compatible providers (Bearer auth)", () => {
    it("should validate valid key for OpenAI", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const result = await validateKey("openai", "sk-valid");
      expect(result.valid).toBe(true);
    });

    it("should reject 401 for OpenAI", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
      const result = await validateKey("openai", "sk-invalid");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("rejected");
    });

    it("should reject 403 for OpenAI", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
      const result = await validateKey("openai", "sk-forbidden");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("rejected");
    });

    it("should validate valid key for Mistral", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const result = await validateKey("mistral", "valid-mistral-key");
      expect(result.valid).toBe(true);
    });

    it("should reject 401 for Mistral", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
      const result = await validateKey("mistral", "invalid-key");
      expect(result.valid).toBe(false);
    });

    it("should validate valid key for DeepSeek", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const result = await validateKey("deepseek", "sk-valid");
      expect(result.valid).toBe(true);
    });

    it("should validate valid key for Grok", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const result = await validateKey("grok", "xai-valid");
      expect(result.valid).toBe(true);
    });

    it("should validate valid key for Groq", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const result = await validateKey("groq", "gsk-valid");
      expect(result.valid).toBe(true);
    });

    it("should validate valid key for OpenRouter", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const result = await validateKey("openrouter", "sk-or-valid");
      expect(result.valid).toBe(true);
    });

    it("should validate valid key for Together", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const result = await validateKey("together", "valid-together-key");
      expect(result.valid).toBe(true);
    });

    it("should validate valid key for Baseten", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const result = await validateKey("baseten", "valid-baseten-key");
      expect(result.valid).toBe(true);
    });

    it("should pass Bearer auth header for OpenAI-compatible providers", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      await validateKey("openai", "sk-test");
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBe("Bearer sk-test");
    });

    it("should pass Bearer auth header for Mistral", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      await validateKey("mistral", "mistral-key-abc");
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBe("Bearer mistral-key-abc");
    });
  });

  describe("Gemini provider", () => {
    it("should validate valid Gemini key", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const result = await validateKey("gemini", "valid-gemini-key");
      expect(result.valid).toBe(true);
    });

    it("should reject invalid Gemini key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: "API key not valid" } }),
      });
      const result = await validateKey("gemini", "invalid-key");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not valid");
    });

    it("should use query parameter auth for Gemini", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      await validateKey("gemini", "gemini-key-123");
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("key=gemini-key-123");
    });
  });

  describe("Anthropic provider", () => {
    it("should validate valid Anthropic key", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const result = await validateKey("anthropic", "sk-ant-valid");
      expect(result.valid).toBe(true);
    });

    it("should reject Anthropic authentication error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { type: "authentication_error", message: "Invalid API key" } }),
      });
      const result = await validateKey("anthropic", "bad-key");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid API key");
    });

    it("should use x-api-key header for Anthropic", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      await validateKey("anthropic", "sk-ant-test");
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["x-api-key"]).toBe("sk-ant-test");
      expect(callArgs[1].headers["anthropic-version"]).toBe("2023-06-01");
    });

    it("should treat non-auth Anthropic errors as valid", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) });
      const result = await validateKey("anthropic", "sk-ant-test");
      expect(result.valid).toBe(true);
    });
  });

  describe("timeout handling", () => {
    it("should return error on timeout", async () => {
      mockFetch.mockRejectedValueOnce(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
      const result = await validateKey("openai", "sk-test");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Timeout");
    });
  });

  describe("network errors", () => {
    it("should handle fetch rejection", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));
      const result = await validateKey("openai", "sk-test");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Connection refused");
    });
  });
});

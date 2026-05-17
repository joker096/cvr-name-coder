import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAIProviders } from "../useAIProviders";

global.fetch = vi.fn();

describe("useAIProviders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all providers", () => {
    const { result } = renderHook(() => useAIProviders());

    expect(result.current.providers).toHaveLength(8);
    expect(result.current.providers[0].id).toBe("gemini");
    expect(result.current.providers[1].id).toBe("openai");
  });

  it("should get provider by id", () => {
    const { result } = renderHook(() => useAIProviders());

    const provider = result.current.getProviderById("gemini");

    expect(provider).toBeDefined();
    expect(provider?.id).toBe("gemini");
    expect(provider?.name).toBe("Google Gemini");
  });

  it("should return undefined for non-existent provider", () => {
    const { result } = renderHook(() => useAIProviders());

    const provider = result.current.getProviderById("nonexistent");

    expect(provider).toBeUndefined();
  });

  it("should get models for provider", () => {
    const { result } = renderHook(() => useAIProviders());

    const models = result.current.getModelsForProvider("gemini");

    expect(models).toHaveLength(3);
    expect(models[0].id).toBe("gemini-2.5-pro");
    expect(models[1].id).toBe("gemini-2.0-flash");
  });

  it("should return empty models for local provider", () => {
    const { result } = renderHook(() => useAIProviders());

    const models = result.current.getModelsForProvider("local");

    expect(models).toHaveLength(0);
  });

  it("should detect local models successfully", async () => {
    const mockModels = [
      { name: "llama2-7b" },
      { name: "llama2-13b" },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ models: mockModels }),
    });

    const { result } = renderHook(() => useAIProviders());

    act(async () => {
      const models = await result.current.detectLocalModels("http://localhost:11434");
      expect(models).toHaveLength(2);
      expect(models[0].id).toBe("llama2-7b");
      expect(result.current.detectedModels).toHaveLength(2);
    });
  });

  it("should handle detection error", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAIProviders());

    await act(async () => {
      await expect(
        result.current.detectLocalModels("http://localhost:11434")
      ).rejects.toThrow("Network error");
    });

    expect(result.current.error).toBe("Network error");
  });

  it("should handle detection timeout", async () => {
    (global.fetch as any).mockImplementation(() =>
      new Promise((resolve) => setTimeout(resolve, 10000))
    );

    const { result } = renderHook(() => useAIProviders());

    await act(async () => {
      await expect(
        result.current.detectLocalModels("http://localhost:11434")
      ).rejects.toThrow();
    });

    expect(result.current.error).toBeTruthy();
  });

  it("should test connection for local provider successfully", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      statusText: "OK",
    });

    const { result } = renderHook(() => useAIProviders());

    act(async () => {
      const success = await result.current.testConnection("local", {
        url: "http://localhost:11434",
      });
      expect(success).toBe(true);
    });
  });

  it("should fail connection test for local provider without URL", async () => {
    const { result } = renderHook(() => useAIProviders());

    await act(async () => {
      await expect(
        result.current.testConnection("local", {})
      ).rejects.toThrow("URL is required for this provider");
    });
  });

  it("should fail connection test for provider without API key", async () => {
    const { result } = renderHook(() => useAIProviders());

    await act(async () => {
      await expect(
        result.current.testConnection("gemini", {})
      ).rejects.toThrow("API key is required for this provider");
    });
  });

  it("should pass connection test for provider with API key", async () => {
    const { result } = renderHook(() => useAIProviders());

    act(async () => {
      const success = await result.current.testConnection("gemini", {
        apiKey: "test-key",
      });
      expect(success).toBe(true);
    });
  });

  it("should handle connection test failure", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: "Unauthorized",
    });

    const { result } = renderHook(() => useAIProviders());

    await act(async () => {
      await expect(
        result.current.testConnection("local", {
          url: "http://localhost:11434",
        })
      ).rejects.toThrow("Connection failed: Unauthorized");
    });
  });

  it("should set isDetecting during operations", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    });

    const { result } = renderHook(() => useAIProviders());

    expect(result.current.isDetecting).toBe(false);

    const promise = result.current.detectLocalModels("http://localhost:11434");
    expect(result.current.isDetecting).toBe(true);

    await promise;
    expect(result.current.isDetecting).toBe(false);
  });
});

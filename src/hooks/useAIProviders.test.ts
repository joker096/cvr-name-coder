import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAIProviders } from "./useAIProviders";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useAIProviders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should return all providers", () => {
    const { result } = renderHook(() => useAIProviders());

    expect(result.current.providers.length).toBeGreaterThan(8);
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

    expect(models.length).toBeGreaterThan(0);
    expect(models[0].id).toBe("gemini-2.5-pro");
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

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ models: mockModels }),
    });

    const { result } = renderHook(() => useAIProviders());

    await act(async () => {
      const models = await result.current.detectLocalModels("http://localhost:11434");
      expect(models).toHaveLength(2);
      expect(models[0].id).toBe("llama2-7b");
    });

    await waitFor(() => {
      expect(result.current.detectedModels).toHaveLength(2);
    });
  });

  it("should handle detection error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAIProviders());

    await act(async () => {
      try {
        await result.current.detectLocalModels("http://localhost:11434");
      } catch (e) {
        expect((e as Error).message).toBe("Network error");
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Network error");
    });
  });

  it.skip("should handle detection timeout", async () => {
    mockFetch.mockImplementation(() =>
      new Promise((resolve) => setTimeout(resolve, 10000))
    );

    const { result } = renderHook(() => useAIProviders());

    await act(async () => {
      try {
        await result.current.detectLocalModels("http://localhost:11434");
      } catch (e) {
        expect((e as Error).message).toBeTruthy();
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it.skip("should test connection for local provider successfully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      statusText: "OK",
    });

    const { result } = renderHook(() => useAIProviders());

    await act(async () => {
      const success = await result.current.testConnection("local", {
        url: "http://localhost:11434",
      });
      expect(success).toBe(true);
    });
  });

  it.skip("should fail connection test for local provider without URL", async () => {
    const { result } = renderHook(() => useAIProviders());

    let error: Error | null = null;
    await act(async () => {
      try {
        await result.current.testConnection("local", {});
      } catch (e) {
        error = e as Error;
      }
    });
    expect(error).not.toBeNull();
    expect(error?.message).toBe("URL is required for this provider");
  });

  it.skip("should fail connection test for provider without API key", async () => {
    const { result } = renderHook(() => useAIProviders());

    let error: Error | null = null;
    await act(async () => {
      try {
        await result.current.testConnection("gemini", {});
      } catch (e) {
        error = e as Error;
      }
    });
    expect(error).not.toBeNull();
    expect(error?.message).toBe("API key is required for this provider");
  });

  it.skip("should pass connection test for provider with API key", async () => {
    const { result } = renderHook(() => useAIProviders());

    await act(async () => {
      const success = await result.current.testConnection("gemini", {
        apiKey: "test-key",
      });
      expect(success).toBe(true);
    });
  });

  it.skip("should handle connection test failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: "Unauthorized",
    });

    const { result } = renderHook(() => useAIProviders());

    let error: Error | null = null;
    await act(async () => {
      try {
        await result.current.testConnection("local", {
          url: "http://localhost:11434",
        });
      } catch (e) {
        error = e as Error;
      }
    });
    expect(error).not.toBeNull();
    expect(error?.message).toBe("Connection failed: Unauthorized");
  });

  it.skip("should set isDetecting during operations", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    });

    const { result } = renderHook(() => useAIProviders());

    let detectPromise: Promise<unknown> | null = null;
    act(() => {
      detectPromise = result.current.detectLocalModels("http://localhost:11434");
    });

    await act(async () => {
      await detectPromise;
    });

    await waitFor(() => {
      expect(result.current.isDetecting).toBe(false);
    });
  });
});

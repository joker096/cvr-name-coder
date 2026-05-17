import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAutoDetect } from "../useAutoDetect";

global.fetch = vi.fn();

describe("useAutoDetect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with empty detected servers", () => {
    const { result } = renderHook(() => useAutoDetect());

    expect(result.current.detectedServers).toEqual([]);
    expect(result.current.isScanning).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should scan default servers", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: "llama2-7b" },
          { name: "llama2-13b" },
        ],
      }),
    });

    const { result } = renderHook(() => useAutoDetect());

    act(async () => {
      const servers = await result.current.scanServers();
      expect(servers).toHaveLength(3);
      expect(servers[0].status).toBe("online");
      expect(servers[0].models).toHaveLength(2);
    });
  });

  it("should scan custom servers", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    });

    const { result } = renderHook(() => useAutoDetect());

    act(async () => {
      const servers = await result.current.scanServers([
        "http://localhost:9999",
      ]);
      expect(servers).toHaveLength(1);
      expect(servers[0].url).toBe("http://localhost:9999");
    });
  });

  it("should handle offline server", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Connection refused"));

    const { result } = renderHook(() => useAutoDetect());

    act(async () => {
      const servers = await result.current.scanServers([
        "http://localhost:9999",
      ]);
      expect(servers).toHaveLength(1);
      expect(servers[0].status).toBe("offline");
    });
  });

  it("should handle server error", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: "Internal Server Error",
    });

    const { result } = renderHook(() => useAutoDetect());

    act(async () => {
      const servers = await result.current.scanServers([
        "http://localhost:9999",
      ]);
      expect(servers).toHaveLength(1);
      expect(servers[0].status).toBe("error");
    });
  });

  it("should measure latency", async () => {
    (global.fetch as any).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ models: [] }),
              }),
            100
          )
        )
    );

    const { result } = renderHook(() => useAutoDetect());

    act(async () => {
      const servers = await result.current.scanServers([
        "http://localhost:9999",
      ]);
      expect(servers[0].latency).toBeGreaterThanOrEqual(100);
    });
  });

  it("should scan single server", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: "llama2-7b" }],
      }),
    });

    const { result } = renderHook(() => useAutoDetect());

    act(async () => {
      const server = await result.current.scanSingleServer("http://localhost:9999");
      expect(server.url).toBe("http://localhost:9999");
      expect(server.status).toBe("online");
      expect(result.current.detectedServers).toHaveLength(1);
    });
  });

  it("should update existing server when scanning single", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: "llama2-7b" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: "llama2-13b" }] }),
      });

    const { result } = renderHook(() => useAutoDetect());

    act(async () => {
      await result.current.scanSingleServer("http://localhost:9999");
      expect(result.current.detectedServers[0].models).toHaveLength(1);

      await result.current.scanSingleServer("http://localhost:9999");
      expect(result.current.detectedServers).toHaveLength(1);
    });
  });

  it("should get online servers", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      })
      .mockRejectedValueOnce(new Error("Connection refused"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });

    const { result } = renderHook(() => useAutoDetect());

    act(async () => {
      await result.current.scanServers([
        "http://localhost:9999",
        "http://localhost:8888",
        "http://localhost:7777",
      ]);

      const onlineServers = result.current.getOnlineServers();
      expect(onlineServers).toHaveLength(2);
    });
  });

  it("should get server by URL", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    });

    const { result } = renderHook(() => useAutoDetect());

    act(async () => {
      await result.current.scanServers([
        "http://localhost:9999",
        "http://localhost:8888",
      ]);

      const server = result.current.getServerByUrl("http://localhost:9999");
      expect(server).toBeDefined();
      expect(server?.url).toBe("http://localhost:9999");

      const notFound = result.current.getServerByUrl("http://localhost:7777");
      expect(notFound).toBeUndefined();
    });
  });

  it("should clear results", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    });

    const { result } = renderHook(() => useAutoDetect());

    act(async () => {
      await result.current.scanServers(["http://localhost:9999"]);
      expect(result.current.detectedServers).toHaveLength(1);

      result.current.clearResults();
      expect(result.current.detectedServers).toHaveLength(0);
      expect(result.current.error).toBe(null);
    });
  });

  it("should set isScanning during operations", async () => {
    (global.fetch as any).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ models: [] }),
              }),
            100
          )
        )
    );

    const { result } = renderHook(() => useAutoDetect());

    expect(result.current.isScanning).toBe(false);

    const promise = result.current.scanServers(["http://localhost:9999"]);
    expect(result.current.isScanning).toBe(true);

    await promise;
    expect(result.current.isScanning).toBe(false);
  });

  it("should handle scan error", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAutoDetect());

    await act(async () => {
      await expect(
        result.current.scanServers(["http://localhost:9999"])
      ).rejects.toThrow("Network error");
    });

    expect(result.current.error).toBe("Network error");
  });
});

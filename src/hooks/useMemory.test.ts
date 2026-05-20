import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMemory } from "./useMemory";
import { storageService } from "../services/storageService";
import type { Memory } from "../types/chat";

vi.mock("../services/storageService", () => ({
  storageService: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe("useMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load memories on mount", async () => {
    const mockMemories: Memory[] = [
      {
        id: "mem1",
        content: "Test memory 1",
        timestamp: Date.now(),
      },
    ];
    vi.mocked(storageService.get).mockReturnValue(mockMemories);

    const { result } = renderHook(() => useMemory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.memories).toEqual(mockMemories);
    expect(storageService.get).toHaveBeenCalledWith("cvr_memories");
  });

  it("should initialize with empty memories when no saved memories exist", async () => {
    vi.mocked(storageService.get).mockReturnValue(null);

    const { result } = renderHook(() => useMemory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.memories).toEqual([]);
  });

  it("should add memory", async () => {
    vi.mocked(storageService.get).mockReturnValue(null);

    const { result } = renderHook(() => useMemory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addMemory("New memory content");
    });

    expect(result.current.memories).toHaveLength(1);
    expect(result.current.memories[0].content).toBe("New memory content");
    expect(result.current.memories[0].id).toBeDefined();
    expect(result.current.memories[0].timestamp).toBeDefined();
  });

  it("should limit memories to MAX_MEMORIES", async () => {
    vi.mocked(storageService.get).mockReturnValue(null);

    const { result } = renderHook(() => useMemory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      for (let i = 0; i < 105; i++) {
        result.current.addMemory(`Memory ${i}`);
      }
    });

    expect(result.current.memories.length).toBe(100);
  });

  it("should compress memories when threshold exceeded", async () => {
    const mockMemories: Memory[] = Array.from({ length: 60 }, (_, i) => ({
      id: `mem${i}`,
      content: `Test memory ${i} with some longer content to test compression`,
      timestamp: Date.now() - i * 1000,
    }));
    vi.mocked(storageService.get).mockReturnValue(mockMemories);

    const { result } = renderHook(() => useMemory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.memories.length).toBe(60);

    act(() => {
      result.current.compressMemories();
    });

    // Compression marks older memories as compressed but doesn't reduce count
    expect(result.current.memories.length).toBe(60);
    // Check that older memories are marked as compressed
    expect(result.current.memories[30].content).toContain("[COMPRESSED]");
  });

  it("should not compress memories when below threshold", async () => {
    const mockMemories: Memory[] = Array.from({ length: 40 }, (_, i) => ({
      id: `mem${i}`,
      content: `Test memory ${i}`,
      timestamp: Date.now() - i * 1000,
    }));
    vi.mocked(storageService.get).mockReturnValue(mockMemories);

    const { result } = renderHook(() => useMemory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.compressMemories();
    });

    expect(result.current.memories.length).toBe(40);
  });

  it("should clear memories", async () => {
    const mockMemories: Memory[] = [
      {
        id: "mem1",
        content: "Test memory 1",
        timestamp: Date.now(),
      },
    ];
    vi.mocked(storageService.get).mockReturnValue(mockMemories);

    const { result } = renderHook(() => useMemory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.memories).toHaveLength(1);

    act(() => {
      result.current.clearMemories();
    });

    expect(result.current.memories).toHaveLength(0);
    expect(storageService.remove).toHaveBeenCalledWith("cvr_memories");
  });

  it("should search memories", async () => {
    const mockMemories: Memory[] = [
      {
        id: "mem1",
        content: "Test memory about React",
        timestamp: Date.now(),
      },
      {
        id: "mem2",
        content: "Test memory about TypeScript",
        timestamp: Date.now(),
      },
      {
        id: "mem3",
        content: "Test memory about Vue",
        timestamp: Date.now(),
      },
    ];
    vi.mocked(storageService.get).mockReturnValue(mockMemories);

    const { result } = renderHook(() => useMemory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const results = result.current.searchMemories("react");

    expect(results).toHaveLength(1);
    expect(results[0].content).toContain("React");
  });

  it("should search memories case insensitive", async () => {
    const mockMemories: Memory[] = [
      {
        id: "mem1",
        content: "Test memory about REACT",
        timestamp: Date.now(),
      },
      {
        id: "mem2",
        content: "Test memory about typescript",
        timestamp: Date.now(),
      },
    ];
    vi.mocked(storageService.get).mockReturnValue(mockMemories);

    const { result } = renderHook(() => useMemory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const results = result.current.searchMemories("react");

    expect(results).toHaveLength(1);
  });

  it("should delete memory", async () => {
    const mockMemories: Memory[] = [
      {
        id: "mem1",
        content: "Test memory 1",
        timestamp: Date.now(),
      },
      {
        id: "mem2",
        content: "Test memory 2",
        timestamp: Date.now(),
      },
    ];
    vi.mocked(storageService.get).mockReturnValue(mockMemories);

    const { result } = renderHook(() => useMemory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.memories).toHaveLength(2);

    act(() => {
      result.current.deleteMemory("mem1");
    });

    expect(result.current.memories).toHaveLength(1);
    expect(result.current.memories[0].id).toBe("mem2");
  });

  it("should update memory", async () => {
    const mockMemories: Memory[] = [
      {
        id: "mem1",
        content: "Test memory 1",
        timestamp: Date.now(),
      },
    ];
    vi.mocked(storageService.get).mockReturnValue(mockMemories);

    const { result } = renderHook(() => useMemory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateMemory("mem1", "Updated content");
    });

    expect(result.current.memories[0].content).toBe("Updated content");
    expect(result.current.memories[0].id).toBe("mem1");
  });

  it("should save memories to storage when they change", async () => {
    vi.mocked(storageService.get).mockReturnValue(null);

    const { result } = renderHook(() => useMemory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addMemory("New memory");
    });

    expect(storageService.set).toHaveBeenCalled();
  });
});

import { useState, useEffect, useCallback } from "react";
import { storageService } from "../services/storageService";
import type { Memory } from "../types/chat";
import type { MemoryId } from "../types/ai";

const STORAGE_KEY = "cvr_memories";

const MAX_MEMORIES = 100;
const COMPRESSION_THRESHOLD = 50;

export const useMemory = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const saved = storageService.get<Memory[]>(STORAGE_KEY);
      setMemories(saved || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load memories");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addMemory = useCallback((content: string) => {
    const newMemory: Memory = {
      id: crypto.randomUUID() as MemoryId,
      content,
      timestamp: Date.now(),
    };

    setMemories((prev) => {
      const updated = [newMemory, ...prev];

      if (updated.length > MAX_MEMORIES) {
        return updated.slice(0, MAX_MEMORIES);
      }

      return updated;
    });

    return newMemory;
  }, []);

  const compressMemories = useCallback(() => {
    setMemories((prev) => {
      if (prev.length <= COMPRESSION_THRESHOLD) {
        return prev;
      }

      const recent = prev.slice(0, COMPRESSION_THRESHOLD / 2);
      const older = prev.slice(COMPRESSION_THRESHOLD / 2);

      const compressed = older.map((mem) => ({
        ...mem,
        content: `[COMPRESSED] ${mem.content.slice(0, 100)}...`,
      }));

      return [...recent, ...compressed];
    });
  }, []);

  const clearMemories = useCallback(() => {
    setMemories([]);
    storageService.remove(STORAGE_KEY);
  }, []);

  const searchMemories = useCallback((query: string): Memory[] => {
    const lowerQuery = query.toLowerCase();
    return memories.filter((mem) =>
      mem.content.toLowerCase().includes(lowerQuery)
    );
  }, [memories]);

  const deleteMemory = useCallback((id: string) => {
    setMemories((prev) => prev.filter((mem) => mem.id !== id));
  }, []);

  const updateMemory = useCallback((id: string, content: string) => {
    setMemories((prev) =>
      prev.map((mem) =>
        mem.id === id ? { ...mem, content } : mem
      )
    );
  }, []);

  useEffect(() => {
    if (memories.length > 0) {
      storageService.set(STORAGE_KEY, memories);
    }
  }, [memories]);

  return {
    memories,
    isLoading,
    error,
    loadMemories,
    addMemory,
    compressMemories,
    clearMemories,
    searchMemories,
    deleteMemory,
    updateMemory,
  };
};

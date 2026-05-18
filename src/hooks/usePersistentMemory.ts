import { useState, useEffect, useCallback } from "react";

export interface MemoryData {
  raw: string;
  sections: Record<string, string>;
}

export function usePersistentMemory() {
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [user, setUser] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchMemory = useCallback(async () => {
    setLoading(true);
    try {
      const [memRes, userRes] = await Promise.all([
        fetch("/api/memory"),
        fetch("/api/user"),
      ]);
      const memData = await memRes.json();
      const userData = await userRes.json();
      setMemory({ raw: memData.raw || "", sections: memData.sections || {} });
      setUser({ raw: userData.raw || "", sections: userData.sections || {} });
    } catch (e) {
      console.error("Failed to load memory:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  const saveMemory = useCallback(async (content: string, section?: string) => {
    setSaving(true);
    try {
      await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, section }),
      });
      await fetchMemory();
    } catch (e) {
      console.error("Failed to save memory:", e);
    } finally {
      setSaving(false);
    }
  }, [fetchMemory]);

  const saveUser = useCallback(async (content: string, section?: string) => {
    setSaving(true);
    try {
      await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, section }),
      });
      await fetchMemory();
    } catch (e) {
      console.error("Failed to save user:", e);
    } finally {
      setSaving(false);
    }
  }, [fetchMemory]);

  return { memory, user, loading, saving, saveMemory, saveUser, refresh: fetchMemory };
}

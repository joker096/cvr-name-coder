import { useState, useEffect, useCallback } from "react";

export interface MemoryData {
  raw: string;
  sections: Record<string, string>;
}

interface BackendSection {
  title: string;
  lines: string[];
}

function normalizeSections(sections: unknown): Record<string, string> {
  if (Array.isArray(sections)) {
    const result: Record<string, string> = {};
    for (const s of sections as BackendSection[]) {
      if (s && typeof s.title === "string" && Array.isArray(s.lines)) {
        result[s.title] = s.lines.join("\n");
      }
    }
    return result;
  }
  return (sections as Record<string, string>) || {};
}

export function usePersistentMemory() {
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [user, setUser] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMemory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [memRes, userRes] = await Promise.all([
        fetch("/api/memory"),
        fetch("/api/user"),
      ]);

      if (!memRes.ok) {
        const text = await memRes.text().catch(() => "Unknown error");
        throw new Error(`Memory API: ${memRes.status} ${text}`);
      }
      if (!userRes.ok) {
        const text = await userRes.text().catch(() => "Unknown error");
        throw new Error(`User API: ${userRes.status} ${text}`);
      }

      const memData = await memRes.json();
      const userData = await userRes.json();
      setMemory({
        raw: memData.raw || "",
        sections: normalizeSections(memData.sections),
      });
      setUser({
        raw: userData.raw || "",
        sections: normalizeSections(userData.sections),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Failed to load memory:", e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  const saveMemory = useCallback(async (content: string, section?: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, section }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchMemory();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Failed to save memory:", e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [fetchMemory]);

  const saveUser = useCallback(async (content: string, section?: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, section }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchMemory();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Failed to save user:", e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [fetchMemory]);

  const updateMemorySection = useCallback(async (section: string, content: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, content }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchMemory();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Failed to update memory section:", e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [fetchMemory]);

  const updateUserSection = useCallback(async (section: string, content: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, content }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchMemory();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Failed to update user section:", e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [fetchMemory]);

  const deleteMemorySection = useCallback(async (section: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/memory/${encodeURIComponent(section)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await fetchMemory();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Failed to delete memory section:", e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [fetchMemory]);

  const deleteUserSection = useCallback(async (section: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(section)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await fetchMemory();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Failed to delete user section:", e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [fetchMemory]);

  const clearMemory = useCallback(async (archive = true) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/memory-all?archive=${archive ? "true" : "false"}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await fetchMemory();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Failed to clear memory:", e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [fetchMemory]);

  const clearUser = useCallback(async (archive = true) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/user-all?archive=${archive ? "true" : "false"}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await fetchMemory();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Failed to clear user preferences:", e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [fetchMemory]);

  return {
    memory, user, loading, saving, error,
    saveMemory, saveUser,
    updateMemorySection, updateUserSection,
    deleteMemorySection, deleteUserSection,
    clearMemory, clearUser,
    refresh: fetchMemory,
  };
}

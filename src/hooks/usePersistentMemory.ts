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
      setMemory({
        raw: memData.raw || "",
        sections: normalizeSections(memData.sections),
      });
      setUser({
        raw: userData.raw || "",
        sections: normalizeSections(userData.sections),
      });
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

  const updateMemorySection = useCallback(async (section: string, content: string) => {
    setSaving(true);
    try {
      await fetch("/api/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, content }),
      });
      await fetchMemory();
    } catch (e) {
      console.error("Failed to update memory section:", e);
    } finally {
      setSaving(false);
    }
  }, [fetchMemory]);

  const updateUserSection = useCallback(async (section: string, content: string) => {
    setSaving(true);
    try {
      await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, content }),
      });
      await fetchMemory();
    } catch (e) {
      console.error("Failed to update user section:", e);
    } finally {
      setSaving(false);
    }
  }, [fetchMemory]);

  const deleteMemorySection = useCallback(async (section: string) => {
    setSaving(true);
    try {
      await fetch("/api/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section }),
      });
      await fetchMemory();
    } catch (e) {
      console.error("Failed to delete memory section:", e);
    } finally {
      setSaving(false);
    }
  }, [fetchMemory]);

  const deleteUserSection = useCallback(async (section: string) => {
    setSaving(true);
    try {
      await fetch("/api/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section }),
      });
      await fetchMemory();
    } catch (e) {
      console.error("Failed to delete user section:", e);
    } finally {
      setSaving(false);
    }
  }, [fetchMemory]);

  return {
    memory, user, loading, saving,
    saveMemory, saveUser,
    updateMemorySection, updateUserSection,
    deleteMemorySection, deleteUserSection,
    refresh: fetchMemory,
  };
}

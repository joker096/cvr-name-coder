import { useState, useCallback } from "react";

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface SearchResult {
  sessionId: string;
  sessionTitle: string;
  messageId: string;
  role: string;
  snippet: string;
  createdAt: number;
}

export function useSessionSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, limit?: number) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const url = new URL("/api/sessions/search", window.location.origin);
      url.searchParams.set("q", query);
      if (limit) url.searchParams.set("limit", String(limit));
      const res = await fetch(url.toString());
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      console.error("Session search failed:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setResults([]), []);

  return { results, loading, search, clear };
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (e) {
      console.error("Failed to load sessions:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSession = useCallback(async (title: string) => {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const session: Session = await res.json();
      setSessions((prev) => [session, ...prev]);
      return session;
    } catch (e) {
      console.error("Failed to create session:", e);
      return null;
    }
  }, []);

  const deleteSessionById = useCallback(async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error("Failed to delete session:", e);
    }
  }, []);

  return { sessions, loading, fetchSessions, createSession, deleteSessionById };
}

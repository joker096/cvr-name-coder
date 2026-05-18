import { useState, useCallback } from "react";
import type { RagResult } from "../server/ragEngine";

export function useRAG() {
  const [results, setResults] = useState<RagResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, topK = 3) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/rag/search?q=${encodeURIComponent(query)}&topK=${topK}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      console.error("RAG search failed:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const ingest = useCallback(async (source: string, content: string) => {
    try {
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, content }),
      });
      return res.ok;
    } catch (e) {
      console.error("RAG ingest failed:", e);
      return false;
    }
  }, []);

  const clear = useCallback(() => setResults([]), []);

  return { results, loading, search, ingest, clear };
}

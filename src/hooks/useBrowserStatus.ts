import { useState, useEffect, useCallback } from "react";

export function useBrowserStatus() {
  const [activeSessions, setActiveSessions] = useState<string[]>([]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/browser/sessions");
      const data = await res.json();
      setActiveSessions(data.sessions || []);
    } catch {
      setActiveSessions([]);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  return {
    activeSessions,
    isActive: activeSessions.length > 0,
    refresh: fetchSessions,
  };
}

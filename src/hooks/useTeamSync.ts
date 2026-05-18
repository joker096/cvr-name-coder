import { useState, useEffect, useCallback } from "react";

export interface SyncStatus {
  lastSyncAt: number | null;
  status: "idle" | "syncing" | "error" | "conflict";
  message: string;
  provider: string;
}

export interface SyncConfig {
  enabled: boolean;
  provider: "git" | "file" | "api";
  repo?: string;
  path?: string;
  apiUrl?: string;
  apiKey?: string;
  interval: number;
  encrypt: boolean;
  encryptionKey?: string;
  conflictResolution: "last-write-wins" | "manual";
}

export const useTeamSync = () => {
  const [status, setStatus] = useState<SyncStatus>({
    lastSyncAt: null,
    status: "idle",
    message: "Sync not configured",
    provider: "none",
  });
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus((prev) => ({ ...prev, status: "error", message: "Failed to fetch status" }));
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/config");
      const data = await res.json();
      setConfig(data);
    } catch {
      setConfig(null);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchConfig();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchConfig]);

  const exportSync = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sync/export", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setError(data.message);
        return false;
      }
      await fetchStatus();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus]);

  const importSync = useCallback(async (): Promise<{ success: boolean; conflicts?: string[] }> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sync/import", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setError(data.message);
        return { success: false };
      }
      await fetchStatus();
      return { success: true, conflicts: data.conflicts };
    } catch (e: any) {
      setError(e.message);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus]);

  const saveConfig = useCallback(async (newConfig: SyncConfig): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sync/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return false;
      }
      setConfig(newConfig);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolveConflicts = useCallback(async (resolutions: Record<string, "local" | "remote">): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sync/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutions }),
      });
      const data = await res.json();
      await fetchStatus();
      return data.resolved;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus]);

  return {
    status,
    config,
    isLoading,
    error,
    exportSync,
    importSync,
    saveConfig,
    resolveConflicts,
    refresh: fetchStatus,
  };
};

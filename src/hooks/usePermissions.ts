import { useState, useCallback, useEffect } from "react";
import type { PendingPermission } from "../types/permissions";

export const usePermissions = () => {
  const [pending, setPending] = useState<PendingPermission[]>([]);

  // Poll for pending permissions from server
  useEffect(() => {
    const poll = async () => {
      try {
        const response = await fetch("/api/permissions/pending");
        if (response.ok) {
          const data = await response.json();
          setPending(data.pending || []);
        }
      } catch {
        // ignore polling errors
      }
    };
    poll();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, []);

  const requestPermission = useCallback(async (request: any): Promise<boolean> => {
    const response = await fetch("/api/permissions/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const result = await response.json();

    if (result.action === "allow") return true;
    if (result.action === "deny") return false;

    // "ask" - poll for resolution
    if (result.pending) {
      return new Promise((resolve) => {
        const interval = setInterval(async () => {
          const check = await fetch(`/api/permissions/pending/${result.pending.id}`);
          const status = await check.json();
          if (status.resolved) {
            clearInterval(interval);
            resolve(status.approved);
          }
        }, 500);
      });
    }

    return false;
  }, []);

  const approve = useCallback(async (id: string) => {
    await fetch(`/api/permissions/resolve/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });
  }, []);

  const deny = useCallback(async (id: string) => {
    await fetch(`/api/permissions/resolve/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: false }),
    });
  }, []);

  return { pending, requestPermission, approve, deny };
};

import { useState, useCallback, useEffect } from "react";
import type { ChangeState, FileChange } from "../types/changes";

export const useChanges = () => {
  const [state, setState] = useState<ChangeState>({
    changes: [],
    canUndo: false,
    canRedo: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch("/api/changes");
      const data: ChangeState = await response.json();
      setState(data);
    } catch (err) {
      console.error("Failed to fetch changes:", err);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const undo = useCallback(async (): Promise<{ success: boolean; restored?: FileChange; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/undo", { method: "POST" });
      const result = await response.json();
      await fetchState();
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchState]);

  const redo = useCallback(async (): Promise<{ success: boolean; restored?: FileChange; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/redo", { method: "POST" });
      const result = await response.json();
      await fetchState();
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchState]);

  return { ...state, undo, redo, isLoading, refresh: fetchState };
};

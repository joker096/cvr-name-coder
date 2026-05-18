import { useState, useCallback, useRef, useEffect } from "react";
import type { LoopState } from "../types/agent";

export const useAgentLoop = () => {
  const [state, setState] = useState<LoopState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loopIdRef = useRef<string | null>(null);

  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollState = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/agent/loop/${id}`);
      if (!response.ok) throw new Error("Failed to fetch loop state");
      const data: LoopState = await response.json();
      setState(data);
      if (data.status === "completed" || data.status === "error") {
        clearPolling();
        setIsRunning(false);
      }
    } catch (err: any) {
      console.error("Poll error:", err);
      clearPolling();
      setIsRunning(false);
    }
  }, [clearPolling]);

  const startLoop = useCallback(async (goal: string, provider: string, model: string) => {
    abortRef.current = false;
    clearPolling();

    try {
      const response = await fetch("/api/agent/loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, provider, model }),
      });

      if (!response.ok) throw new Error("Failed to start loop");

      const { id, state: initialState } = await response.json();
      loopIdRef.current = id;
      setState(initialState);
      setIsRunning(true);

      // Start polling
      pollIntervalRef.current = setInterval(() => {
        if (abortRef.current) {
          clearPolling();
          return;
        }
        pollState(id);
      }, 1500);

    } catch (err: any) {
      setState({
        goal,
        steps: [],
        status: "error",
        currentStep: 0,
        maxSteps: 20,
      });
      setIsRunning(false);
    }
  }, [clearPolling, pollState]);

  const abortLoop = useCallback(async () => {
    abortRef.current = true;
    clearPolling();
    if (loopIdRef.current) {
      try {
        await fetch(`/api/agent/loop/${loopIdRef.current}/abort`, { method: "POST" });
      } catch (e) {
        // ignore
      }
    }
    setIsRunning(false);
  }, [clearPolling]);

  useEffect(() => {
    return () => clearPolling();
  }, [clearPolling]);

  return { state, isRunning, startLoop, abortLoop };
};

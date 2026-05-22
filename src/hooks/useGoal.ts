import { useState, useCallback, useRef, useEffect } from "react";
import type { GoalState, GoalEvent } from "../types/goal";

interface UseGoalState {
  goalState: GoalState | null;
  events: GoalEvent[];
  isLoading: boolean;
  error: string | null;
}

export function useGoal() {
  const [state, setState] = useState<UseGoalState>({
    goalState: null,
    events: [],
    isLoading: false,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const goalIdRef = useRef<string | null>(null);

  const closeCurrentConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connectToEvents = useCallback(async (goalId: string) => {
    closeCurrentConnection();

    const stateRes = await fetch(`/api/goal/${goalId}`);
    const currentState = await stateRes.json();
    setState((prev) => ({
      ...prev,
      goalState: currentState.status ? currentState : null,
    }));

    const eventSource = new EventSource(`/api/goal/${goalId}/events`);
    eventSourceRef.current = eventSource;
    eventSource.onmessage = (e) => {
      try {
        const event: GoalEvent = JSON.parse(e.data);
        setState((prev) => {
          const newEvents = [...prev.events, event];
          let newGoalState = prev.goalState;
          if (event.type === "goal.complete" || event.type === "goal.aborted" || event.type === "goal.error") {
            newGoalState = (event.data as { state?: GoalState } | undefined)?.state || prev.goalState;
          }
          return {
            ...prev,
            events: newEvents,
            goalState: newGoalState,
            isLoading: event.type !== "goal.complete" && event.type !== "goal.aborted" && event.type !== "goal.error",
          };
        });
        if (event.type === "goal.complete" || event.type === "goal.aborted" || event.type === "goal.error") {
          eventSource.close();
          eventSourceRef.current = null;
        }
      } catch {
        // ignore malformed events
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;
      setState((prev) => ({ ...prev, isLoading: false, error: "Event stream error" }));
    };
  }, [closeCurrentConnection]);

  const startGoal = useCallback(async (goal: string, successCriteria?: string, config?: any) => {
    setState({ goalState: null, events: [], isLoading: true, error: null });
    try {
      const res = await fetch("/api/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, successCriteria, ...config }),
      });
      const { id } = await res.json();
      goalIdRef.current = id;
      await connectToEvents(id);
    } catch (err: any) {
      setState((prev) => ({ ...prev, isLoading: false, error: err.message }));
    }
  }, [connectToEvents]);

  const abortGoal = useCallback(async () => {
    const id = goalIdRef.current;
    if (!id) return;
    await fetch(`/api/goal/${id}/abort`, { method: "POST" });
    closeCurrentConnection();
  }, [closeCurrentConnection]);

  const resumeGoal = useCallback(async (goalId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await fetch(`/api/goal/${goalId}/resume`, { method: "POST" });
      goalIdRef.current = goalId;
      await connectToEvents(goalId);
    } catch (err: any) {
      setState((prev) => ({ ...prev, isLoading: false, error: err.message }));
    }
  }, [connectToEvents]);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((data) => {
        if (data.goals && data.goals.length > 0) {
          const active = data.goals.find((g: GoalState) => g.status === "running" || g.status === "paused");
          if (active) {
            goalIdRef.current = active.id;
            connectToEvents(active.id);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load goals:", err);
      });
    return () => {
      closeCurrentConnection();
    };
  }, [connectToEvents, closeCurrentConnection]);

  return {
    ...state,
    startGoal,
    abortGoal,
    resumeGoal,
  };
}

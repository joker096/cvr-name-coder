import { useState, useCallback } from "react";
import type { SubagentTask } from "../server/subagentManager";

export const useSubagents = () => {
  const [tasks, setTasks] = useState<SubagentTask[]>([]);

  const spawnSubagent = useCallback(async (goal: string, agentId: string) => {
    const response = await fetch("/api/subagents/spawn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, agentId }),
    });
    const task = await response.json();
    setTasks((prev) => [...prev, task]);
    return task;
  }, []);

  const refreshTasks = useCallback(async () => {
    const response = await fetch("/api/subagents");
    const data = await response.json();
    setTasks(data.tasks);
  }, []);

  return { tasks, spawnSubagent, refreshTasks };
};

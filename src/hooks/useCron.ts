import { useState, useCallback, useEffect } from "react";

export interface CronTask {
  id: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
}

export function useCron() {
  const [tasks, setTasks] = useState<CronTask[]>([]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/cron");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) {
      console.error("Failed to fetch cron tasks:", e);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const addTask = useCallback(async (task: Omit<CronTask, "id">) => {
    try {
      const res = await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      const newTask: CronTask = await res.json();
      setTasks((prev) => [...prev, newTask]);
      return newTask;
    } catch (e) {
      console.error("Failed to add cron task:", e);
      return null;
    }
  }, []);

  const removeTask = useCallback(async (id: string) => {
    try {
      await fetch(`/api/cron/${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error("Failed to remove cron task:", e);
    }
  }, []);

  const toggleTask = useCallback(async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/cron/${id}/${enabled ? "enable" : "disable"}`, { method: "POST" });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, enabled } : t)));
    } catch (e) {
      console.error("Failed to toggle cron task:", e);
    }
  }, []);

  return { tasks, addTask, removeTask, toggleTask, fetchTasks };
}

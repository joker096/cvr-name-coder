import { randomUUID } from "crypto";

export interface CronTask {
  id: string;
  name: string;
  schedule: string; // cron-like or interval expression
  command: string; // what to run: "agent:goal" or "tool:name"
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  isRunning?: boolean;
}

// Simple cron parser supporting: "* * * * *" (min hour day month dow) or "every N minutes"
export function parseSchedule(schedule: string): number | null {
  if (schedule.startsWith("every ")) {
    const match = schedule.match(/every (\d+) (minute|minutes|hour|hours|day|days)/);
    if (!match || match[1] === undefined || match[2] === undefined) return null;
    const num = parseInt(match[1], 10);
    const unit = match[2];
    const ms = unit.startsWith("minute") ? num * 60 * 1000 : unit.startsWith("hour") ? num * 60 * 60 * 1000 : num * 24 * 60 * 60 * 1000;
    return ms;
  }
  // Basic cron: "min hour day month dow" — for simplicity, only support exact minute intervals like "*/5 * * * *"
  const parts = schedule.split(" ");
  if (parts.length === 5 && parts[0] !== undefined && parts[0].startsWith("*/")) {
    const mins = parseInt(parts[0].slice(2), 10);
    if (!isNaN(mins)) return mins * 60 * 1000;
  }
  return null;
}

class CronScheduler {
  private tasks = new Map<string, CronTask>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private runCallbacks = new Map<string, (task: CronTask) => void | Promise<void>>();

  addTask(task: Omit<CronTask, "id">): CronTask {
    const interval = parseSchedule(task.schedule);
    if (!interval) {
      throw new Error(`Invalid schedule: ${task.schedule}`);
    }
    const id = randomUUID();
    const fullTask: CronTask = { ...task, id };
    this.tasks.set(id, fullTask);
    if (fullTask.enabled) {
      this.startTask(id);
    }
    return fullTask;
  }

  removeTask(id: string): void {
    this.stopTask(id);
    this.tasks.delete(id);
  }

  enableTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.enabled = true;
    this.startTask(id);
  }

  disableTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.enabled = false;
    this.stopTask(id);
  }

  getTasks(): CronTask[] {
    return Array.from(this.tasks.values());
  }

  getTask(id: string): CronTask | undefined {
    return this.tasks.get(id);
  }

  private startTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task || !task.enabled) return;
    this.stopTask(id);

    const interval = parseSchedule(task.schedule);
    if (!interval) return;

    task.nextRun = Date.now() + interval;

    const timer = setInterval(() => {
      void this.runTask(id);
    }, interval);
    if (typeof timer.unref === "function") {
      timer.unref();
    }
    this.timers.set(id, timer);
  }

  private stopTask(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }
  }

  private async runTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    if (task.isRunning) return;
    const interval = parseSchedule(task.schedule) || 0;
    task.isRunning = true;
    task.lastRun = Date.now();
    task.nextRun = Date.now() + interval;
    try {
      console.log(`[CRON] Running task ${task.name}: ${task.command}`);
      const callback = this.runCallbacks.get(id);
      if (callback) {
        await callback(task);
      }
    } finally {
      task.isRunning = false;
      task.nextRun = Date.now() + interval;
    }
  }

  onTaskRun(id: string, callback: (task: CronTask) => void): void {
    const task = this.tasks.get(id);
    if (!task) return;
    this.runCallbacks.set(id, callback);
    if (task.enabled) {
      this.startTask(id);
    }
  }

  dispose(): void {
    for (const [id] of this.timers) {
      this.stopTask(id);
    }
    this.runCallbacks.clear();
    this.tasks.clear();
  }
}

export const cronScheduler = new CronScheduler();

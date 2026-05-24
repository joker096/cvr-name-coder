import { randomUUID } from "crypto";
import { log } from "./logger.js";

/**
 * A scheduled task that runs at a defined interval.
 */
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

/**
 * Parses a schedule expression into a millisecond interval.
 * Supports cron-like `&#42;/N * * * *` syntax and `every N minutes/hours/days`.
 *
 * @param schedule - The schedule expression string.
 * @returns The interval in milliseconds, or `null` if the expression is invalid.
 */
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

/**
 * A lightweight cron-like scheduler for running periodic tasks in-process.
 * Tasks are stored in memory and executed via `setInterval`.
 */
class CronScheduler {
  private tasks = new Map<string, CronTask>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private runCallbacks = new Map<string, (task: CronTask) => void | Promise<void>>();

  /**
   * Registers a new scheduled task and starts it if enabled.
   *
   * @param task - Task definition without an ID (auto-generated).
   * @returns The full task record including its generated ID.
   * @throws {Error} If the schedule expression is invalid.
   */
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

  /**
   * Removes a task and stops its timer.
   * @param id - The task ID.
   */
  removeTask(id: string): void {
    this.stopTask(id);
    this.tasks.delete(id);
  }

  /**
   * Enables a disabled task and schedules its next run.
   * @param id - The task ID.
   */
  enableTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.enabled = true;
    this.startTask(id);
  }

  /**
   * Disables a task without removing it.
   * @param id - The task ID.
   */
  disableTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.enabled = false;
    this.stopTask(id);
  }

  /**
   * Returns all registered tasks.
   * @returns Array of task records.
   */
  getTasks(): CronTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Finds a task by ID.
   * @param id - The task ID.
   * @returns The task record, or `undefined`.
   */
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
      log.info(`Running task`, { name: task.name, command: task.command });
      const callback = this.runCallbacks.get(id);
      if (callback) {
        await callback(task);
      }
    } finally {
      task.isRunning = false;
      task.nextRun = Date.now() + interval;
    }
  }

  /**
   * Registers a callback to execute when the task runs.
   * If the task is enabled, it also starts the timer.
   *
   * @param id - The task ID.
   * @param callback - Function invoked with the task record on each run.
   */
  onTaskRun(id: string, callback: (task: CronTask) => void): void {
    const task = this.tasks.get(id);
    if (!task) return;
    this.runCallbacks.set(id, callback);
    if (task.enabled) {
      this.startTask(id);
    }
  }

  /**
   * Stops all timers and clears all task/callback registrations.
   */
  dispose(): void {
    for (const [id] of this.timers) {
      this.stopTask(id);
    }
    this.runCallbacks.clear();
    this.tasks.clear();
  }
}

/**
 * Shared singleton instance of {@link CronScheduler} for application-wide use.
 */
export const cronScheduler = new CronScheduler();

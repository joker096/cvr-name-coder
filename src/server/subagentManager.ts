import { AgentLoop } from "./agentLoop.js";
import type { AgentConfig } from "../types/agent.js";
import { getErrorMessage } from "../types/errors.js";
import { log } from "./logger.js";

/** Represents a single subagent task tracked by the manager. */
export interface SubagentTask {
  /** Unique identifier for this task. */
  id: string;
  /** ID of the parent agent that spawned this subagent. */
  parentId: string;
  /** The goal/task the subagent is working on. */
  goal: string;
  /** Configuration for the subagent's AI behavior. */
  agentConfig: AgentConfig;
  /** Current lifecycle status of the task. */
  status: "pending" | "running" | "completed" | "failed";
  /** Output result if the task completed successfully. */
  result?: string;
  /** Error message if the task failed. */
  error?: string;
  /** Timestamp (ms) when the task started executing. */
  startTime?: number;
  /** Timestamp (ms) when the task finished (completed or failed). */
  endTime?: number;
}

/**
 * Manages concurrent subagent task execution with a configurable concurrency limit.
 * Tasks exceeding the limit are queued and executed when a slot becomes available.
 */
export class SubagentManager {
  private tasks = new Map<string, SubagentTask>();
  private queue: string[] = [];
  private maxConcurrent = 3;
  private activeLoops = new Map<string, AgentLoop>();

  /**
   * Spawns a new subagent task. If under the concurrency limit, executes immediately;
   * otherwise queues the task for later execution.
   *
   * @param parentId - ID of the parent agent.
   * @param goal - The task goal for the subagent.
   * @param agentConfig - Agent configuration (maxSteps, etc.).
   * @param thinkFn - Async function that sends a prompt to the AI and returns the response.
   * @returns The created {@link SubagentTask} (may still be "pending" if queued).
   */
  async spawn(
    parentId: string,
    goal: string,
    agentConfig: AgentConfig,
    thinkFn: (prompt: string) => Promise<string>
  ): Promise<SubagentTask> {
    const id = crypto.randomUUID();
    const task: SubagentTask = {
      id,
      parentId,
      goal,
      agentConfig,
      status: "pending",
    };

    this.tasks.set(id, task);

    // Check concurrency limit
    const running = this.getRunningCount();
    if (running >= this.maxConcurrent) {
      this.queue.push(id);
      return task;
    }

    await this.executeTask(task, thinkFn);
    return task;
  }

  private async executeTask(
    task: SubagentTask,
    thinkFn: (prompt: string) => Promise<string>
  ): Promise<void> {
    task.status = "running";
    task.startTime = Date.now();

    try {
      const loop = new AgentLoop(task.goal, {
        maxSteps: task.agentConfig.maxSteps || 10,
        onStep: (step) => {
          log.debug(`Step ${step.id}`, { thought: step.thought.substring(0, 100) });
        },
        thinkFn,
      });
      this.activeLoops.set(task.id, loop);

      const state = await loop.run();
      if (state.status === "aborted") {
        task.status = "failed";
        task.error = "Aborted by user";
      } else {
        task.status = "completed";
        task.result = state.steps.map((s) => s.observation || s.thought).join("\n\n");
      }
    } catch (err: unknown) {
      task.status = "failed";
      task.error = getErrorMessage(err);
    } finally {
      this.activeLoops.delete(task.id);
      task.endTime = Date.now();
      this.processQueue(thinkFn);
    }
  }

  private processQueue(thinkFn: (prompt: string) => Promise<string>): void {
    const running = this.getRunningCount();
    if (running >= this.maxConcurrent) return;

    const nextId = this.queue.shift();
    if (!nextId) return;

    const nextTask = this.tasks.get(nextId);
    if (nextTask) {
      this.executeTask(nextTask, thinkFn).catch((err: unknown) => {
        log.error(`Queued subagent failed`, err instanceof Error ? err : undefined, { nextId });
      });
    }
  }

  private getRunningCount(): number {
    return Array.from(this.tasks.values()).filter((t) => t.status === "running").length;
  }

  /**
   * Retrieves a task by its ID.
   *
   * @param id - The task identifier.
   * @returns The {@link SubagentTask} or undefined if not found.
   */
  getTask(id: string): SubagentTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Lists all tasks, optionally filtered by parent agent ID.
   *
   * @param parentId - Optional parent ID to filter by.
   * @returns Array of matching {@link SubagentTask} objects.
   */
  listTasks(parentId?: string): SubagentTask[] {
    const all = Array.from(this.tasks.values());
    return parentId ? all.filter((t) => t.parentId === parentId) : all;
  }

  /**
   * Aborts a running or pending subagent task.
   * Running tasks are aborted via AgentLoop; pending tasks are removed from the queue.
   *
   * @param id - The ID of the task to abort.
   */
  async abort(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (task && task.status === "running") {
      this.activeLoops.get(id)?.abort();
      task.status = "failed";
      task.error = "Aborted by user";
      task.endTime = Date.now();
    } else if (task && task.status === "pending") {
      // Remove from queue
      this.queue = this.queue.filter((qid) => qid !== id);
      task.status = "failed";
      task.error = "Aborted before start";
    }
  }
}

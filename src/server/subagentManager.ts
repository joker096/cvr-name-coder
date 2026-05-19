import { AgentLoop } from "./agentLoop.js";
import type { AgentConfig } from "../types/agent.js";

export interface SubagentTask {
  id: string;
  parentId: string;
  goal: string;
  agentConfig: AgentConfig;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export class SubagentManager {
  private tasks = new Map<string, SubagentTask>();
  private queue: string[] = [];
  private maxConcurrent = 3;

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
          console.log(`[Subagent ${task.id}] Step ${step.id}: ${step.thought.substring(0, 100)}`);
        },
        thinkFn,
      });

      const state = await loop.run();
      task.status = "completed";
      task.result = state.steps.map((s) => s.observation || s.thought).join("\n\n");
    } catch (err: any) {
      task.status = "failed";
      task.error = err.message;
    } finally {
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
      this.executeTask(nextTask, thinkFn).catch((err) => {
        console.error(`Queued subagent ${nextId} failed:`, err);
      });
    }
  }

  private getRunningCount(): number {
    return Array.from(this.tasks.values()).filter((t) => t.status === "running").length;
  }

  getTask(id: string): SubagentTask | undefined {
    return this.tasks.get(id);
  }

  listTasks(parentId?: string): SubagentTask[] {
    const all = Array.from(this.tasks.values());
    return parentId ? all.filter((t) => t.parentId === parentId) : all;
  }

  async abort(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (task && task.status === "running") {
      // In a full implementation, we'd abort the AgentLoop
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

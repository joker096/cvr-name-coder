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
    const running = Array.from(this.tasks.values()).filter((t) => t.status === "running").length;
    if (running >= this.maxConcurrent) {
      task.status = "pending";
      return task;
    }
    
    // Execute
    task.status = "running";
    task.startTime = Date.now();
    
    try {
      const loop = new AgentLoop(goal, {
        maxSteps: agentConfig.maxSteps || 10,
        onStep: (step) => {
          console.log(`[Subagent ${id}] Step ${step.id}: ${step.thought.substring(0, 100)}`);
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
    }
    
    return task;
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
    }
  }
}

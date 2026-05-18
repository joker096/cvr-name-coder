import { executeTool } from "./tools";
import type { PermissionEngine } from "./permissions";
import type { ToolCall } from "../types/tools";
import type { LoopStep, LoopState } from "../types/agent";
import { hookRegistry } from "./hooks";
import { maybeCreateSkill } from "./skillCreator";

export type ThinkFunction = (prompt: string) => Promise<string>;
export type ExecuteToolFunction = (toolCall: ToolCall, mode?: "plan" | "build") => Promise<import("../types/tools").ToolResult>;

export class AgentLoop {
  private state: LoopState;
  private permissionEngine: PermissionEngine | undefined;
  private thinkFn: ThinkFunction;
  private executeToolFn: ExecuteToolFunction;
  private onStep: ((step: LoopStep) => void) | undefined;
  private onStatus: ((status: string) => void) | undefined;
  private _abort = false;
  private sessionId: string;

  constructor(
    goal: string,
    options: {
      maxSteps?: number;
      permissionEngine?: PermissionEngine;
      thinkFn: ThinkFunction;
      executeToolFn?: ExecuteToolFunction;
      onStep?: (step: LoopStep) => void;
      onStatus?: (status: string) => void;
      sessionId?: string;
    }
  ) {
    this.sessionId = options.sessionId || crypto.randomUUID();
    this.state = {
      goal,
      steps: [],
      status: "planning",
      currentStep: 0,
      maxSteps: options.maxSteps || 20,
    };
    this.permissionEngine = options.permissionEngine;
    this.thinkFn = options.thinkFn;
    this.executeToolFn =
      options.executeToolFn ||
      ((toolCall, mode) => executeTool(toolCall, mode || "build", this.permissionEngine, this.sessionId));
    this.onStep = options.onStep;
    this.onStatus = options.onStatus;
  }

  async run(): Promise<LoopState> {
    try {
      await hookRegistry.execute("loop.start", { goal: this.state.goal }, this.sessionId);

      while (this.state.status !== "completed" && this.state.status !== "error") {
        if (this.state.currentStep >= this.state.maxSteps || this._abort) {
          if (this._abort) {
            this.state.steps.push({
              id: this.state.currentStep,
              thought: "Loop aborted by user",
              timestamp: Date.now(),
            });
          }
          this.state.status = "error";
          break;
        }

        const thought = await this.think();
        const step: LoopStep = {
          id: this.state.currentStep,
          thought,
          timestamp: Date.now(),
        };

        const action = this.parseAction(thought);
        if (action) {
          step.action = action;
          this.state.status = "executing";
          this.onStatus?.("executing");

          try {
            const result = await this.executeToolFn(
              { name: action.tool as ToolCall["name"], params: action.params },
              "build"
            );
            step.observation = JSON.stringify(result);
          } catch (err: any) {
            step.observation = `Error: ${err.message}`;
          }
        } else {
          this.state.status = "completed";
        }

        this.state.steps.push(step);
        this.onStep?.(step);
        this.state.currentStep++;

        await hookRegistry.execute("loop.step", { step }, this.sessionId);

        if (!action) {
          break;
        }

        this.state.status = "observing";
        this.onStatus?.("observing");
      }

      if (this.state.status !== "error") {
        this.state.status = "completed";
      }
      this.onStatus?.(this.state.status);

      await hookRegistry.execute("loop.complete", { state: this.state }, this.sessionId);

      // Auto skill creation on successful multi-step tasks
      if (this.state.status === "completed" && this.state.steps.length >= 3) {
        const toolNames = this.state.steps.map((s) => s.action?.tool || "");
        maybeCreateSkill({
          goal: this.state.goal,
          steps: this.state.steps.map((s) => ({ thought: s.thought, action: s.action, observation: s.observation })),
          toolNames,
          durationMs: this.state.steps[this.state.steps.length - 1].timestamp - this.state.steps[0].timestamp,
          success: true,
        }).catch(() => {});
      }

      return this.state;
    } catch (err: any) {
      this.state.status = "error";
      await hookRegistry.execute("loop.error", { error: err.message || String(err) }, this.sessionId);
      throw err;
    }
  }

  abort(): void {
    this._abort = true;
  }

  private async think(): Promise<string> {
    const context = this.buildContext();
    const prompt = `You are an autonomous coding agent working on this goal:
${this.state.goal}

Previous steps:
${context}

Think about what to do next. If you need to use a tool, respond in this format:
ACTION: tool_name
PARAMS: {"param": "value"}

If the task is complete, respond with:
COMPLETE: brief summary

Your thought:`;

    return (await this.thinkFn(prompt)).trim();
  }

  private buildContext(): string {
    return this.state.steps
      .slice(-5)
      .map(
        (s) =>
          `Step ${s.id}: ${s.thought.substring(0, 200)}${
            s.thought.length > 200 ? "..." : ""
          } Observation: ${s.observation?.substring(0, 200)}${
            s.observation && s.observation.length > 200 ? "..." : ""
          }`
      )
      .join("\n");
  }

  private parseAction(thought: string): { tool: string; params: Record<string, any> } | null {
    const actionMatch = thought.match(/ACTION:\s*(\w+)/);
    const paramsMatch = thought.match(/PARAMS:\s*(\{[\s\S]*?\})/);
    if (actionMatch && actionMatch[1]) {
      try {
        return {
          tool: actionMatch[1],
          params: paramsMatch && paramsMatch[1] ? JSON.parse(paramsMatch[1]) : {},
        };
      } catch {
        return { tool: actionMatch[1], params: {} };
      }
    }
    return null;
  }

  getState(): LoopState {
    return { ...this.state };
  }
}

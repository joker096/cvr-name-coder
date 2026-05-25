import { executeTool } from "./tools";
import type { PermissionEngine } from "./permissions";
import type { ToolCall } from "../types/tools";
import type { LoopStep, LoopState } from "../types/agent";
import { hookRegistry } from "./hooks";
import { maybeCreateSkill } from "./skillCreator";
import { getErrorMessage } from "../types/errors";
import { validateFileAccess } from "./antiHallucination";

/**
 * A function that takes a prompt string and returns an AI-generated response.
 * @param prompt - The prompt to send to the AI model
 * @returns A Promise resolving to the AI's text response
 */
export type ThinkFunction = (prompt: string) => Promise<string>;

/**
 * A function that executes a tool call and returns the result.
 * @param toolCall - The tool call to execute
 * @param mode - The execution mode (plan, build, or review)
 * @returns A Promise resolving to the tool execution result
 */
export type ExecuteToolFunction = (toolCall: ToolCall, mode?: "plan" | "build" | "review") => Promise<import("../types/tools").ToolResult>;

/**
 * Autonomous agent loop that manages multi-step task execution.
 *
 * Orchestrates a think-act-observe cycle: the AI thinks about what to do next,
 * parses tool actions from its response, executes them, and observes results.
 * Supports abort, status callbacks, hook integration, and auto skill creation.
 *
 * @example
 * ```ts
 * const loop = new AgentLoop("Fix all TypeScript errors", {
 *   thinkFn: async (prompt) => ai.generate(prompt),
 *   permissionEngine,
 *   onStep: (step) => console.log(step),
 *   onStatus: (status) => console.log(status),
 * });
 * const result = await loop.run();
 * ```
 */
export class AgentLoop {
  private state: LoopState;
  private permissionEngine: PermissionEngine | undefined;
  private thinkFn: ThinkFunction;
  private executeToolFn: ExecuteToolFunction;
  private onStep: ((step: LoopStep) => void) | undefined;
  private onStatus: ((status: string) => void) | undefined;
  private _abort = false;
  private sessionId: string;
  private additionalContext = "";

  /**
   * Creates a new agent loop instance.
   * @param goal - The goal/task description for the agent to accomplish
   * @param options - Configuration options for the loop
   * @param options.maxSteps - Maximum number of think-act steps before stopping (default: 20)
   * @param options.permissionEngine - Permission engine for checking tool access
   * @param options.thinkFn - Function that sends prompts to the AI and returns responses
   * @param options.executeToolFn - Custom tool execution function (defaults to executeTool)
   * @param options.onStep - Callback invoked after each step completes
   * @param options.onStatus - Callback invoked when the loop status changes
   * @param options.sessionId - Unique session identifier (defaults to a random UUID)
   */
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

  /**
   * Runs the agent loop until completion, error, or abort.
   *
   * Executes the think-act-observe cycle in a loop. Fires `loop.start` and
   * `loop.complete` hooks. On successful multi-step tasks (3+ steps),
   * triggers automatic skill creation via `maybeCreateSkill`.
   *
   * @returns A Promise resolving to the final loop state
   * @throws Re-throws any error that occurs during execution after setting status to "error"
   */
  async run(): Promise<LoopState> {
    try {
      await hookRegistry.execute("loop.start", { goal: this.state.goal }, this.sessionId);

      while (
        this.state.status !== "completed" &&
        this.state.status !== "error" &&
        this.state.status !== "aborted"
      ) {
        if (this.state.currentStep >= this.state.maxSteps || this._abort) {
          if (this._abort) {
            this.state.status = "aborted";
            break;
          }
          this.state.status = "error";
          break;
        }

        const step = await this.runSingleStep();
        if (!step.action) {
          break;
        }
      }

      if (this.state.status !== "error" && this.state.status !== "aborted") {
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
          durationMs: this.state.steps[this.state.steps.length - 1]!.timestamp - this.state.steps[0]!.timestamp,
          success: true,
        }).catch(() => {});
      }

      return this.state;
    } catch (err: unknown) {
      this.state.status = "error";
      await hookRegistry.execute("loop.error", { error: getErrorMessage(err) }, this.sessionId);
      throw err;
    }
  }

  /**
   * Aborts the agent loop. Sets internal abort flag and updates state.
   * Safe to call multiple times; only affects non-terminal states.
   */
  abort(): void {
    this._abort = true;
    if (this.state.status !== "completed" && this.state.status !== "error") {
      this.state.status = "aborted";
    }
  }

  /**
   * Appends additional context that will be included in the prompt for each thinking step.
   * Useful for injecting extra instructions or situational awareness mid-loop.
   * @param ctx - Additional context string to append
   */
  setAdditionalContext(ctx: string): void {
    this.additionalContext = ctx;
  }

  /**
   * Executes a single think-act-observe step: thinks, parses action, executes tool, records result.
   * Handles abort detection both before thinking and after tool execution.
   *
   * @returns A Promise resolving to the completed loop step
   */
  async runSingleStep(): Promise<LoopStep> {
    if (this._abort) {
      this.state.status = "aborted";
      const abortedStep: LoopStep = {
        id: this.state.currentStep,
        thought: "Loop aborted by user",
        timestamp: Date.now(),
      };
      this.state.steps.push(abortedStep);
      this.onStep?.(abortedStep);
      return abortedStep;
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

      const pathParam = typeof action.params?.path === "string" ? action.params.path : undefined;
      if (pathParam) {
        const validation = await validateFileAccess(action.tool, pathParam);
        if (!validation.valid && validation.warning) {
          this.additionalContext = (this.additionalContext ? this.additionalContext + "\n" : "") + validation.warning;
        }
      }

      this.state.status = "executing";
      this.onStatus?.("executing");

      try {
        const result = await this.executeToolFn(
          { name: action.tool as ToolCall["name"], params: action.params },
          "build"
        );
        step.observation = JSON.stringify(result);
        if (this._abort) {
          this.state.status = "aborted";
          step.observation = `${step.observation}\n[ABORTED] Loop aborted after tool execution`;
        }
      } catch (err: unknown) {
        step.observation = `Error: ${getErrorMessage(err)}`;
      }
    }

    this.state.steps.push(step);
    this.onStep?.(step);
    this.state.currentStep++;

    await hookRegistry.execute("loop.step", { step }, this.sessionId);

    this.state.status = this._abort ? "aborted" : "observing";
    this.onStatus?.(this.state.status);

    return step;
  }

  /**
   * Sends the current context + goal to the AI and returns its thinking response.
   * @returns A Promise resolving to the trimmed AI response text
   */
  private async think(): Promise<string> {
    const context = this.buildContext();
    const prompt = `You are an autonomous coding agent working on this goal:
${this.state.goal}

Previous steps:
${context}
${this.additionalContext ? `\nAdditional context:\n${this.additionalContext}\n` : ""}

Think about what to do next. If you need to use a tool, respond in this format:
ACTION: tool_name
PARAMS: {"param": "value"}

If the task is complete, respond with:
COMPLETE: brief summary

Your thought:`;

    return (await this.thinkFn(prompt)).trim();
  }

  /**
   * Builds a truncated context string from the last 5 steps.
   * @returns Context string summarizing recent steps with truncated thoughts and observations
   */
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

  /**
   * Parses an ACTION and PARAMS block from the AI's thought text.
   * @param thought - The AI's raw thought text
   * @returns Parsed tool name and params, or null if no ACTION block found
   */
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

  /**
   * Returns a shallow copy of the current loop state.
   * @returns The current loop state (snapshot)
   */
  getState(): LoopState {
    return { ...this.state };
  }
}

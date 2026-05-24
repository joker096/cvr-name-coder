import { AgentLoop } from "./agentLoop";
import { evaluateGoal } from "./goalJudge";
import { saveGoalState } from "./goalSessionStore";
import { GoalEventBroadcaster } from "./goalEventBroadcaster";
import type { PermissionEngine } from "./permissions";
import type { GoalConfig, GoalState, GoalStep, JudgeVerdict } from "../types/goal";
import type { LoopStep } from "../types/agent";
import { getErrorMessage } from "../types/errors";

/**
 * @typedef OrchestratorThinkFunction
 * @description A function that sends a prompt to an AI model and returns its text response.
 *   Used by the orchestrator for both the agent loop and the judge.
 * @param {string} prompt - The prompt to send to the AI model.
 * @returns {Promise<string>} The AI model's text response.
 */
export type OrchestratorThinkFunction = (prompt: string) => Promise<string>;

interface GoalOrchestratorOptions {
  thinkFn: OrchestratorThinkFunction;
  judgeThinkFn?: OrchestratorThinkFunction;
  permissionEngine?: PermissionEngine;
  broadcaster?: GoalEventBroadcaster;
}

/**
 * @class GoalOrchestrator
 * @description Manages the lifecycle of a goal execution: runs an agent loop,
 *   periodically calls a judge to evaluate progress, persists state, and
 *   broadcasts events. Supports abort, token budgeting, and iteration limits.
 */
export class GoalOrchestrator {
  private state: GoalState;
  private loop: AgentLoop;
  private broadcaster: GoalEventBroadcaster;
  private judgeThinkFn: OrchestratorThinkFunction;
  private _abort = false;
  private timeoutTimer?: NodeJS.Timeout;
  private totalTokensEstimate = 0;
  private saveTimeout: NodeJS.Timeout | undefined;

  /**
   * Creates a new GoalOrchestrator instance.
   * @param {GoalConfig} config - The goal configuration including description, criteria, and limits.
   * @param {GoalOrchestratorOptions} options - Runtime options including the think function and permission engine.
   */
  constructor(config: GoalConfig, options: GoalOrchestratorOptions) {
    const id = crypto.randomUUID();
    this.state = {
      id,
      goal: config.goal,
      successCriteria: config.successCriteria || "Goal is fully achieved with concrete evidence.",
      config,
      status: "running",
      currentIteration: 0,
      maxIterations: config.maxIterations || 50,
      steps: [],
      judgeHistory: [],
      totalTokensUsed: 0,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.judgeThinkFn = options.judgeThinkFn || options.thinkFn;
    this.broadcaster = options.broadcaster || new GoalEventBroadcaster();

    const wrappedThinkFn = async (prompt: string): Promise<string> => {
      const result = await options.thinkFn(prompt);
      this.totalTokensEstimate += Math.ceil(result.length / 4);
      return result;
    };

    const loopOpts: {
      maxSteps: number;
      thinkFn: (prompt: string) => Promise<string>;
      onStep: (step: LoopStep) => void;
      sessionId: string;
      permissionEngine?: PermissionEngine;
    } = {
      maxSteps: 999999,
      thinkFn: wrappedThinkFn,
      onStep: (step: LoopStep) => {
        this.broadcaster.broadcast(this.state.id, "goal.step", step);
      },
      sessionId: id,
    };
    if (options.permissionEngine) {
      loopOpts.permissionEngine = options.permissionEngine;
    }
    this.loop = new AgentLoop(config.goal, loopOpts);
  }

  /**
   * Returns a shallow copy of the current goal state.
   * @returns {GoalState} The current goal state snapshot.
   */
  getState(): GoalState {
    return { ...this.state };
  }

  /**
   * Returns the event broadcaster for subscribing to goal events.
   * @returns {GoalEventBroadcaster} The broadcaster instance.
   */
  getBroadcaster(): GoalEventBroadcaster {
    return this.broadcaster;
  }

  /**
   * Aborts the current goal execution gracefully.
   */
  abort(): void {
    this._abort = true;
    this.loop.abort();
  }

  /**
   * Runs the goal orchestration loop until completion, error, or abort.
   * Delegates to the agent loop for step execution and the judge for progress evaluation.
   * @returns {Promise<GoalState>} The final goal state after the run concludes.
   */
  async run(): Promise<GoalState> {
    this.broadcaster.broadcast(this.state.id, "goal.started", { goal: this.state.goal });
    this.debouncedSave();

    const maxDurationMs = (this.state.config.maxDurationMinutes || 120) * 60 * 1000;
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    this.timeoutTimer = setTimeout(() => {
      this._abort = true;
    }, maxDurationMs);

    try {
      while (this.state.status === "running") {
        if (this._abort) {
          this.state.status = "aborted";
          this.state.error = this.state.error || "Aborted by user";
          break;
        }

        if (this.state.currentIteration >= this.state.maxIterations) {
          this.state.status = "error";
          this.state.error = `Max iterations reached (${this.state.maxIterations})`;
          break;
        }

        if (this.totalTokensEstimate >= (this.state.config.maxTokens || 500000)) {
          this.state.status = "error";
          this.state.error = "Token budget exhausted";
          break;
        }

        const loopStep = await this.loop.runSingleStep();
        const goalStep = this.mapLoopStep(loopStep);
        this.state.steps.push(goalStep);
        this.state.currentIteration++;
        this.state.updatedAt = Date.now();
        this.debouncedSave();

        const verdict = await this.callJudge(goalStep);
        this.broadcaster.broadcast(this.state.id, "goal.judge", verdict);

        if (verdict.verdict === "COMPLETE") {
          this.state.status = "completed";
          this.state.completedAt = Date.now();
          break;
        }

        if (verdict.nextHint) {
          this.loop.setAdditionalContext(`Next step guidance: ${verdict.nextHint}`);
        } else {
          this.loop.setAdditionalContext("");
        }
      }
    } catch (err: unknown) {
      this.state.status = "error";
      this.state.error = getErrorMessage(err);
      this.broadcaster.broadcast(this.state.id, "goal.error", { error: this.state.error });
    } finally {
      if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
      this.state.updatedAt = Date.now();
      this.state.totalTokensUsed = this.totalTokensEstimate;
      await this.flushSave();

      if (this.state.status === "completed") {
        this.broadcaster.broadcast(this.state.id, "goal.complete", { state: this.state });
      } else if (this.state.status === "aborted") {
        this.broadcaster.broadcast(this.state.id, "goal.aborted", { state: this.state });
      }
    }

    return this.state;
  }

  private debouncedSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      saveGoalState(this.state).catch(() => {});
    }, 300);
    if (this.saveTimeout && typeof this.saveTimeout.unref === "function") {
      this.saveTimeout.unref();
    }
  }

  private async flushSave(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = undefined;
    }
    await saveGoalState(this.state);
  }

  private mapLoopStep(loopStep: LoopStep): GoalStep {
    const goalStep: GoalStep = {
      iteration: this.state.currentIteration + 1,
      thought: loopStep.thought,
      timestamp: loopStep.timestamp,
    };
    if (loopStep.action) {
      goalStep.action = loopStep.action;
    }
    if (loopStep.observation) {
      goalStep.observation = loopStep.observation;
    }
    return goalStep;
  }

  private async callJudge(step: GoalStep): Promise<JudgeVerdict> {
    const wrappedJudgeFn = async (prompt: string): Promise<string> => {
      const result = await this.judgeThinkFn(prompt);
      this.totalTokensEstimate += Math.ceil(result.length / 4);
      return result;
    };

    const verdict = await evaluateGoal(
      {
        goal: this.state.goal,
        successCriteria: this.state.successCriteria,
        steps: this.state.steps,
        lastObservation: step.observation || "",
      },
      wrappedJudgeFn
    );
    this.state.judgeHistory.push(verdict);
    return verdict;
  }
}

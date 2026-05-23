import { AgentLoop } from "./agentLoop";
import { evaluateGoal } from "./goalJudge";
import { saveGoalState } from "./goalSessionStore";
import { GoalEventBroadcaster } from "./goalEventBroadcaster";
import type { PermissionEngine } from "./permissions";
import type { GoalConfig, GoalState, GoalStep, JudgeVerdict } from "../types/goal";
import type { LoopStep } from "../types/agent";
import { getErrorMessage } from "../types/errors";

export type OrchestratorThinkFunction = (prompt: string) => Promise<string>;

interface GoalOrchestratorOptions {
  thinkFn: OrchestratorThinkFunction;
  judgeThinkFn?: OrchestratorThinkFunction;
  permissionEngine?: PermissionEngine;
  broadcaster?: GoalEventBroadcaster;
}

export class GoalOrchestrator {
  private state: GoalState;
  private loop: AgentLoop;
  private broadcaster: GoalEventBroadcaster;
  private judgeThinkFn: OrchestratorThinkFunction;
  private _abort = false;
  private timeoutTimer?: NodeJS.Timeout;
  private totalTokensEstimate = 0;
  private saveTimeout: NodeJS.Timeout | undefined;

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

  getState(): GoalState {
    return { ...this.state };
  }

  getBroadcaster(): GoalEventBroadcaster {
    return this.broadcaster;
  }

  abort(): void {
    this._abort = true;
    this.loop.abort();
  }

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

export interface GoalConfig {
  goal: string;
  successCriteria?: string;
  maxIterations?: number;
  maxTokens?: number;
  maxDurationMinutes?: number;
  provider: string;
  model: string;
  apiKey?: string;
  agent?: string;
}

export interface GoalStep {
  iteration: number;
  thought: string;
  action?: { tool: string; params: Record<string, unknown> };
  observation?: string;
  timestamp: number;
}

export interface JudgeVerdict {
  iteration: number;
  verdict: 'COMPLETE' | 'INCOMPLETE';
  reason: string;
  nextHint?: string;
  timestamp: number;
}

export interface GoalState {
  id: string;
  goal: string;
  successCriteria: string;
  config: GoalConfig;
  status: 'running' | 'paused' | 'completed' | 'error' | 'aborted';
  currentIteration: number;
  maxIterations: number;
  steps: GoalStep[];
  judgeHistory: JudgeVerdict[];
  totalTokensUsed: number;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
}

export type GoalEventType =
  | 'goal.started'
  | 'goal.step'
  | 'goal.judge'
  | 'goal.action'
  | 'goal.observation'
  | 'goal.complete'
  | 'goal.error'
  | 'goal.aborted';

export interface GoalEvent {
  type: GoalEventType;
  goalId: string;
  timestamp: number;
  data: unknown;
}

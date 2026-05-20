export interface LoopStep {
  id: number;
  thought: string;
  action?: {
    tool: string;
    params: Record<string, unknown>;
  };
  observation?: string;
  timestamp: number;
}

export interface LoopState {
  goal: string;
  steps: LoopStep[];
  status: "planning" | "executing" | "observing" | "completed" | "error";
  currentStep: number;
  maxSteps: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  maxSteps: number;
  model: string;
  provider: string;
}

export interface Plan {
  goal: string;
  tasks: Array<{
    id: number;
    description: string;
    dependencies: number[];
    status: "pending" | "in_progress" | "completed" | "failed";
  }>;
}

export interface AgentLoopEvent {
  type: "thought" | "action" | "observation" | "status" | "complete" | "error";
  data: string | LoopStep | { status: string } | { error: string };
  timestamp: number;
}

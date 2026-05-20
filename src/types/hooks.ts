export type HookPoint =
  | "tool.before"
  | "tool.after"
  | "message.before"
  | "message.after"
  | "file.write.before"
  | "file.write.after"
  | "loop.start"
  | "loop.step"
  | "loop.complete"
  | "loop.error";

export interface ToolBeforeData {
  tool: string;
  params: Record<string, unknown>;
}

export interface ToolAfterData {
  tool: string;
  params: Record<string, unknown>;
  result: string;
  success: boolean;
}

export interface MessageBeforeData {
  role: "user" | "assistant";
  content: string;
}

export interface MessageAfterData {
  role: "user" | "assistant";
  content: string;
  tokens?: number;
}

export interface FileWriteBeforeData {
  path: string;
  content: string;
}

export interface FileWriteAfterData {
  path: string;
  content: string;
  success: boolean;
}

export interface LoopStartData {
  goal: string;
  agentId?: string;
}

export interface LoopStepData {
  step: import("./agent").LoopStep;
}

export interface LoopCompleteData {
  state: import("./agent").LoopState;
}

export interface LoopErrorData {
  error: string | Error;
  agentId?: string;
  step?: number;
}

export type HookDataMap = {
  "tool.before": ToolBeforeData;
  "tool.after": ToolAfterData;
  "message.before": MessageBeforeData;
  "message.after": MessageAfterData;
  "file.write.before": FileWriteBeforeData;
  "file.write.after": FileWriteAfterData;
  "loop.start": LoopStartData;
  "loop.step": LoopStepData;
  "loop.complete": LoopCompleteData;
  "loop.error": LoopErrorData;
};

export interface HookContext<P extends HookPoint = HookPoint> {
  hookPoint: P;
  data: HookDataMap[P];
  timestamp: number;
  sessionId: string;
}

export type HookHandler<P extends HookPoint = HookPoint> = (
  ctx: HookContext<P>
) => Promise<void> | void;

export interface HookRegistration<P extends HookPoint = HookPoint> {
  id: string;
  hookPoint: P;
  handler: HookHandler<P>;
  priority: number;
}

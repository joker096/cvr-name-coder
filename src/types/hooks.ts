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

export interface HookContext {
  hookPoint: HookPoint;
  data: any;
  timestamp: number;
  sessionId: string;
}

export type HookHandler = (ctx: HookContext) => Promise<void> | void;

export interface HookRegistration {
  id: string;
  hookPoint: HookPoint;
  handler: HookHandler;
  priority: number; // Higher = runs first
}

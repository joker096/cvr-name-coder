import { PermissionEngine } from "./permissions.js";
import { AgentLoop } from "./agentLoop.js";
import { SubagentManager } from "./subagentManager.js";

export let permissionEngine: PermissionEngine | undefined;
export const agentLoopMap = new Map<string, AgentLoop>();
export const subagentManager = new SubagentManager();

export function setPermissionEngine(pe: PermissionEngine) {
  permissionEngine = pe;
}

import { PermissionEngine } from "./permissions.js";
import { AgentLoop } from "./agentLoop.js";
import { SubagentManager } from "./subagentManager.js";

/** Global permission engine instance, set once during server startup. */
export let permissionEngine: PermissionEngine | undefined;

/** Map of session IDs to their active AgentLoop instances. */
export const agentLoopMap = new Map<string, AgentLoop>();

/** Global subagent manager for spawning and tracking parallel sub-agents. */
export const subagentManager = new SubagentManager();

/**
 * Sets the global permission engine instance.
 *
 * @param pe - The initialized {@link PermissionEngine} to use for all tool permission checks.
 */
export function setPermissionEngine(pe: PermissionEngine) {
  permissionEngine = pe;
}

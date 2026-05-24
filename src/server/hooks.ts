import { HookPoint, HookContext, HookRegistration, HookDataMap } from "../types/hooks";
import { log } from "./logger.js";

/**
 * @class HookRegistry
 * @description Manages registration and execution of hooks at various lifecycle points.
 *   Hooks are sorted by priority (highest first) and executed sequentially.
 * @internal
 */
class HookRegistry {
  private hooks = new Map<HookPoint, HookRegistration[]>();

  /**
   * Registers a hook to be executed at the specified hook point.
   * @param {HookRegistration<P>} reg - The hook registration containing id, hookPoint, handler, and priority.
   * @typeParam P - The hook point type parameter.
   */
  register<P extends HookPoint>(reg: HookRegistration<P>): void {
    const existing = this.hooks.get(reg.hookPoint) || [];
    existing.push(reg as unknown as HookRegistration);
    existing.sort((a, b) => b.priority - a.priority);
    this.hooks.set(reg.hookPoint, existing);
  }

  /**
   * Unregisters a hook by its unique ID.
   * @param {string} id - The identifier of the hook to remove.
   */
  unregister(id: string): void {
    for (const [point, regs] of this.hooks) {
      this.hooks.set(
        point,
        regs.filter((r) => r.id !== id)
      );
    }
  }

  /**
   * Executes all registered hooks for the given hook point in priority order.
   * Hook errors are caught and logged; they do not prevent other hooks from running.
   * @param {P} hookPoint - The lifecycle hook point.
   * @param {HookDataMap[P]} data - Data specific to this hook point.
   * @param {string} sessionId - The current session identifier.
   * @typeParam P - The hook point type parameter.
   * @returns {Promise<void>} Resolves when all hooks have executed.
   */
  async execute<P extends HookPoint>(
    hookPoint: P,
    data: HookDataMap[P],
    sessionId: string
  ): Promise<void> {
    const regs = this.hooks.get(hookPoint) || [];
    const ctx: HookContext<P> = { hookPoint, data, timestamp: Date.now(), sessionId };

    for (const reg of regs) {
      try {
        await (reg.handler as (ctx: HookContext<P>) => Promise<void> | void)(ctx);
      } catch (err: unknown) {
        log.error(`Hook failed at ${hookPoint}`, err instanceof Error ? err : undefined, { hookId: reg.id });
      }
    }
  }

  /**
   * Lists registered hooks, optionally filtered by hook point.
   * @param {HookPoint} [hookPoint] - Optional hook point to filter by.
   * @returns {HookRegistration[]} An array of registered hook registrations.
   */
  list(hookPoint?: HookPoint): HookRegistration[] {
    if (hookPoint) return this.hooks.get(hookPoint) || [];
    return Array.from(this.hooks.values()).flat();
  }
}

/**
 * Singleton hook registry instance for global hook management.
 */
export const hookRegistry = new HookRegistry();

/**
 * Registers built-in system hooks for logging tool and file write events.
 * Called during server initialization.
 */
export function registerBuiltinHooks(): void {
  hookRegistry.register({
    id: "builtin.log-tools",
    hookPoint: "tool.after",
    priority: 0,
    handler: (ctx) => {
      log.debug("Tool executed", { tool: ctx.data.tool, result: ctx.data.result?.substring?.(0, 100) });
    },
  });

  hookRegistry.register({
    id: "builtin.log-files",
    hookPoint: "file.write.after",
    priority: 0,
    handler: (ctx) => {
      log.debug("File written", { path: ctx.data.path });
    },
  });
}

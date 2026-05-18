import { HookPoint, HookContext, HookRegistration } from "../types/hooks";

class HookRegistry {
  private hooks = new Map<HookPoint, HookRegistration[]>();

  register(reg: HookRegistration): void {
    const existing = this.hooks.get(reg.hookPoint) || [];
    existing.push(reg);
    // Sort by priority descending
    existing.sort((a, b) => b.priority - a.priority);
    this.hooks.set(reg.hookPoint, existing);
  }

  unregister(id: string): void {
    for (const [point, regs] of this.hooks) {
      this.hooks.set(
        point,
        regs.filter((r) => r.id !== id)
      );
    }
  }

  async execute(hookPoint: HookPoint, data: any, sessionId: string): Promise<void> {
    const regs = this.hooks.get(hookPoint) || [];
    const ctx: HookContext = { hookPoint, data, timestamp: Date.now(), sessionId };

    for (const reg of regs) {
      try {
        await reg.handler(ctx);
      } catch (err: any) {
        console.error(`Hook ${reg.id} failed at ${hookPoint}:`, err.message);
      }
    }
  }

  list(hookPoint?: HookPoint): HookRegistration[] {
    if (hookPoint) return this.hooks.get(hookPoint) || [];
    return Array.from(this.hooks.values()).flat();
  }
}

export const hookRegistry = new HookRegistry();

// Helper to register built-in hooks
export function registerBuiltinHooks(): void {
  // Log all tool executions
  hookRegistry.register({
    id: "builtin.log-tools",
    hookPoint: "tool.after",
    priority: 0,
    handler: (ctx) => {
      console.log(`[HOOK] Tool executed:`, ctx.data.tool, "Result:", ctx.data.result?.substring?.(0, 100));
    },
  });

  // Log file writes
  hookRegistry.register({
    id: "builtin.log-files",
    hookPoint: "file.write.after",
    priority: 0,
    handler: (ctx) => {
      console.log(`[HOOK] File written:`, ctx.data.path);
    },
  });
}

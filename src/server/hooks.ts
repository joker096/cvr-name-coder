import { HookPoint, HookContext, HookRegistration, HookDataMap } from "../types/hooks";
import { getErrorMessage } from "../types/errors";

class HookRegistry {
  private hooks = new Map<HookPoint, HookRegistration[]>();

  register<P extends HookPoint>(reg: HookRegistration<P>): void {
    const existing = this.hooks.get(reg.hookPoint) || [];
    existing.push(reg as unknown as HookRegistration);
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
        console.error(`Hook ${reg.id} failed at ${hookPoint}:`, getErrorMessage(err));
      }
    }
  }

  list(hookPoint?: HookPoint): HookRegistration[] {
    if (hookPoint) return this.hooks.get(hookPoint) || [];
    return Array.from(this.hooks.values()).flat();
  }
}

export const hookRegistry = new HookRegistry();

export function registerBuiltinHooks(): void {
  hookRegistry.register({
    id: "builtin.log-tools",
    hookPoint: "tool.after",
    priority: 0,
    handler: (ctx) => {
      console.log(
        `[HOOK] Tool executed:`,
        ctx.data.tool,
        "Result:",
        ctx.data.result?.substring?.(0, 100)
      );
    },
  });

  hookRegistry.register({
    id: "builtin.log-files",
    hookPoint: "file.write.after",
    priority: 0,
    handler: (ctx) => {
      console.log(`[HOOK] File written:`, ctx.data.path);
    },
  });
}

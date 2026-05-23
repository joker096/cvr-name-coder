import type { Application, Request, Response } from "express";
import { GoalOrchestrator } from "../goalOrchestrator.js";
import { loadGoalState, listGoalStates } from "../goalSessionStore.js";
import type { PermissionEngine } from "../permissions.js";
import type { GoalConfig } from "../../types/goal.js";

export interface GoalRoutesOptions {
  generateFn: (prompt: string, contents?: unknown[], provider?: string, localUrl?: string, modelName?: string, apiKey?: string, temperature?: number, maxTokens?: number, useCache?: boolean) => Promise<string>;
  permissionEngine?: PermissionEngine;
}

export function registerRoutes(app: Application, options: GoalRoutesOptions): void {
  const { generateFn: generateAIContent, permissionEngine } = options;
  const activeGoals = new Map<string, GoalOrchestrator>();

  app.post("/api/goal", async (req: Request, res: Response) => {
    try {
      const config: GoalConfig = req.body;
      if (!config.provider) {
        res.status(400).json({ error: "AI provider not configured. Please select a provider in Settings." });
        return;
      }
      const opts: { thinkFn: (p: string) => Promise<string>; permissionEngine?: PermissionEngine } = {
        thinkFn: (prompt: string) =>
          generateAIContent(prompt, [], config.provider, undefined, config.model, config.apiKey),
      };
      if (permissionEngine) opts.permissionEngine = permissionEngine;
      const orchestrator = new GoalOrchestrator(config, opts);
      const goalId = orchestrator.getState().id;
      activeGoals.set(goalId, orchestrator);
      const cleanup = (event: any) => {
        if (
          event.type === "goal.complete" ||
          event.type === "goal.aborted" ||
          event.type === "goal.error"
        ) {
          orchestrator.getBroadcaster().off("event", cleanup);
          activeGoals.delete(goalId);
        }
      };
      orchestrator.getBroadcaster().on("event", cleanup);
      orchestrator.run().catch((err: any) => console.error("Goal orchestrator error:", err));
      res.json({ id: goalId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/goal/:id", async (req: Request, res: Response) => {
    const goalId = req.params.id!;
    const orchestrator = activeGoals.get(goalId);
    if (orchestrator) {
      res.json(orchestrator.getState());
      return;
    }
    const fromDisk = await loadGoalState(goalId);
    if (fromDisk) {
      res.json(fromDisk);
      return;
    }
    res.status(404).json({ error: "Goal not found" });
  });

  app.get("/api/goal/:id/events", (req: Request, res: Response) => {
    const goalId = req.params.id!;
    const orchestrator = activeGoals.get(goalId);
    if (!orchestrator) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const broadcaster = orchestrator.getBroadcaster();
    const handler = (event: any) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      if (
        event.type === "goal.complete" ||
        event.type === "goal.aborted" ||
        event.type === "goal.error"
      ) {
        broadcaster.off("event", handler);
      }
    };
    broadcaster.on("event", handler);

    req.on("close", () => {
      broadcaster.off("event", handler);
    });
  });

  app.post("/api/goal/:id/abort", (req: Request, res: Response) => {
    const goalId = req.params.id!;
    const orchestrator = activeGoals.get(goalId);
    if (!orchestrator) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    orchestrator.abort();
    res.json({ aborted: true });
  });

  app.post("/api/goal/:id/resume", async (req: Request, res: Response) => {
    const goalId = req.params.id!;
    const state = await loadGoalState(goalId);
    if (!state) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    if (state.status !== "paused" && state.status !== "error") {
      res.status(400).json({ error: "Goal cannot be resumed from status: " + state.status });
      return;
    }
    res.status(501).json({ error: "Resume is not yet implemented. Start a new goal instead." });
  });

  app.get("/api/goals", async (_req: Request, res: Response) => {
    const states = await listGoalStates();
    res.json({ goals: states });
  });
}

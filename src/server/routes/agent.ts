import type { Application, Request, Response } from "express";
import { randomUUID } from "crypto";
import { AgentLoop } from "../agentLoop.js";
import { createPlan } from "../planner.js";
import { generateWithDualModel } from "../providers.js";
import { permissionEngine, agentLoopMap, subagentManager } from "../serverState.js";
import { setActiveLoops, incrementError } from "../standalone/health.js";
import { validateBody, AgentLoopSchema, AgentPlanSchema, PermissionRequestSchema, PermissionResolveSchema, SubagentSpawnSchema } from "../validation.js";
import { buildDualModelConfig } from "../dualModel.js";
import { log } from "../logger.js";

export function registerRoutes(app: Application) {
  app.post("/api/agent/loop", validateBody(AgentLoopSchema), async (req: Request, res: Response) => {
    try {
      const { goal, provider, model, thinkingProvider, thinkingModel, thinkingLocalUrl } = req.body;
      const id = randomUUID();
      const dualCfg = buildDualModelConfig({
        aiProvider: provider,
        aiModel: model,
        multiModelEnabled: Boolean(thinkingProvider && thinkingModel),
        thinkingProvider,
        thinkingModel,
        thinkingLocalUrl,
      });

      const loop = new AgentLoop(goal, {
        maxSteps: 20,
        permissionEngine: permissionEngine!,
        thinkFn: (prompt: string) => generateWithDualModel(prompt, [], dualCfg, 'think'),
        sessionId: id,
      });

      agentLoopMap.set(id, loop);
      setActiveLoops(agentLoopMap.size);
      loop.run()
        .then(() => { agentLoopMap.delete(id); setActiveLoops(agentLoopMap.size); })
        .catch((err) => {
          log.error(`Agent loop error`, err instanceof Error ? err : undefined, { id });
          agentLoopMap.delete(id);
          setActiveLoops(agentLoopMap.size);
          incrementError();
        });

      res.json({ id, state: loop.getState() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/agent/loop/:id", (req: Request, res: Response) => {
    const loop = agentLoopMap.get(req.params.id!);
    if (!loop) return res.status(404).json({ error: "Loop not found" });
    return res.json(loop.getState());
  });

  app.post("/api/agent/loop/:id/abort", (req: Request, res: Response) => {
    const loop = agentLoopMap.get(req.params.id!);
    if (!loop) return res.status(404).json({ error: "Loop not found" });
    loop.abort();
    return res.json({ aborted: true });
  });

  app.post("/api/agent/plan", validateBody(AgentPlanSchema), async (req: Request, res: Response) => {
    try {
      const { goal, provider, model, thinkingProvider, thinkingModel, thinkingLocalUrl } = req.body;
      const dualCfg = buildDualModelConfig({
        aiProvider: provider,
        aiModel: model,
        multiModelEnabled: Boolean(thinkingProvider && thinkingModel),
        thinkingProvider,
        thinkingModel,
        thinkingLocalUrl,
      });
      const plan = await createPlan(goal, (prompt: string) =>
        generateWithDualModel(prompt, [], dualCfg, 'think')
      );
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/subagents/spawn", validateBody(SubagentSpawnSchema), async (req: Request, res: Response) => {
    try {
      const { goal, agentConfig, provider, model, thinkingProvider, thinkingModel, thinkingLocalUrl } = req.body;
      const dualCfg = buildDualModelConfig({
        aiProvider: provider,
        aiModel: model,
        multiModelEnabled: Boolean(thinkingProvider && thinkingModel),
        thinkingProvider,
        thinkingModel,
        thinkingLocalUrl,
      });
      const task = await subagentManager.spawn(
        req.body.parentId || "main",
        goal,
        agentConfig,
        (prompt: string) => generateWithDualModel(prompt, [], dualCfg, 'think')
      );
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/subagents", (_req: Request, res: Response) => {
    const tasks = subagentManager.listTasks();
    res.json({ tasks });
  });

  app.post("/api/subagents/:id/abort", async (req: Request, res: Response) => {
    await subagentManager.abort(req.params.id!);
    res.json({ aborted: true });
  });

  app.post("/api/permissions/check", validateBody(PermissionRequestSchema), (req: Request, res: Response) => {
    if (!permissionEngine) return res.status(503).json({ error: "Permission engine not initialized" });
    const result = permissionEngine.check(req.body);
    return res.json(result);
  });

  app.post("/api/permissions/ask", validateBody(PermissionRequestSchema), (req: Request, res: Response) => {
    if (!permissionEngine) return res.status(503).json({ error: "Permission engine not initialized" });
    const request = req.body;
    const check = permissionEngine.check(request);
    if (check.action === "allow") {
      return res.json({ action: "allow" });
    }
    if (check.action === "deny") {
      return res.json({ action: "deny" });
    }
    const pending = permissionEngine.createPending(request);
    return res.json({ action: "ask", pending });
  });

  app.get("/api/permissions/pending", (_req: Request, res: Response) => {
    if (!permissionEngine) return res.json({ pending: [] });
    return res.json({ pending: permissionEngine.listPending() });
  });

  app.get("/api/permissions/pending/:id", (req: Request, res: Response) => {
    if (!permissionEngine) return res.status(503).json({ error: "Permission engine not initialized" });
    const pending = permissionEngine.getPending(req.params.id!);
    if (!pending) return res.status(404).json({ error: "Not found" });
    return res.json(pending);
  });

  app.post("/api/permissions/resolve/:id", validateBody(PermissionResolveSchema), (req: Request, res: Response) => {
    if (!permissionEngine) return res.status(503).json({ error: "Permission engine not initialized" });
    const { approved } = req.body;
    permissionEngine.resolve(req.params.id!, approved === true);
    return res.json({ resolved: true });
  });
}

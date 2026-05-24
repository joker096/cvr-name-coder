import type { Application, Request, Response } from "express";
import { getPlugins, enablePlugin, disablePlugin } from "../pluginManager.js";
import { cronScheduler } from "../cronScheduler.js";
import { hookRegistry } from "../hooks.js";
import { getCosts, resetCosts } from "../costTracker.js";
import { getSyncStatus, exportSync, importSync, getSyncConfig, saveSyncConfig, resolveConflictsManually } from "../teamSync.js";
import { runPromptTest } from "../promptTester.js";
import { getPeers, getShares, publishShare, isP2PActive } from "../p2pSync.js";
import { validateBody, CronTaskSchema } from "../validation.js";

/**
 * Registers ecosystem management API routes on the Express application.
 *
 * Routes registered:
 * - `GET /api/plugins` — Lists all plugins with their id, name, version, and enabled status.
 * - `POST /api/plugins/:id/enable` — Enables a plugin by ID.
 * - `POST /api/plugins/:id/disable` — Disables a plugin by ID.
 * - `GET /api/cron` — Lists all scheduled cron tasks.
 * - `POST /api/cron` — Creates a new cron task (validated against CronTaskSchema).
 * - `DELETE /api/cron/:id` — Removes a cron task by ID.
 * - `POST /api/cron/:id/enable` — Enables a cron task by ID.
 * - `POST /api/cron/:id/disable` — Disables a cron task by ID.
 * - `GET /api/hooks` — Lists all registered hooks.
 * - `POST /api/hooks/register` — Registers a new hook (disabled in production).
 * - `POST /api/hooks/unregister` — Unregisters a hook (disabled in production).
 * - `GET /api/costs` — Retrieves accumulated AI cost data.
 * - `POST /api/costs/reset` — Resets cost tracking.
 * - `GET /api/sync/status` — Returns team sync status.
 * - `POST /api/sync/export` — Exports sync data.
 * - `POST /api/sync/import` — Imports sync data.
 * - `GET /api/sync/config` — Returns sync configuration.
 * - `POST /api/sync/config` — Saves sync configuration.
 * - `POST /api/sync/resolve` — Manually resolves sync conflicts.
 * - `POST /api/prompt-test` — Runs a prompt variant test.
 * - `GET /api/p2p/status` — Returns P2P network status (active, peers, shares).
 * - `GET /api/p2p/peers` — Lists connected P2P peers.
 * - `GET /api/p2p/shares` — Lists shared fragments, optionally filtered by type.
 * - `POST /api/p2p/share` — Publishes a new P2P share fragment.
 *
 * @param app - The Express Application instance to register routes on.
 */
export function registerRoutes(app: Application) {
  app.get("/api/plugins", async (_req: Request, res: Response) => {
    try {
      const plugins = getPlugins();
      return res.json({ plugins: plugins.map((p) => ({ id: p.manifest.id, name: p.manifest.name, version: p.manifest.version, enabled: p.enabled })) });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/plugins/:id/enable", (req: Request, res: Response) => {
    enablePlugin(req.params.id!);
    return res.json({ enabled: true });
  });

  app.post("/api/plugins/:id/disable", (req: Request, res: Response) => {
    disablePlugin(req.params.id!);
    return res.json({ disabled: true });
  });

  app.get("/api/cron", (_req: Request, res: Response) => {
    return res.json({ tasks: cronScheduler.getTasks() });
  });

  app.post("/api/cron", validateBody(CronTaskSchema), (req: Request, res: Response) => {
    try {
      const task = cronScheduler.addTask(req.body);
      return res.json(task);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/cron/:id", (req: Request, res: Response) => {
    cronScheduler.removeTask(req.params.id!);
    return res.json({ removed: true });
  });

  app.post("/api/cron/:id/enable", (req: Request, res: Response) => {
    cronScheduler.enableTask(req.params.id!);
    return res.json({ enabled: true });
  });

  app.post("/api/cron/:id/disable", (req: Request, res: Response) => {
    cronScheduler.disableTask(req.params.id!);
    return res.json({ disabled: true });
  });

  app.get("/api/hooks", (_req: Request, res: Response) => {
    res.json({ hooks: hookRegistry.list() });
  });

  app.post("/api/hooks/register", (req: Request, res: Response) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Hook registration disabled in production" });
    }
    try {
      const { id, hookPoint, handler, priority = 0 } = req.body;
      if (!id || !hookPoint || !handler) {
        return res.status(400).json({ error: "Missing id, hookPoint, or handler" });
      }
      // Note: handler is a string representation; in a real scenario, this would be a function reference
      // For dev API, we accept it but log a warning that runtime function registration is limited
      hookRegistry.register({ id, hookPoint, handler: () => {}, priority });
      return res.json({ registered: true, id, hookPoint });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/hooks/unregister", (req: Request, res: Response) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Hook unregistration disabled in production" });
    }
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Missing id" });
      }
      hookRegistry.unregister(id);
      return res.json({ unregistered: true, id });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/costs", async (_req: Request, res: Response) => {
    try {
      const costs = await getCosts();
      return res.json(costs);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/costs/reset", async (_req: Request, res: Response) => {
    try {
      await resetCosts();
      return res.json({ reset: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/sync/status", (_req: Request, res: Response) => {
    res.json(getSyncStatus());
  });

  app.post("/api/sync/export", async (_req: Request, res: Response) => {
    const result = await exportSync();
    res.json(result);
  });

  app.post("/api/sync/import", async (_req: Request, res: Response) => {
    const result = await importSync();
    res.json(result);
  });

  app.get("/api/sync/config", (_req: Request, res: Response) => {
    res.json(getSyncConfig());
  });

  app.post("/api/sync/config", async (req: Request, res: Response) => {
    try {
      await saveSyncConfig(req.body);
      res.json({ saved: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/sync/resolve", async (req: Request, res: Response) => {
    try {
      const { resolutions } = req.body;
      await resolveConflictsManually(resolutions);
      res.json({ resolved: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/prompt-test", async (req: Request, res: Response) => {
    try {
      const { task, variants, provider, model, localUrl, apiKey, temperature, maxTokens, judgeProvider, judgeModel } = req.body;
      if (!task || !variants || !Array.isArray(variants) || variants.length < 2 || !provider) {
        res.status(400).json({ error: "task, variants (min 2), and provider are required" });
        return;
      }
      const result = await runPromptTest({
        task,
        variants,
        provider,
        model,
        localUrl,
        apiKey,
        temperature,
        maxTokens,
        judgeProvider,
        judgeModel,
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/p2p/status", (_req: Request, res: Response) => {
    res.json({
      active: isP2PActive(),
      peers: getPeers(),
      shares: getShares().length,
    });
  });

  app.get("/api/p2p/peers", (_req: Request, res: Response) => {
    res.json({ peers: getPeers() });
  });

  app.get("/api/p2p/shares", (req: Request, res: Response) => {
    const type = req.query.type as string | undefined;
    res.json({ shares: getShares(type) });
  });

  app.post("/api/p2p/share", (req: Request, res: Response) => {
    try {
      const { type, name, content } = req.body;
      if (!type || !name || !content) {
        res.status(400).json({ error: "type, name, and content are required" });
        return;
      }
      const fragment = publishShare(type, name, content);
      res.json(fragment);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}

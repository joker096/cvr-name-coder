import type { Application, Request, Response } from "express";
import { getMarketItems, publishItem, downloadItem, removeItem, addReview, getReviews, getTags, getStats } from "../agentMarketplace.js";
import { generateCIPipeline, PIPELINE_TEMPLATES } from "../ciPipeline.js";

/**
 * Registers marketplace and CI pipeline API routes on the Express application.
 *
 * Routes include:
 * - GET /api/marketplace - List marketplace items with optional filters (type, tag, search)
 * - GET /api/marketplace/stats - Get marketplace statistics
 * - POST /api/marketplace/publish - Publish a new marketplace item
 * - GET /api/marketplace/:id - Download a specific marketplace item
 * - DELETE /api/marketplace/:id - Remove a marketplace item
 * - POST /api/marketplace/:id/review - Add a review to a marketplace item
 * - GET /api/marketplace/:id/reviews - Get reviews for a marketplace item
 * - POST /api/ci/generate - Generate a CI pipeline configuration
 * - GET /api/ci/templates - List available CI pipeline templates
 *
 * @param app - The Express Application instance to register routes on
 */
export function registerRoutes(app: Application) {
  app.get("/api/marketplace", async (req: Request, res: Response) => {
    try {
      const { type, tag, search } = req.query;
      const items = getMarketItems(
        type as string | undefined,
        tag as string | undefined,
        search as string | undefined
      );
      res.json({ items, stats: getStats(), tags: getTags() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/marketplace/stats", (_req: Request, res: Response) => {
    res.json(getStats());
  });

  app.post("/api/marketplace/publish", async (req: Request, res: Response) => {
    try {
      const { type, name, description, content, author, version, tags } = req.body;
      if (!type || !name || !content) {
        res.status(400).json({ error: "type, name, and content are required" });
        return;
      }
      const item = await publishItem(type, name, description || "", content, author, version, tags);
      res.json(item);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/marketplace/:id", async (req: Request, res: Response) => {
    try {
      const item = await downloadItem(req.params.id!);
      if (!item) { res.status(404).json({ error: "Item not found" }); return; }
      res.json(item);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/marketplace/:id", async (req: Request, res: Response) => {
    try {
      const ok = await removeItem(req.params.id!);
      res.json({ removed: ok });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/marketplace/:id/review", async (req: Request, res: Response) => {
    try {
      const { rating, text, author } = req.body;
      if (!rating) { res.status(400).json({ error: "rating required (1-5)" }); return; }
      const review = await addReview(req.params.id!, rating, text || "", author);
      res.json(review);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/marketplace/:id/reviews", (req: Request, res: Response) => {
    res.json({ reviews: getReviews(req.params.id!) });
  });

  app.post("/api/ci/generate", async (req: Request, res: Response) => {
    try {
      const { pipelineType, projectName, nodeVersion, buildCommand, testCommand, lintCommand, typeCheckCommand, deployTarget, dockerfile, customSteps } = req.body;
      if (!pipelineType || !projectName) {
        res.status(400).json({ error: "pipelineType and projectName are required" });
        return;
      }
      const result = await generateCIPipeline({
        pipelineType, projectName, nodeVersion, buildCommand, testCommand, lintCommand, typeCheckCommand, deployTarget, dockerfile, customSteps,
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/ci/templates", (_req: Request, res: Response) => {
    res.json({ templates: PIPELINE_TEMPLATES });
  });
}

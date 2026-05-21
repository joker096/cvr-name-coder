import type { Application, Request, Response } from "express";
import { setTrackerConfig, createIssue as createTrackerIssue, listIssues as listTrackerIssues, getIssue as getTrackerIssue, addComment as addTrackerComment } from "../issueTracker.js";

export function registerRoutes(app: Application) {
  app.post("/api/tracker/config", (req: Request, res: Response) => {
    try {
      const { type, token, baseUrl, repo, project } = req.body;
      if (!type || !token) {
        res.status(400).json({ error: "type and token are required" });
        return;
      }
      setTrackerConfig({ type, token, baseUrl, repo, project });
      res.json({ configured: true, type });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tracker/issues", async (req: Request, res: Response) => {
    try {
      const { title, description, priority, labels } = req.body;
      if (!title) { res.status(400).json({ error: "title required" }); return; }
      const issue = await createTrackerIssue({ title, description, priority, labels });
      res.json(issue);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tracker/issues", async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const issues = await listTrackerIssues(status, limit);
      res.json({ issues });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tracker/issues/:key", async (req: Request, res: Response) => {
    try {
      const issue = await getTrackerIssue(req.params.key!);
      res.json(issue);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tracker/issues/:key/comment", async (req: Request, res: Response) => {
    try {
      const { body } = req.body;
      if (!body) { res.status(400).json({ error: "body required" }); return; }
      await addTrackerComment(req.params.key!, body);
      res.json({ commented: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}

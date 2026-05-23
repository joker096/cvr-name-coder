import type { Application, Request, Response } from "express";
import { getGitStatus, getGitDiff, gitCommit, gitPush, getGitLog } from "../gitTools.js";
import { gatherPRContext, generatePRDescription, createGitHubPR, listOpenPRs, createBranch, listBranches } from "../prAgent.js";
import { undoChange, redoChange, getChangeState } from "../changes.js";
import { generateWithDualModel } from "../providers.js";
import { validateBody, GitBranchSchema, GitCommitSchema, GitDiffQuerySchema, GitLogQuerySchema, GitPullRequestSchema } from "../validation.js";
import { buildDualModelConfig } from "../dualModel.js";

export function registerRoutes(app: Application) {
  app.get("/api/git/status", async (_req: Request, res: Response) => {
    try {
      const status = await getGitStatus();
      return res.json(status);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/git/diff", async (req: Request, res: Response) => {
    try {
      const parsed = GitDiffQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation failed", details: parsed.error.format() });
      }
      const staged = parsed.data.staged === "true";
      const diffs = await getGitDiff(staged);
      return res.json({ diffs });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/git/commit", validateBody(GitCommitSchema), async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Commit message is required" });
      }
      const result = await gitCommit(message);
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/git/push", async (_req: Request, res: Response) => {
    try {
      const result = await gitPush();
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/git/log", async (req: Request, res: Response) => {
    try {
      const parsed = GitLogQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation failed", details: parsed.error.format() });
      }
      const limit = parsed.data.limit ?? 10;
      const commits = await getGitLog(limit);
      return res.json({ commits });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/git/pr", validateBody(GitPullRequestSchema), async (req: Request, res: Response) => {
    try {
      const { draft, config = {} } = req.body || {};
      const {
        aiProvider, localUrl, aiModel, apiKey, temperature, maxTokens,
        multiModelEnabled, thinkingProvider, thinkingModel, thinkingLocalUrl,
      } = config;
      const dualCfg = buildDualModelConfig({
        aiProvider, aiModel, localUrl, apiKey, temperature, maxTokens,
        multiModelEnabled, thinkingProvider, thinkingModel, thinkingLocalUrl,
      });
      const ctx = await gatherPRContext();
      const thinkFn = (prompt: string) =>
        generateWithDualModel(prompt, [], dualCfg, "think");
      const { title, description } = await generatePRDescription(ctx, thinkFn);
      const result = await createGitHubPR(title, description, ctx.baseBranch, !!draft);
      res.json({ context: ctx, pr: result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/git/pr/context", async (_req: Request, res: Response) => {
    try {
      const ctx = await gatherPRContext();
      res.json(ctx);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/git/pr/list", async (_req: Request, res: Response) => {
    try {
      const prs = await listOpenPRs();
      res.json({ prs: JSON.parse(prs) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/git/branch", validateBody(GitBranchSchema), async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      const result = await createBranch(name);
      res.json({ branch: result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/git/branches", async (_req: Request, res: Response) => {
    try {
      const branches = await listBranches();
      res.json({ branches: branches.split("\n").map((b: string) => b.replace(/^\*?\s+/, "").trim()).filter(Boolean) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/undo", async (_req: Request, res: Response) => {
    const result = await undoChange();
    res.json(result);
  });

  app.post("/api/redo", async (_req: Request, res: Response) => {
    const result = await redoChange();
    res.json(result);
  });

  app.get("/api/changes", async (_req: Request, res: Response) => {
    const state = await getChangeState();
    res.json(state);
  });
}

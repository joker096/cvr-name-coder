import type { Application, Request, Response } from "express";
import { analyzeDiff, getPendingReviews, acceptComment, rejectComment } from "../codeReview.js";
import { generateWithDualModel } from "../providers.js";
import type { DualModelConfig } from "../providers.js";
import { validateBody, ReviewRequestSchema } from "../validation.js";

interface ChatConfig {
  aiProvider?: string;
  localUrl?: string;
  aiModel?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  multiModelEnabled?: boolean;
  thinkingProvider?: string;
  thinkingModel?: string;
  thinkingLocalUrl?: string;
}

function buildDualConfig(cfg: ChatConfig): DualModelConfig {
  const result: DualModelConfig = {
    primaryProvider: cfg.aiProvider || "",
  };
  if (cfg.aiModel !== undefined) result.primaryModel = cfg.aiModel;
  if (cfg.localUrl !== undefined) result.primaryLocalUrl = cfg.localUrl;
  if (cfg.multiModelEnabled && cfg.thinkingProvider !== undefined) result.thinkingProvider = cfg.thinkingProvider;
  if (cfg.multiModelEnabled && cfg.thinkingModel !== undefined) result.thinkingModel = cfg.thinkingModel;
  if (cfg.thinkingLocalUrl !== undefined) result.thinkingLocalUrl = cfg.thinkingLocalUrl;
  if (cfg.apiKey !== undefined) result.apiKey = cfg.apiKey;
  if (cfg.temperature !== undefined) result.temperature = cfg.temperature;
  if (cfg.maxTokens !== undefined) result.maxTokens = cfg.maxTokens;
  return result;
}

export function registerRoutes(app: Application) {
  app.post("/api/review", validateBody(ReviewRequestSchema), async (req: Request, res: Response) => {
    try {
      const { diff, config = {} } = req.body;
      const dualCfg = buildDualConfig(config as ChatConfig);

      const result = await analyzeDiff(
        (prompt: string) => generateWithDualModel(prompt, [], dualCfg, 'think'),
        diff
      );

      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/review/pending", async (_req: Request, res: Response) => {
    try {
      const reviews = getPendingReviews();
      return res.json({ reviews });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/review/:id/accept", (req: Request, res: Response) => {
    const { commentId } = req.body;
    const success = acceptComment(req.params.id!, commentId);
    return res.json({ success });
  });

  app.post("/api/review/:id/reject", (req: Request, res: Response) => {
    const { commentId } = req.body;
    const success = rejectComment(req.params.id!, commentId);
    return res.json({ success });
  });
}

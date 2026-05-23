import type { Application, Request, Response } from "express";
import { analyzeDiff, getPendingReviews, acceptComment, rejectComment } from "../codeReview.js";
import { generateWithDualModel } from "../providers.js";
import { validateBody, ReviewDecisionSchema, ReviewRequestSchema } from "../validation.js";
import { buildDualModelConfig } from "../dualModel.js";

export function registerRoutes(app: Application) {
  app.post("/api/review", validateBody(ReviewRequestSchema), async (req: Request, res: Response) => {
    try {
      const { diff, config = {} } = req.body;
      const dualCfg = buildDualModelConfig(config);

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

  app.post("/api/review/:id/accept", validateBody(ReviewDecisionSchema), (req: Request, res: Response) => {
    const { commentId } = req.body;
    const success = acceptComment(req.params.id!, commentId);
    return res.json({ success });
  });

  app.post("/api/review/:id/reject", validateBody(ReviewDecisionSchema), (req: Request, res: Response) => {
    const { commentId } = req.body;
    const success = rejectComment(req.params.id!, commentId);
    return res.json({ success });
  });
}

import type { Application, Request, Response } from "express";
import {
  browserNavigate,
  browserClick,
  browserType,
  browserScreenshot,
  browserEvaluate,
  browserGetHtml,
  browserClose,
  getActiveBrowserSessions,
} from "../browserTools.js";
import { validateBody, BrowserNavigateSchema, BrowserActionSchema } from "../validation.js";

export function registerRoutes(app: Application) {
  app.post("/api/browser/navigate", validateBody(BrowserNavigateSchema), async (req: Request, res: Response) => {
    try {
      const { url, headless = true, sessionId = "default" } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "url is required" });
      }
      const result = await browserNavigate(sessionId, url, Boolean(headless));
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });

  app.post("/api/browser/click", validateBody(BrowserActionSchema), async (req: Request, res: Response) => {
    try {
      const { selector, headless = true, sessionId = "default" } = req.body;
      if (!selector || typeof selector !== "string") {
        return res.status(400).json({ error: "selector is required" });
      }
      const result = await browserClick(sessionId, selector, Boolean(headless));
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });

  app.post("/api/browser/type", validateBody(BrowserActionSchema), async (req: Request, res: Response) => {
    try {
      const { selector, text, headless = true, sessionId = "default" } = req.body;
      if (!selector || typeof selector !== "string" || typeof text !== "string") {
        return res.status(400).json({ error: "selector and text are required" });
      }
      const result = await browserType(sessionId, selector, text, Boolean(headless));
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });

  app.get("/api/browser/screenshot", async (req: Request, res: Response) => {
    try {
      const sessionId = String(req.query.sessionId || "default");
      const headless = req.query.headless !== "false";
      const result = await browserScreenshot(sessionId, headless);
      if (result.success && result.base64) {
        return res.json({ success: true, output: result.output, base64: result.base64 });
      }
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });

  app.post("/api/browser/evaluate", async (req: Request, res: Response) => {
    try {
      const { script, headless = true, sessionId = "default" } = req.body;
      if (!script || typeof script !== "string") {
        return res.status(400).json({ error: "script is required" });
      }
      const result = await browserEvaluate(sessionId, script, Boolean(headless));
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });

  app.get("/api/browser/html", async (req: Request, res: Response) => {
    try {
      const sessionId = String(req.query.sessionId || "default");
      const headless = req.query.headless !== "false";
      const result = await browserGetHtml(sessionId, headless);
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });

  app.post("/api/browser/close", async (req: Request, res: Response) => {
    try {
      const { sessionId = "default" } = req.body;
      const result = await browserClose(sessionId);
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });

  app.get("/api/browser/sessions", (_req: Request, res: Response) => {
    return res.json({ sessions: getActiveBrowserSessions() });
  });
}

import type { Application, Request, Response } from "express";
import { validateBody, BrowserNavigateSchema, BrowserActionSchema, BrowserCloseSchema, BrowserEvaluateSchema } from "../validation.js";

/** Module interface for Playwright-based browser automation tools. */
interface BrowserToolsModule {
  browserNavigate: (sessionId: string, url: string, headless: boolean) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserClick: (sessionId: string, selector: string, headless: boolean) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserType: (sessionId: string, selector: string, text: string, headless: boolean) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserScreenshot: (sessionId: string, headless: boolean) => Promise<{ success: boolean; output?: string; error?: string; base64?: string }>;
  browserEvaluate: (sessionId: string, script: string, headless: boolean) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserGetHtml: (sessionId: string, headless: boolean) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserClose: (sessionId: string) => Promise<{ success: boolean; output?: string; error?: string }>;
  getActiveBrowserSessions: () => string[];
}

let browserTools: BrowserToolsModule | null = null;

async function getBrowserTools(): Promise<BrowserToolsModule | null> {
  if (!browserTools) {
    try {
      browserTools = (await import("../browserTools.js")) as BrowserToolsModule;
    } catch {
      return null;
    }
  }
  return browserTools;
}

/**
 * Registers all browser automation API routes on the Express application.
 * Requires playwright-core to be installed; returns 503 otherwise.
 * 
 * Routes:
 * - POST /api/browser/navigate - Navigates a browser session to a URL
 * - POST /api/browser/click - Clicks an element by CSS selector
 * - POST /api/browser/type - Types text into an element by CSS selector
 * - GET /api/browser/screenshot - Takes a screenshot of the current page
 * - POST /api/browser/evaluate - Evaluates arbitrary JavaScript on the page
 * - GET /api/browser/html - Returns the current page's HTML
 * - POST /api/browser/close - Closes a browser session
 * - GET /api/browser/sessions - Lists active browser session IDs
 * @param app - Express application instance
 */
export function registerRoutes(app: Application) {
  app.post("/api/browser/navigate", validateBody(BrowserNavigateSchema), async (req: Request, res: Response) => {
    try {
      const bt = await getBrowserTools();
      if (!bt) return res.status(503).json({ success: false, output: "", error: "playwright-core not installed" });
      const { url, headless = true, sessionId = "default" } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "url is required" });
      }
      const result = await bt.browserNavigate(sessionId, url, Boolean(headless));
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });

  app.post("/api/browser/click", validateBody(BrowserActionSchema), async (req: Request, res: Response) => {
    try {
      const bt = await getBrowserTools();
      if (!bt) return res.status(503).json({ success: false, output: "", error: "playwright-core not installed" });
      const { selector, headless = true, sessionId = "default" } = req.body;
      if (!selector || typeof selector !== "string") {
        return res.status(400).json({ error: "selector is required" });
      }
      const result = await bt.browserClick(sessionId, selector, Boolean(headless));
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });

  app.post("/api/browser/type", validateBody(BrowserActionSchema), async (req: Request, res: Response) => {
    try {
      const bt = await getBrowserTools();
      if (!bt) return res.status(503).json({ success: false, output: "", error: "playwright-core not installed" });
      const { selector, text, headless = true, sessionId = "default" } = req.body;
      if (!selector || typeof selector !== "string" || typeof text !== "string") {
        return res.status(400).json({ error: "selector and text are required" });
      }
      const result = await bt.browserType(sessionId, selector, text, Boolean(headless));
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });

  app.get("/api/browser/screenshot", async (req: Request, res: Response) => {
    try {
      const bt = await getBrowserTools();
      if (!bt) return res.status(503).json({ success: false, output: "", error: "playwright-core not installed" });
      const sessionId = String(req.query.sessionId || "default");
      const headless = req.query.headless !== "false";
      const result = await bt.browserScreenshot(sessionId, headless);
      if (result.success && result.base64) {
        return res.json({ success: true, output: result.output, base64: result.base64 });
      }
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });

  app.post("/api/browser/evaluate", validateBody(BrowserEvaluateSchema), async (req: Request, res: Response) => {
    try {
      const bt = await getBrowserTools();
      if (!bt) return res.status(503).json({ success: false, output: "", error: "playwright-core not installed" });
      const { script, headless = true, sessionId = "default" } = req.body;
      if (!script || typeof script !== "string") {
        return res.status(400).json({ error: "script is required" });
      }
      const result = await bt.browserEvaluate(sessionId, script, Boolean(headless));
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });

  app.get("/api/browser/html", async (req: Request, res: Response) => {
    try {
      const bt = await getBrowserTools();
      if (!bt) return res.status(503).json({ success: false, output: "", error: "playwright-core not installed" });
      const sessionId = String(req.query.sessionId || "default");
      const headless = req.query.headless !== "false";
      const result = await bt.browserGetHtml(sessionId, headless);
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });

  app.post("/api/browser/close", validateBody(BrowserCloseSchema), async (req: Request, res: Response) => {
    try {
      const bt = await getBrowserTools();
      if (!bt) return res.status(503).json({ success: false, output: "", error: "playwright-core not installed" });
      const { sessionId = "default" } = req.body;
      const result = await bt.browserClose(sessionId);
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });

  app.get("/api/browser/sessions", async (_req: Request, res: Response) => {
    const bt = await getBrowserTools();
    if (!bt) return res.json({ sessions: [] });
    return res.json({ sessions: bt.getActiveBrowserSessions() });
  });
}

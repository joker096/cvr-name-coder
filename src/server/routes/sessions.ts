import type { Application, Request, Response } from "express";
import { createSession, addMessage, getSession, listSessions, searchSessions, deleteSession } from "../sessionStore.js";
import { getErrorMessage } from "../../types/errors.js";
import { validateBody, SessionCreateSchema, SessionMessageSchema, SessionSearchQuerySchema } from "../validation.js";

/**
 * Registers session management API routes on the Express application.
 *
 * Routes:
 * - `POST /api/sessions` — Create a new chat session with an optional title.
 * - `GET /api/sessions` — List all existing chat sessions.
 * - `GET /api/sessions/:id` — Retrieve a single session by its ID.
 * - `POST /api/sessions/:id/messages` — Add a message (user, assistant, or system) to a session.
 * - `GET /api/sessions/search` — Search sessions by query string with an optional limit.
 * - `DELETE /api/sessions/:id` — Delete a session by its ID.
 *
 * @param app - The Express Application instance to register routes on.
 */
export function registerRoutes(app: Application) {
  app.post("/api/sessions", validateBody(SessionCreateSchema), async (req: Request, res: Response) => {
    try {
      const { title } = req.body as { title?: string };
      const session = createSession(title || "New Session");
      return res.json(session);
    } catch (e: unknown) {
      return res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.get("/api/sessions", async (_req: Request, res: Response) => {
    try {
      const sessions = listSessions();
      return res.json({ sessions });
    } catch (e: unknown) {
      return res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.get("/api/sessions/:id", async (req: Request, res: Response) => {
    try {
      const result = getSession(req.params.id!);
      if (!result) return res.status(404).json({ error: "Session not found" });
      return res.json(result);
    } catch (e: unknown) {
      return res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.post("/api/sessions/:id/messages", validateBody(SessionMessageSchema), async (req: Request, res: Response) => {
    try {
      const { role, content } = req.body as { role: "user" | "assistant" | "system"; content: string };
      const message = addMessage(req.params.id!, role, content);
      return res.json(message);
    } catch (e: unknown) {
      return res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.get("/api/sessions/search", async (req: Request, res: Response) => {
    try {
      const parsed = SessionSearchQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation failed", details: parsed.error.format() });
      }
      const { q, limit } = parsed.data;
      const results = searchSessions(q ?? "", limit ?? 20);
      return res.json({ results });
    } catch (e: unknown) {
      return res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.delete("/api/sessions/:id", async (req: Request, res: Response) => {
    try {
      deleteSession(req.params.id!);
      return res.json({ deleted: true });
    } catch (e: unknown) {
      return res.status(500).json({ error: getErrorMessage(e) });
    }
  });
}

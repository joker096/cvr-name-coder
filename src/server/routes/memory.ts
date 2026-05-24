import type { Application, Request, Response } from "express";
import { readMemory, writeMemory, replaceMemorySection, deleteMemorySection, readUser, writeUser, replaceUserSection, deleteUserSection } from "../memoryStore.js";
import { getErrorMessage } from "../../types/errors.js";
import { validateBody, SectionDeleteSchema, SectionReplaceSchema, SectionWriteSchema } from "../validation.js";

/**
 * Registers memory and user preference API routes on the Express application.
 *
 * Routes include:
 * - GET /api/memory - Read all memory sections
 * - POST /api/memory - Write a memory section (with body validation)
 * - PUT /api/memory - Replace a memory section (with body validation)
 * - DELETE /api/memory - Delete a memory section (with body validation)
 * - GET /api/user - Read all user preference sections
 * - POST /api/user - Write a user preference section (with body validation)
 * - PUT /api/user - Replace a user preference section (with body validation)
 * - DELETE /api/user - Delete a user preference section (with body validation)
 *
 * @param app - The Express Application instance to register routes on
 */
export function registerRoutes(app: Application) {
  app.get("/api/memory", async (_req: Request, res: Response) => {
    try {
      const data = await readMemory();
      res.json({ raw: data.raw, sections: data.sections });
    } catch (e: unknown) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.post("/api/memory", validateBody(SectionWriteSchema), async (req: Request, res: Response) => {
    try {
      const { content, section } = req.body as { content?: string; section?: string };
      await writeMemory(content ?? "", section);
      res.json({ saved: true });
    } catch (e: unknown) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.put("/api/memory", validateBody(SectionReplaceSchema), async (req: Request, res: Response) => {
    try {
      const { content, section } = req.body as { content: string; section: string };
      await replaceMemorySection(section, content.split("\n"));
      res.json({ saved: true });
    } catch (e: unknown) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.delete("/api/memory", validateBody(SectionDeleteSchema), async (req: Request, res: Response) => {
    try {
      const { section } = req.body as { section: string };
      await deleteMemorySection(section);
      res.json({ deleted: true });
    } catch (e: unknown) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.get("/api/user", async (_req: Request, res: Response) => {
    try {
      const data = await readUser();
      res.json({ raw: data.raw, sections: data.sections });
    } catch (e: unknown) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.post("/api/user", validateBody(SectionWriteSchema), async (req: Request, res: Response) => {
    try {
      const { content, section } = req.body as { content?: string; section?: string };
      await writeUser(content ?? "", section);
      res.json({ saved: true });
    } catch (e: unknown) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.put("/api/user", validateBody(SectionReplaceSchema), async (req: Request, res: Response) => {
    try {
      const { content, section } = req.body as { content: string; section: string };
      await replaceUserSection(section, content.split("\n"));
      res.json({ saved: true });
    } catch (e: unknown) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.delete("/api/user", validateBody(SectionDeleteSchema), async (req: Request, res: Response) => {
    try {
      const { section } = req.body as { section: string };
      await deleteUserSection(section);
      res.json({ deleted: true });
    } catch (e: unknown) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });
}

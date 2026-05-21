import type { Application, Request, Response } from "express";
import { readMemory, writeMemory, replaceMemorySection, deleteMemorySection, readUser, writeUser, replaceUserSection, deleteUserSection } from "../memoryStore.js";
import { getErrorMessage } from "../../types/errors.js";

export function registerRoutes(app: Application) {
  app.get("/api/memory", async (_req: Request, res: Response) => {
    try {
      const data = await readMemory();
      res.json({ raw: data.raw, sections: data.sections });
    } catch (e: unknown) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.post("/api/memory", async (req: Request, res: Response) => {
    try {
      const { content, section } = req.body as { content?: string; section?: string };
      await writeMemory(content ?? "", section);
      res.json({ saved: true });
    } catch (e: unknown) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.put("/api/memory", async (req: Request, res: Response) => {
    try {
      const { content, section } = req.body as { content: string; section: string };
      await replaceMemorySection(section, content.split("\n"));
      res.json({ saved: true });
    } catch (e: unknown) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.delete("/api/memory", async (req: Request, res: Response) => {
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

  app.post("/api/user", async (req: Request, res: Response) => {
    try {
      const { content, section } = req.body as { content?: string; section?: string };
      await writeUser(content ?? "", section);
      res.json({ saved: true });
    } catch (e: unknown) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.put("/api/user", async (req: Request, res: Response) => {
    try {
      const { content, section } = req.body as { content: string; section: string };
      await replaceUserSection(section, content.split("\n"));
      res.json({ saved: true });
    } catch (e: unknown) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });

  app.delete("/api/user", async (req: Request, res: Response) => {
    try {
      const { section } = req.body as { section: string };
      await deleteUserSection(section);
      res.json({ deleted: true });
    } catch (e: unknown) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });
}

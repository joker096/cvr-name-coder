import type { Application, Request, Response } from "express";
import { loadSkills, getSkillById } from "../skillLoader.js";
import { ingestDocument, searchRAG, listSources, clearSource } from "../ragEngine.js";
import { generateEmbeddings } from "../providers.js";
import { loadInstructions, getInstructionsContext, saveInstruction, deleteInstruction } from "../instructionLoader.js";
import { loadCustomTools } from "../customToolLoader.js";

export function registerRoutes(app: Application) {
  app.get("/api/skills", async (_req: Request, res: Response) => {
    try {
      const skills = await loadSkills();
      return res.json({ skills: skills.map((s) => ({ id: s.id, name: s.name, description: s.description, triggers: s.triggers })) });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/skills/:id", async (req: Request, res: Response) => {
    try {
      const skill = await getSkillById(req.params.id!);
      if (!skill) return res.status(404).json({ error: "Skill not found" });
      return res.json({ id: skill.id, name: skill.name, description: skill.description, triggers: skill.triggers, content: skill.content });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/rag/ingest", async (req: Request, res: Response) => {
    try {
      const { source, content } = req.body;
      await ingestDocument(source || "unknown", content || "", generateEmbeddings);
      return res.json({ ingested: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/rag/search", async (req: Request, res: Response) => {
    try {
      const { q, topK } = req.query;
      const results = await searchRAG(String(q || ""), generateEmbeddings, topK ? parseInt(String(topK), 10) : 3);
      return res.json({ results });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/rag/sources", async (_req: Request, res: Response) => {
    try {
      return res.json({ sources: listSources() });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/rag/sources/:source", async (req: Request, res: Response) => {
    try {
      clearSource(req.params.source!);
      return res.json({ cleared: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/rules", async (_req: Request, res: Response) => {
    try {
      const instructions = await loadInstructions();
      return res.json({ rules: instructions.map((r) => ({ name: r.name, priority: r.priority })) });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/rules/:name", async (req: Request, res: Response) => {
    try {
      const instructions = await loadInstructions();
      const rule = instructions.find((r) => r.name === req.params.name!);
      if (!rule) return res.status(404).json({ error: "Rule not found" });
      return res.json({ name: rule.name, content: rule.content, priority: rule.priority });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/rules/context", async (_req: Request, res: Response) => {
    try {
      const ctx = await getInstructionsContext();
      return res.json({ context: ctx });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/rules/:name", async (req: Request, res: Response) => {
    try {
      const { content, priority } = req.body as { content: string; priority: number };
      await saveInstruction(req.params.name!, content, priority ?? 0);
      return res.json({ saved: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/rules/:name", async (req: Request, res: Response) => {
    try {
      await deleteInstruction(req.params.name!);
      return res.json({ deleted: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/custom-tools", async (_req: Request, res: Response) => {
    try {
      const tools = await loadCustomTools();
      return res.json({ tools: tools.map((t) => ({ id: t.id, name: t.name, description: t.description, readOnly: t.readOnly })) });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/custom-tools/:id", async (req: Request, res: Response) => {
    try {
      const tools = await loadCustomTools();
      const tool = tools.find((t) => t.id === req.params.id!);
      if (!tool) return res.status(404).json({ error: "Tool not found" });
      return res.json({ id: tool.id, name: tool.name, description: tool.description, parameters: tool.parameters, readOnly: tool.readOnly });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });
}

import express from "express";
import * as path from "path";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { executeTool } from "./src/server/tools.js";
import { recordChange, undoChange, redoChange, getChangeState } from "./src/server/changes.js";
import { buildSystemPrompt } from "./src/server/prompts.js";
import { PermissionEngine } from "./src/server/permissions.js";
import type { PermissionConfig } from "./src/types/permissions.js";
import { randomUUID } from "crypto";
import { AgentLoop } from "./src/server/agentLoop.js";
import { createPlan } from "./src/server/planner.js";
import { SubagentManager } from "./src/server/subagentManager.js";
import { hookRegistry, registerBuiltinHooks } from "./src/server/hooks.js";
import { loadAgents } from "./src/server/agentLoader.js";
import { readMemory, writeMemory, readUser, writeUser } from "./src/server/memoryStore.js";
import { createSession, addMessage, getSession, listSessions, searchSessions, deleteSession, setSessionDbPath } from "./src/server/sessionStore.js";
import { loadSkills, getSkillById, setSkillsDir } from "./src/server/skillLoader.js";
import { setSkillCreatorDir } from "./src/server/skillCreator.js";
import { ingestDocument, searchRAG, listSources, clearSource, setRagDbPath } from "./src/server/ragEngine.js";

dotenv.config();

// Local Storage Path
const STORAGE_DIR = path.join(process.cwd(), ".opencode-infinite");
const HISTORY_FILE = path.join(STORAGE_DIR, "history.json");
const MEMORY_FILE = path.join(STORAGE_DIR, "memory.json");

async function ensureStorage() {
  try {
    await mkdir(STORAGE_DIR, { recursive: true });
    try { await access(HISTORY_FILE); } catch { await writeFile(HISTORY_FILE, JSON.stringify([])); }
    try { await access(MEMORY_FILE); } catch { await writeFile(MEMORY_FILE, JSON.stringify([])); }
  } catch (e) {
    console.error("Storage init error:", e);
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Permission Engine
let permissionEngine: PermissionEngine | undefined;
try {
  const configData = await readFile(".cvr/permissions.json", "utf-8");
  const config: PermissionConfig = JSON.parse(configData);
  permissionEngine = new PermissionEngine(config);
} catch {
  permissionEngine = new PermissionEngine({
    rules: [
      { pattern: "read_file", action: "allow" },
      { pattern: "list_directory", action: "allow" },
      { pattern: "search_files", action: "allow" },
      { pattern: "write_file", action: "ask" },
      { pattern: "edit_file", action: "ask" },
      { pattern: "execute_command", action: "ask" },
      { pattern: "*.env*", action: "deny" },
      { pattern: "*/secrets/*", action: "deny" },
      { pattern: "bash:rm -rf *", action: "deny" },
      { pattern: "bash:git push *", action: "ask" },
    ],
    defaultAction: "ask",
  });
}

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

// Gemini Logic
async function generateAIContent(prompt: string, contents: any[] = [], provider: string = "gemini", localUrl?: string, modelName?: string, apiKey?: string, temperature?: number, maxTokens?: number) {
  if ((provider === "local" || provider === "custom" || provider === "openai" || provider === "deepseek" || provider === "grok" || provider === "baseten" || provider === "openrouter" || provider === "together" || provider === "mistral") && (localUrl || apiKey)) {
    try {
      let baseUrl = localUrl;
      if (provider === "openai") baseUrl = "https://api.openai.com/v1";
      if (provider === "deepseek") baseUrl = localUrl || "https://api.deepseek.com";
      if (provider === "grok") baseUrl = localUrl || "https://api.x.ai/v1";
      if (provider === "baseten") baseUrl = "https://api.baseten.co/v1";
      if (provider === "openrouter") baseUrl = "https://openrouter.ai/api/v1";
      if (provider === "together") baseUrl = "https://api.together.xyz/v1";
      if (provider === "mistral") baseUrl = "https://api.mistral.ai/v1";

        const body: any = {
          model: modelName || (provider === "openai" ? "gpt-4o" : provider === "deepseek" ? "deepseek-chat" : provider === "grok" ? "grok-beta" : provider === "baseten" ? "llama-3-1-70b-instruct" : provider === "openrouter" ? "meta-llama/llama-3.3-70b-instruct:free" : provider === "together" ? "meta-llama/Llama-3.3-70B-Instruct-Turbo" : provider === "mistral" ? "mistral-large-latest" : "local-model"),
          messages: [
            { role: 'system', content: prompt },
            ...contents.map(c => ({ 
              role: c.role === 'model' ? 'assistant' : c.role, 
              content: c.parts[0].text 
            }))
          ]
        };
        if (temperature !== undefined) body.temperature = temperature;
        if (maxTokens !== undefined) body.max_tokens = maxTokens;

        const response = await fetch(`${(baseUrl || '').replace(/\/$/, '')}/v1/chat/completions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey || (provider === "openai" ? process.env.OPENAI_API_KEY : provider === "deepseek" ? process.env.DEEPSEEK_API_KEY : provider === "grok" ? process.env.XAI_API_KEY : provider === "baseten" ? process.env.BASETEN_API_KEY : provider === "openrouter" ? process.env.OPENROUTER_API_KEY : provider === "together" ? process.env.TOGETHER_API_KEY : provider === "mistral" ? process.env.MISTRAL_API_KEY : provider === "custom" ? process.env.CUSTOM_API_KEY : "")}`
          },
          body: JSON.stringify(body)
        });
      const data: any = await response.json();
      if (data.error) throw new Error(data.error.message || "AI Provider Error");
      return data.choices[0].message.content;
    } catch (e: any) {
      console.error(`${provider} AI Error:`, e);
      throw new Error(`${provider} AI error: ` + e.message);
    }
  }

  if (provider === "anthropic") {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || process.env.ANTHROPIC_API_KEY || "",
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelName || "claude-3-5-sonnet-20240620",
          max_tokens: 4096,
          system: prompt,
          messages: contents.map(c => ({
            role: c.role === 'model' ? 'assistant' : c.role,
            content: c.parts[0].text
          }))
        })
      });
      const data: any = await response.json();
      if (data.error) throw new Error(data.error.message || "Anthropic Error");
      return data.content[0].text;
    } catch (e: any) {
      console.error("Anthropic Error:", e);
      throw new Error("Anthropic error: " + e.message);
    }
  }

  try {
    const result = await ai.models.generateContent({
      model: modelName || "gemini-2.0-flash",
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
        ...contents
      ]
    });
    return result.text;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const result = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: texts.map((t) => ({ role: "user", parts: [{ text: t }] })),
    });
    // Gemini v1 returns embeddings per content
    if (Array.isArray(result.embeddings)) {
      return result.embeddings.map((e: any) => e.values as number[]);
    }
    if (result.embeddings && Array.isArray((result.embeddings as any).values)) {
      return [(result.embeddings as any).values as number[]];
    }
    return texts.map(() => []);
  } catch (e) {
    console.error("Embedding generation failed:", e);
    return texts.map(() => []);
  }
}

import { setRagEmbedFn } from "./src/server/tools.js";
setRagEmbedFn(generateEmbeddings);

// Memory Engine
async function summarizeLongHistory(messages: any[], provider: string = "gemini", localUrl?: string, modelName?: string, apiKey?: string) {
  if (messages.length < 5) return null;
  
  const instruction = `You are the "cvr.name Dreamer Engine". Examine the conversation below and extract:
  1. KEY_FACTS: Fundamental project decisions or requirements.
  2. INVARIANT_RULES: Coding standards or logic that MUST not change.
  3. PROGRESS_STATE: What was just finished.
  4. PENDING_GOALS: What the agent is currently working towards.
  
  Format as a strict technical manifest (max 150 words). Focus on architectural integrity.
  
  Conversation:
  ${messages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n')}`;
  
  try {
    return await generateAIContent(instruction, [], provider, localUrl, modelName, apiKey);
  } catch (error) {
    console.error("Summarization failed:", error);
    return null;
  }
}

// API Routes
app.post("/api/chat", async (req, res) => {
  try {
    const { message, config = {}, kernelConfig = {}, agent: bodyAgent } = req.body;
    const { aiProvider = "gemini", localUrl, aiModel, apiKey, temperature, maxTokens, systemPrompt: customSystemPrompt, agent: configAgent } = config;
    const kConfig = kernelConfig.aiProvider ? kernelConfig : config;

    // 1. Read persistent state
    const history = JSON.parse(await readFile(HISTORY_FILE, "utf-8"));
    const memories = JSON.parse(await readFile(MEMORY_FILE, "utf-8"));

    // 2. Construct context
    const agent = bodyAgent || configAgent || "build";
    const mode = config.mode || "build";
    const contextParts = memories.slice(-5).map((m: any) => `[CLUSTER_DATA]: ${m.content}`).join('\n');

    const systemPrompt = await buildSystemPrompt({
      agent,
      mode,
      contextParts,
      customSystemPrompt: customSystemPrompt && customSystemPrompt.trim() ? customSystemPrompt : undefined,
    });

    const responseText = await generateAIContent(systemPrompt, [
      ...history.slice(-10).map((m: any) => ({ role: m.role, parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: message }] }
    ], aiProvider, localUrl, aiModel, apiKey, temperature, maxTokens);

    // 3. Persist
    const updatedHistory = [...history, { role: 'user', content: message, createdAt: new Date() }, { role: 'model', content: responseText, createdAt: new Date() }];
    await writeFile(HISTORY_FILE, JSON.stringify(updatedHistory));

    // 4. Memory Compression (Project "Dreamer" process)
    if (updatedHistory.length % 5 === 0) {
      summarizeLongHistory(updatedHistory, kConfig.aiProvider, kConfig.localUrl, kConfig.aiModel || kConfig.localModelName, kConfig.apiKey).then(async (summary) => {
        if (summary) {
          const currentMemories = JSON.parse(await readFile(MEMORY_FILE, "utf-8"));
          await writeFile(MEMORY_FILE, JSON.stringify([...currentMemories, { content: summary, createdAt: new Date() }]));
        }
      });
    }

    res.json({ 
      content: responseText, 
      continueNeeded: responseText.includes("CONTINUE_NEEDED")
    });

  } catch (error: any) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/history", async (_req, res) => {
  try {
    const history = JSON.parse(await readFile(HISTORY_FILE, "utf-8"));
    const memories = JSON.parse(await readFile(MEMORY_FILE, "utf-8"));
    res.json({ history, memories });
  } catch (e: any) {
    res.json({ history: [], memories: [] });
  }
});

app.post("/api/clear", async (_req, res) => {
  await writeFile(HISTORY_FILE, JSON.stringify([]));
  await writeFile(MEMORY_FILE, JSON.stringify([]));
  res.json({ status: "cleared" });
});

// Memory API routes
app.get("/api/memory", async (_req, res) => {
  try {
    const data = await readMemory();
    res.json({ raw: data.raw, sections: data.sections });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/memory", async (req, res) => {
  try {
    const { content, section } = req.body;
    await writeMemory(content, section);
    res.json({ saved: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/user", async (_req, res) => {
  try {
    const data = await readUser();
    res.json({ raw: data.raw, sections: data.sections });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/user", async (req, res) => {
  try {
    const { content, section } = req.body;
    await writeUser(content, section);
    res.json({ saved: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Session API routes
app.post("/api/sessions", async (req, res) => {
  try {
    const { title } = req.body;
    const session = createSession(title || "New Session");
    return res.json(session);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/sessions", async (_req, res) => {
  try {
    const sessions = listSessions();
    return res.json({ sessions });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/sessions/:id", async (req, res) => {
  try {
    const result = getSession(req.params.id);
    if (!result) return res.status(404).json({ error: "Session not found" });
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/sessions/:id/messages", async (req, res) => {
  try {
    const { role, content } = req.body;
    const message = addMessage(req.params.id, role, content);
    return res.json(message);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/sessions/search", async (req, res) => {
  try {
    const { q, limit } = req.query;
    const results = searchSessions(String(q || ""), limit ? parseInt(String(limit), 10) : 20);
    return res.json({ results });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.delete("/api/sessions/:id", async (req, res) => {
  try {
    deleteSession(req.params.id);
    return res.json({ deleted: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Skill API routes
app.get("/api/skills", async (_req, res) => {
  try {
    const skills = await loadSkills();
    return res.json({ skills: skills.map((s) => ({ id: s.id, name: s.name, description: s.description, triggers: s.triggers })) });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/skills/:id", async (req, res) => {
  try {
    const skill = await getSkillById(req.params.id);
    if (!skill) return res.status(404).json({ error: "Skill not found" });
    return res.json({ id: skill.id, name: skill.name, description: skill.description, triggers: skill.triggers, content: skill.content });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// RAG API routes
app.post("/api/rag/ingest", async (req, res) => {
  try {
    const { source, content } = req.body;
    await ingestDocument(source || "unknown", content || "", generateEmbeddings);
    return res.json({ ingested: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/rag/search", async (req, res) => {
  try {
    const { q, topK } = req.query;
    const results = await searchRAG(String(q || ""), generateEmbeddings, topK ? parseInt(String(topK), 10) : 3);
    return res.json({ results });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/rag/sources", async (_req, res) => {
  try {
    return res.json({ sources: listSources() });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.delete("/api/rag/sources/:source", async (req, res) => {
  try {
    clearSource(req.params.source);
    return res.json({ cleared: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Tool execution endpoint
app.post("/api/tools/execute", async (req, res) => {
  try {
    const { toolCall, mode = "build", sessionId = randomUUID() } = req.body;
    const result = await executeTool(toolCall, mode, permissionEngine, sessionId);

    // Snapshot for undo if write tool succeeded
    if (
      result.success &&
      (toolCall.name === "write_file" || toolCall.name === "edit_file")
    ) {
      const afterContent =
        toolCall.name === "write_file"
          ? (toolCall.params.content as string)
          : await readFile(path.join(process.cwd(), toolCall.params.path as string), "utf-8");
      const change = await recordChange(
        toolCall.params.path as string,
        toolCall.name === "write_file" ? "write" : "edit",
        afterContent,
        `${toolCall.name}: ${toolCall.params.path}`
      );
      result.changeId = change.id;
    }

    res.json(result);
  } catch (error: any) {
    console.error("Tool execution error:", error);
    res.status(500).json({ success: false, output: "", error: error.message });
  }
});

// Undo endpoint
app.post("/api/undo", async (_req, res) => {
  const result = await undoChange();
  res.json(result);
});

// Redo endpoint
app.post("/api/redo", async (_req, res) => {
  const result = await redoChange();
  res.json(result);
});

// Changes state endpoint
app.get("/api/changes", async (_req, res) => {
  const state = await getChangeState();
  res.json(state);
});

// Permission API routes
app.post("/api/permissions/check", (req, res) => {
  if (!permissionEngine) return res.status(503).json({ error: "Permission engine not initialized" });
  const result = permissionEngine.check(req.body);
  return res.json(result);
});

app.post("/api/permissions/ask", (req, res) => {
  if (!permissionEngine) return res.status(503).json({ error: "Permission engine not initialized" });
  const request = req.body;
  const check = permissionEngine.check(request);
  if (check.action === "allow") {
    return res.json({ action: "allow" });
  }
  if (check.action === "deny") {
    return res.json({ action: "deny" });
  }
  const pending = permissionEngine.createPending(request);
  return res.json({ action: "ask", pending });
});

app.get("/api/permissions/pending", (_req, res) => {
  if (!permissionEngine) return res.json({ pending: [] });
  return res.json({ pending: permissionEngine.listPending() });
});

app.get("/api/permissions/pending/:id", (req, res) => {
  if (!permissionEngine) return res.status(503).json({ error: "Permission engine not initialized" });
  const pending = permissionEngine.getPending(req.params.id);
  if (!pending) return res.status(404).json({ error: "Not found" });
  return res.json(pending);
});

app.post("/api/permissions/resolve/:id", (req, res) => {
  if (!permissionEngine) return res.status(503).json({ error: "Permission engine not initialized" });
  const { approved } = req.body;
  permissionEngine.resolve(req.params.id, approved === true);
  return res.json({ resolved: true });
});

// Agent Loop API routes
const activeLoops = new Map<string, AgentLoop>();
const subagentManager = new SubagentManager();

app.post("/api/agent/loop", async (req, res) => {
  try {
    const { goal, provider, model } = req.body;
    const id = randomUUID();

    const loop = new AgentLoop(goal, {
      maxSteps: 20,
      permissionEngine,
      thinkFn: (prompt) => generateAIContent(prompt, [], provider, undefined, model),
      sessionId: id,
    });

    activeLoops.set(id, loop);
    loop.run().catch((err) => console.error(`Agent loop ${id} error:`, err));

    res.json({ id, state: loop.getState() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/agent/loop/:id", (req, res) => {
  const loop = activeLoops.get(req.params.id);
  if (!loop) return res.status(404).json({ error: "Loop not found" });
  return res.json(loop.getState());
});

app.post("/api/agent/loop/:id/abort", (req, res) => {
  const loop = activeLoops.get(req.params.id);
  if (!loop) return res.status(404).json({ error: "Loop not found" });
  loop.abort();
  return res.json({ aborted: true });
});

app.post("/api/agent/plan", async (req, res) => {
  try {
    const { goal, provider, model } = req.body;
    const plan = await createPlan(goal, (prompt) =>
      generateAIContent(prompt, [], provider, undefined, model)
    );
    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Subagent API routes
app.post("/api/subagents/spawn", async (req, res) => {
  try {
    const { goal, agentConfig, provider, model } = req.body;
    const task = await subagentManager.spawn(
      req.body.parentId || "main",
      goal,
      agentConfig,
      (prompt) => generateAIContent(prompt, [], provider, undefined, model)
    );
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/subagents", (_req, res) => {
  const tasks = subagentManager.listTasks();
  res.json({ tasks });
});

app.post("/api/subagents/:id/abort", async (req, res) => {
  await subagentManager.abort(req.params.id);
  res.json({ aborted: true });
});

// Hook API routes
app.get("/api/hooks", (_req, res) => {
  res.json({ hooks: hookRegistry.list() });
});

app.post("/api/hooks/register", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Hook registration disabled in production" });
  }
  try {
    const { id, hookPoint, handler, priority = 0 } = req.body;
    if (!id || !hookPoint || !handler) {
      return res.status(400).json({ error: "Missing id, hookPoint, or handler" });
    }
    // Note: handler is a string representation; in a real scenario, this would be a function reference
    // For dev API, we accept it but log a warning that runtime function registration is limited
    hookRegistry.register({ id, hookPoint, handler: () => {}, priority });
    return res.json({ registered: true, id, hookPoint });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/hooks/unregister", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Hook unregistration disabled in production" });
  }
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Missing id" });
    }
    hookRegistry.unregister(id);
    return res.json({ unregistered: true, id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  await ensureStorage();
  setSessionDbPath(STORAGE_DIR);
  setSkillsDir(path.join(process.cwd(), ".cvr", "skills"));
  setSkillCreatorDir(path.join(process.cwd(), ".cvr", "skills"));
  setRagDbPath(STORAGE_DIR);
  await loadAgents();
  registerBuiltinHooks();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
      app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

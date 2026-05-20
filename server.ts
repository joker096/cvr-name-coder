import express from "express";
import * as path from "path";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import { readFileSync } from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { executeTool, setRagEmbedFn } from "./src/server/tools.js";
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
import { setCacheDbPath } from "./src/server/cache.js";
import { indexProject } from "./src/server/projectOracle.js";
import { loadInstructions, getInstructionsContext, setRulesDir } from "./src/server/instructionLoader.js";
import { loadCustomTools, setCustomToolsDir } from "./src/server/customToolLoader.js";
import { registerPlugins, getPlugins, enablePlugin, disablePlugin, setPluginsDir } from "./src/server/pluginManager.js";
import { cronScheduler } from "./src/server/cronScheduler.js";
import { getGitStatus, getGitDiff, gitCommit, gitPush, getGitLog } from "./src/server/gitTools.js";
import { analyzeDiff, getPendingReviews, acceptComment, rejectComment } from "./src/server/codeReview.js";
import { getCosts, resetCosts } from "./src/server/costTracker.js";
import { processImages, type ProcessedImage } from "./src/server/imageProcessor.js";
import { loadMcpConfig, startMcpStdio, mountMcpSseRoutes } from "./src/server/mcpServer.js";
import {
  browserNavigate,
  browserClick,
  browserType,
  browserScreenshot,
  browserEvaluate,
  browserGetHtml,
  browserClose,
  getActiveBrowserSessions,
  closeAllBrowsers,
} from "./src/server/browserTools.js";
import {
  initSync,
  getSyncStatus,
  exportSync,
  importSync,
  getSyncConfig,
  saveSyncConfig,
  resolveConflictsManually,
} from "./src/server/teamSync.js";
import { setupSecurityMiddleware, createApiKeyMiddleware } from "./src/server/standalone/middleware.js";
import { setupHealthRoute, incrementRequestCount, incrementToolCall, incrementError, setActiveLoops } from "./src/server/standalone/health.js";
import type { HistoryEntry, MemoryEntry } from "./src/types/api.js";
import { getErrorMessage } from "./src/types/errors.js";

interface ChatConfig {
  aiProvider?: string;
  localUrl?: string;
  aiModel?: string;
  localModelName?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  agent?: string;
  mode?: "plan" | "build" | "review";
  visionEnabled?: boolean;
  maxImageSize?: number;
  multiModelEnabled?: boolean;
  thinkingProvider?: string;
  thinkingModel?: string;
  thinkingLocalUrl?: string;
}

interface KernelConfig {
  aiProvider?: string;
  [key: string]: unknown;
}

function buildDualConfig(cfg: ChatConfig): DualModelConfig {
  const result: DualModelConfig = {
    primaryProvider: cfg.aiProvider || "gemini",
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

interface ChatRequestBody {
  message: string;
  images?: string[];
  config?: ChatConfig;
  kernelConfig?: KernelConfig;
  agent?: string;
}

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

setupHealthRoute(app);
setupSecurityMiddleware(app);

const requireApiKey = createApiKeyMiddleware();
app.use("/api", requireApiKey);
app.use("/mcp", requireApiKey);

// Initialize Permission Engine
let permissionEngine: PermissionEngine | undefined;
try {
  const configData = readFileSync(".cvr/permissions.json", "utf-8");
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

import { generateAIContent, generateWithDualModel, generateEmbeddings } from "./src/server/providers.js";
import type { DualModelConfig } from "./src/server/providers.js";
import { ContextWindow, Priority } from "./src/server/contextWindow.js";
import { runPromptTest } from "./src/server/promptTester.js";
import { gatherPRContext, generatePRDescription, createGitHubPR, listOpenPRs, createBranch, listBranches } from "./src/server/prAgent.js";
import { setTrackerConfig, createIssue as createTrackerIssue, listIssues as listTrackerIssues, getIssue as getTrackerIssue, addComment as addTrackerComment } from "./src/server/issueTracker.js";
import { generateCIPipeline, PIPELINE_TEMPLATES } from "./src/server/ciPipeline.js";
import { setupP2PSync, getPeers, getShares, publishShare, isP2PActive } from "./src/server/p2pSync.js";
import { initMarketplace, getMarketItems, publishItem, downloadItem, removeItem, addReview, getReviews, getTags, getStats } from "./src/server/agentMarketplace.js";
import {
  validateBody,
  ChatRequestSchema,
  ToolExecuteSchema,
  ReviewRequestSchema,
  AgentLoopSchema,
  CronTaskSchema,
  GitCommitSchema,
  BrowserNavigateSchema,
  BrowserActionSchema,
} from "./src/server/validation.js";

setRagEmbedFn(generateEmbeddings);

// Memory Engine
async function summarizeLongHistory(messages: HistoryEntry[], provider: string = "gemini", localUrl?: string, modelName?: string, apiKey?: string, dualConfig?: DualModelConfig) {
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
    if (dualConfig?.thinkingProvider && dualConfig?.thinkingModel) {
      return await generateWithDualModel(instruction, [], dualConfig, 'think');
    }
    return await generateAIContent(instruction, [], provider, localUrl, modelName, apiKey);
  } catch (error) {
    console.error("Summarization failed:", error);
    return null;
  }
}

// API Routes
app.post("/api/chat", validateBody(ChatRequestSchema), async (req, res) => {
  incrementRequestCount();
  try {
    const body = req.body as ChatRequestBody;
    const { message, config = {}, kernelConfig = {}, agent: bodyAgent } = body;
    const { aiProvider = "gemini", localUrl, aiModel, apiKey, temperature, maxTokens, systemPrompt: customSystemPrompt, agent: configAgent, maxImageSize } = config;
    const kConfig = kernelConfig?.aiProvider ? kernelConfig : config;

    // 1. Read persistent state
    const history = JSON.parse(await readFile(HISTORY_FILE, "utf-8")) as HistoryEntry[];
    const memories = JSON.parse(await readFile(MEMORY_FILE, "utf-8")) as MemoryEntry[];

    // 2. Construct context
    const agent = (bodyAgent || configAgent || "build") as import("./src/types/settings.js").AgentId;
    const mode = config.mode || "build";
    const contextParts = memories.slice(-5).map((m) => `[CLUSTER_DATA]: ${m.content}`).join('\n');

    const systemPrompt = await buildSystemPrompt({
      agent,
      mode,
      contextParts,
      customSystemPrompt: customSystemPrompt && customSystemPrompt.trim() ? customSystemPrompt : undefined,
    } as Parameters<typeof buildSystemPrompt>[0]);

    // Process images if provided
    const rawImages = body.images ?? [];
    let processedImages: ProcessedImage[] = [];
    if (Array.isArray(rawImages) && rawImages.length > 0) {
      processedImages = await processImages(rawImages, { maxDimension: maxImageSize || 1024 });
    }

    const buildParts = (text: string, imgs?: ProcessedImage[]): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> => {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text }];
      if (imgs && imgs.length > 0) {
        for (const img of imgs) {
          parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
        }
      }
      return parts;
    };

    // Build context with sliding window + priority
    const ctxWindow = new ContextWindow({ maxTokens: 128000, tokenBuffer: 16000 });
    for (const m of history.slice(-20)) {
      const priority = m.role === 'user' && m.content.startsWith('/')
        ? Priority.HIGH
        : Priority.NORMAL;
      ctxWindow.add(m.role, m.content, priority);
    }
    const visibleHistory = ctxWindow.getMessages();

    const historyContents = visibleHistory.map((m) => {
      const hEntry = history.find((h: HistoryEntry) => h.content === m.content && h.role === m.role);
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: m.content }];
      if (hEntry?.images && Array.isArray(hEntry.images)) {
        for (const img of hEntry.images) {
          const match = typeof img === 'string' ? img.match(/^data:([^;]+);base64,(.+)$/) : null;
          if (match && match[1] && match[2]) {
            parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          }
        }
      }
      return { role: m.role, parts };
    });

    const responseText = await generateAIContent(systemPrompt, [
      ...historyContents,
      { role: 'user', parts: buildParts(message, processedImages) }
    ], aiProvider, localUrl, aiModel, apiKey, temperature, maxTokens);

    // 3. Persist
    const userHistoryEntry: HistoryEntry = { role: 'user', content: message, createdAt: new Date() };
    if (processedImages.length > 0) {
      userHistoryEntry.images = processedImages.map(img => `data:${img.mimeType};base64,${img.base64}`);
    }
    const updatedHistory: HistoryEntry[] = [...history, userHistoryEntry, { role: 'assistant' as const, content: responseText, createdAt: new Date() }];
    await writeFile(HISTORY_FILE, JSON.stringify(updatedHistory));

    // 4. Memory Compression (Project "Dreamer" process)
    if (updatedHistory.length % 5 === 0) {
      const kConfigTyped = kConfig as ChatConfig;
      const dualCfg = buildDualConfig(kConfigTyped);
      summarizeLongHistory(updatedHistory, kConfigTyped.aiProvider, kConfigTyped.localUrl, kConfigTyped.aiModel || kConfigTyped.localModelName, kConfigTyped.apiKey, dualCfg).then(async (summary) => {
        if (summary) {
          const currentMemories = JSON.parse(await readFile(MEMORY_FILE, "utf-8")) as MemoryEntry[];
          await writeFile(MEMORY_FILE, JSON.stringify([...currentMemories, { content: summary, createdAt: new Date() }]));
        }
      });
    }

    res.json({ 
      content: responseText, 
      continueNeeded: responseText.includes("CONTINUE_NEEDED")
    });

  } catch (error: unknown) {
    console.error("API Error:", getErrorMessage(error));
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.get("/api/history", async (_req, res) => {
  try {
    const history = JSON.parse(await readFile(HISTORY_FILE, "utf-8")) as HistoryEntry[];
    const memories = JSON.parse(await readFile(MEMORY_FILE, "utf-8")) as MemoryEntry[];
    res.json({ history, memories });
  } catch {
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
  } catch (e: unknown) {
    res.status(500).json({ error: getErrorMessage(e) });
  }
});

app.post("/api/memory", async (req, res) => {
  try {
    const { content, section } = req.body as { content?: string; section?: string };
    await writeMemory(content ?? "", section);
    res.json({ saved: true });
  } catch (e: unknown) {
    res.status(500).json({ error: getErrorMessage(e) });
  }
});

app.get("/api/user", async (_req, res) => {
  try {
    const data = await readUser();
    res.json({ raw: data.raw, sections: data.sections });
  } catch (e: unknown) {
    res.status(500).json({ error: getErrorMessage(e) });
  }
});

app.post("/api/user", async (req, res) => {
  try {
    const { content, section } = req.body as { content?: string; section?: string };
    await writeUser(content ?? "", section);
    res.json({ saved: true });
  } catch (e: unknown) {
    res.status(500).json({ error: getErrorMessage(e) });
  }
});

// Session API routes
app.post("/api/sessions", async (req, res) => {
  try {
    const { title } = req.body as { title?: string };
    const session = createSession(title || "New Session");
    return res.json(session);
  } catch (e: unknown) {
    return res.status(500).json({ error: getErrorMessage(e) });
  }
});

app.get("/api/sessions", async (_req, res) => {
  try {
    const sessions = listSessions();
    return res.json({ sessions });
  } catch (e: unknown) {
    return res.status(500).json({ error: getErrorMessage(e) });
  }
});

app.get("/api/sessions/:id", async (req, res) => {
  try {
    const result = getSession(req.params.id);
    if (!result) return res.status(404).json({ error: "Session not found" });
    return res.json(result);
  } catch (e: unknown) {
    return res.status(500).json({ error: getErrorMessage(e) });
  }
});

app.post("/api/sessions/:id/messages", async (req, res) => {
  try {
    const { role, content } = req.body as { role?: string; content?: string };
    const message = addMessage(req.params.id, role ?? "user", content ?? "");
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

// Instruction/Rules API routes
app.get("/api/rules", async (_req, res) => {
  try {
    const instructions = await loadInstructions();
    return res.json({ rules: instructions.map((r) => ({ name: r.name, priority: r.priority })) });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/rules/:name", async (req, res) => {
  try {
    const instructions = await loadInstructions();
    const rule = instructions.find((r) => r.name === req.params.name);
    if (!rule) return res.status(404).json({ error: "Rule not found" });
    return res.json({ name: rule.name, content: rule.content, priority: rule.priority });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/rules/context", async (_req, res) => {
  try {
    const ctx = await getInstructionsContext();
    return res.json({ context: ctx });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Custom Tools API routes
app.get("/api/custom-tools", async (_req, res) => {
  try {
    const tools = await loadCustomTools();
    return res.json({ tools: tools.map((t) => ({ id: t.id, name: t.name, description: t.description, readOnly: t.readOnly })) });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/custom-tools/:id", async (req, res) => {
  try {
    const tools = await loadCustomTools();
    const tool = tools.find((t) => t.id === req.params.id);
    if (!tool) return res.status(404).json({ error: "Tool not found" });
    return res.json({ id: tool.id, name: tool.name, description: tool.description, parameters: tool.parameters, readOnly: tool.readOnly });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Plugin API routes
app.get("/api/plugins", async (_req, res) => {
  try {
    const plugins = getPlugins();
    return res.json({ plugins: plugins.map((p) => ({ id: p.manifest.id, name: p.manifest.name, version: p.manifest.version, enabled: p.enabled })) });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/plugins/:id/enable", (req, res) => {
  enablePlugin(req.params.id);
  return res.json({ enabled: true });
});

app.post("/api/plugins/:id/disable", (req, res) => {
  disablePlugin(req.params.id);
  return res.json({ disabled: true });
});

// Cron API routes
app.get("/api/cron", (_req, res) => {
  return res.json({ tasks: cronScheduler.getTasks() });
});

app.post("/api/cron", validateBody(CronTaskSchema), (req, res) => {
  try {
    const task = cronScheduler.addTask(req.body);
    return res.json(task);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.delete("/api/cron/:id", (req, res) => {
  cronScheduler.removeTask(req.params.id);
  return res.json({ removed: true });
});

app.post("/api/cron/:id/enable", (req, res) => {
  cronScheduler.enableTask(req.params.id);
  return res.json({ enabled: true });
});

app.post("/api/cron/:id/disable", (req, res) => {
  cronScheduler.disableTask(req.params.id);
  return res.json({ disabled: true });
});

// Git API routes
app.get("/api/git/status", async (_req, res) => {
  try {
    const status = await getGitStatus();
    return res.json(status);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/git/diff", async (req, res) => {
  try {
    const staged = req.query.staged === "true";
    const diffs = await getGitDiff(staged);
    return res.json({ diffs });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/git/commit", validateBody(GitCommitSchema), async (req, res) => {
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

app.post("/api/git/push", async (_req, res) => {
  try {
    const result = await gitPush();
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/git/log", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
    const commits = await getGitLog(limit);
    return res.json({ commits });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// --- PR Agent API ---
app.post("/api/git/pr", async (req, res) => {
  try {
    const { draft, config = {} } = req.body || {};
    const {
      aiProvider = "gemini", localUrl, aiModel, apiKey, temperature, maxTokens,
      multiModelEnabled, thinkingProvider, thinkingModel, thinkingLocalUrl,
    } = config;
    const dualCfg = buildDualConfig({
      aiProvider, aiModel, localUrl, apiKey, temperature, maxTokens,
      multiModelEnabled, thinkingProvider, thinkingModel, thinkingLocalUrl,
    } as ChatConfig);
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

app.get("/api/git/pr/context", async (_req, res) => {
  try {
    const ctx = await gatherPRContext();
    res.json(ctx);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/git/pr/list", async (_req, res) => {
  try {
    const prs = await listOpenPRs();
    res.json({ prs: JSON.parse(prs) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/git/branch", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: "Branch name required" }); return; }
    const result = await createBranch(name);
    res.json({ branch: result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/git/branches", async (_req, res) => {
  try {
    const branches = await listBranches();
    res.json({ branches: branches.split("\n").map((b: string) => b.replace(/^\*?\s+/, "").trim()).filter(Boolean) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
// ---

// Tool execution endpoint
app.post("/api/tools/execute", validateBody(ToolExecuteSchema), async (req, res) => {
  try {
    const { toolCall, mode = "build", sessionId = randomUUID() } = req.body;
    const result = await executeTool(toolCall, mode, permissionEngine, sessionId);
    incrementToolCall();

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

app.post("/api/agent/loop", validateBody(AgentLoopSchema), async (req, res) => {
  try {
    const { goal, provider, model, thinkingProvider, thinkingModel, thinkingLocalUrl } = req.body;
    const id = randomUUID();
    const dualCfg: DualModelConfig = {
      primaryProvider: provider || "gemini",
      primaryModel: model,
      thinkingProvider,
      thinkingModel,
      thinkingLocalUrl,
    };

    const loop = new AgentLoop(goal, {
      maxSteps: 20,
      permissionEngine,
      thinkFn: (prompt) => generateWithDualModel(prompt, [], dualCfg, 'think'),
      sessionId: id,
    });

    activeLoops.set(id, loop);
    setActiveLoops(activeLoops.size);
    loop.run()
      .then(() => { activeLoops.delete(id); setActiveLoops(activeLoops.size); })
      .catch((err) => {
        console.error(`Agent loop ${id} error:`, err);
        activeLoops.delete(id);
        setActiveLoops(activeLoops.size);
        incrementError();
      });

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
    const { goal, provider, model, thinkingProvider, thinkingModel, thinkingLocalUrl } = req.body;
    const dualCfg: DualModelConfig = {
      primaryProvider: provider || "gemini",
      primaryModel: model,
      thinkingProvider,
      thinkingModel,
      thinkingLocalUrl,
    };
    const plan = await createPlan(goal, (prompt) =>
      generateWithDualModel(prompt, [], dualCfg, 'think')
    );
    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Subagent API routes
app.post("/api/subagents/spawn", async (req, res) => {
  try {
    const { goal, agentConfig, provider, model, thinkingProvider, thinkingModel, thinkingLocalUrl } = req.body;
    const dualCfg: DualModelConfig = {
      primaryProvider: provider || "gemini",
      primaryModel: model,
      thinkingProvider,
      thinkingModel,
      thinkingLocalUrl,
    };
    const task = await subagentManager.spawn(
      req.body.parentId || "main",
      goal,
      agentConfig,
      (prompt) => generateWithDualModel(prompt, [], dualCfg, 'think')
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

// Review API routes
app.post("/api/review", validateBody(ReviewRequestSchema), async (req, res) => {
  try {
    const { diff, config = {} } = req.body;
    const dualCfg = buildDualConfig(config as ChatConfig);

    const result = await analyzeDiff(
      (prompt) => generateWithDualModel(prompt, [], dualCfg, 'think'),
      diff
    );

    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/review/pending", async (_req, res) => {
  try {
    const reviews = getPendingReviews();
    return res.json({ reviews });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/review/:id/accept", (req, res) => {
  const { commentId } = req.body;
  const success = acceptComment(req.params.id, commentId);
  return res.json({ success });
});

app.post("/api/review/:id/reject", (req, res) => {
  const { commentId } = req.body;
  const success = rejectComment(req.params.id, commentId);
  return res.json({ success });
});

// Browser API routes
app.post("/api/browser/navigate", validateBody(BrowserNavigateSchema), async (req, res) => {
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

app.post("/api/browser/click", validateBody(BrowserActionSchema), async (req, res) => {
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

app.post("/api/browser/type", validateBody(BrowserActionSchema), async (req, res) => {
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

app.get("/api/browser/screenshot", async (req, res) => {
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

app.post("/api/browser/evaluate", async (req, res) => {
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

app.get("/api/browser/html", async (req, res) => {
  try {
    const sessionId = String(req.query.sessionId || "default");
    const headless = req.query.headless !== "false";
    const result = await browserGetHtml(sessionId, headless);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ success: false, output: "", error: e.message });
  }
});

app.post("/api/browser/close", async (req, res) => {
  try {
    const { sessionId = "default" } = req.body;
    const result = await browserClose(sessionId);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ success: false, output: "", error: e.message });
  }
});

app.get("/api/browser/sessions", (_req, res) => {
  return res.json({ sessions: getActiveBrowserSessions() });
});

// Cost tracking API routes
app.get("/api/costs", async (_req, res) => {
  try {
    const costs = await getCosts();
    return res.json(costs);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/costs/reset", async (_req, res) => {
  try {
    await resetCosts();
    return res.json({ reset: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
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

// Team Sync API routes
app.get("/api/sync/status", (_req, res) => {
  res.json(getSyncStatus());
});

app.post("/api/sync/export", async (_req, res) => {
  const result = await exportSync();
  res.json(result);
});

app.post("/api/sync/import", async (_req, res) => {
  const result = await importSync();
  res.json(result);
});

app.get("/api/sync/config", (_req, res) => {
  res.json(getSyncConfig());
});

app.post("/api/sync/config", async (req, res) => {
  try {
    await saveSyncConfig(req.body);
    res.json({ saved: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/sync/resolve", async (req, res) => {
  try {
    const { resolutions } = req.body;
    await resolveConflictsManually(resolutions);
    res.json({ resolved: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- A/B Prompt Testing API ---
app.post("/api/prompt-test", async (req, res) => {
  try {
    const { task, variants, provider, model, localUrl, apiKey, temperature, maxTokens, judgeProvider, judgeModel } = req.body;
    if (!task || !variants || !Array.isArray(variants) || variants.length < 2 || !provider) {
      res.status(400).json({ error: "task, variants (min 2), and provider are required" });
      return;
    }
    const result = await runPromptTest({
      task,
      variants,
      provider,
      model,
      localUrl,
      apiKey,
      temperature,
      maxTokens,
      judgeProvider,
      judgeModel,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- Issue Tracker API ---
app.post("/api/tracker/config", (req, res) => {
  try {
    const { type, token, baseUrl, repo, project } = req.body;
    if (!type || !token) {
      res.status(400).json({ error: "type and token are required" });
      return;
    }
    setTrackerConfig({ type, token, baseUrl, repo, project });
    res.json({ configured: true, type });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/tracker/issues", async (req, res) => {
  try {
    const { title, description, priority, labels } = req.body;
    if (!title) { res.status(400).json({ error: "title required" }); return; }
    const issue = await createTrackerIssue({ title, description, priority, labels });
    res.json(issue);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/tracker/issues", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
    const issues = await listTrackerIssues(status, limit);
    res.json({ issues });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/tracker/issues/:key", async (req, res) => {
  try {
    const issue = await getTrackerIssue(req.params.key);
    res.json(issue);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/tracker/issues/:key/comment", async (req, res) => {
  try {
    const { body } = req.body;
    if (!body) { res.status(400).json({ error: "body required" }); return; }
    await addTrackerComment(req.params.key, body);
    res.json({ commented: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
// ---

// --- P2P Collaboration Sync API ---
app.get("/api/p2p/status", (_req, res) => {
  res.json({
    active: isP2PActive(),
    peers: getPeers(),
    shares: getShares().length,
  });
});

app.get("/api/p2p/peers", (_req, res) => {
  res.json({ peers: getPeers() });
});

app.get("/api/p2p/shares", (req, res) => {
  const type = req.query.type as string | undefined;
  res.json({ shares: getShares(type) });
});

app.post("/api/p2p/share", (req, res) => {
  try {
    const { type, name, content } = req.body;
    if (!type || !name || !content) {
      res.status(400).json({ error: "type, name, and content are required" });
      return;
    }
    const fragment = publishShare(type, name, content);
    res.json(fragment);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- Agent Marketplace API ---
app.get("/api/marketplace", async (req, res) => {
  try {
    const { type, tag, search } = req.query;
    const items = getMarketItems(
      type as string | undefined,
      tag as string | undefined,
      search as string | undefined
    );
    res.json({ items, stats: getStats(), tags: getTags() });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/marketplace/stats", (_req, res) => {
  res.json(getStats());
});

app.post("/api/marketplace/publish", async (req, res) => {
  try {
    const { type, name, description, content, author, version, tags } = req.body;
    if (!type || !name || !content) {
      res.status(400).json({ error: "type, name, and content are required" });
      return;
    }
    const item = await publishItem(type, name, description || "", content, author, version, tags);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/marketplace/:id", async (req, res) => {
  try {
    const item = await downloadItem(req.params.id);
    if (!item) { res.status(404).json({ error: "Item not found" }); return; }
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/marketplace/:id", async (req, res) => {
  try {
    const ok = await removeItem(req.params.id);
    res.json({ removed: ok });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/marketplace/:id/review", async (req, res) => {
  try {
    const { rating, text, author } = req.body;
    if (!rating) { res.status(400).json({ error: "rating required (1-5)" }); return; }
    const review = await addReview(req.params.id, rating, text || "", author);
    res.json(review);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/marketplace/:id/reviews", (req, res) => {
  res.json({ reviews: getReviews(req.params.id) });
});

// --- CI/CD Pipeline API ---
app.post("/api/ci/generate", async (req, res) => {
  try {
    const { pipelineType, projectName, nodeVersion, buildCommand, testCommand, lintCommand, typeCheckCommand, deployTarget, dockerfile, customSteps } = req.body;
    if (!pipelineType || !projectName) {
      res.status(400).json({ error: "pipelineType and projectName are required" });
      return;
    }
    const result = await generateCIPipeline({
      pipelineType, projectName, nodeVersion, buildCommand, testCommand, lintCommand, typeCheckCommand, deployTarget, dockerfile, customSteps,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/ci/templates", (_req, res) => {
  res.json({ templates: PIPELINE_TEMPLATES });
});
// ---

async function startServer() {
  await ensureStorage();
  await initSync();
  await initMarketplace();
  setSessionDbPath(STORAGE_DIR);
  setSkillsDir(path.join(process.cwd(), ".cvr", "skills"));
  setSkillCreatorDir(path.join(process.cwd(), ".cvr", "skills"));
  setRagDbPath(STORAGE_DIR);
  setCacheDbPath(STORAGE_DIR);
  setRulesDir(path.join(process.cwd(), ".cvr", "rules"));
  setCustomToolsDir(path.join(process.cwd(), ".cvr", "tools"));
  setPluginsDir(path.join(process.cwd(), ".cvr", "plugins"));
  await loadAgents();
  await registerPlugins();
  registerBuiltinHooks();

  // Project Oracle: auto-index workspace into RAG (background, non-blocking)
  if (process.env.CVR_ORACLE_ENABLED !== 'false') {
    setImmediate(() => {
      indexProject(process.cwd(), generateEmbeddings).catch((err) => {
        console.error('Project Oracle indexing failed:', err);
      });
    });
  }

  const mcpConfig = await loadMcpConfig();
  if (mcpConfig.enabled && mcpConfig.transport === "stdio") {
    await startMcpStdio();
    return;
  }

  if (mcpConfig.enabled && (mcpConfig.transport === "http" || mcpConfig.transport === "sse")) {
    mountMcpSseRoutes(app, mcpConfig.basePath || "/mcp");
  }

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

  // SECURITY: Bind to localhost only to prevent remote exposure
  const server = app.listen(PORT, "127.0.0.1", () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
  });

  // P2P Collaboration — auto-start if enabled
  if (process.env.CVR_P2P_ENABLED === "true") {
    const p2pPort = parseInt(process.env.CVR_P2P_PORT || "3001", 10);
    const p2pSecret = process.env.CVR_P2P_SECRET || "cvr-p2p-default-secret";
    setupP2PSync(server, {
      enabled: true,
      port: p2pPort,
      secret: p2pSecret,
      room: process.env.CVR_P2P_ROOM || "default",
    });
    console.log(`P2P sync enabled (room: ${process.env.CVR_P2P_ROOM || "default"})`);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    import("./src/server/p2pSync.js").then((m) => m.closeP2PSync()).catch(() => {});
    server.close(() => {
      console.log("HTTP server closed");
    });
    await closeAllBrowsers();
    // Close SQLite if open
    try {
      const { getDb } = await import("./src/server/sessionStore.js");
      getDb().close?.();
    } catch {
      // ignore
    }
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer();

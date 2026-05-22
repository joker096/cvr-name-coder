import type { Application, Request, Response } from "express";
import * as path from "path";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import { buildSystemPrompt } from "../prompts.js";
import { generateAIContent, generateWithDualModel } from "../providers.js";
import type { DualModelConfig } from "../providers.js";
import { ContextWindow, Priority } from "../contextWindow.js";
import { processImages, type ProcessedImage } from "../imageProcessor.js";
import type { HistoryEntry, MemoryEntry } from "../../types/api.js";
import { getErrorMessage } from "../../types/errors.js";
import { incrementRequestCount } from "../standalone/health.js";
import { trackCost } from "../costTracker.js";

interface ChatConfig {
  aiProvider?: string;
  localUrl?: string;
  aiModel?: string;
  localModelName?: string;
  apiKey?: string;
  providerKeys?: Record<string, string>;
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
  const providerKey = cfg.providerKeys?.[cfg.aiProvider || "gemini"] || cfg.apiKey;
  if (providerKey !== undefined) result.apiKey = providerKey;
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

export const STORAGE_DIR = path.join(process.cwd(), ".opencode-infinite");
export const HISTORY_FILE = path.join(STORAGE_DIR, "history.json");
export const MEMORY_FILE = path.join(STORAGE_DIR, "memory.json");

export async function ensureStorage() {
  try {
    await mkdir(STORAGE_DIR, { recursive: true });
    try { await access(HISTORY_FILE); } catch { await writeFile(HISTORY_FILE, JSON.stringify([])); }
    try { await access(MEMORY_FILE); } catch { await writeFile(MEMORY_FILE, JSON.stringify([])); }
  } catch (e) {
    console.error("Storage init error:", e);
  }
}

let _historyCache: HistoryEntry[] | null = null;
let _historyCacheTime = 0;
let _memoryCache: MemoryEntry[] | null = null;
let _memoryCacheTime = 0;

async function getHistoryCached(): Promise<HistoryEntry[]> {
  if (_historyCache && Date.now() - _historyCacheTime < 5000) return _historyCache;
  try {
    _historyCache = JSON.parse(await readFile(HISTORY_FILE, "utf-8")) as HistoryEntry[];
    _historyCacheTime = Date.now();
    return _historyCache;
  } catch {
    return [];
  }
}

async function getMemoriesCached(): Promise<MemoryEntry[]> {
  if (_memoryCache && Date.now() - _memoryCacheTime < 5000) return _memoryCache;
  try {
    _memoryCache = JSON.parse(await readFile(MEMORY_FILE, "utf-8")) as MemoryEntry[];
    _memoryCacheTime = Date.now();
    return _memoryCache;
  } catch {
    return [];
  }
}

function invalidateHistoryCache(): void {
  _historyCache = null;
  _historyCacheTime = 0;
}

function invalidateMemoryCache(): void {
  _memoryCache = null;
  _memoryCacheTime = 0;
}

export async function summarizeLongHistory(messages: HistoryEntry[], provider: string = "gemini", localUrl?: string, modelName?: string, apiKey?: string, dualConfig?: DualModelConfig) {
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

export function registerRoutes(app: Application) {
  app.post("/api/chat", async (req: Request, res: Response) => {
    incrementRequestCount();
    try {
      const body = req.body as ChatRequestBody;
      const { message, config = {}, kernelConfig = {}, agent: bodyAgent } = body;
      const { aiProvider = "gemini", localUrl, aiModel, localModelName, apiKey, temperature, maxTokens, systemPrompt: customSystemPrompt, agent: configAgent, maxImageSize } = config;
      const resolvedModel = aiProvider === "local" ? (localModelName || aiModel) : aiModel;
      const kConfig = kernelConfig?.aiProvider ? kernelConfig : config;

      const history = await getHistoryCached();
      const memories = await getMemoriesCached();

      const agent = (bodyAgent || configAgent || "build") as import("../../types/settings.js").AgentId;
      const mode = config.mode || "build";
      const contextParts = memories.slice(-5).map((m) => `[CLUSTER_DATA]: ${m.content}`).join('\n');

      const systemPrompt = await buildSystemPrompt({
        agent,
        mode,
        contextParts,
        customSystemPrompt: customSystemPrompt && customSystemPrompt.trim() ? customSystemPrompt : undefined,
      } as Parameters<typeof buildSystemPrompt>[0]);

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

      const ctxWindow = new ContextWindow({ maxTokens: 128000, tokenBuffer: 16000 });
      for (const m of history.slice(-20)) {
        const priority = m.role === 'user' && m.content.startsWith('/')
          ? Priority.HIGH
          : Priority.NORMAL;
        ctxWindow.add(m.role, m.content, priority);
      }
      const visibleHistory = ctxWindow.getMessages();

      const historyLookup = new Map<string, HistoryEntry>();
      for (const h of history) {
        historyLookup.set(`${h.role}:${h.content}`, h);
      }

      const historyContents = visibleHistory.map((m) => {
        const hEntry = historyLookup.get(`${m.role}:${m.content}`);
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
      ], aiProvider, localUrl, resolvedModel, apiKey, temperature, maxTokens, true);

      const estimatedInputTokens = Math.ceil((systemPrompt + message).length / 4);
      const estimatedOutputTokens = Math.ceil(responseText.length / 4);

      const userHistoryEntry: HistoryEntry = { role: 'user', content: message, createdAt: new Date() };
      if (processedImages.length > 0) {
        userHistoryEntry.images = processedImages.map(img => `data:${img.mimeType};base64,${img.base64}`);
      }
      const updatedHistory: HistoryEntry[] = [...history, userHistoryEntry, { role: 'assistant' as const, content: responseText, createdAt: new Date() }];
      await writeFile(HISTORY_FILE, JSON.stringify(updatedHistory));
      invalidateHistoryCache();

      if (updatedHistory.length % 5 === 0) {
        const kConfigTyped = kConfig as ChatConfig;
        const dualCfg = buildDualConfig(kConfigTyped);
        summarizeLongHistory(updatedHistory, kConfigTyped.aiProvider, kConfigTyped.localUrl, kConfigTyped.aiProvider === "local" ? (kConfigTyped.localModelName || kConfigTyped.aiModel) : kConfigTyped.aiModel, kConfigTyped.apiKey, dualCfg).then(async (summary) => {
          if (summary) {
            const currentMemories = JSON.parse(await readFile(MEMORY_FILE, "utf-8")) as MemoryEntry[];
            await writeFile(MEMORY_FILE, JSON.stringify([...currentMemories, { content: summary, createdAt: new Date() }]));
            invalidateMemoryCache();
          }
        });
      }

      res.json({ 
        content: responseText, 
        continueNeeded: responseText.includes("CONTINUE_NEEDED"),
        tokenUsage: { input: estimatedInputTokens, output: estimatedOutputTokens }
      });

      // Track cost (fire-and-forget)
      trackCost(aiProvider, resolvedModel || 'unknown', estimatedInputTokens, estimatedOutputTokens).catch(() => {});

    } catch (error: unknown) {
      console.error("API Error:", getErrorMessage(error));
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/models", async (req: Request, res: Response) => {
    try {
      const provider = (req.query.provider as string) || "gemini";
      const apiKey = (req.query.apiKey as string) || undefined;

      const baseUrls: Record<string, string> = {
        openai: "https://api.openai.com/v1",
        deepseek: "https://api.deepseek.com/v1",
        grok: "https://api.x.ai/v1",
        groq: "https://api.groq.com/openai/v1",
        baseten: "https://api.baseten.co/v1",
        openrouter: "https://openrouter.ai/api/v1",
        together: "https://api.together.xyz/v1",
        mistral: "https://api.mistral.ai/v1",
      };

      if (provider === "gemini") {
        const key = apiKey || process.env.GEMINI_API_KEY || "";
        if (!key) { res.status(400).json({ error: "API key required" }); return; }
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await resp.json() as any;
        const models = (data.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .sort((a: any, b: any) => (b.name || "").localeCompare(a.name || ""))
          .slice(0, 30)
          .map((m: any) => ({ id: m.name?.replace("models/", "") || "", name: m.displayName || m.name || "" }));
        res.json({ models });
        return;
      }

      if (provider === "anthropic") {
        const key = apiKey || process.env.ANTHROPIC_API_KEY || "";
        if (!key) { res.status(400).json({ error: "API key required" }); return; }
        const resp = await fetch("https://api.anthropic.com/v1/models", {
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
        });
        const data = await resp.json() as any;
        const models = (data.data || [])
          .sort((a: any, b: any) => (b.id || "").localeCompare(a.id || ""))
          .slice(0, 20)
          .map((m: any) => ({ id: m.id || "", name: m.display_name || m.id || "" }));
        res.json({ models });
        return;
      }

      if (provider === "baseten") {
        const key = apiKey || process.env.BASETEN_API_KEY || "";
        if (!key) { res.status(400).json({ error: "API key required — set BASETEN_API_KEY env var" }); return; }
        const resp = await fetch("https://api.baseten.co/v1/models", {
          headers: { Authorization: `Api-Key ${key}`, "Content-Type": "application/json" },
        });
        if (!resp.ok) {
          res.status(resp.status).json({ error: `Baseten API: ${resp.status} — deploy models at baseten.co/library` });
          return;
        }
        const data = await resp.json() as any;
        const models = (data.models || [])
          .filter((m: any) => m.status === "ACTIVE" || m.status === "READY")
          .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
          .map((m: any) => ({ id: m.id || m.model_id || "", name: m.name || m.id || m.model_id || "" }));
        res.json({ models, note: "Only deployed models shown. Deploy from baseten.co/library" });
        return;
      }

      const baseUrl = baseUrls[provider] || "";
      if (!baseUrl) { res.status(400).json({ error: "Unknown provider" }); return; }

      const envKeyMap: Record<string, string> = {
        openai: "OPENAI_API_KEY", deepseek: "DEEPSEEK_API_KEY", grok: "XAI_API_KEY",
        groq: "GROQ_API_KEY", baseten: "BASETEN_API_KEY", openrouter: "OPENROUTER_API_KEY",
        together: "TOGETHER_API_KEY", mistral: "MISTRAL_API_KEY",
      };
      const key = apiKey || process.env[envKeyMap[provider] || ""] || "";
      if (!key) { res.status(400).json({ error: "API key required — set via env var or enter in settings" }); return; }

      const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      });
      if (!resp.ok) {
        const err = await resp.text().catch(() => "");
        res.status(resp.status).json({ error: `API error: ${resp.status} ${err.slice(0, 200)}` });
        return;
      }
      const data = await resp.json() as any;
      const rawModels: any[] = data.data || data.models || [];
      const models = rawModels
        .filter((m: any) => m.id && !m.id.includes("embed") && !m.id.includes("tts") && !m.id.includes("whisper") && !m.id.includes("dall"))
        .sort((a: any, b: any) => (b.created || 0) - (a.created || 0))
        .slice(0, 40)
        .map((m: any) => ({ id: m.id || "", name: m.id || "" }));

      res.json({ models });
    } catch (err: unknown) {
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  app.get("/api/history", async (_req: Request, res: Response) => {
    try {
      const history = await getHistoryCached();
      const memories = await getMemoriesCached();
      res.json({ history, memories });
    } catch {
      res.json({ history: [], memories: [] });
    }
  });

  app.post("/api/clear", async (_req: Request, res: Response) => {
    await writeFile(HISTORY_FILE, JSON.stringify([]));
    await writeFile(MEMORY_FILE, JSON.stringify([]));
    invalidateHistoryCache();
    invalidateMemoryCache();
    res.json({ status: "cleared" });
  });
}

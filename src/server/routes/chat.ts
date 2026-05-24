import type { Application, Request, Response } from "express";
import * as path from "path";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import { buildSystemPrompt, getOpenAITools } from "../prompts.js";
import { generateAIResponse, generateStreamResponse, generateAIContent, generateWithDualModel } from "../providers.js";
import type { DualModelConfig, Content } from "../providers.js";
import { ContextWindow, Priority } from "../contextWindow.js";
import { processImages, type ProcessedImage } from "../imageProcessor.js";
import type { HistoryEntry, MemoryEntry } from "../../types/api.js";
import { getErrorMessage } from "../../types/errors.js";
import { incrementRequestCount } from "../standalone/health.js";
import { trackCost } from "../costTracker.js";
import { buildDualModelConfig } from "../dualModel.js";
import { validateBody, ChatRequestSchema } from "../validation.js";
import { executeTool } from "../tools.js";
import { log } from "../logger.js";

/** Configuration for AI chat provider and model settings. */
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

interface ChatRequestBody {
  message: string;
  images?: string[];
  config?: ChatConfig;
  kernelConfig?: KernelConfig;
  agent?: string;
}

interface ChatContext {
  systemPrompt: string;
  historyContents: Content[];
  history: HistoryEntry[];
  buildParts: (text: string, imgs?: ProcessedImage[]) => Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
  processedImages: ProcessedImage[];
  message: string;
  agent: string;
  mode: string;
  aiProvider: string;
  localUrl: string | undefined;
  resolvedModel: string | undefined;
  resolvedApiKey: string | undefined;
  temperature: number | undefined;
  maxTokens: number | undefined;
  kConfig: ChatConfig;
}

/** Directory path for persistent storage (.opencode-infinite). */
export const STORAGE_DIR = path.join(process.cwd(), ".opencode-infinite");
export const HISTORY_FILE = path.join(STORAGE_DIR, "history.json");
export const MEMORY_FILE = path.join(STORAGE_DIR, "memory.json");

export async function ensureStorage() {
  try {
    await mkdir(STORAGE_DIR, { recursive: true });
    try { await access(HISTORY_FILE); } catch { await writeFile(HISTORY_FILE, JSON.stringify([])); }
    try { await access(MEMORY_FILE); } catch { await writeFile(MEMORY_FILE, JSON.stringify([])); }
  } catch (e) {
    log.error("Storage init error", e instanceof Error ? e : undefined);
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

export async function summarizeLongHistory(messages: HistoryEntry[], provider?: string, localUrl?: string, modelName?: string, apiKey?: string, dualConfig?: DualModelConfig) {
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
    log.error("Summarization failed", error instanceof Error ? error : undefined);
    return null;
  }
}

function scheduleSummary(updatedHistory: HistoryEntry[], kConfig: ChatConfig) {
  if (updatedHistory.length % 5 !== 0) return;
  const dualCfg: DualModelConfig = buildDualModelConfig(kConfig);
  const summaryKey = kConfig.providerKeys?.[kConfig.aiProvider || ""] || kConfig.apiKey;
  summarizeLongHistory(updatedHistory, kConfig.aiProvider, kConfig.localUrl, kConfig.aiProvider === "local" ? (kConfig.localModelName || kConfig.aiModel) : kConfig.aiModel, summaryKey, dualCfg).then(async (summary) => {
    if (summary) {
      const currentMemories = JSON.parse(await readFile(MEMORY_FILE, "utf-8")) as MemoryEntry[];
      await writeFile(MEMORY_FILE, JSON.stringify([...currentMemories, { content: summary, createdAt: new Date() }]));
      invalidateMemoryCache();
    }
  });
}

async function executeToolCalls(
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>,
  mode: string,
  agent: string
): Promise<Array<{ role: string; tool_call_id: string; content: string }>> {
  const results: Array<{ role: string; tool_call_id: string; content: string }> = [];
  for (const tc of toolCalls) {
    const result = await executeTool(
      { name: tc.name, params: tc.arguments },
      mode as "plan" | "build" | "review",
      undefined,
      agent
    );
    results.push({
      role: "tool",
      tool_call_id: tc.id,
      content: result.success ? result.output : `Error: ${result.error || "Unknown error"}`,
    });
    if (result.error) {
      log.warn(`Tool ${tc.name} error: ${result.error}`);
    }
  }
  return results;
}

function appendToolResults(contents: Content[], response: { text?: string | undefined; toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }> | undefined }, toolResults: Array<{ role: string; tool_call_id: string; content: string }>) {
  if (response.toolCalls) {
    contents.push({
      role: "assistant",
      parts: [{ text: response.text || `Tool call: ${response.toolCalls.map((tc) => tc.name).join(", ")}` }],
      _toolCalls: response.toolCalls.map((tc) => ({
        id: tc.id, type: "function" as const, function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
      })),
    });
  }
  for (const tr of toolResults) {
    contents.push({ role: "tool", parts: [{ text: tr.content }], _toolCallId: tr.tool_call_id, _isToolResult: true });
  }
}

async function runToolLoop(
  systemPrompt: string,
  contents: Content[],
  ctx: ChatContext,
  onToolResult?: (step: number, response: { text?: string | undefined; reasoning?: string | undefined; toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }> | undefined }) => void
): Promise<{ text: string; reasoning: string | undefined; steps: number }> {
  const tools = getOpenAITools();
  const MAX_STEPS = 20;
  let step = 0;

  let response = await generateAIResponse(systemPrompt, contents, ctx.aiProvider, ctx.localUrl, ctx.resolvedModel, ctx.resolvedApiKey, ctx.temperature, ctx.maxTokens, step === 0, tools);

  while (response.toolCalls && response.toolCalls.length > 0 && step < MAX_STEPS) {
    step++;
    const toolResults = await executeToolCalls(response.toolCalls, ctx.mode, ctx.agent);
    appendToolResults(contents, response, toolResults);
    if (onToolResult) onToolResult(step, response);
    response = await generateAIResponse(systemPrompt, contents, ctx.aiProvider, ctx.localUrl, ctx.resolvedModel, ctx.resolvedApiKey, ctx.temperature, ctx.maxTokens, false, tools);
  }

  return { text: response.text || "", reasoning: response.reasoning, steps: step };
}

async function buildHistoryContents(history: HistoryEntry[]): Promise<Content[]> {
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

  return visibleHistory.map((m) => {
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
}

function makeHistoryEntry(message: string, images?: ProcessedImage[]): HistoryEntry {
  const entry: HistoryEntry = { role: 'user', content: message, createdAt: new Date() };
  if (images && images.length > 0) {
    entry.images = images.map(img => `data:${img.mimeType};base64,${img.base64}`);
  }
  return entry;
}

async function finalizeChat(
  history: HistoryEntry[],
  userEntry: HistoryEntry,
  responseText: string,
  ctx: ChatContext,
  extra?: { reasoning?: string | undefined; steps?: number | undefined; toolOutputs?: string[] | undefined }
) {
  const sanitized = sanitizeAIResponse(responseText);
  const updatedHistory: HistoryEntry[] = [...history, userEntry, { role: 'assistant' as const, content: sanitized, createdAt: new Date() }];
  await writeFile(HISTORY_FILE, JSON.stringify(updatedHistory));
  invalidateHistoryCache();
  scheduleSummary(updatedHistory, ctx.kConfig);
  trackCost(ctx.aiProvider, ctx.resolvedModel || 'unknown', Math.ceil(sanitized.length / 2.5), Math.ceil(sanitized.length / 2.5)).catch(() => {});
  return {
    updatedHistory,
    response: {
      content: sanitized,
      reasoning: extra?.reasoning ?? undefined,
      toolCalls: extra?.toolOutputs,
      continueNeeded: false,
      tokenUsage: { input: Math.ceil((ctx.systemPrompt + ctx.message).length / 2.5), output: Math.ceil(sanitized.length / 2.5) },
    },
  };
}

function setSSEHeaders(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

function sseWrite(res: Response, data: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

const HALLUCINATED_TOOL_PATTERN = /<\s*(?:invoke|parameter|tool_calls?|function_calls?|function_call)[\s\S]*?<\/\s*(?:invoke|parameter|tool_calls?|function_calls?|function_call)\s*>/gi;
const FAKE_PATH_PREFIX = /(^|\n)\s*(?:Now let me read|Let me read|I'll read|Reading)\s+/gi;

function sanitizeAIResponse(text: string): string {
  let sanitized = text.replace(HALLUCINATED_TOOL_PATTERN, '[tool call removed]');
  sanitized = sanitized.replace(FAKE_PATH_PREFIX, '$1');
  return sanitized;
}

class SSETokenFilter {
  private buf = '';
  private inTag = false;

  feed(token: string): string {
    this.buf += token;
    if (!this.inTag) {
      const tagIdx = this.buf.search(/<\s*(invoke|parameter|tool_calls?|function_calls?|function_call)/i);
      if (tagIdx === -1) {
        const out = this.buf;
        this.buf = '';
        return out;
      }
      const before = this.buf.slice(0, tagIdx);
      this.buf = this.buf.slice(tagIdx);
      this.inTag = true;
      return before;
    }
    const closeIdx = this.buf.search(/<\/\s*(invoke|parameter|tool_calls?|function_calls?|function_call)\s*>/i);
    if (closeIdx !== -1) {
      this.buf = this.buf.slice(closeIdx + this.buf.slice(closeIdx).indexOf('>') + 1);
      this.inTag = false;
    } else if (this.buf.length > 500) {
      this.buf = '';
      this.inTag = false;
    }
    return '';
  }

  flush(): string {
    const out = this.inTag ? '' : this.buf;
    this.buf = '';
    this.inTag = false;
    return out;
  }
}

export function registerRoutes(app: Application) {
  app.post("/api/chat", validateBody(ChatRequestSchema), async (req: Request, res: Response) => {
    incrementRequestCount();
    try {
      const body = req.body as ChatRequestBody;
      const { message, config = {}, kernelConfig = {}, agent: bodyAgent } = body;
      const { aiProvider, localUrl, aiModel, localModelName, apiKey, providerKeys, temperature, maxTokens, systemPrompt: customSystemPrompt, agent: configAgent, maxImageSize } = config;
      const resolvedApiKey = providerKeys?.[aiProvider || ""] || apiKey;
      if (!aiProvider) {
        res.status(400).json({ error: "AI provider not configured. Please select a provider in Settings." });
        return;
      }
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

      const historyContents = await buildHistoryContents(history);

      const ctx: ChatContext = {
        systemPrompt, historyContents, history, buildParts, processedImages, message,
        agent, mode, aiProvider, localUrl, resolvedModel, resolvedApiKey, temperature, maxTokens, kConfig: kConfig as ChatConfig,
      };

      const acceptSSE = (req.headers.accept || "").includes("text/event-stream");
      const { multiModelEnabled, thinkingProvider, thinkingModel, thinkingLocalUrl } = config;
      const useDualModel = multiModelEnabled && thinkingProvider && thinkingModel;

      // SSE cleanup on client disconnect
      let clientDisconnected = false;
      req.on('close', () => { clientDisconnected = true; });

      if (useDualModel) {
        const thinkPrompt = `Analyze the user's request and provide a detailed plan/analysis.`;
        const thinkResponse = await generateAIResponse(thinkPrompt, [
          ...historyContents,
          { role: 'user', parts: buildParts(message, processedImages) },
        ], thinkingProvider, thinkingLocalUrl || localUrl, thinkingModel, resolvedApiKey, temperature, maxTokens, false);
        const reasoning = thinkResponse.text;

        const finalPrompt = `${systemPrompt}\n\n[CONTEXT]\n${reasoning?.slice(0, 2000) || ""}\n\nNow respond to: ${message}`;
        const dmUserContent: Content = { role: 'user', parts: buildParts(message, processedImages) };
        const dmContents: Content[] = [...historyContents, dmUserContent];

        const result = await runToolLoop(finalPrompt, dmContents, ctx);

        if (clientDisconnected) return;
        const userEntry = makeHistoryEntry(message, processedImages);

        if (acceptSSE) {
          setSSEHeaders(res);
          sseWrite(res, { reasoning });
          if (result.steps > 0) sseWrite(res, { toolSteps: result.steps });

          const sseFilter = new SSETokenFilter();
          const finalStream = await generateStreamResponse(finalPrompt, dmContents, ctx.aiProvider, ctx.localUrl, ctx.resolvedModel, ctx.resolvedApiKey, ctx.temperature, ctx.maxTokens, {
            onToken: (token: string) => {
              if (!clientDisconnected) {
                const filtered = sseFilter.feed(token);
                if (filtered) sseWrite(res, { content: filtered });
              }
            },
          });
          const flushToken = sseFilter.flush();
          if (!clientDisconnected && flushToken) sseWrite(res, { content: flushToken });

          if (!clientDisconnected) {
            sseWrite(res, { done: true, continueNeeded: false, tokenUsage: { input: Math.ceil((finalPrompt + message).length / 2.5), output: Math.ceil(finalStream.text.length / 2.5) } });
            res.end();
          }

          await finalizeChat(history, userEntry, finalStream.text, ctx, {
            ...(reasoning ? { reasoning } : {}),
            steps: result.steps,
          });
          return;
        }

        const finalized = await finalizeChat(history, userEntry, result.text, ctx, {
          ...(reasoning ? { reasoning } : {}),
          steps: result.steps,
        });
        res.json(finalized.response);
        return;
      }

      const userContent: Content = { role: 'user', parts: buildParts(message, processedImages) };
      const allContents: Content[] = [...historyContents, userContent];
      const userEntry = makeHistoryEntry(message, processedImages);

      if (acceptSSE) {
        setSSEHeaders(res);

        const toolOutputs: string[] = [];
        const result = await runToolLoop(systemPrompt, allContents, ctx, (_step, response) => {
          if (!clientDisconnected && response.toolCalls) {
            sseWrite(res, { toolCalls: response.toolCalls.map((tc) => ({ name: tc.name, args: tc.arguments })) });
          }
          if (!clientDisconnected && response.reasoning) {
            sseWrite(res, { reasoning: response.reasoning.slice(0, 500) });
          }
        });

        if (clientDisconnected) return;

        const sseTokenFilter = new SSETokenFilter();
        const finalStreamResponse = await generateStreamResponse(systemPrompt, allContents, ctx.aiProvider, ctx.localUrl, ctx.resolvedModel, ctx.resolvedApiKey, ctx.temperature, ctx.maxTokens, {
          onToken: (token: string) => {
            if (!clientDisconnected) {
              const filtered = sseTokenFilter.feed(token);
              if (filtered) sseWrite(res, { content: filtered });
            }
          },
        });
        const flushRemaining = sseTokenFilter.flush();
        if (!clientDisconnected && flushRemaining) sseWrite(res, { content: flushRemaining });

        if (!clientDisconnected) {
          sseWrite(res, { done: true, continueNeeded: false, tokenUsage: { input: Math.ceil((systemPrompt + message).length / 2.5), output: Math.ceil(finalStreamResponse.text.length / 2.5) } });
          res.end();
        }

        await finalizeChat(history, userEntry, finalStreamResponse.text, ctx, {
          steps: result.steps,
          ...(toolOutputs.length > 0 ? { toolOutputs } : {}),
        });
        return;
      }

      // Non-SSE JSON path
      const toolOutputs: string[] = [];
      const result = await runToolLoop(systemPrompt, allContents, ctx, (_step, response) => {
        if (response.toolCalls) {
          for (const tc of response.toolCalls) {
            toolOutputs.push(`[${tc.id}]: tool ${tc.name}`);
          }
        }
      });

      const finalized = await finalizeChat(history, userEntry, result.text, ctx, {
        ...(result.reasoning ? { reasoning: result.reasoning } : {}),
        steps: result.steps,
        ...(toolOutputs.length > 0 ? { toolOutputs } : {}),
      });
      res.json(finalized.response);

    } catch (error: unknown) {
      log.error("API Error", error instanceof Error ? error : undefined);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get("/api/models", async (req: Request, res: Response) => {
    try {
      const provider = (req.query.provider as string) || "";
      const apiKey = (req.query.apiKey as string) || undefined;

      const baseUrls: Record<string, string> = {
        openai: "https://api.openai.com/v1",
        deepseek: "https://api.deepseek.com/v1",
        grok: "https://api.x.ai/v1",
        groq: "https://api.groq.com/openai/v1",
        baseten: "https://inference.baseten.co/v1",
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
        const resp = await fetch("https://inference.baseten.co/v1/models", {
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        });
        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          res.status(resp.status).json({ error: `Baseten API: ${resp.status} — ${errText.slice(0, 200)}` });
          return;
        }
        const data = await resp.json() as any;
        const models = (data.data || []).map((m: any) => ({ id: m.id || "", name: m.id || "" }));
        res.json({ models });
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

      const authPrefix = "Bearer";
      const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
        headers: { Authorization: `${authPrefix} ${key}`, "Content-Type": "application/json" },
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

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import express from 'express';
import { CompletionEngine } from './completion/completionEngine.js';
import { CvrInlineCompletionProvider } from './providers/InlineCompletionProvider.js';
import type { CompletionConfig } from './types/completion.js';
import { registerInlineEditCommand } from './commands/InlineEditCommand.js';
import { generateDiff } from './server/diffRoutes.js';
import { DiffViewProvider } from './providers/DiffViewProvider.js';
import { DiagnosticsProvider } from './providers/DiagnosticsProvider.js';
import { PermissionEngine } from '../../src/server/permissions.js';
import type { PermissionConfig } from '../../src/types/permissions.js';
import { AgentLoop } from '../../src/server/agentLoop.js';
import { executeTool } from '../../src/server/tools.js';
import { createPlan } from '../../src/server/planner.js';
import { SubagentManager } from '../../src/server/subagentManager.js';
import { loadAgents, setAgentsDir, getAgentById } from '../../src/server/agentLoader.js';
import { toOpenAITools, type OpenAITool, type OpenAIToolCall } from '../../src/types/tools.js';
import { randomUUID } from 'crypto';
import { readMemory, writeMemory, replaceMemorySection, deleteMemorySection, readUser, writeUser, replaceUserSection, deleteUserSection, setMemoryDir } from '../../src/server/memoryStore.js';
import { createSession, addMessage, getSession, listSessions, searchSessions, deleteSession, setSessionDbPath } from '../../src/server/sessionStore.js';
import { setGoalStorageDir } from '../../src/server/goalSessionStore.js';
import { loadSkills, getSkillById, setSkillsDir } from '../../src/server/skillLoader.js';
import { setSkillCreatorDir } from '../../src/server/skillCreator.js';
import { ingestDocument, searchRAG, listSources, clearSource, setRagDbPath } from '../../src/server/ragEngine.js';
import { setRagEmbedFn } from '../../src/server/tools.js';
import { setProjectRoot } from '../../src/server/tools/file.js';
import { setGitProjectRoot } from '../../src/server/gitTools.js';
import { setCacheDbPath } from '../../src/server/cache.js';
import { indexProject } from '../../src/server/projectOracle.js';
import { loadInstructions, getInstructionsContext, setRulesDir, saveInstruction, deleteInstruction } from '../../src/server/instructionLoader.js';
import { loadCustomTools, setCustomToolsDir } from '../../src/server/customToolLoader.js';
import { loadPlugins, registerPlugins, getPlugins, enablePlugin, disablePlugin, setPluginsDir } from '../../src/server/pluginManager.js';
import { setDesignSystemsDir } from '../../src/server/tools/design.js';
import { cronScheduler } from '../../src/server/cronScheduler.js';
import { trackCost } from '../../src/server/costTracker.js';
import { loadMcpConfig, mountMcpSseRoutes } from '../../src/server/mcpServer.js';
import { initSync } from '../../src/server/teamSync.js';
import { registerRoutes as registerGitRoutes } from '../../src/server/routes/git.js';
import { registerRoutes as registerEcosystemRoutes } from '../../src/server/routes/ecosystem.js';
import { registerRoutes as registerBrowserRoutes } from '../../src/server/routes/browser.js';
import { registerRoutes as registerToolsRoutes } from '../../src/server/routes/tools.js';
import { registerRoutes as registerGoalRoutes } from '../../src/server/routes/goal.js';
import { setupSecurityMiddleware, createTrustedLocalOriginMiddleware } from '../../src/server/standalone/middleware.js';
import { SettingsSchema } from '../../src/server/validation.js';
import { McpManager } from './mcp/McpManager.js';
import type { McpServerConfig } from './mcp/McpManager.js';
import { generateEmbeddings, hasGeminiEmbeddingsConfigured, getGemini } from './embeddings/geminiEmbeddings.js';
import { parseCommand, getCommandPrompt, getCommandAgent, getCommandMode } from '../../src/utils/commands.js';

const $fetch = (globalThis as { fetch: (url: string, init?: RequestInit) => Promise<Response> }).fetch;

export let serverPort: number | null = null;

const completionEngine = new CompletionEngine();
let diagnosticsProvider: DiagnosticsProvider | null = null;

function getCompletionConfig(): CompletionConfig {
  const cfg = vscode.workspace.getConfiguration('cvr');
  return {
    provider: cfg.get<string>('completionProvider') || process.env.CVR_COMPLETION_PROVIDER || '',
    model: cfg.get<string>('completionModel') || process.env.CVR_COMPLETION_MODEL || '',
    debounceMs: cfg.get<number>('debounceMs', 150),
    maxPrefixLines: cfg.get<number>('maxPrefixLines', 50),
    maxSuffixLines: cfg.get<number>('maxSuffixLines', 10),
    enabled: cfg.get<boolean>('enabled', true),
  };
}

function getServerDir(context: vscode.ExtensionContext): string {
  return context.extensionPath;
}

async function ensureStorage(storagePath: string) {
  const historyFile = path.join(storagePath, 'history.json');
  const memoryFile = path.join(storagePath, 'memory.json');
  try {
    await fs.promises.mkdir(storagePath, { recursive: true });
    try { await fs.promises.access(historyFile); } catch { await fs.promises.writeFile(historyFile, JSON.stringify([])); }
    try { await fs.promises.access(memoryFile); } catch { await fs.promises.writeFile(memoryFile, JSON.stringify([])); }
  } catch (e) {
    console.error('Storage init error:', e);
  }
}

async function startAppServer(context: vscode.ExtensionContext): Promise<number> {
  try {
  const express = require('express');
  const dotenv = require('dotenv');

  dotenv.config();

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  setupSecurityMiddleware(app, { contentSecurityPolicy: false, frameguard: false });
  app.use(createTrustedLocalOriginMiddleware());

  let _wsContextCache: string | null = null;
  let _wsContextTime = 0;

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: context.extension.packageJSON?.version || '1.0.0',
    });
  });

  // Settings persistence — survives extension reinstall via globalState
  app.get('/api/settings', (_req, res) => {
    try {
      const settings = context.globalState.get('cvr_settings', {});
      res.json(settings);
    } catch {
      res.json({});
    }
  });

  app.post('/api/settings', (req, res) => {
    try {
      const parsed = SettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid settings', details: parsed.error.format() });
        return;
      }
      void context.globalState.update('cvr_settings', parsed.data).then(
        () => res.json({ saved: true }),
        () => res.status(500).json({ error: 'Failed to save settings' })
      );
    } catch (e) {
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  const PROVIDER_VALIDATION_URLS: Record<string, string> = {
    openai: 'https://api.openai.com/v1/models',
    deepseek: 'https://api.deepseek.com/v1/models',
    grok: 'https://api.x.ai/v1/models',
    groq: 'https://api.groq.com/openai/v1/models',
    baseten: 'https://inference.baseten.co/v1/models',
    openrouter: 'https://openrouter.ai/api/v1/models',
    together: 'https://api.together.xyz/v1/models',
    mistral: 'https://api.mistral.ai/v1/models',
  };

  app.post('/api/validate-key', async (req, res) => {
    const { provider, apiKey } = req.body;
    if (!provider || !apiKey) {
      return res.status(400).json({ valid: false, error: 'provider and apiKey required' });
    }

    try {
      if (provider === 'gemini') {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
        if (r.ok) return res.json({ valid: true });
        const d = await r.json().catch(() => ({}));
        return res.json({ valid: false, error: d.error?.message || `HTTP ${r.status}` });
      }

      if (provider === 'anthropic') {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
        });
        if (r.ok) return res.json({ valid: true });
        const d = await r.json().catch(() => ({}));
        const err = d.error?.message || `HTTP ${r.status}`;
        if (d.error?.type === 'authentication_error') return res.json({ valid: false, error: err });
        if (r.status === 401 || r.status === 403) return res.json({ valid: false, error: err });
        return res.json({ valid: true });
      }

      const baseUrl = PROVIDER_VALIDATION_URLS[provider];
      if (baseUrl) {
        const authPrefix = 'Bearer';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const r = await fetch(baseUrl, {
            headers: { Authorization: `${authPrefix} ${apiKey}` },
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (r.ok) return res.json({ valid: true });
          if (r.status === 401 || r.status === 403) return res.json({ valid: false, error: `HTTP ${r.status} — key rejected` });
          return res.json({ valid: true, warning: `HTTP ${r.status}` });
        } catch (e: any) {
          clearTimeout(timeout);
          if (e.name === 'AbortError') return res.json({ valid: false, error: 'Connection timeout — check network' });
          throw e;
        }
      }

      return res.json({ valid: false, error: `Unknown provider: ${provider}` });
    } catch (e: any) {
      return res.json({ valid: false, error: e.message || 'Network error' });
    }
  });

  const storagePath = path.join(context.globalStorageUri.fsPath, '.opencode-infinite');
  const historyFile = path.join(storagePath, 'history.json');
  const memoryFile = path.join(storagePath, 'memory.json');

  // Auto-resolve workspace .cvr/ directories with fallback to extension storage
  const workspaceRoot = (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0)
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : null;

  // Use workspace-root memory if it exists (preferred), otherwise fallback to extension storage
  const workspaceMemoryDir = workspaceRoot
    ? path.join(workspaceRoot, '.opencode-infinite')
    : null;
  const memoryDir = (workspaceMemoryDir && fs.existsSync(workspaceMemoryDir))
    ? workspaceMemoryDir
    : storagePath;

  await ensureStorage(memoryDir);
  setMemoryDir(memoryDir);
  setSessionDbPath(memoryDir);

  if (workspaceRoot) {
    setProjectRoot(workspaceRoot);
    setGitProjectRoot(workspaceRoot);
  }

  function resolveCvrDir(name: string): string {
    if (workspaceRoot) {
      const workspaceDir = path.join(workspaceRoot, '.cvr', name);
      if (fs.existsSync(workspaceDir)) {
        return workspaceDir;
      }
    }
    const fallback = path.join(storagePath, name);
    if (!fs.existsSync(fallback)) {
      fs.mkdirSync(fallback, { recursive: true });
    }
    return fallback;
  }

  setSkillsDir(resolveCvrDir('skills'));
  setSkillCreatorDir(resolveCvrDir('skills'));
  setRagDbPath(storagePath);
  setCacheDbPath(storagePath);
  setGoalStorageDir(storagePath);
  setRulesDir(resolveCvrDir('rules'));
  setCustomToolsDir(resolveCvrDir('tools'));
  setPluginsDir(resolveCvrDir('plugins'));
  setDesignSystemsDir(resolveCvrDir('design-systems'));
  setAgentsDir(resolveCvrDir('agents'));

  // Initialize Permission Engine
  let permissionEngine: PermissionEngine | undefined;
  try {
    const configData = await fs.promises.readFile('.cvr/permissions.json', 'utf-8');
    const config: PermissionConfig = JSON.parse(configData);
    permissionEngine = new PermissionEngine(config);
  } catch {
    permissionEngine = new PermissionEngine({
      rules: [
        { pattern: 'read_file', action: 'allow' },
        { pattern: 'list_directory', action: 'allow' },
        { pattern: 'search_files', action: 'allow' },
        { pattern: 'write_file', action: 'allow' },
        { pattern: 'edit_file', action: 'allow' },
        { pattern: 'execute_command', action: 'ask' },
        { pattern: '*.env*', action: 'deny' },
        { pattern: '*/secrets/*', action: 'deny' },
        { pattern: 'bash:rm -rf *', action: 'deny' },
        { pattern: 'bash:git push *', action: 'ask' },
      ],
      defaultAction: 'ask',
    });
  }

  function getProviderEnvKey(provider: string): string {
    const envMap: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      grok: 'XAI_API_KEY',
      groq: 'GROQ_API_KEY',
      baseten: 'BASETEN_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      together: 'TOGETHER_API_KEY',
      mistral: 'MISTRAL_API_KEY',
      custom: 'CUSTOM_API_KEY',
    };
    const envKey = envMap[provider];
    return envKey ? (process.env[envKey] || '') : '';
  }

  const mcpManager = new McpManager(storagePath);
  mcpManager.startServers();

  const diffViewProvider = new DiffViewProvider();
  diagnosticsProvider = new DiagnosticsProvider();
  context.subscriptions.push(diagnosticsProvider);

  async function generateAIContent(prompt: string, contents: any[] = [], provider?: string, localUrl?: string, modelName?: string, apiKey?: string, temperature?: number, maxTokens?: number, signal?: AbortSignal, onReasoning?: (token: string) => void): Promise<string> {
    let full = '';
    await generateContentStream(prompt, contents, (t) => { full += t; }, provider, localUrl, modelName, apiKey, temperature, maxTokens, signal, onReasoning);
    return full;
  }

  async function generateContentStream(prompt: string, contents: any[], onToken: (token: string) => void, provider?: string, localUrl?: string, modelName?: string, apiKey?: string, temperature?: number, maxTokens?: number, signal?: AbortSignal, onReasoning?: (token: string) => void, tools?: OpenAITool[]): Promise<{ text: string; toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }> }> {
    if (!provider) throw new Error('No AI provider configured. Set it in Settings.');
    const msgs = [
      { role: 'system', content: prompt },
      ...contents.map((c: any) => ({ role: c.role === 'model' ? 'assistant' : c.role, content: c.parts[0].text }))
    ];

    let fullText = '';
    const toolCallAccum: Map<number, { id: string; name: string; args: string }> = new Map();

    function processStreamChunk(chunk: any): void {
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.reasoning_content && onReasoning) onReasoning(delta.reasoning_content);
      if (delta?.content) { fullText += delta.content; onToken(delta.content); }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          let entry = toolCallAccum.get(idx);
          if (!entry) { entry = { id: "", name: "", args: "" }; toolCallAccum.set(idx, entry); }
          if (tc.id) entry.id = tc.id;
          if (tc.function?.name) entry.name = tc.function.name;
          if (tc.function?.arguments) entry.args += tc.function.arguments;
        }
      }
    }

    if (provider === 'local') {
      if (!localUrl) throw new Error('Local provider requires a URL. Configure it in Settings.');
      const url = `${localUrl.replace(/\/$/, '')}/chat/completions`;
      const bodyObj: any = { model: modelName || 'local-model', messages: msgs, stream: true };
      if (temperature !== undefined) bodyObj.temperature = temperature;
      if (maxTokens !== undefined) bodyObj.max_tokens = maxTokens;
      if (tools?.length) bodyObj.tools = tools;
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyObj), signal });
      if (!response.ok) {
        const text = await response.text();
        let message: string;
        try { const e = JSON.parse(text); message = e.error?.message || `Local AI error: HTTP ${response.status}`; } catch { message = `Local AI error: HTTP ${response.status} — ${text.slice(0, 200)}`; }
        throw new Error(message);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') break;
          try { processStreamChunk(JSON.parse(jsonStr)); } catch {}
        }
      }
    } else if (provider === 'custom' || provider === 'openai' || provider === 'deepseek' || provider === 'grok' || provider === 'groq' || provider === 'baseten' || provider === 'openrouter' || provider === 'together' || provider === 'mistral') {
      // Provider-model mismatch guard
      if ((provider === 'openai' || provider === 'groq') && modelName?.toLowerCase().includes('claude')) {
        throw new Error(`Model "${modelName}" is an Anthropic Claude model, but provider is ${provider}. To use Claude models, select provider "anthropic" instead.`);
      }

      let baseUrl = localUrl;
      if (provider === 'openai') baseUrl = 'https://api.openai.com/v1';
      if (provider === 'deepseek') baseUrl = localUrl || 'https://api.deepseek.com/v1';
      if (provider === 'grok') baseUrl = localUrl || 'https://api.x.ai/v1';
      if (provider === 'groq') baseUrl = localUrl || 'https://api.groq.com/openai/v1';
      if (provider === 'baseten') baseUrl = 'https://inference.baseten.co/v1';
      if (provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1';
      if (provider === 'together') baseUrl = 'https://api.together.xyz/v1';
      if (provider === 'mistral') baseUrl = 'https://api.mistral.ai/v1';
      if (!baseUrl) throw new Error(`Provider ${provider} requires a URL. Configure it in Settings.`);
      const key = apiKey || getProviderEnvKey(provider);
      const model = modelName || (provider === 'openai' ? 'gpt-4.1' : provider === 'deepseek' ? 'deepseek-chat' : provider === 'grok' ? 'grok-3' : provider === 'groq' ? 'meta-llama/llama-4-maverick-17b-128e-instruct' : provider === 'baseten' ? 'deepseek-ai/DeepSeek-V4-Pro' : provider === 'openrouter' ? 'google/gemini-2.5-flash' : provider === 'together' ? 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8' : provider === 'mistral' ? 'mistral-large-latest' : 'custom-model');

      const bodyObj: any = { model, messages: msgs, stream: true };
      if (temperature !== undefined) bodyObj.temperature = temperature;
      if (maxTokens !== undefined) bodyObj.max_tokens = maxTokens;
      if (tools?.length) bodyObj.tools = tools;

      const authHeader = `Bearer ${key}`;
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify(bodyObj),
        signal,
      });
      if (!response.ok) {
        const text = await response.text();
        let message: string;
        try { const e = JSON.parse(text); message = e.error?.message || `${provider} API error: HTTP ${response.status}`; } catch { message = `${provider} API error: HTTP ${response.status} — ${text.slice(0, 200)}`; }
        throw new Error(message);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') break;
          try { processStreamChunk(JSON.parse(jsonStr)); } catch {}
        }
      }
    } else if (provider === 'anthropic') {
      const apiKeyValue = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKeyValue) throw new Error('Anthropic requires an API key.');
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKeyValue, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: modelName || 'claude-sonnet-4-20250514',
          max_tokens: maxTokens || 4096,
          stream: true,
          system: prompt,
          messages: contents.map((c: any) => {
            const hasImages = c.parts.some((p: any) => p.inlineData);
            if (hasImages) {
              return {
                role: c.role === 'model' ? 'assistant' : c.role,
                content: c.parts.map((p: any) => {
                  if (p.text) return { type: 'text', text: p.text };
                  if (p.inlineData) return { type: 'image', source: { type: 'base64', media_type: p.inlineData.mimeType, data: p.inlineData.data } };
                  return null;
                }).filter((x: any) => x !== null),
              };
            }
            return { role: c.role === 'model' ? 'assistant' : c.role, content: c.parts[0]?.text ?? '' };
          })
        }),
        signal,
      });
      if (!response.ok) { const e = await response.json(); throw new Error(e.error?.message || 'Anthropic Error'); }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          try {
            const chunk = JSON.parse(jsonStr);
            if (chunk.type === 'content_block_delta') {
              if (chunk.delta?.text) { fullText += chunk.delta.text; onToken(chunk.delta.text); }
              if (chunk.delta?.thinking && onReasoning) onReasoning(chunk.delta.thinking);
            }
          } catch {}
        }
      }
    } else if (provider === 'gemini') {
      if (!process.env.GEMINI_API_KEY) throw new Error('Gemini requires GEMINI_API_KEY environment variable.');
      const streamResult = await getGemini().models.generateContentStream({
        model: modelName || 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }, ...contents],
      });
      for await (const chunk of streamResult) {
        const text = chunk.text;
        if (text) { fullText += text; onToken(text); }
      }
    } else {
      throw new Error(`Unknown provider: ${provider}. Please configure a valid provider in Settings.`);
    }

    const toolCalls = toolCallAccum.size > 0
      ? Array.from(toolCallAccum.values()).filter(tc => tc.name).map(tc => ({
          id: tc.id,
          name: tc.name,
          arguments: JSON.parse(tc.args || "{}") as Record<string, unknown>,
        }))
      : undefined;

    return { text: fullText, toolCalls };
  }

  async function summarizeLongHistory(messages: any[], provider?: string, localUrl?: string, modelName?: string, apiKey?: string) {
    if (messages.length < 5) return null;
    const instruction = `You are the "cvr.name Dreamer Engine". Examine the conversation below and extract:
1. KEY_FACTS: Fundamental project decisions or requirements.
2. INVARIANT_RULES: Coding standards or logic that MUST not change.
3. PROGRESS_STATE: What was just finished.
4. PENDING_GOALS: What the agent is currently working towards.

Format as a strict technical manifest (max 150 words). Focus on architectural integrity.

Conversation:
${messages.slice(-10).map((m: any) => `${m.role}: ${m.content}`).join('\n')}`;
    try { return await generateAIContent(instruction, [], provider, localUrl, modelName, apiKey); }
    catch (e) { console.error('Summarization failed:', e); return null; }
  }

  setRagEmbedFn(generateEmbeddings);

  const AGENT_PROMPTS: Record<string, string> = {
    build: '[ROLE: BUILD] - DEFAULT DEVELOPER AGENT. You have full access to developer tools (read/write files, execute bash). First explore the codebase with list_directory/read_file to understand the actual project structure, then implement changes. NEVER invent file names or code. Focus on iterative coding, bug fixing, and implementation.',
    general: '[ROLE: GENERAL] - UNIVERSAL ASSISTANT. Help with complex, multi-stage tasks. You can modify files, run parallel processes, and coordinate broad workflows. Always verify file existence before referencing them — use list_directory and read_file to explore first.',
    explore: '[ROLE: EXPLORE] - CODEBASE EXPLORER. Read-only specialist. Efficiently search patterns, find keywords, and explain codebase structure. Use fast search tools. You CANNOT write files. Only report on files you have actually read.',
    scout: '[ROLE: SCOUT] - ANALYST. Read-only. Specialized in external documentation research and dependency analysis. Focus on architectural auditing and research. Verify file existence before analysis.',
    prometheus: '[ROLE: PROMETHEUS] - STRATEGIC PLANNER. You are a strategic architect. Before any code is written, you must explore the actual codebase with list_directory/read_file, clarify requirements, define architecture, and scope the work. Do not invent file names — base your plan on REAL files. You create comprehensive plans.',
    hephaestus: '[ROLE: HEPHAESTUS] - DEEP EXECUTOR. Autonomous specialist. Given a goal, independently research patterns by reading actual files, write code, and finish the task without requiring step-by-step guidance. Always verify file paths before editing — never hallucinate file names or code.',
  };

  const CYRILLIC = /[\u0400-\u04FF]/;
  const CJK = /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
  const ARABIC = /[\u0600-\u06FF]/;

  function detectLang(text: string): string {
    if (CYRILLIC.test(text)) return "Russian";
    if (CJK.test(text)) return "Chinese";
    if (ARABIC.test(text)) return "Arabic";
    return "English";
  }

  function buildSystemPrompt(agent: string, memories: any[], mcpCtx: string, workspaceCtx: string, lastMessage?: string): string {
    const contextParts = memories.slice(-5).map((m: any) => `[CLUSTER_DATA]: ${m.content}`).join('\n');
    const customAgent = getAgentById(agent);
    const agentIdentity = customAgent?.systemPrompt || AGENT_PROMPTS[agent] || AGENT_PROMPTS.build;
    const userLang = lastMessage ? detectLang(lastMessage) : "English";
    const langInstruction = userLang !== "English"
      ? `\nIMPORTANT: The user wrote to you in ${userLang}. You MUST respond in ${userLang}. Do NOT switch to English.\n`
      : "";
    return `You are "cvr.name", the world's most advanced autonomous coding kernel.

CURRENT_AGENT_IDENTITY:
${agentIdentity}

INTEGRATED PROTOCOLS:
- [COMPLEXITY_OPTIMIZER]: When analyzing or refactoring, apply Algorithmic Complexity Evaluation.
- [AGENT_BEST_PRACTICES]: Maintain a proactive, provider-neutral stance.
- [SUPERPOWERS]: Active plugin from OpenCode for brainstorming, refactoring, debugging.
- [MCP_TOOLS]: You have access to external tools.
${langInstruction}
${mcpCtx}

AVAILABLE TOOLS:
You have the following built-in tools available via function calling. Use them when you need to read files, search the codebase, execute commands, or make changes. The system will automatically handle function call execution — just tell the system what you need and use the available functions.

      To use MCP (external) tools, include a fenced code block:
\`\`\`tool_call
{"server": "server-name", "tool": "tool-name", "arguments": {...}}
\`\`\`

      To use tools, include an ACTION:/PARAMS: block:
ACTION: list_directory
PARAMS: {"path": "."}

Available tools:
- read_file (path) - Read file contents
- list_directory (path) - List directory contents
- search_files (pattern, path?) - Search for files by pattern
- write_file (path, content) - Write content to a file
- edit_file (path, oldString, newString) - Edit file content
- execute_command (command) - Execute a shell command
- git_status, git_diff, git_commit, git_push - Git operations
- browser_navigate, browser_click, browser_type - Browser automation
- memory_read, memory_write - Memory operations
- rag_search (q, topK?) - Search RAG index

Always explore the codebase with list_directory first to understand structure, then read_file to see actual contents. NEVER invent file paths or code.

WORKSPACE CONTEXT:
${workspaceCtx || 'No workspace open. The user is not currently editing a project.'}

SYSTEM ARCHITECTURE:
- Local Persistent Memory (.opencode-infinite)
- Recursive Task Execution Pipeline
- Dreamer Semantic Compression Engine
- MCP Tool Server

AUTONOMY PROTOCOLS:
1. OBJECTIVE: Absolute task completion.
2. ITERATION: For multi-vector tasks, solve sequentially.
3. TERMINATION: "CONTINUE_NEEDED" for next cycles. "TASK_COMPLETE" for final success.

PERSISTENT CONTEXT CLUSTERS:
${contextParts || 'No previous knowledge clusters found. Cold-start mode.'}
`;
  }

  function getWorkspaceContext(): string {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return '';
    const root = folders[0].uri.fsPath;

    if (_wsContextCache && _wsContextTime && Date.now() - _wsContextTime < 30000) return _wsContextCache;

    try {
      function walkDir(dirPath: string, depth: number = 0): string[] {
        if (depth > 2) return [];
        const results: string[] = [];
        try {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
            const relPath = path.relative(root, path.join(dirPath, entry.name));
            if (entry.isDirectory()) {
              results.push(relPath + '/');
              if (depth < 2) {
                results.push(...walkDir(path.join(dirPath, entry.name), depth + 1));
              }
            } else {
              results.push(relPath);
            }
          }
        } catch {}
        return results;
      }
      const files = walkDir(root);
      _wsContextCache = `Project: ${path.basename(root)}\nFiles: ${files.slice(0, 80).join(', ')}${files.length > 80 ? '...' : ''}`;
      _wsContextTime = Date.now();
      return _wsContextCache;
    } catch {
      _wsContextCache = `Project: ${path.basename(root)}`;
      _wsContextTime = Date.now();
      return _wsContextCache;
    }
  }

  app.post('/api/chat', async (req: any, res: any) => {
    try {
      const { message, config = {}, kernelConfig = {}, agent: bodyAgent, mode: bodyMode } = req.body;
      const { aiProvider, localUrl, aiModel, localModelName, apiKey, temperature, maxTokens, systemPrompt: customSystemPrompt, agent: configAgent, mode: configMode } = config;
      const resolvedModel = aiProvider === "local" ? (localModelName || aiModel) : aiModel;
      const kConfig = kernelConfig.aiProvider ? kernelConfig : config;

      const history = JSON.parse(await fs.promises.readFile(historyFile, 'utf-8'));
      const memories = JSON.parse(await fs.promises.readFile(memoryFile, 'utf-8'));

      // Parse command and integrate command prompt into system prompt
      const { command, args } = parseCommand(message);
      const commandAgent = command ? getCommandAgent(command) : undefined;
      const commandMode = command ? getCommandMode(command) : undefined;

      // Command agent/mode take priority over UI settings
      const agent = commandAgent || bodyAgent || configAgent || 'build';
      const mode = commandMode || bodyMode || configMode || 'build';

      let commandPrompt = "";
      if (command) {
        commandPrompt = getCommandPrompt(command, args);
      }

      let systemPrompt = buildSystemPrompt(agent, memories, mcpManager.getToolsContext(), getWorkspaceContext(), message);

      if (customSystemPrompt && customSystemPrompt.trim()) {
        const customAgent = getAgentById(agent);
        const agentIdentity = customAgent?.systemPrompt || AGENT_PROMPTS[agent] || AGENT_PROMPTS.build;
        systemPrompt = `${customSystemPrompt}\n\n${agentIdentity}\n\nWORKSPACE CONTEXT:\n${getWorkspaceContext() || 'No workspace open.'}`;
      } else if (commandPrompt) {
        // Integrate command prompt into system prompt
        systemPrompt = `${commandPrompt}\n\n${systemPrompt}`;
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      let fullText = '';
      const onToken = (token: string) => {
        fullText += token;
        res.write(`data: ${JSON.stringify({ content: token })}\n\n`);
      };
      const onReasoning = (token: string) => {
        res.write(`data: ${JSON.stringify({ reasoning: token })}\n\n`);
      };

      const tools = toOpenAITools();
      let result: { text: string; toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }> };
      try {
        result = await generateContentStream(systemPrompt, [
          ...history.slice(-10).map((m: any) => ({ role: m.role, parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: message }] }
        ], onToken, aiProvider, localUrl, resolvedModel, apiKey, temperature, maxTokens, req.signal, onReasoning, tools);
      } catch (e: any) {
        res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
        res.end();
        return;
      }

      // Multi-turn tool loop: think → act → observe → think again
      const MAX_TOOL_TURNS = 15;
      let messages = [
        ...history.slice(-10).map((m: any) => ({ role: m.role, parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: message }] }
      ];
      let accumulatedText = result.text;
      let latestResponse = result.text;

      for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
        // Use native tool_calls from AI response
        let toolCalls = result.toolCalls;

        // Also check for MCP tool calls in text (still text-based)
        const mcpCallRegex = /```tool_call\n([\s\S]*?)```/g;
        let mcpTool: string | null = null;
        let mcpServer: string | null = null;
        let mcpArgs: Record<string, unknown> = {};
        let mcpMatch;
        while ((mcpMatch = mcpCallRegex.exec(latestResponse)) !== null) {
          try {
            const call = JSON.parse(mcpMatch[1]);
            if (call.server && call.tool) { mcpServer = call.server; mcpTool = call.tool; mcpArgs = call.arguments || {}; }
          } catch {}
        }

        // Fallback: text-based ACTION:/PARAMS: parsing for models without function calling
        if (!toolCalls?.length && !mcpTool) {
          const actionMatch = latestResponse.match(/ACTION:\s*(\w+)/);
          const paramsMatch = latestResponse.match(/PARAMS:\s*(\{[\s\S]*?\})/);
          if (actionMatch && actionMatch[1]) {
            try {
              toolCalls = [{
                id: `text_fallback_${turn}`,
                name: actionMatch[1],
                arguments: paramsMatch && paramsMatch[1] ? JSON.parse(paramsMatch[1]) : {},
              }];
            } catch {
              break;
            }
          } else {
            break;
          }
        }

        // Execute tool calls (natively parsed, no regex fragility)
        let resultText = '';
        for (const tc of toolCalls || []) {
          try {
            const execResult = await executeTool(
              { name: tc.name, params: tc.arguments },
              mode === "plan" ? "plan" : "build",
              permissionEngine,
              "chat-session"
            );
            resultText += `\n\n**Tool ${tc.name}:** ${execResult.success ? execResult.output : `Error: ${execResult.error}`}\n\n`;
          } catch (e: any) {
            resultText += `\n\n**Tool Error:** ${e.message}\n\n`;
          }
        }

        if (mcpTool && mcpServer) {
          try {
            const mcpResult = await mcpManager.callTool(mcpServer, mcpTool, mcpArgs);
            resultText += `\n\n**MCP Tool ${mcpServer}/${mcpTool}:** ${JSON.stringify(mcpResult)}\n\n`;
          } catch (e: any) {
            resultText += `\n\n**MCP Error:** ${e.message}\n\n`;
          }
        }

        accumulatedText += resultText;
        res.write(`data: ${JSON.stringify({ content: resultText })}\n\n`);

        // Feed result back to AI for next thinking round
        messages.push({ role: 'assistant', parts: [{ text: latestResponse }] });
        messages.push({ role: 'user', parts: [{ text: `[Tool result] ${resultText.trim()}\n\nContinue with your next step or respond COMPLETE: summary if the goal is reached.` }] });

        latestResponse = '';
        const nextOnToken = (token: string) => {
          latestResponse += token;
          res.write(`data: ${JSON.stringify({ content: token })}\n\n`);
        };
        try {
          result = await generateContentStream(systemPrompt, messages, nextOnToken, aiProvider, localUrl, resolvedModel, apiKey, temperature, maxTokens, req.signal, onReasoning, tools);
        } catch (e: any) {
          res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
          break;
        }
        accumulatedText += `\n\n${latestResponse}`;
      }
      fullText = accumulatedText;

      const updatedHistory = [...history, { role: 'user', content: message, createdAt: new Date() }, { role: 'model', content: fullText, createdAt: new Date() }];
      await fs.promises.writeFile(historyFile, JSON.stringify(updatedHistory));

      // Token estimation
      const estimatedInputTokens = Math.ceil((systemPrompt + message).length / 4);
      const estimatedOutputTokens = Math.ceil(fullText.length / 4);

      // Track cost (fire-and-forget)
      trackCost(aiProvider, resolvedModel || 'unknown', estimatedInputTokens, estimatedOutputTokens).catch(() => {});

      if (updatedHistory.length % 5 === 0) {
        summarizeLongHistory(updatedHistory, kConfig.aiProvider, kConfig.localUrl, kConfig.aiProvider === "local" ? (kConfig.localModelName || kConfig.aiModel) : kConfig.aiModel, kConfig.apiKey).then(async (summary) => {
          if (summary) {
            const currentMemories = JSON.parse(await fs.promises.readFile(memoryFile, 'utf-8'));
            await fs.promises.writeFile(memoryFile, JSON.stringify([...currentMemories, { content: summary, createdAt: new Date() }]));
          }
        });
      }

      res.write(`data: ${JSON.stringify({ done: true, continueNeeded: fullText.includes('CONTINUE_NEEDED'), tokenUsage: { input: estimatedInputTokens, output: estimatedOutputTokens } })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error('API Error:', error);
      if (!res.headersSent) res.status(500).json({ error: error.message });
      else res.end();
    }
  });

  // Workspace API
  app.get('/api/workspace', (_req: any, res: any) => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return res.json({ root: null, files: [] });
    const root = folders[0].uri.fsPath;
    try {
      function walkDir(dirPath: string, depth: number = 0): any[] {
        if (depth > 3) return [];
        const results: any[] = [];
        try {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
            const item: any = {
              name: path.relative(root, path.join(dirPath, entry.name)),
              isDir: entry.isDirectory(),
              size: entry.isFile() ? fs.statSync(path.join(dirPath, entry.name)).size : 0,
            };
            if (entry.isDirectory()) {
              item.children = walkDir(path.join(dirPath, entry.name), depth + 1);
            }
            results.push(item);
          }
        } catch {}
        return results;
      }
      const files = walkDir(root);
      res.json({ root: path.basename(root), rootPath: root, files });
    } catch (e: any) {
      res.json({ root: path.basename(root), files: [], error: e.message });
    }
  });

  // Path traversal safe helper
  function isPathSafe(requestedPath: string, workspaceRoot: string): boolean {
    const resolvedRoot = path.resolve(workspaceRoot);
    const resolvedPath = path.resolve(path.join(resolvedRoot, requestedPath));
    return resolvedPath.startsWith(resolvedRoot + path.sep) || resolvedPath === resolvedRoot;
  }

  app.post('/api/workspace/read', async (req: any, res: any) => {
    const { file } = req.body;
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || !file) return res.status(400).json({ error: 'No workspace or file path' });
    if (!isPathSafe(file, folders[0].uri.fsPath)) return res.status(403).json({ error: 'Path traversal denied' });
    const fullPath = path.resolve(path.join(folders[0].uri.fsPath, file));
    try {
      const content = await fs.promises.readFile(fullPath, 'utf-8');
      res.json({ content, path: file });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/workspace/write', async (req: any, res: any) => {
    const { file, content } = req.body;
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || !file) return res.status(400).json({ error: 'No workspace or file path' });
    if (!isPathSafe(file, folders[0].uri.fsPath)) return res.status(403).json({ error: 'Path traversal denied' });
    const fullPath = path.resolve(path.join(folders[0].uri.fsPath, file));
    try {
      const cfg = vscode.workspace.getConfiguration('cvr');
      const diffEnabled = cfg.get<boolean>('diff.enabled', true);
      if (diffEnabled) {
        let originalContent = '';
        try {
          originalContent = await fs.promises.readFile(fullPath, 'utf-8');
        } catch {
          // File doesn't exist yet - skip diff for new files
        }
        if (originalContent) {
          const accepted = await diffViewProvider.showChangeDiff(
            originalContent,
            content,
            file,
            'Proposed change'
          );
          if (!accepted) {
            return res.json({ status: 'skipped', path: file, reason: 'User skipped' });
          }
        }
      }
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, content, 'utf-8');
      diagnosticsProvider.checkFileAfterEdit(fullPath);
      res.json({ status: 'written', path: file });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Diff API routes
  app.post('/api/diff', (req: any, res: any) => {
    const { original, modified } = req.body;
    if (typeof original !== 'string' || typeof modified !== 'string') {
      return res.status(400).json({ error: 'original and modified strings required' });
    }
    const diff = generateDiff(original, modified);
    res.json({ diff });
  });

  app.get('/api/changes/:id/diff', async (req: any, res: any) => {
    res.json({ diff: [], id: req.params.id });
  });

  // History/Memory persistence
  app.get('/api/history', async (_req: any, res: any) => {
    try {
      const history = JSON.parse(await fs.promises.readFile(historyFile, 'utf-8'));
      const memories = JSON.parse(await fs.promises.readFile(memoryFile, 'utf-8'));
      res.json({ history, memories });
    } catch {
      res.json({ history: [], memories: [] });
    }
  });

  app.post('/api/clear', async (_req: any, res: any) => {
    await fs.promises.writeFile(historyFile, JSON.stringify([]));
    await fs.promises.writeFile(memoryFile, JSON.stringify([]));
    res.json({ status: 'cleared' });
  });

  // MCP Configuration endpoints
  app.get('/api/mcp-config', async (_req: any, res: any) => {
    const config = await mcpManager.loadConfig();
    const tools = mcpManager.getTools();
    res.json({ config, tools });
  });

  app.post('/api/mcp-config', async (req: any, res: any) => {
    const servers: McpServerConfig[] = req.body.servers || [];
    mcpManager.stopAll();
    await mcpManager.saveConfig(servers);
    mcpManager.startServers();
    res.json({ status: 'saved' });
  });

  app.post('/api/mcp-call', async (req: any, res: any) => {
    const { server, tool, arguments: args } = req.body;
    try {
      const result = await mcpManager.callTool(server, tool, args || {});
      res.json({ result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/mcp-refresh', async (_req: any, res: any) => {
    mcpManager.stopAll();
    await mcpManager.startServers();
    res.json({ tools: mcpManager.getTools() });
  });

  app.post('/api/edit/inline', async (req: any, res: any) => {
    try {
      const { selectedCode, instruction, filePath, language, wholeFile } = req.body;

      if (!selectedCode || !instruction) {
        return res.status(400).json({ error: 'selectedCode and instruction are required' });
      }

      const prompt = `Apply the following instruction to the selected code.

File: ${filePath}
Language: ${language}

Instruction: ${instruction}

Selected code:
\`\`\`
${selectedCode}
\`\`\`

Full file context:
\`\`\`
${wholeFile}
\`\`\`

Return ONLY the replacement code for the selection. No explanations, no markdown.`;

      const provider = process.env.CVR_COMPLETION_PROVIDER || '';
      const modelName = process.env.CVR_COMPLETION_MODEL || '';
      const apiKey = process.env.CVR_COMPLETION_API_KEY || undefined;

      let fullText = '';
      const onToken = (token: string) => { fullText += token; };

      await generateContentStream(
        prompt,
        [],
        onToken,
        provider,
        undefined,
        modelName,
        apiKey,
        0.3,
        2048,
        req.signal,
      );

      let cleanText = fullText.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').replace(/^```/, '').replace(/```$/, '').trim();

      if (!cleanText) {
        cleanText = fullText.trim();
      }

      res.json({ replacement: cleanText });
    } catch (e: any) {
      console.error('Inline edit error:', e);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/completions', async (req: any, res: any) => {
    try {
      const { textBeforeCursor, textAfterCursor, filePath, language, maxLines } = req.body;

      if (!textBeforeCursor) {
        return res.json({ items: [] });
      }

      const lines = textBeforeCursor.split('\n');
      const recentLines = lines.slice(-(maxLines || 50)).join('\n');
      const afterLines = textAfterCursor ? textAfterCursor.split('\n').slice(0, 10).join('\n') : '';

      const prompt = `You are a code completion engine. Complete the code at the cursor position marked by <CURSOR>.
Only output the completion text, no explanations or markdown code fences.
Language: ${language || 'unknown'}
File: ${filePath || 'unknown'}

Code before cursor:
\`\`\`
${recentLines}
\`\`\`

${afterLines ? `Code after cursor:\n\`\`\`\n${afterLines}\n\`\`\`\n` : ''}
Complete the code at the cursor position:`;

      const provider = process.env.CVR_COMPLETION_PROVIDER || '';
      const modelName = process.env.CVR_COMPLETION_MODEL || '';
      const apiKey = process.env.CVR_COMPLETION_API_KEY || undefined;

      let completionText = '';
      const onToken = (token: string) => { completionText += token; };

      await generateContentStream(
        prompt,
        [],
        onToken,
        provider,
        undefined,
        modelName,
        apiKey,
        0.2,
        256,
        req.signal,
      );

      let cleanText = completionText.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').replace(/^```/, '').replace(/```$/, '');

      if (!cleanText.trim()) {
        return res.json({ items: [] });
      }

      res.json({ items: [{ text: cleanText }] });
    } catch (e: any) {
      console.error('Completion error:', e);
      if (!res.headersSent) res.json({ items: [] });
    }
  });

  // Permission API routes
  app.post('/api/permissions/check', (req: any, res: any) => {
    if (!permissionEngine) return res.status(503).json({ error: 'Permission engine not initialized' });
    const result = permissionEngine.check(req.body);
    return res.json(result);
  });

  app.post('/api/permissions/ask', (req: any, res: any) => {
    if (!permissionEngine) return res.status(503).json({ error: 'Permission engine not initialized' });
    const request = req.body;
    const check = permissionEngine.check(request);
    if (check.action === 'allow') {
      return res.json({ action: 'allow' });
    }
    if (check.action === 'deny') {
      return res.json({ action: 'deny' });
    }
    const pending = permissionEngine.createPending(request);
    return res.json({ action: 'ask', pending });
  });

  app.get('/api/permissions/pending', (_req: any, res: any) => {
    if (!permissionEngine) return res.json({ pending: [] });
    return res.json({ pending: permissionEngine.listPending() });
  });

  app.get('/api/permissions/pending/:id', (req: any, res: any) => {
    if (!permissionEngine) return res.status(503).json({ error: 'Permission engine not initialized' });
    const pending = permissionEngine.getPending(req.params.id);
    if (!pending) return res.status(404).json({ error: 'Not found' });
    return res.json(pending);
  });

  app.post('/api/permissions/resolve/:id', (req: any, res: any) => {
    if (!permissionEngine) return res.status(503).json({ error: 'Permission engine not initialized' });
    const { approved } = req.body;
    permissionEngine.resolve(req.params.id, approved === true);
    return res.json({ resolved: true });
  });

  // Agent Loop API routes
  const activeLoops = new Map<string, AgentLoop>();
  const subagentManager = new SubagentManager();

  app.post('/api/agent/loop', async (req: any, res: any) => {
    try {
      const { goal, provider, model } = req.body;
      const id = randomUUID();

      const loop = new AgentLoop(goal, {
        maxSteps: 20,
        permissionEngine,
        thinkFn: (prompt: string) => generateAIContent(prompt, [], provider, undefined, model),
      });

      activeLoops.set(id, loop);
      loop.run().catch((err: any) => console.error('Agent loop error:', err));

      res.json({ id, state: loop.getState() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/agent/loop/:id', (req: any, res: any) => {
    const loop = activeLoops.get(req.params.id);
    if (!loop) return res.status(404).json({ error: 'Loop not found' });
    return res.json(loop.getState());
  });

  app.post('/api/agent/loop/:id/abort', (req: any, res: any) => {
    const loop = activeLoops.get(req.params.id);
    if (!loop) return res.status(404).json({ error: 'Loop not found' });
    loop.abort();
    return res.json({ aborted: true });
  });

  app.post('/api/agent/plan', async (req: any, res: any) => {
    try {
      const { goal, provider, model } = req.body;
      const plan = await createPlan(goal, (prompt: string) =>
        generateAIContent(prompt, [], provider, undefined, model)
      );
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  registerGoalRoutes(app, { generateFn: generateAIContent, permissionEngine });

  app.get('/api/design-active', async (_req: any, res: any) => {
    try {
      const { getActiveDesignSystemBrief } = await import('../../src/server/tools/design.js');
      const brief = await getActiveDesignSystemBrief();
      if (brief) {
        const parsed = brief.match(/"([^"]+)"\s*\(id:\s*([^)]+)\)/);
        res.json({ active: parsed ? parsed[2] : null, name: parsed ? parsed[1] : null, brief });
      } else {
        res.json({ active: null, name: null, brief: null });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to get active design system" });
    }
  });

  app.get('/api/design-preview/:id', async (req: any, res: any) => {
    try {
      const { getDesignPreviewData } = await import('../../src/server/tools/design.js');
      const data = await getDesignPreviewData(req.params.id);
      if (!data) {
        res.status(404).json({ error: `Design system "${req.params.id}" not found` });
        return;
      }
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to get design preview" });
    }
  });

  // Subagent API routes
  app.post('/api/subagents/spawn', async (req: any, res: any) => {
    try {
      const { goal, agentConfig, provider, model } = req.body;
      const task = await subagentManager.spawn(
        req.body.parentId || 'main',
        goal,
        agentConfig,
        (prompt: string) => generateAIContent(prompt, [], provider, undefined, model)
      );
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/subagents', (_req: any, res: any) => {
    const tasks = subagentManager.listTasks();
    res.json({ tasks });
  });

  app.post('/api/subagents/:id/abort', async (req: any, res: any) => {
    await subagentManager.abort(req.params.id);
    res.json({ aborted: true });
  });

  // Memory API routes
  app.get('/api/memory', async (_req: any, res: any) => {
    try {
      const data = await readMemory();
      res.json({ raw: data.raw, sections: data.sections });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/memory', async (req: any, res: any) => {
    try {
      const { content, section } = req.body;
      await writeMemory(content, section);
      res.json({ saved: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/memory', async (req: any, res: any) => {
    try {
      const { content, section } = req.body;
      await replaceMemorySection(section, content.split('\n'));
      res.json({ saved: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/memory', async (req: any, res: any) => {
    try {
      const { section } = req.body;
      await deleteMemorySection(section);
      res.json({ deleted: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/user', async (_req: any, res: any) => {
    try {
      const data = await readUser();
      res.json({ raw: data.raw, sections: data.sections });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/user', async (req: any, res: any) => {
    try {
      const { content, section } = req.body;
      await writeUser(content, section);
      res.json({ saved: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/user', async (req: any, res: any) => {
    try {
      const { content, section } = req.body;
      await replaceUserSection(section, content.split('\n'));
      res.json({ saved: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/user', async (req: any, res: any) => {
    try {
      const { section } = req.body;
      await deleteUserSection(section);
      res.json({ deleted: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Session API routes
  app.post('/api/sessions', async (req: any, res: any) => {
    try {
      const { title } = req.body;
      const session = createSession(title || 'New Session');
      res.json(session);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/sessions', async (_req: any, res: any) => {
    try {
      const sessions = listSessions();
      res.json({ sessions });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/sessions/:id', async (req: any, res: any) => {
    try {
      const result = getSession(req.params.id);
      if (!result) return res.status(404).json({ error: 'Session not found' });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/sessions/:id/messages', async (req: any, res: any) => {
    try {
      const { role, content } = req.body;
      const message = addMessage(req.params.id, role, content);
      res.json(message);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/sessions/search', async (req: any, res: any) => {
    try {
      const { q, limit } = req.query;
      const results = searchSessions(String(q || ''), limit ? parseInt(String(limit), 10) : 20);
      res.json({ results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/sessions/:id', async (req: any, res: any) => {
    try {
      deleteSession(req.params.id);
      res.json({ deleted: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Skill API routes
  app.get('/api/skills', async (_req: any, res: any) => {
    try {
      const skills = await loadSkills();
      res.json({ skills: skills.map((s: any) => ({ id: s.id, name: s.name, description: s.description, triggers: s.triggers })) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/skills/:id', async (req: any, res: any) => {
    try {
      const skill = await getSkillById(req.params.id);
      if (!skill) return res.status(404).json({ error: 'Skill not found' });
      res.json({ id: skill.id, name: skill.name, description: skill.description, triggers: skill.triggers, content: skill.content });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // RAG API routes
  app.post('/api/rag/ingest', async (req: any, res: any) => {
    try {
      const { source, content } = req.body;
      await ingestDocument(source || 'unknown', content || '', generateEmbeddings);
      res.json({ ingested: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/rag/search', async (req: any, res: any) => {
    try {
      const { q, topK } = req.query;
      const results = await searchRAG(String(q || ''), generateEmbeddings, topK ? parseInt(String(topK), 10) : 3);
      res.json({ results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/rag/sources', async (_req: any, res: any) => {
    try {
      res.json({ sources: listSources() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/rag/sources/:source', async (req: any, res: any) => {
    try {
      clearSource(req.params.source);
      res.json({ cleared: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Instruction/Rules API routes
  app.get('/api/rules', async (_req: any, res: any) => {
    try {
      const instructions = await loadInstructions();
      res.json({ rules: instructions.map((r: any) => ({ name: r.name, priority: r.priority })) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/rules/:name', async (req: any, res: any) => {
    try {
      const instructions = await loadInstructions();
      const rule = instructions.find((r: any) => r.name === req.params.name);
      if (!rule) return res.status(404).json({ error: 'Rule not found' });
      res.json({ name: rule.name, content: rule.content, priority: rule.priority });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/rules/context', async (_req: any, res: any) => {
    try {
      const ctx = await getInstructionsContext();
      res.json({ context: ctx });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/rules/:name', async (req: any, res: any) => {
    try {
      const { content, priority } = req.body;
      await saveInstruction(req.params.name, content, priority ?? 0);
      res.json({ saved: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/rules/:name', async (req: any, res: any) => {
    try {
      await deleteInstruction(req.params.name);
      res.json({ deleted: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Custom Tools API routes
  app.get('/api/custom-tools', async (_req: any, res: any) => {
    try {
      const tools = await loadCustomTools();
      res.json({ tools: tools.map((t: any) => ({ id: t.id, name: t.name, description: t.description, readOnly: t.readOnly })) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/custom-tools/:id', async (req: any, res: any) => {
    try {
      const tools = await loadCustomTools();
      const tool = tools.find((t: any) => t.id === req.params.id);
      if (!tool) return res.status(404).json({ error: 'Tool not found' });
      res.json({ id: tool.id, name: tool.name, description: tool.description, parameters: tool.parameters, readOnly: tool.readOnly });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Plugin API routes
  app.get('/api/plugins', async (_req: any, res: any) => {
    try {
      const plugins = getPlugins();
      res.json({ plugins: plugins.map((p: any) => ({ id: p.manifest.id, name: p.manifest.name, version: p.manifest.version, enabled: p.enabled })) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/plugins/:id/enable', (req: any, res: any) => {
    enablePlugin(req.params.id);
    res.json({ enabled: true });
  });

  app.post('/api/plugins/:id/disable', (req: any, res: any) => {
    disablePlugin(req.params.id);
    res.json({ disabled: true });
  });

  // Cron API routes
  app.get('/api/cron', (_req: any, res: any) => {
    res.json({ tasks: cronScheduler.getTasks() });
  });

  app.post('/api/cron', (req: any, res: any) => {
    try {
      const task = cronScheduler.addTask(req.body);
      res.json(task);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/cron/:id', (req: any, res: any) => {
    cronScheduler.removeTask(req.params.id);
    res.json({ removed: true });
  });

  app.post('/api/cron/:id/enable', (req: any, res: any) => {
    cronScheduler.enableTask(req.params.id);
    res.json({ enabled: true });
  });

  app.post('/api/cron/:id/disable', (req: any, res: any) => {
    cronScheduler.disableTask(req.params.id);
    res.json({ disabled: true });
  });

  // Register modular routes (git, sync, browser, etc.) for features not duplicated inline
  registerEcosystemRoutes(app);
  registerGitRoutes(app);
  registerBrowserRoutes(app);
  registerToolsRoutes(app);

  // Initialize team sync
  initSync().catch((e) => console.error('Team sync init failed:', e));

  // MCP Server routes
  const mcpConfig = await loadMcpConfig();
  if (mcpConfig.enabled && (mcpConfig.transport === 'http' || mcpConfig.transport === 'sse')) {
    mountMcpSseRoutes(app, mcpConfig.basePath || '/mcp');
  }

  const appDir = path.join(getServerDir(context), 'app');
  app.use(express.static(appDir));
  app.get('*', (_req: any, res: any) => {
    res.sendFile(path.join(appDir, 'index.html'));
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3000;
      serverPort = port;
      completionEngine.setPort(port);
      console.log(`cvr.name server running on http://127.0.0.1:${port}`);
      resolve(port);
    });
    server.on('error', reject);
  });
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('[cvr.name] Server start failed:', msg);
    vscode.window.showErrorMessage(`cvr.name server failed to start: ${msg}`);
    throw err;
  }
}

let serverStartPromise: Promise<void> | null = null;
let serverStartError: string | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;

function ensureServer(context: vscode.ExtensionContext): Promise<void> {
  if (!serverStartPromise) {
    serverStartPromise = startAppServer(context)
      .then(() => {
        serverStartError = null;
        if (statusBarItem) {
          statusBarItem.text = '$(rocket) cvr.name';
          statusBarItem.tooltip = 'cvr.name kernel running';
          statusBarItem.backgroundColor = undefined;
        }
      })
      .catch(err => {
        console.error('[cvr.name] ensureServer failed:', err?.message || err);
        serverStartError = err?.message || String(err);
        serverStartPromise = null;
        if (statusBarItem) {
          statusBarItem.text = '$(error) cvr.name';
          statusBarItem.tooltip = 'Failed to start: ' + (err?.message || String(err));
          statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
        throw err;
      });
  }
  return serverStartPromise;
}

export async function activate(context: vscode.ExtensionContext) {
  console.log('cvr.name extension activating...');

  // Load custom agent configurations
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) {
    setAgentsDir(path.join(workspaceRoot, '.cvr', 'agents'));
  }
  await loadAgents();
  await registerPlugins();

  // Project Oracle: auto-index workspace into RAG (background, non-blocking)
  if (workspaceRoot && process.env.CVR_ORACLE_ENABLED !== 'false') {
    if (hasGeminiEmbeddingsConfigured()) {
      setImmediate(() => {
        indexProject(workspaceRoot, generateEmbeddings).catch((err) => {
          console.error('Project Oracle indexing failed:', err);
        });
      });
    } else {
      console.warn('[cvr.name] Project Oracle disabled: GEMINI_API_KEY not configured');
    }
  }

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(sync~spin) cvr.name';
  statusBarItem.tooltip = 'Starting kernel server...';
  statusBarItem.command = 'cvr.launch';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Sidebar webview
  const provider = new CvrWebviewViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CvrWebviewViewProvider.viewType, provider)
  );

  // Inline completion provider
  const inlineCompletionProvider = new CvrInlineCompletionProvider(completionEngine, getCompletionConfig());
  context.subscriptions.push(
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: '**' },
      inlineCompletionProvider
    )
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('cvr')) {
        inlineCompletionProvider.updateConfig(getCompletionConfig());
      }
      if (e.affectsConfiguration('cvr.diagnostics')) {
        const enabled = vscode.workspace.getConfiguration('cvr').get<boolean>('diagnostics.enabled', true);
        diagnosticsProvider?.setEnabled(enabled);
      }
    })
  );

  // Launch dashboard command
  context.subscriptions.push(
    vscode.commands.registerCommand('cvr.launch', async () => {
      await ensureServer(context);
      if (serverPort) {
        const panel = vscode.window.createWebviewPanel(
          'cvrDashboard',
          'cvr.name Dashboard',
          vscode.ViewColumn.One,
          { enableScripts: true, retainContextWhenHidden: true }
        );
        panel.webview.html = getWebviewContent(`http://127.0.0.1:${serverPort}`);
      }
    })
  );

  // Quick commands
  context.subscriptions.push(
    vscode.commands.registerCommand('cvr.clearHistory', async () => {
      if (serverPort) {
        await $fetch(`http://127.0.0.1:${serverPort}/api/clear`, { method: 'POST' });
        vscode.window.showInformationMessage('cvr.name: History cleared');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cvr.openSidebar', () => {
      vscode.commands.executeCommand('workbench.view.extension.cvr-explorer');
    })
  );

  // Start MCP Server command
  context.subscriptions.push(
    vscode.commands.registerCommand('cvr.startMcpServer', async () => {
      await ensureServer(context);
      if (serverPort) {
        const mcpUrl = `http://127.0.0.1:${serverPort}/mcp/sse`;
        vscode.window.showInformationMessage(`cvr.name MCP Server running on ${mcpUrl}`);
      } else {
        vscode.window.showWarningMessage('cvr.name server not running yet. Please wait and try again.');
      }
    })
  );

  // Start server only when sidebar is first shown
  context.subscriptions.push(
    vscode.window.onDidChangeVisibleTextEditors(() => {
      if (!serverStartPromise) {
        ensureServer(context).catch(() => {});
      }
    })
  );

  // Inline edit command
  registerInlineEditCommand(context, () => serverPort);

  // Deferred start after 2s (don't block VS Code startup)
  setTimeout(() => {
    ensureServer(context).catch(() => {});
  }, 2000);
}

class CvrWebviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'cvr.webview';
  private context: vscode.ExtensionContext;

  constructor(ctx: vscode.ExtensionContext) {
    this.context = ctx;
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    webviewView.webview.options = { enableScripts: true };

    if (serverPort) {
      webviewView.webview.html = getWebviewContent(`http://127.0.0.1:${serverPort}`);
      return;
    }

    if (serverStartError) {
      webviewView.webview.html = getErrorContent(serverStartError);
      return;
    }

    // Start server when sidebar is opened
    if (!serverStartPromise) {
      ensureServer(this.context).catch(() => {});
    }

    webviewView.webview.html = getLoadingContent();
    const check = setInterval(() => {
      if (serverPort) {
        webviewView.webview.html = getWebviewContent(`http://127.0.0.1:${serverPort}`);
        clearInterval(check);
      } else if (serverStartError) {
        webviewView.webview.html = getErrorContent(serverStartError);
        clearInterval(check);
      }
    }, 500);
    setTimeout(() => clearInterval(check), 30000);
  }
}

function getLoadingContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>cvr.name</title>
<style>body,html{margin:0;padding:0;height:100vh;overflow:hidden;background:#0F0F11;color:#E0E0E6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center}
.spinner{width:28px;height:28px;border:2px solid #2D2D33;border-top-color:#3E5CFF;border-radius:50%;animation:spin .8s linear infinite;margin:16px auto}
@keyframes spin{to{transform:rotate(360deg)}}
h1{font-size:16px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px}
.accent{color:#3E5CFF}
p{font-size:11px;color:#707080;margin:4px 0}</style>
</head>
<body>
  <h1><span class="accent">cvr</span>.<span class="accent">name</span>.coder</h1>
  <p>Starting kernel server...</p>
  <div class="spinner"></div>
</body>
</html>`;
}

function getErrorContent(errorMsg: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>cvr.name</title>
<style>body,html{margin:0;padding:0;height:100vh;overflow:hidden;background:#0F0F11;color:#E0E0E6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center}
h1{font-size:16px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin:0 0 16px}
.accent{color:#3E5CFF}
.err{color:#FF4444;font-size:12px;max-width:320px;line-height:1.5;margin:0 0 16px;padding:8px 12px;background:#1A1015;border:1px solid #3A2025;border-radius:4px}
.btn{background:#3E5CFF;color:#fff;border:none;padding:8px 20px;border-radius:4px;font-size:12px;cursor:pointer}
.btn:hover{background:#4E6CFF}</style>
</head>
<body>
  <h1><span class="accent">cvr</span>.<span class="accent">name</span>.coder</h1>
  <p class="err">${errorMsg}</p>
  <p style="font-size:11px;color:#707080">Press Ctrl+Shift+P → "cvr.name: Launch Dashboard" to retry</p>
</body>
</html>`;
}

function getWebviewContent(url: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src http://127.0.0.1:*; style-src 'unsafe-inline';">
  <title>cvr.name</title>
  <style>
    body,html{margin:0;padding:0;height:100vh;width:100vw;overflow:hidden;background:#000}
    iframe{border:none;width:100%;height:100%;display:block}
  </style>
</head>
<body>
  <iframe src="${url}" allow="clipboard-read;clipboard-write" referrerpolicy="no-referrer"></iframe>
</body>
</html>`;
}

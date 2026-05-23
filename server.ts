import express from "express";
import * as path from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { PermissionEngine } from "./src/server/permissions.js";
import type { PermissionConfig } from "./src/types/permissions.js";
import { setRagEmbedFn } from "./src/server/tools.js";
import { registerBuiltinHooks } from "./src/server/hooks.js";
import { loadAgents } from "./src/server/agentLoader.js";
import { setSessionDbPath } from "./src/server/sessionStore.js";
import { setSkillsDir } from "./src/server/skillLoader.js";
import { setSkillCreatorDir } from "./src/server/skillCreator.js";
import { setRagDbPath } from "./src/server/ragEngine.js";
import { setGoalStorageDir } from "./src/server/goalSessionStore.js";
import { setCacheDbPath } from "./src/server/cache.js";
import { indexProject } from "./src/server/projectOracle.js";
import { setRulesDir } from "./src/server/instructionLoader.js";
import { setCustomToolsDir } from "./src/server/customToolLoader.js";
import { registerPlugins, setPluginsDir } from "./src/server/pluginManager.js";
import { loadMcpConfig, startMcpStdio, mountMcpSseRoutes } from "./src/server/mcpServer.js";
import { closeAllBrowsers } from "./src/server/browserTools.js";
import { initSync } from "./src/server/teamSync.js";
import { setupSecurityMiddleware, createApiKeyMiddleware } from "./src/server/standalone/middleware.js";
import { setupHealthRoute } from "./src/server/standalone/health.js";
import { generateEmbeddings, generateAIContent } from "./src/server/providers.js";
import { initMarketplace } from "./src/server/agentMarketplace.js";
import { setupP2PSync } from "./src/server/p2pSync.js";
import { SettingsSchema } from "./src/server/validation.js";

import { setPermissionEngine, permissionEngine } from "./src/server/serverState.js";
import { STORAGE_DIR, ensureStorage, registerRoutes as registerChatRoutes } from "./src/server/routes/chat.js";
import { registerRoutes as registerMemoryRoutes } from "./src/server/routes/memory.js";
import { registerRoutes as registerSessionRoutes } from "./src/server/routes/sessions.js";
import { registerRoutes as registerKnowledgeRoutes } from "./src/server/routes/knowledge.js";
import { registerRoutes as registerEcosystemRoutes } from "./src/server/routes/ecosystem.js";
import { registerRoutes as registerGitRoutes } from "./src/server/routes/git.js";
import { registerRoutes as registerAgentRoutes } from "./src/server/routes/agent.js";
import { registerRoutes as registerReviewRoutes } from "./src/server/routes/review.js";
import { registerRoutes as registerBrowserRoutes } from "./src/server/routes/browser.js";
import { registerRoutes as registerTrackerRoutes } from "./src/server/routes/tracker.js";
import { registerRoutes as registerMarketplaceRoutes } from "./src/server/routes/marketplace.js";
import { registerRoutes as registerToolRoutes } from "./src/server/routes/tools.js";
import { registerRoutes as registerGoalRoutes } from "./src/server/routes/goal.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

setupHealthRoute(app);
setupSecurityMiddleware(app);

const PROVIDER_VALIDATION_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1/models",
  deepseek: "https://api.deepseek.com/v1/models",
  grok: "https://api.x.ai/v1/models",
  groq: "https://api.groq.com/openai/v1/models",
  baseten: "https://api.baseten.co/v1/models",
  openrouter: "https://openrouter.ai/api/v1/models",
  together: "https://api.together.xyz/v1/models",
  mistral: "https://api.mistral.ai/v1/models",
};

app.post("/api/validate-key", async (req, res) => {
  const { provider, apiKey } = req.body;
  if (!provider || !apiKey) {
    return res.status(400).json({ valid: false, error: "provider and apiKey required" });
  }

  try {
    if (provider === "gemini") {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
      if (r.ok) return res.json({ valid: true });
      const d = await r.json().catch(() => ({}));
      return res.json({ valid: false, error: (d as any).error?.message || `HTTP ${r.status}` });
    }

    if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-3-haiku-20240307", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
      });
      if (r.ok) return res.json({ valid: true });
      const d = await r.json().catch(() => ({}));
      const err = (d as any).error?.message || `HTTP ${r.status}`;
      if ((d as any).error?.type === "authentication_error") return res.json({ valid: false, error: err });
      if (r.status === 401 || r.status === 403) return res.json({ valid: false, error: err });
      return res.json({ valid: true });
    }

    const baseUrl = PROVIDER_VALIDATION_URLS[provider];
    if (baseUrl) {
      const authPrefix = provider === "baseten" ? "Api-Key" : "Bearer";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const r = await fetch(baseUrl, {
          headers: { Authorization: `${authPrefix} ${apiKey}` },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (r.ok) return res.json({ valid: true });
        if (r.status === 401 || r.status === 403) return res.json({ valid: false, error: `HTTP ${r.status} — key rejected. Проверьте ключ или подождите — новые ключи могут активироваться не сразу.` });
        return res.json({ valid: true, warning: `HTTP ${r.status}` });
      } catch (e: any) {
        clearTimeout(timeout);
        if (e.name === "AbortError") return res.json({ valid: false, error: "Таймаут соединения — проверьте сеть" });
        throw e;
      }
    }

    return res.json({ valid: false, error: `Unknown provider: ${provider}` });
  } catch (e: any) {
    return res.json({ valid: false, error: e.message || "Network error" });
  }
});

const requireApiKey = createApiKeyMiddleware();
app.use("/api", requireApiKey);
app.use("/mcp", requireApiKey);

// Settings persistence (now behind API key auth)
app.get('/api/settings', (_req, res) => {
  try {
    const settingsPath = path.join(process.cwd(), '.opencode-infinite', 'settings.json');
    if (existsSync(settingsPath)) {
      const data = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      res.json(data);
    } else {
      res.json({});
    }
  } catch {
    res.json({});
  }
});

app.post('/api/settings', (req, res): void => {
  try {
    const parsed = SettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid settings", details: parsed.error.format() });
      return;
    }
    const settingsPath = path.join(process.cwd(), '.opencode-infinite', 'settings.json');
    const dir = path.dirname(settingsPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(settingsPath, JSON.stringify(parsed.data, null, 2));
    res.json({ saved: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Initialize Permission Engine
try {
  const configData = readFileSync(".cvr/permissions.json", "utf-8");
  const config: PermissionConfig = JSON.parse(configData);
  setPermissionEngine(new PermissionEngine(config));
} catch {
  setPermissionEngine(new PermissionEngine({
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
  }));
}

setRagEmbedFn(generateEmbeddings);

// Register route modules
registerChatRoutes(app);
registerMemoryRoutes(app);
registerSessionRoutes(app);
registerKnowledgeRoutes(app);
registerEcosystemRoutes(app);
registerGitRoutes(app);
registerAgentRoutes(app);
registerReviewRoutes(app);
registerBrowserRoutes(app);
registerTrackerRoutes(app);
registerMarketplaceRoutes(app);
registerToolRoutes(app);
registerGoalRoutes(app, { generateFn: generateAIContent, ...(permissionEngine ? { permissionEngine } : {}) });

async function startServer() {
  await ensureStorage();
  await initSync();
  await initMarketplace();
  setSessionDbPath(STORAGE_DIR);
  setSkillsDir(path.join(process.cwd(), ".cvr", "skills"));
  setSkillCreatorDir(path.join(process.cwd(), ".cvr", "skills"));
  setRagDbPath(STORAGE_DIR);
  setCacheDbPath(STORAGE_DIR);
  setGoalStorageDir(STORAGE_DIR);
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
    const p2pSecret = process.env.CVR_P2P_SECRET || (() => {
      const crypto = require("crypto");
      const key = crypto.randomBytes(32).toString("hex");
      console.log(`P2P_SECRET not set, generated random key: ${key}`);
      return key;
    })();
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

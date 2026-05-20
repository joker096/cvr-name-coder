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
import { loadInstructions, getInstructionsContext, setRulesDir } from "./src/server/instructionLoader.js";
import { loadCustomTools, setCustomToolsDir } from "./src/server/customToolLoader.js";
import { registerPlugins, getPlugins, enablePlugin, disablePlugin, setPluginsDir } from "./src/server/pluginManager.js";
import { cronScheduler } from "./src/server/cronScheduler.js";
import { getGitStatus, getGitDiff, gitCommit, gitPush, getGitLog } from "./src/server/gitTools.js";
import { analyzeDiff, getPendingReviews, acceptComment, rejectComment } from "./src/server/codeReview.js";
import { getCosts, resetCosts } from "./src/server/costTracker.js";
import { processImages } from "./src/server/imageProcessor.js";
import { loadMcpConfig, startMcpStdio, mountMcpSseRoutes } from "./src/server/mcpServer.js";
import { browserNavigate, browserClick, browserType, browserScreenshot, browserEvaluate, browserGetHtml, browserClose, getActiveBrowserSessions, closeAllBrowsers, } from "./src/server/browserTools.js";
import { initSync, getSyncStatus, exportSync, importSync, getSyncConfig, saveSyncConfig, resolveConflictsManually, } from "./src/server/teamSync.js";
import { setupSecurityMiddleware, createApiKeyMiddleware } from "./src/server/standalone/middleware.js";
import { setupHealthRoute } from "./src/server/standalone/health.js";
dotenv.config();
// Local Storage Path
const STORAGE_DIR = path.join(process.cwd(), ".opencode-infinite");
const HISTORY_FILE = path.join(STORAGE_DIR, "history.json");
const MEMORY_FILE = path.join(STORAGE_DIR, "memory.json");
async function ensureStorage() {
    try {
        await mkdir(STORAGE_DIR, { recursive: true });
        try {
            await access(HISTORY_FILE);
        }
        catch {
            await writeFile(HISTORY_FILE, JSON.stringify([]));
        }
        try {
            await access(MEMORY_FILE);
        }
        catch {
            await writeFile(MEMORY_FILE, JSON.stringify([]));
        }
    }
    catch (e) {
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
let permissionEngine;
try {
    const configData = readFileSync(".cvr/permissions.json", "utf-8");
    const config = JSON.parse(configData);
    permissionEngine = new PermissionEngine(config);
}
catch {
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
import { generateAIContent, generateEmbeddings } from "./src/server/providers.js";
import { validateBody, ChatRequestSchema, ToolExecuteSchema, ReviewRequestSchema, AgentLoopSchema, CronTaskSchema, GitCommitSchema, BrowserNavigateSchema, BrowserActionSchema, } from "./src/server/validation.js";
setRagEmbedFn(generateEmbeddings);
// Memory Engine
async function summarizeLongHistory(messages, provider = "gemini", localUrl, modelName, apiKey) {
    if (messages.length < 5)
        return null;
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
    }
    catch (error) {
        console.error("Summarization failed:", error);
        return null;
    }
}
// API Routes
app.post("/api/chat", validateBody(ChatRequestSchema), async (req, res) => {
    try {
        const { message, config = {}, kernelConfig = {}, agent: bodyAgent } = req.body;
        const { aiProvider = "gemini", localUrl, aiModel, apiKey, temperature, maxTokens, systemPrompt: customSystemPrompt, agent: configAgent, maxImageSize } = config;
        const kConfig = kernelConfig.aiProvider ? kernelConfig : config;
        // 1. Read persistent state
        const history = JSON.parse(await readFile(HISTORY_FILE, "utf-8"));
        const memories = JSON.parse(await readFile(MEMORY_FILE, "utf-8"));
        // 2. Construct context
        const agent = bodyAgent || configAgent || "build";
        const mode = config.mode || "build";
        const contextParts = memories.slice(-5).map((m) => `[CLUSTER_DATA]: ${m.content}`).join('\n');
        const systemPrompt = await buildSystemPrompt({
            agent,
            mode,
            contextParts,
            customSystemPrompt: customSystemPrompt && customSystemPrompt.trim() ? customSystemPrompt : undefined,
        });
        // Process images if provided
        const { images: rawImages = [] } = req.body;
        let processedImages = [];
        if (Array.isArray(rawImages) && rawImages.length > 0) {
            processedImages = await processImages(rawImages, { maxDimension: maxImageSize || 1024 });
        }
        const buildParts = (text, imgs) => {
            const parts = [{ text }];
            if (imgs && imgs.length > 0) {
                for (const img of imgs) {
                    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
                }
            }
            return parts;
        };
        const historyContents = history.slice(-10).map((m) => {
            const parts = [{ text: m.content }];
            if (m.images && Array.isArray(m.images)) {
                for (const img of m.images) {
                    const match = typeof img === 'string' ? img.match(/^data:([^;]+);base64,(.+)$/) : null;
                    if (match) {
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
        const userHistoryEntry = { role: 'user', content: message, createdAt: new Date() };
        if (processedImages.length > 0) {
            userHistoryEntry.images = processedImages.map(img => `data:${img.mimeType};base64,${img.base64}`);
        }
        const updatedHistory = [...history, userHistoryEntry, { role: 'model', content: responseText, createdAt: new Date() }];
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
    }
    catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: error.message });
    }
});
app.get("/api/history", async (_req, res) => {
    try {
        const history = JSON.parse(await readFile(HISTORY_FILE, "utf-8"));
        const memories = JSON.parse(await readFile(MEMORY_FILE, "utf-8"));
        res.json({ history, memories });
    }
    catch (e) {
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
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post("/api/memory", async (req, res) => {
    try {
        const { content, section } = req.body;
        await writeMemory(content, section);
        res.json({ saved: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.get("/api/user", async (_req, res) => {
    try {
        const data = await readUser();
        res.json({ raw: data.raw, sections: data.sections });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post("/api/user", async (req, res) => {
    try {
        const { content, section } = req.body;
        await writeUser(content, section);
        res.json({ saved: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Session API routes
app.post("/api/sessions", async (req, res) => {
    try {
        const { title } = req.body;
        const session = createSession(title || "New Session");
        return res.json(session);
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.get("/api/sessions", async (_req, res) => {
    try {
        const sessions = listSessions();
        return res.json({ sessions });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.get("/api/sessions/:id", async (req, res) => {
    try {
        const result = getSession(req.params.id);
        if (!result)
            return res.status(404).json({ error: "Session not found" });
        return res.json(result);
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.post("/api/sessions/:id/messages", async (req, res) => {
    try {
        const { role, content } = req.body;
        const message = addMessage(req.params.id, role, content);
        return res.json(message);
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.get("/api/sessions/search", async (req, res) => {
    try {
        const { q, limit } = req.query;
        const results = searchSessions(String(q || ""), limit ? parseInt(String(limit), 10) : 20);
        return res.json({ results });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.delete("/api/sessions/:id", async (req, res) => {
    try {
        deleteSession(req.params.id);
        return res.json({ deleted: true });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
// Skill API routes
app.get("/api/skills", async (_req, res) => {
    try {
        const skills = await loadSkills();
        return res.json({ skills: skills.map((s) => ({ id: s.id, name: s.name, description: s.description, triggers: s.triggers })) });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.get("/api/skills/:id", async (req, res) => {
    try {
        const skill = await getSkillById(req.params.id);
        if (!skill)
            return res.status(404).json({ error: "Skill not found" });
        return res.json({ id: skill.id, name: skill.name, description: skill.description, triggers: skill.triggers, content: skill.content });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
// RAG API routes
app.post("/api/rag/ingest", async (req, res) => {
    try {
        const { source, content } = req.body;
        await ingestDocument(source || "unknown", content || "", generateEmbeddings);
        return res.json({ ingested: true });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.get("/api/rag/search", async (req, res) => {
    try {
        const { q, topK } = req.query;
        const results = await searchRAG(String(q || ""), generateEmbeddings, topK ? parseInt(String(topK), 10) : 3);
        return res.json({ results });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.get("/api/rag/sources", async (_req, res) => {
    try {
        return res.json({ sources: listSources() });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.delete("/api/rag/sources/:source", async (req, res) => {
    try {
        clearSource(req.params.source);
        return res.json({ cleared: true });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
// Instruction/Rules API routes
app.get("/api/rules", async (_req, res) => {
    try {
        const instructions = await loadInstructions();
        return res.json({ rules: instructions.map((r) => ({ name: r.name, priority: r.priority })) });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.get("/api/rules/:name", async (req, res) => {
    try {
        const instructions = await loadInstructions();
        const rule = instructions.find((r) => r.name === req.params.name);
        if (!rule)
            return res.status(404).json({ error: "Rule not found" });
        return res.json({ name: rule.name, content: rule.content, priority: rule.priority });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.get("/api/rules/context", async (_req, res) => {
    try {
        const ctx = await getInstructionsContext();
        return res.json({ context: ctx });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
// Custom Tools API routes
app.get("/api/custom-tools", async (_req, res) => {
    try {
        const tools = await loadCustomTools();
        return res.json({ tools: tools.map((t) => ({ id: t.id, name: t.name, description: t.description, readOnly: t.readOnly })) });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.get("/api/custom-tools/:id", async (req, res) => {
    try {
        const tools = await loadCustomTools();
        const tool = tools.find((t) => t.id === req.params.id);
        if (!tool)
            return res.status(404).json({ error: "Tool not found" });
        return res.json({ id: tool.id, name: tool.name, description: tool.description, parameters: tool.parameters, readOnly: tool.readOnly });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
// Plugin API routes
app.get("/api/plugins", async (_req, res) => {
    try {
        const plugins = getPlugins();
        return res.json({ plugins: plugins.map((p) => ({ id: p.manifest.id, name: p.manifest.name, version: p.manifest.version, enabled: p.enabled })) });
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.get("/api/git/diff", async (req, res) => {
    try {
        const staged = req.query.staged === "true";
        const diffs = await getGitDiff(staged);
        return res.json({ diffs });
    }
    catch (e) {
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
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.post("/api/git/push", async (_req, res) => {
    try {
        const result = await gitPush();
        return res.json(result);
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.get("/api/git/log", async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
        const commits = await getGitLog(limit);
        return res.json({ commits });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
// Tool execution endpoint
app.post("/api/tools/execute", validateBody(ToolExecuteSchema), async (req, res) => {
    try {
        const { toolCall, mode = "build", sessionId = randomUUID() } = req.body;
        const result = await executeTool(toolCall, mode, permissionEngine, sessionId);
        // Snapshot for undo if write tool succeeded
        if (result.success &&
            (toolCall.name === "write_file" || toolCall.name === "edit_file")) {
            const afterContent = toolCall.name === "write_file"
                ? toolCall.params.content
                : await readFile(path.join(process.cwd(), toolCall.params.path), "utf-8");
            const change = await recordChange(toolCall.params.path, toolCall.name === "write_file" ? "write" : "edit", afterContent, `${toolCall.name}: ${toolCall.params.path}`);
            result.changeId = change.id;
        }
        res.json(result);
    }
    catch (error) {
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
    if (!permissionEngine)
        return res.status(503).json({ error: "Permission engine not initialized" });
    const result = permissionEngine.check(req.body);
    return res.json(result);
});
app.post("/api/permissions/ask", (req, res) => {
    if (!permissionEngine)
        return res.status(503).json({ error: "Permission engine not initialized" });
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
    if (!permissionEngine)
        return res.json({ pending: [] });
    return res.json({ pending: permissionEngine.listPending() });
});
app.get("/api/permissions/pending/:id", (req, res) => {
    if (!permissionEngine)
        return res.status(503).json({ error: "Permission engine not initialized" });
    const pending = permissionEngine.getPending(req.params.id);
    if (!pending)
        return res.status(404).json({ error: "Not found" });
    return res.json(pending);
});
app.post("/api/permissions/resolve/:id", (req, res) => {
    if (!permissionEngine)
        return res.status(503).json({ error: "Permission engine not initialized" });
    const { approved } = req.body;
    permissionEngine.resolve(req.params.id, approved === true);
    return res.json({ resolved: true });
});
// Agent Loop API routes
const activeLoops = new Map();
const subagentManager = new SubagentManager();
app.post("/api/agent/loop", validateBody(AgentLoopSchema), async (req, res) => {
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
        loop.run()
            .then(() => activeLoops.delete(id))
            .catch((err) => {
            console.error(`Agent loop ${id} error:`, err);
            activeLoops.delete(id);
        });
        res.json({ id, state: loop.getState() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get("/api/agent/loop/:id", (req, res) => {
    const loop = activeLoops.get(req.params.id);
    if (!loop)
        return res.status(404).json({ error: "Loop not found" });
    return res.json(loop.getState());
});
app.post("/api/agent/loop/:id/abort", (req, res) => {
    const loop = activeLoops.get(req.params.id);
    if (!loop)
        return res.status(404).json({ error: "Loop not found" });
    loop.abort();
    return res.json({ aborted: true });
});
app.post("/api/agent/plan", async (req, res) => {
    try {
        const { goal, provider, model } = req.body;
        const plan = await createPlan(goal, (prompt) => generateAIContent(prompt, [], provider, undefined, model));
        res.json(plan);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Subagent API routes
app.post("/api/subagents/spawn", async (req, res) => {
    try {
        const { goal, agentConfig, provider, model } = req.body;
        const task = await subagentManager.spawn(req.body.parentId || "main", goal, agentConfig, (prompt) => generateAIContent(prompt, [], provider, undefined, model));
        res.json(task);
    }
    catch (error) {
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
        const { aiProvider = "gemini", localUrl, aiModel, apiKey, temperature, maxTokens } = config;
        const result = await analyzeDiff((prompt) => generateAIContent(prompt, [], aiProvider, localUrl, aiModel, apiKey, temperature, maxTokens), diff);
        return res.json(result);
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.get("/api/review/pending", async (_req, res) => {
    try {
        const reviews = getPendingReviews();
        return res.json({ reviews });
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
        return res.status(500).json({ success: false, output: "", error: e.message });
    }
});
app.get("/api/browser/html", async (req, res) => {
    try {
        const sessionId = String(req.query.sessionId || "default");
        const headless = req.query.headless !== "false";
        const result = await browserGetHtml(sessionId, headless);
        return res.json(result);
    }
    catch (e) {
        return res.status(500).json({ success: false, output: "", error: e.message });
    }
});
app.post("/api/browser/close", async (req, res) => {
    try {
        const { sessionId = "default" } = req.body;
        const result = await browserClose(sessionId);
        return res.json(result);
    }
    catch (e) {
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
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
app.post("/api/costs/reset", async (_req, res) => {
    try {
        await resetCosts();
        return res.json({ reset: true });
    }
    catch (e) {
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
        hookRegistry.register({ id, hookPoint, handler: () => { }, priority });
        return res.json({ registered: true, id, hookPoint });
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post("/api/sync/resolve", async (req, res) => {
    try {
        const { resolutions } = req.body;
        await resolveConflictsManually(resolutions);
        res.json({ resolved: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
async function startServer() {
    await ensureStorage();
    await initSync();
    setSessionDbPath(STORAGE_DIR);
    setSkillsDir(path.join(process.cwd(), ".cvr", "skills"));
    setSkillCreatorDir(path.join(process.cwd(), ".cvr", "skills"));
    setRagDbPath(STORAGE_DIR);
    setRulesDir(path.join(process.cwd(), ".cvr", "rules"));
    setCustomToolsDir(path.join(process.cwd(), ".cvr", "tools"));
    setPluginsDir(path.join(process.cwd(), ".cvr", "plugins"));
    await loadAgents();
    await registerPlugins();
    registerBuiltinHooks();
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
    }
    else {
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
    // Graceful shutdown
    const shutdown = async (signal) => {
        console.log(`Received ${signal}, shutting down gracefully...`);
        server.close(() => {
            console.log("HTTP server closed");
        });
        await closeAllBrowsers();
        // Close SQLite if open
        try {
            const { getDb } = await import("./src/server/sessionStore.js");
            getDb().close();
        }
        catch {
            // ignore
        }
        process.exit(0);
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}
startServer();

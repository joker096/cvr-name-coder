import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Local Storage Path
const STORAGE_DIR = path.join(process.cwd(), ".opencode-infinite");
const HISTORY_FILE = path.join(STORAGE_DIR, "history.json");
const MEMORY_FILE = path.join(STORAGE_DIR, "memory.json");

async function ensureStorage() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    try { await fs.access(HISTORY_FILE); } catch { await fs.writeFile(HISTORY_FILE, JSON.stringify([])); }
    try { await fs.access(MEMORY_FILE); } catch { await fs.writeFile(MEMORY_FILE, JSON.stringify([])); }
  } catch (e) {
    console.error("Storage init error:", e);
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

// Gemini Logic
async function generateAIContent(prompt: string, contents: any[] = [], provider: string = "gemini", localUrl?: string, modelName?: string, apiKey?: string) {
  if ((provider === "local" || provider === "custom" || provider === "openai" || provider === "deepseek" || provider === "grok") && (localUrl || apiKey)) {
    try {
      let baseUrl = localUrl;
      if (provider === "openai") baseUrl = "https://api.openai.com/v1";
      if (provider === "deepseek") baseUrl = localUrl || "https://api.deepseek.com";
      if (provider === "grok") baseUrl = localUrl || "https://api.x.ai/v1";

      const response = await fetch(`${(baseUrl || '').replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || (provider === "openai" ? process.env.OPENAI_API_KEY : provider === "deepseek" ? process.env.DEEPSEEK_API_KEY : provider === "grok" ? process.env.XAI_API_KEY : "")}`
        },
        body: JSON.stringify({
          model: modelName || (provider === "openai" ? "gpt-4o" : provider === "deepseek" ? "deepseek-chat" : provider === "grok" ? "grok-beta" : "local-model"),
          messages: [
            { role: 'system', content: prompt },
            ...contents.map(c => ({ 
              role: c.role === 'model' ? 'assistant' : c.role, 
              content: c.parts[0].text 
            }))
          ]
        })
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
    const { message, config = {}, kernelConfig = {} } = req.body;
    const { aiProvider = "gemini", localUrl, aiModel, apiKey } = config;
    const kConfig = kernelConfig.aiProvider ? kernelConfig : config;

    // 1. Read persistent state
    const history = JSON.parse(await fs.readFile(HISTORY_FILE, "utf-8"));
    const memories = JSON.parse(await fs.readFile(MEMORY_FILE, "utf-8"));

    // 2. Construct context
    const { agent = "build" } = req.body;
    const contextParts = memories.slice(-5).map((m: any) => `[CLUSTER_DATA]: ${m.content}`).join('\n');
    
    const AGENT_PROMPTS: Record<string, string> = {
      build: `[ROLE: BUILD] - DEFAULT DEVELOPER AGENT. You have full access to developer tools (read/write files, execute bash). Focus on iterative coding, bug fixing, and implementation.`,
      general: `[ROLE: GENERAL] - UNIVERSAL ASSISTANT. Help with complex, multi-stage tasks. You can modify files, run parallel processes, and coordinate broad workflows.`,
      explore: `[ROLE: EXPLORE] - CODEBASE EXPLORER. Read-only specialist. Efficiently search patterns, find keywords, and explain codebase structure. Use fast search tools. You CANNOT write files.`,
      scout: `[ROLE: SCOUT] - ANALYST. Read-only. Specialized in external documentation research and dependency analysis. Focus on architectural auditing and research.`,
      prometheus: `[ROLE: PROMETHEUS] - STRATEGIC PLANNER. You are a strategic architect. Before any code is written, you must clarify requirements, define architecture, and scope the work. You create comprehensive plans.`,
      hephaestus: `[ROLE: HEPHAESTUS] - DEEP EXECUTOR. Autonomous specialist. Given a goal, independently research patterns, write code, and finish the task without requiring step-by-step guidance.`,
    };

    const systemPrompt = `You are "cvr.name", the world's most advanced autonomous coding kernel. 
    
    CURRENT_AGENT_IDENTITY:
    ${AGENT_PROMPTS[agent] || AGENT_PROMPTS.build}
    
    INTEGRATED PROTOCOLS:
    - [COMPLEXITY_OPTIMIZER]: When analyzing or refactoring, apply Algorithmic Complexity Evaluation. Detect performance hotspots (O(n) notation), identify high-risk logic, and provide safe optimization reports. Focus on memory usage, execution speed, and architectural efficiency.
    - [AGENT_BEST_PRACTICES]: Maintain a proactive, provider-neutral stance. Rigorously audit your own tool harness and state. When tasked with complexity, solve sequentially without human friction, prioritizing MVP stability and clear tool definitions.
    - [SUPERPOWERS]: Active plugin from OpenCode. Enables high-level brainstorming, advanced task decomposition, and "Superpower" skills (available: brainstorming, refactor, test-gen, arch-review, debug, doc-gen). Use the 'skill' tool nomenclature to refer to discovered capabilities. Enhanced tool mapping is active (e.g., TodoWrite -> todowrite).
    
    SYSTEM ARCHITECTURE: 
    - Local Persistent Memory (.opencode-infinite)
    - Recursive Task Execution Pipeline
    - Dreamer Semantic Compression Engine
    
    AUTONOMY PROTOCOLS:
    1. OBJECTIVE: Absolute task completion. Use deep-analysis for code optimization.
    2. ITERATION: For multi-vector tasks, solve sequentially. If /optimize is used, focus on complexity reduction. If /audit is used, report on system integrity. If /superpowers is used, invoke the Superpowers plugin for high-level refactoring and brainstorming.
    3. TERMINATION: "CONTINUE_NEEDED" for next cycles. "TASK_COMPLETE" for final success.
    
    PERSISTENT CONTEXT CLUSTERS:
    ${contextParts || "No previous knowledge clusters found. Kernel is in cold-start mode."}
    `;

    const responseText = await generateAIContent(systemPrompt, [
      ...history.slice(-10).map((m: any) => ({ role: m.role, parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: message }] }
    ], aiProvider, localUrl, aiModel, apiKey);

    // 3. Persist
    const updatedHistory = [...history, { role: 'user', content: message, createdAt: new Date() }, { role: 'model', content: responseText, createdAt: new Date() }];
    await fs.writeFile(HISTORY_FILE, JSON.stringify(updatedHistory));

    // 4. Memory Compression (Project "Dreamer" process)
    if (updatedHistory.length % 5 === 0) {
      summarizeLongHistory(updatedHistory, kConfig.aiProvider, kConfig.localUrl, kConfig.aiModel || kConfig.localModelName, kConfig.apiKey).then(async (summary) => {
        if (summary) {
          const currentMemories = JSON.parse(await fs.readFile(MEMORY_FILE, "utf-8"));
          await fs.writeFile(MEMORY_FILE, JSON.stringify([...currentMemories, { content: summary, createdAt: new Date() }]));
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
    const history = JSON.parse(await fs.readFile(HISTORY_FILE, "utf-8"));
    const memories = JSON.parse(await fs.readFile(MEMORY_FILE, "utf-8"));
    res.json({ history, memories });
  } catch (e: any) {
    res.json({ history: [], memories: [] });
  }
});

app.post("/api/clear", async (_req, res) => {
  await fs.writeFile(HISTORY_FILE, JSON.stringify([]));
  await fs.writeFile(MEMORY_FILE, JSON.stringify([]));
  res.json({ status: "cleared" });
});

async function startServer() {
  await ensureStorage();

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

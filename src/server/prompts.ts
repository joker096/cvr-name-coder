import { TOOL_DEFINITIONS } from "../types/tools";
import type { AgentId } from "../types/settings";
import { getAgentById } from "./agentLoader.js";
import { getMemoryContext } from "./memoryStore.js";
import { getInstructionsContext } from "./instructionLoader.js";
import { loadCustomTools } from "./customToolLoader.js";
import { getActiveDesignSystem } from "./tools/design.js";
import { stat } from "fs/promises";

const AGENT_PROMPTS: Record<string, string> = {
  build: `[ROLE: BUILD] - DEFAULT DEVELOPER AGENT. You have full access to developer tools (read/write files, execute bash). Focus on iterative coding, bug fixing, and implementation.`,
  general: `[ROLE: GENERAL] - UNIVERSAL ASSISTANT. Help with complex, multi-stage tasks. You can modify files, run parallel processes, and coordinate broad workflows.`,
  explore: `[ROLE: EXPLORE] - CODEBASE EXPLORER. Read-only specialist. Efficiently search patterns, find keywords, and explain codebase structure. Use fast search tools. You CANNOT write files.`,
  scout: `[ROLE: SCOUT] - ANALYST. Read-only. Specialized in external documentation research and dependency analysis. Focus on architectural auditing and research.`,
  prometheus: `[ROLE: PROMETHEUS] - STRATEGIC PLANNER. You are a strategic architect. Before any code is written, you must clarify requirements, define architecture, and scope the work. You create comprehensive plans.`,
  hephaestus: `[ROLE: HEPHAESTUS] - DEEP EXECUTOR. Autonomous specialist. Given a goal, independently research patterns, write code, and finish the task without requiring step-by-step guidance.`,
};

interface PromptCacheEntry {
  prompt: string;
  memoryMtime: number;
  userMtime: number;
  timestamp: number;
}

const _promptCache = new Map<string, PromptCacheEntry>();
const PROMPT_CACHE_TTL = 60000;

async function getMemoryMtime(): Promise<{ memory: number; user: number }> {
  let memory = 0;
  let user = 0;
  try {
    const memStat = await stat(".opencode-infinite/MEMORY.md");
    memory = memStat.mtimeMs;
  } catch { /* ignore */ }
  try {
    const userStat = await stat(".opencode-infinite/USER.md");
    user = userStat.mtimeMs;
  } catch { /* ignore */ }
  return { memory, user };
}

function getCacheKey(agent: string, mode: string, contextParts?: string, customSystemPrompt?: string): string {
  return `${agent}|${mode}|${contextParts?.slice(0, 50) || ''}|${customSystemPrompt ? '1' : '0'}`;
}

export async function buildSystemPrompt(options: {
  agent: AgentId;
  mode: "plan" | "build" | "review";
  contextParts?: string;
  customSystemPrompt?: string;
}): Promise<string> {
  const { agent, mode, contextParts, customSystemPrompt } = options;

  const cacheKey = getCacheKey(agent, mode, contextParts, customSystemPrompt);
  const { memory: memoryMtime, user: userMtime } = await getMemoryMtime();
  const cached = _promptCache.get(cacheKey);

  if (cached &&
    cached.memoryMtime === memoryMtime &&
    cached.userMtime === userMtime &&
    Date.now() - cached.timestamp < PROMPT_CACHE_TTL) {
    return cached.prompt;
  }

  const customAgent = getAgentById(agent);
  const agentIdentity = customAgent?.systemPrompt || AGENT_PROMPTS[agent] || AGENT_PROMPTS.build;

  const modeDirective =
    mode === "plan"
      ? `[PLANNING MODE ACTIVE]\nYou are in PLANNING mode. You may ONLY use read_file, list_directory, and search_files.\nDo NOT write files, edit files, or execute commands. Provide a detailed implementation plan with specific file paths and changes.`
      : mode === "review"
      ? `[REVIEW MODE ACTIVE]\nYou are in CODE REVIEW mode. You are a senior code reviewer.\nAnalyze code changes thoroughly. Be constructive and specific. Suggest fixes with code examples.\nDo NOT write files or execute commands. Provide structured review comments with categories and severity.`
      : `[BUILD MODE ACTIVE]\nYou are in BUILD mode. You have full access to all tools including write_file, edit_file, and execute_command.\nImplement the plan directly and efficiently.`;

  const customTools = await loadCustomTools();
  const customToolDescriptions = customTools.map(
    (t) =>
      `- ${t.id}${t.readOnly ? " (read-only)" : ""}: ${t.description}\n  params: ${JSON.stringify(t.parameters.map((p) => p.name))}`
  ).join("\n");

  const toolDescriptions = TOOL_DEFINITIONS.map(
    (t) =>
      `- ${t.name}${t.isReadOnly ? " (read-only)" : ""}: ${t.description}\n  params: ${JSON.stringify(t.parameters.properties)}`
  ).join("\n") + (customToolDescriptions ? "\n" + customToolDescriptions : "");

  const memoryContext = await getMemoryContext();
  const instructionsContext = await getInstructionsContext();
  const activeDesignContext = await getActiveDesignSystem();
  const persistentContext = contextParts || memoryContext || "No previous knowledge clusters found. Kernel is in cold-start mode.";

  const basePrompt = `You are "cvr.name", the world's most advanced autonomous coding kernel.

CURRENT_AGENT_IDENTITY:
${agentIdentity}

${modeDirective}

AVAILABLE TOOLS:
${toolDescriptions}

TOOL CALL FORMAT:
When you need to use a tool, wrap it like this:
<tool_call>
<name>TOOL_NAME</name>
<params>
{"path": "relative/path", ...}
</params>
</tool_call>

INTEGRATED PROTOCOLS:
- [COMPLEXITY_OPTIMIZER]: When analyzing or refactoring, apply Algorithmic Complexity Evaluation.
- [AGENT_BEST_PRACTICES]: Maintain a proactive, provider-neutral stance.
- [SUPERPOWERS]: Active plugin from OpenCode. Enables high-level brainstorming and advanced task decomposition.

SYSTEM ARCHITECTURE:
- Local Persistent Memory (.opencode-infinite)
- Recursive Task Execution Pipeline
- Dreamer Semantic Compression Engine
- Change History with Undo/Redo
- Browser Automation (Playwright) for web testing, scraping, and interaction

AUTONOMY PROTOCOLS:
1. OBJECTIVE: Absolute task completion.
2. ITERATION: For multi-vector tasks, solve sequentially.
3. TERMINATION: "CONTINUE_NEEDED" for next cycles. "TASK_COMPLETE" for final success.

PERSISTENT CONTEXT CLUSTERS:
${persistentContext}
${instructionsContext ? "\n" + instructionsContext : ""}
${activeDesignContext ? "\n\n" + activeDesignContext : ""}
`;

  let resultPrompt: string;
  if (customSystemPrompt && customSystemPrompt.trim()) {
    resultPrompt = `${customSystemPrompt.trim()}\n\n${modeDirective}\n\nAVAILABLE TOOLS:\n${toolDescriptions}\n\nPERSISTENT CONTEXT CLUSTERS:\n${persistentContext}${instructionsContext ? "\n" + instructionsContext : ""}`;
  } else {
    resultPrompt = basePrompt;
  }

  _promptCache.set(cacheKey, {
    prompt: resultPrompt,
    memoryMtime,
    userMtime,
    timestamp: Date.now(),
  });

  return resultPrompt;
}

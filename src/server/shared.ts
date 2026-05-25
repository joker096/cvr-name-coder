import { log } from './logger.js';
import { aiCache } from './cache.js';

/**
 * Represents a single content part in a multi-modal conversation turn.
 */
export interface ContentPart {
  /** The role of the participant. "model" is mapped to "assistant" internally. */
  role: 'user' | 'model' | 'assistant';
  /** Array of content parts, either text blocks or inline image data. */
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
}

/**
 * Options for generating AI responses via any provider.
 */
export interface GenerateOptions {
  /** The provider identifier (e.g. "openai", "gemini", "anthropic"). */
  provider: string;
  /** Base URL for local LLM providers. */
  localUrl?: string;
  /** The specific model name to use. */
  modelName?: string;
  /** API key for the provider. */
  apiKey?: string;
  /** Sampling temperature (0-2). */
  temperature?: number;
  /** Maximum output tokens. */
  maxTokens?: number;
  /** AbortSignal for cancelling the request. */
  signal?: AbortSignal;
  /** Whether to use the response cache. */
  useCache?: boolean;
}

/**
 * System prompt templates for each agent role.
 * Each agent has a distinct role and set of capabilities.
 */
export const AGENT_PROMPTS: Record<string, string> = {
  build: `[ROLE: BUILD] - DEFAULT DEVELOPER AGENT. You have full access to developer tools (read/write files, execute bash). First explore the codebase with list_directory/read_file to understand the actual project structure, then implement changes. NEVER invent file names or code. Focus on iterative coding, bug fixing, and implementation.`,
  general: `[ROLE: GENERAL] - UNIVERSAL ASSISTANT. Help with complex, multi-stage tasks. You can modify files, run parallel processes, and coordinate broad workflows. Always verify file existence before referencing them — use list_directory and read_file to explore first.`,
  explore: `[ROLE: EXPLORE] - CODEBASE EXPLORER. Read-only specialist. Efficiently search patterns, find keywords, and explain codebase structure. Use fast search tools. You CANNOT write files. Only report on files you have actually read.`,
  scout: `[ROLE: SCOUT] - ANALYST. Read-only. Specialized in external documentation research and dependency analysis. Focus on architectural auditing and research. Verify file existence before analysis.`,
  prometheus: `[ROLE: PROMETHEUS] - STRATEGIC PLANNER. You are a strategic architect. Before any code is written, you must explore the actual codebase with list_directory/read_file, clarify requirements, define architecture, and scope the work. Do not invent file names — base your plan on REAL files. You create comprehensive plans.`,
  hephaestus: `[ROLE: HEPHAESTUS] - DEEP EXECUTOR. Autonomous specialist. Given a goal, independently research patterns by reading actual files, write code, and finish the task without requiring step-by-step guidance. Always verify file paths before editing — never hallucinate file names or code.`,
};

/**
 * Returns default configuration for a given AI provider.
 * Includes the base API URL, default model name, and the environment variable key for the API key.
 * @param {string} provider - The provider identifier.
 * @returns {{ baseUrl: string; defaultModel: string; envKey: string }} Provider defaults.
 */
export function getProviderDefaults(provider: string): { baseUrl: string; defaultModel: string; envKey: string } {
  const defaults: Record<string, { baseUrl: string; defaultModel: string; envKey: string }> = {
    openai: { baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4.1', envKey: 'OPENAI_API_KEY' },
    deepseek: { baseUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', envKey: 'DEEPSEEK_API_KEY' },
    grok: { baseUrl: 'https://api.x.ai/v1', defaultModel: 'grok-3', envKey: 'XAI_API_KEY' },
    groq: { baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'meta-llama/llama-4-maverick-17b-128e-instruct', envKey: 'GROQ_API_KEY' },
    baseten: { baseUrl: 'https://inference.baseten.co/v1', defaultModel: 'deepseek-ai/DeepSeek-V4-Pro', envKey: 'BASETEN_API_KEY' },
    openrouter: { baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'google/gemini-2.5-flash', envKey: 'OPENROUTER_API_KEY' },
    together: { baseUrl: 'https://api.together.xyz/v1', defaultModel: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', envKey: 'TOGETHER_API_KEY' },
    mistral: { baseUrl: 'https://api.mistral.ai/v1', defaultModel: 'mistral-large-latest', envKey: 'MISTRAL_API_KEY' },
    anthropic: { baseUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-sonnet-4-20250514', envKey: 'ANTHROPIC_API_KEY' },
    gemini: { baseUrl: '', defaultModel: 'gemini-2.5-flash', envKey: 'GEMINI_API_KEY' },
  };

  return defaults[provider] || { baseUrl: '', defaultModel: 'model', envKey: '' };
}

/**
 * Summarizes conversation history using the "Dreamer Engine" when a conversation exceeds 5 messages.
 * Extracts key facts, invariant rules, progress state, and pending goals.
 * @param {Array<{ role: string; content: string }>} messages - The conversation messages to summarize.
 * @param {string} _provider - The AI provider (unused, reserved for future use).
 * @param {(prompt: string) => Promise<string>} generateFn - Function that sends a prompt to the AI and returns the response.
 * @returns {Promise<string | null>} The summary text, or null if there are fewer than 5 messages or on failure.
 */
export async function summarizeHistory(
  messages: Array<{ role: string; content: string }>,
  _provider: string,
  generateFn: (prompt: string) => Promise<string>
): Promise<string | null> {
  if (messages.length < 5) return null;

  const instruction = `You are the "cvr.name Dreamer Engine". Examine the conversation below and extract:
1. KEY_FACTS: Fundamental project decisions or requirements.
2. INVARIANT_RULES: Coding standards or logic that MUST not change.
3. PROGRESS_STATE: What was just finished.
4. PENDING_GOALS: What the agent is currently working towards.

Format as a strict technical manifest (max 150 words). Focus on architectural integrity.

Conversation:
${messages.slice(-10).map((m) => `${m.role}: ${m.content}`).join('\n')}`;

  try {
    const summary = await generateFn(instruction);
    log.info('History summarized', { messageCount: messages.length });
    return summary;
  } catch (error) {
    log.error('Summarization failed', error instanceof Error ? error : undefined);
    return null;
  }
}

/**
 * Builds the full message array for an AI request, prepending a system prompt
 * and converting ContentPart entries to standard message objects.
 * @param {string} prompt - The system prompt text.
 * @param {ContentPart[]} contents - The conversation history as content parts.
 * @returns {Array<{ role: string; content: string }>} Formatted message array for the AI provider.
 */
export function buildMessages(prompt: string, contents: ContentPart[]): Array<{ role: string; content: string }> {
  return [
    { role: 'system', content: prompt },
    ...contents.map((c) => ({
      role: c.role === 'model' ? 'assistant' : c.role,
      content: c.parts[0] && 'text' in c.parts[0] ? c.parts[0].text : '',
    })),
  ];
}

/**
 * Parses a raw SSE (Server-Sent Events) buffer into individual lines,
 * separating the last incomplete line as a remainder for the next chunk.
 * @param {string} buffer - The raw SSE buffer text.
 * @returns {{ lines: string[]; remaining: string }} Parsed complete lines and the trailing partial line.
 */
export function parseSSEStream(buffer: string): { lines: string[]; remaining: string } {
  const lines = buffer.split('\n');
  const remaining = lines.pop() || '';
  return { lines, remaining };
}

/**
 * Extracts tool call JSON blocks from AI response content.
 * Handles both ```tool_call ... ``` fenced code blocks and <tool_call> XML format.
 * @param {string} content - The raw AI response content.
 * @returns {Array<{ server: string; tool: string; arguments: Record<string, unknown> }>} Parsed tool call objects.
 */
export function extractToolCalls(content: string): Array<{ server: string; tool: string; arguments: Record<string, unknown> }> {
  const calls: Array<{ server: string; tool: string; arguments: Record<string, unknown> }> = [];
  const fencedRegex = /```tool_call\n([\s\S]*?)```/g;
  let match;

  while ((match = fencedRegex.exec(content)) !== null) {
    try {
      const call = JSON.parse(match[1] || '{}');
      if (call.server && call.tool) {
        calls.push(call);
      }
    } catch {
      // skip malformed tool calls
    }
  }

  const xmlRegex = /<tool_call>\s*<name>(.+?)<\/name>\s*<params>\s*([\s\S]*?)\s*<\/params>\s*<\/tool_call>/g;
  while ((match = xmlRegex.exec(content)) !== null) {
    try {
      const name = (match[1] || '').trim();
      const paramsStr = (match[2] || '{}').trim();
      const params = JSON.parse(paramsStr) as Record<string, unknown>;
      calls.push({ server: 'local', tool: name, arguments: params });
    } catch {
      // skip malformed
    }
  }

  return calls;
}

/**
 * Checks whether the AI response indicates that more work is needed to complete the task.
 * @param {string} content - The AI response content.
 * @returns {boolean} True if the content contains a continuation marker.
 */
export function shouldContinueNeeded(content: string): boolean {
  return content.includes('CONTINUE_NEEDED') || content.includes('TASK_INCOMPLETE');
}

/**
 * Checks whether the AI response indicates that the task is fully complete.
 * @param {string} content - The AI response content.
 * @returns {boolean} True if the content contains a completion marker.
 */
export function isTaskComplete(content: string): boolean {
  return content.includes('TASK_COMPLETE') || content.includes('DONE');
}

/**
 * Generates a cache key for an AI request based on provider, model, prompt prefix, and content count.
 * @param {string} prompt - The system prompt.
 * @param {ContentPart[]} contents - The conversation contents.
 * @param {string} provider - The AI provider identifier.
 * @param {string} [model] - The model name (optional).
 * @returns {string} A unique cache key string.
 */
export function getCacheKey(prompt: string, contents: ContentPart[], provider: string, model?: string): string {
  return `${provider}:${model || 'default'}:${prompt.slice(0, 50)}:${contents.length}`;
}

/**
 * Checks the AI response cache for a previously generated response.
 * @param {string} prompt - The system prompt.
 * @param {ContentPart[]} contents - The conversation contents.
 * @param {string} provider - The AI provider identifier.
 * @param {string} [model] - The model name (optional).
 * @returns {string | null} The cached response, or null if not found.
 */
export function checkCache(prompt: string, contents: ContentPart[], provider: string, model?: string): string | null {
  return aiCache.get(prompt, contents, provider, model);
}

/**
 * Stores an AI response in the cache for future reuse.
 * @param {string} prompt - The system prompt.
 * @param {ContentPart[]} contents - The conversation contents.
 * @param {string} provider - The AI provider identifier.
 * @param {string} response - The generated response to cache.
 * @param {string} [model] - The model name (optional).
 */
export function setCache(prompt: string, contents: ContentPart[], provider: string, response: string, model?: string): void {
  aiCache.set(prompt, contents, provider, response, model);
}

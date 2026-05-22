import { log } from './logger.js';
import { aiCache } from './cache.js';

export interface ContentPart {
  role: 'user' | 'model' | 'assistant';
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
}

export interface GenerateOptions {
  provider: string;
  localUrl?: string;
  modelName?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  useCache?: boolean;
}

export const AGENT_PROMPTS: Record<string, string> = {
  build: `[ROLE: BUILD] - DEFAULT DEVELOPER AGENT. You have full access to developer tools (read/write files, execute bash). Focus on iterative coding, bug fixing, and implementation.`,
  general: `[ROLE: GENERAL] - UNIVERSAL ASSISTANT. Help with complex, multi-stage tasks. You can modify files, run parallel processes, and coordinate broad workflows.`,
  explore: `[ROLE: EXPLORE] - CODEBASE EXPLORER. Read-only specialist. Efficiently search patterns, find keywords, and explain codebase structure. Use fast search tools. You CANNOT write files.`,
  scout: `[ROLE: SCOUT] - ANALYST. Read-only. Specialized in external documentation research and dependency analysis. Focus on architectural auditing and research.`,
  prometheus: `[ROLE: PROMETHEUS] - STRATEGIC PLANNER. You are a strategic architect. Before any code is written, you must clarify requirements, define architecture, and scope the work. You create comprehensive plans.`,
  hephaestus: `[ROLE: HEPHAESTUS] - DEEP EXECUTOR. Autonomous specialist. Given a goal, independently research patterns, write code, and finish the task without requiring step-by-step guidance.`,
};

export function getProviderDefaults(provider: string): { baseUrl: string; defaultModel: string; envKey: string } {
  const defaults: Record<string, { baseUrl: string; defaultModel: string; envKey: string }> = {
    openai: { baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4.1', envKey: 'OPENAI_API_KEY' },
    deepseek: { baseUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', envKey: 'DEEPSEEK_API_KEY' },
    grok: { baseUrl: 'https://api.x.ai/v1', defaultModel: 'grok-3', envKey: 'XAI_API_KEY' },
    groq: { baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'meta-llama/llama-4-maverick-17b-128e-instruct', envKey: 'GROQ_API_KEY' },
    baseten: { baseUrl: 'https://api.baseten.co/v1', defaultModel: 'meta-llama-4-maverick', envKey: 'BASETEN_API_KEY' },
    openrouter: { baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'google/gemini-2.5-flash', envKey: 'OPENROUTER_API_KEY' },
    together: { baseUrl: 'https://api.together.xyz/v1', defaultModel: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', envKey: 'TOGETHER_API_KEY' },
    mistral: { baseUrl: 'https://api.mistral.ai/v1', defaultModel: 'mistral-large-latest', envKey: 'MISTRAL_API_KEY' },
    anthropic: { baseUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-sonnet-4-20250514', envKey: 'ANTHROPIC_API_KEY' },
    gemini: { baseUrl: '', defaultModel: 'gemini-2.5-flash', envKey: 'GEMINI_API_KEY' },
  };

  return defaults[provider] || { baseUrl: '', defaultModel: 'model', envKey: '' };
}

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

export function buildMessages(prompt: string, contents: ContentPart[]): Array<{ role: string; content: string }> {
  return [
    { role: 'system', content: prompt },
    ...contents.map((c) => ({
      role: c.role === 'model' ? 'assistant' : c.role,
      content: c.parts[0] && 'text' in c.parts[0] ? c.parts[0].text : '',
    })),
  ];
}

export function parseSSEStream(buffer: string): { lines: string[]; remaining: string } {
  const lines = buffer.split('\n');
  const remaining = lines.pop() || '';
  return { lines, remaining };
}

export function extractToolCalls(content: string): Array<{ server: string; tool: string; arguments: Record<string, unknown> }> {
  const calls: Array<{ server: string; tool: string; arguments: Record<string, unknown> }> = [];
  const regex = /```tool_call\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    try {
      const call = JSON.parse(match[1] || '{}');
      if (call.server && call.tool) {
        calls.push(call);
      }
    } catch {
      // skip malformed tool calls
    }
  }

  return calls;
}

export function shouldContinueNeeded(content: string): boolean {
  return content.includes('CONTINUE_NEEDED') || content.includes('TASK_INCOMPLETE');
}

export function isTaskComplete(content: string): boolean {
  return content.includes('TASK_COMPLETE') || content.includes('DONE');
}

export function getCacheKey(prompt: string, contents: ContentPart[], provider: string, model?: string): string {
  return `${provider}:${model || 'default'}:${prompt.slice(0, 50)}:${contents.length}`;
}

export function checkCache(prompt: string, contents: ContentPart[], provider: string, model?: string): string | null {
  return aiCache.get(prompt, contents, provider, model);
}

export function setCache(prompt: string, contents: ContentPart[], provider: string, response: string, model?: string): void {
  aiCache.set(prompt, contents, provider, response, model);
}

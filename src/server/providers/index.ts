import { estimateTokens } from "../costTracker.js";
import { aiCache } from "../cache.js";
import type { OpenAITool } from "../../types/tools.js";
import { AIProvider, type AIResponse, type StreamCallbacks, type Content, type DualModelConfig } from "./types.js";
import { GeminiProvider } from "./gemini.js";
import { OpenAICompatibleProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";

export { AIProvider } from "./types.js";
export type { AIResponse, AIGenerateOptions, StreamCallbacks, Content, ContentPart, DualModelConfig } from "./types.js";

const providers: Record<string, AIProvider> = {
  gemini: new GeminiProvider(),
  openai: new OpenAICompatibleProvider("openai"),
  deepseek: new OpenAICompatibleProvider("deepseek"),
  grok: new OpenAICompatibleProvider("grok"),
  groq: new OpenAICompatibleProvider("groq"),
  baseten: new OpenAICompatibleProvider("baseten"),
  openrouter: new OpenAICompatibleProvider("openrouter"),
  together: new OpenAICompatibleProvider("together"),
  mistral: new OpenAICompatibleProvider("mistral"),
  local: new OpenAICompatibleProvider("local"),
  custom: new OpenAICompatibleProvider("custom"),
  anthropic: new AnthropicProvider(),
};

export async function generateAIResponse(
  prompt: string,
  contents: Content[] = [],
  provider?: string,
  localUrl?: string,
  modelName?: string,
  apiKey?: string,
  temperature?: number,
  maxTokens?: number,
  useCache?: boolean,
  tools?: OpenAITool[],
  toolMessages?: Array<{ role: string; tool_call_id: string; content: string }>
): Promise<AIResponse> {
  if (!provider) {
    throw new Error("AI provider not configured.");
  }
  if (useCache) {
    const cached = aiCache.get(prompt, contents, provider, modelName);
    if (cached) return { text: cached, inputTokens: estimateTokens(prompt), outputTokens: estimateTokens(cached) };
  }

  const p = providers[provider];
  if (!p) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  const result = await p.generate({ prompt, contents, localUrl, modelName, apiKey, temperature, maxTokens, tools, toolMessages });

  if (useCache) {
    aiCache.set(prompt, contents, provider, result.text, modelName);
  }

  return result;
}

export async function generateStreamResponse(
  prompt: string,
  contents: Content[] = [],
  provider?: string,
  localUrl?: string,
  modelName?: string,
  apiKey?: string,
  temperature?: number,
  maxTokens?: number,
  callbacks?: StreamCallbacks,
  tools?: OpenAITool[],
  toolMessages?: Array<{ role: string; tool_call_id: string; content: string }>
): Promise<AIResponse> {
  if (!provider) {
    throw new Error("AI provider not configured.");
  }

  const p = providers[provider];
  if (!p) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return p.generateStream({ prompt, contents, localUrl, modelName, apiKey, temperature, maxTokens, tools, toolMessages }, callbacks || { onToken: () => {} });
}

export async function generateAIContent(
  prompt: string,
  contents: Content[] = [],
  provider?: string,
  localUrl?: string,
  modelName?: string,
  apiKey?: string,
  temperature?: number,
  maxTokens?: number,
  useCache?: boolean,
  tools?: OpenAITool[],
  toolMessages?: Array<{ role: string; tool_call_id: string; content: string }>
): Promise<string> {
  const result = await generateAIResponse(prompt, contents, provider, localUrl, modelName, apiKey, temperature, maxTokens, useCache, tools, toolMessages);
  return result.text;
}

export async function generateWithDualModelResponse(
  prompt: string,
  contents: Content[] = [],
  config: DualModelConfig,
  purpose: 'think' | 'code' | 'auto' = 'auto'
): Promise<AIResponse> {
  const useThinking = purpose === 'think' ||
    (purpose === 'auto' && config.thinkingProvider && config.thinkingModel);

  if (useThinking && config.thinkingProvider && config.thinkingModel) {
    return generateAIResponse(
      prompt, contents,
      config.thinkingProvider!,
      config.thinkingLocalUrl || config.primaryLocalUrl,
      config.thinkingModel,
      config.apiKey,
      config.temperature,
      config.maxTokens
    );
  }

  return generateAIResponse(
    prompt, contents,
    config.primaryProvider,
    config.primaryLocalUrl,
    config.primaryModel,
    config.apiKey,
    config.temperature,
    config.maxTokens
  );
}

export async function generateWithDualModel(
  prompt: string,
  contents: Content[] = [],
  config: DualModelConfig,
  purpose: 'think' | 'code' | 'auto' = 'auto'
): Promise<string> {
  const result = await generateWithDualModelResponse(prompt, contents, config, purpose);
  return result.text;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const gemini = providers.gemini as GeminiProvider;
  return gemini.embed(texts);
}

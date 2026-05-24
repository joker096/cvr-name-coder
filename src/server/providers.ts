import { GoogleGenAI } from "@google/genai";
import { DEFAULT_MAX_TOKENS, PROVIDER_DEFAULT_MODELS, PROVIDER_BASE_URLS } from "../utils/constants.js";
import { estimateTokens } from "./costTracker.js";
import { aiCache } from "./cache.js";

export interface AIResponse {
  text: string;
  reasoning?: string | undefined;
  inputTokens: number;
  outputTokens: number;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onReasoning?: (token: string) => void;
}

export abstract class AIProvider {
  abstract generate(options: AIGenerateOptions): Promise<AIResponse>;
  abstract generateStream(options: AIGenerateOptions, callbacks: StreamCallbacks): Promise<AIResponse>;

  protected resolveApiKey(envVar: string, override?: string): string {
    return override || process.env[envVar] || "";
  }
}

export interface ContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface Content {
  role: string;
  parts: ContentPart[];
}

export interface AIGenerateOptions {
  prompt: string;
  contents: Content[];
  modelName?: string | undefined;
  apiKey?: string | undefined;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  localUrl?: string | undefined;
  useCache?: boolean | undefined;
}

class GeminiProvider extends AIProvider {
  private cachedClient: GoogleGenAI | null = null;
  private cachedKey: string | undefined = undefined;

  private getClient(apiKey?: string): GoogleGenAI {
    const key = this.resolveApiKey("GEMINI_API_KEY", apiKey);
    if (!apiKey && this.cachedClient && this.cachedKey === key) return this.cachedClient;
    const client = new GoogleGenAI({ apiKey: key });
    if (!apiKey) {
      this.cachedClient = client;
      this.cachedKey = key;
    }
    return client;
  }

  async generate(options: AIGenerateOptions): Promise<AIResponse> {
    const { prompt, contents, modelName, apiKey } = options;
    const client = this.getClient(apiKey);
    const model = modelName || PROVIDER_DEFAULT_MODELS.gemini;
    const result = await client.models.generateContent({
      model: model as string,
      contents: [
        { role: "user", parts: [{ text: prompt }] },
        ...contents,
      ],
    });
    const candidates = result.candidates || [];
    const candidate = candidates[0] as Record<string, unknown> | undefined;
    const parts = (candidate?.content as { parts?: Array<{ text?: string; thought?: boolean }> })?.parts || [];
    const reasoning = parts.filter((p) => (p as Record<string, unknown>).thought).map((p) => p.text || "").join("\n") || undefined;
    const text = parts.filter((p) => !(p as Record<string, unknown>).thought).map((p) => p.text || "").join("") || result.text || "";
    return {
      text,
      reasoning,
      inputTokens: estimateTokens(prompt),
      outputTokens: estimateTokens(text),
    };
  }

  async generateStream(options: AIGenerateOptions, callbacks: StreamCallbacks): Promise<AIResponse> {
    const { prompt, contents, modelName, apiKey } = options;
    const client = this.getClient(apiKey);
    const model = modelName || PROVIDER_DEFAULT_MODELS.gemini;
    const streamResult = await client.models.generateContentStream({
      model: model as string,
      contents: [
        { role: "user", parts: [{ text: prompt }] },
        ...contents,
      ],
    });
    const allParts: Array<{ text?: string; thought?: boolean }> = [];
    for await (const chunk of streamResult) {
      const text = chunk.text;
      if (text) {
        allParts.push({ text, thought: false });
        callbacks.onToken(text);
      }
    }
    const reasoning = allParts.filter((p) => p.thought).map((p) => p.text || "").join("\n") || undefined;
    const text = allParts.filter((p) => !p.thought).map((p) => p.text || "").join("");
    return {
      text,
      reasoning,
      inputTokens: estimateTokens(prompt),
      outputTokens: estimateTokens(text),
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    const client = this.getClient();
    const result = await client.models.embedContent({
      model: "text-embedding-004",
      contents: texts.map((t) => ({ role: "user", parts: [{ text: t }] })),
    });
    interface EmbedResult {
      values: number[];
    }
    if (Array.isArray(result.embeddings)) {
      return (result.embeddings as EmbedResult[]).map((e) => e.values);
    }
    if (result.embeddings && Array.isArray((result.embeddings as EmbedResult).values)) {
      return [(result.embeddings as EmbedResult).values];
    }
    throw new Error("Unexpected embedding response format");
  }
}

function buildOpenAICompatibleBody(options: AIGenerateOptions, providerName: string): Record<string, unknown> {
  const { prompt, contents, modelName, temperature, maxTokens } = options;
  const defaultModel = PROVIDER_DEFAULT_MODELS[providerName as keyof typeof PROVIDER_DEFAULT_MODELS] ?? "local-model";
  const body: Record<string, unknown> = {
    model: modelName || defaultModel,
    messages: [
      { role: "system", content: prompt },
      ...contents.map((c) => {
        const hasImages = c.parts.some((p) => p.inlineData);
        if (hasImages) {
          return {
            role: c.role === "model" ? "assistant" : c.role,
            content: c.parts.map((p) => {
              if (p.text) return { type: "text", text: p.text };
              if (p.inlineData) return { type: "image_url", image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } };
              return null;
            }).filter((x) => x !== null),
          };
        }
        return {
          role: c.role === "model" ? "assistant" : c.role,
          content: c.parts[0]?.text ?? "",
        };
      }),
    ],
  };
  if (temperature !== undefined) body.temperature = temperature;
  body.max_tokens = maxTokens ?? DEFAULT_MAX_TOKENS;
  return body;
}

function getEnvVarForProvider(provider: string): string {
  const map: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    grok: "XAI_API_KEY",
    groq: "GROQ_API_KEY",
    baseten: "BASETEN_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    together: "TOGETHER_API_KEY",
    mistral: "MISTRAL_API_KEY",
    custom: "CUSTOM_API_KEY",
  };
  return map[provider] || "";
}

interface OpenAIMessageContentPart {
  type?: string;
  text?: string;
}

interface OpenAIResponse {
  error?: { message?: string };
  choices?: Array<{
    message?: {
      content?: string | OpenAIMessageContentPart[];
      reasoning_content?: string | OpenAIMessageContentPart[];
      reasoning?: string | OpenAIMessageContentPart[];
    };
    delta?: {
      content?: string | OpenAIMessageContentPart[];
      reasoning_content?: string | OpenAIMessageContentPart[];
      reasoning?: string | OpenAIMessageContentPart[];
    };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

interface AnthropicResponse {
  error?: { message?: string };
  content?: Array<{ type?: string; text?: string; thinking?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

const ALLOWED_LOCAL_URLS = [
  "http://localhost",
  "http://127.0.0.1",
  "https://localhost",
  "https://127.0.0.1",
  "http://0.0.0.0",
];

function validateLocalUrl(localUrl: string | undefined, provider: string): string | null {
  if (!localUrl) return null;
  try {
    const parsed = new URL(localUrl);
    const origin = parsed.origin.toLowerCase();
    if (provider === "local" || provider === "custom") {
      return null;
    }
    if (ALLOWED_LOCAL_URLS.some((u) => origin.startsWith(u))) {
      return null;
    }
    return "localUrl is only allowed for 'local' or 'custom' providers";
  } catch {
    return "Invalid localUrl";
  }
}

class OpenAICompatibleProvider extends AIProvider {
  constructor(private provider: string) {
    super();
  }

  async generate(options: AIGenerateOptions): Promise<AIResponse> {
    const { prompt, contents, localUrl, apiKey, modelName, temperature, maxTokens } = options;
    const urlError = validateLocalUrl(localUrl, this.provider);
    if (urlError) throw new Error(urlError);

    // Provider-model mismatch guard
    if ((this.provider === "openai" || this.provider === "groq") && modelName?.toLowerCase().includes("claude")) {
      throw new Error(`Model "${modelName}" is an Anthropic Claude model, but provider is ${this.provider}. To use Claude models, select provider "anthropic" instead.`);
    }

    const baseUrl = localUrl || PROVIDER_BASE_URLS[this.provider] || "";
    const key = this.resolveApiKey(getEnvVarForProvider(this.provider), apiKey);

    const body = buildOpenAICompatibleBody({ prompt, contents, modelName, temperature, maxTokens }, this.provider);

    const authHeader = `Bearer ${key}`;

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      let message: string;
      try { const e = JSON.parse(text); message = e.error?.message || `${this.provider} API error: HTTP ${response.status}`; } catch { message = `${this.provider} API error: HTTP ${response.status} — ${text.slice(0, 200)}`; }
      throw new Error(message);
    }
    const data = (await response.json()) as OpenAIResponse;
    const choice = data.choices?.[0];
    const msg = choice?.message || choice?.delta;
    const reasoning = extractOpenAIText(msg?.reasoning_content || msg?.reasoning) || undefined;
    const text = extractOpenAIText(msg?.content) || "";
    const inputTokens = data.usage?.prompt_tokens || estimateTokens(prompt + contents.map((c) => c.parts?.[0]?.text || "").join(" "));
    const outputTokens = data.usage?.completion_tokens || estimateTokens(text + (reasoning || ""));
    return { text, reasoning, inputTokens, outputTokens };
  }

  async generateStream(options: AIGenerateOptions, callbacks: StreamCallbacks): Promise<AIResponse> {
    const { prompt, contents, localUrl, apiKey, modelName, temperature, maxTokens } = options;
    const urlError = validateLocalUrl(localUrl, this.provider);
    if (urlError) throw new Error(urlError);

    if ((this.provider === "openai" || this.provider === "groq") && modelName?.toLowerCase().includes("claude")) {
      throw new Error(`Model "${modelName}" is an Anthropic Claude model, but provider is ${this.provider}.`);
    }

    const baseUrl = localUrl || PROVIDER_BASE_URLS[this.provider] || "";
    const key = this.resolveApiKey(getEnvVarForProvider(this.provider), apiKey);
    const body = buildOpenAICompatibleBody({ prompt, contents, modelName, temperature, maxTokens }, this.provider);
    (body as Record<string, unknown>).stream = true;

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const t = await response.text();
      let msg: string;
      try { const e = JSON.parse(t); msg = e.error?.message || `API error: HTTP ${response.status}`; } catch { msg = `API error: HTTP ${response.status} — ${t.slice(0, 200)}`; }
      throw new Error(msg);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buf = "";
    let fullText = "";
    let fullReasoning = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const jsonStr = trimmed.slice(6);
        if (jsonStr === "[DONE]") break;
        try {
          const chunk = JSON.parse(jsonStr) as OpenAIResponse;
          const delta = chunk.choices?.[0]?.delta;
          const rs = extractOpenAIText(delta?.reasoning_content || delta?.reasoning);
          if (rs) {
            fullReasoning += rs;
            if (callbacks.onReasoning) callbacks.onReasoning(rs);
            else callbacks.onToken(rs);
          }
          const cs = extractOpenAIText(delta?.content);
          if (cs) { fullText += cs; callbacks.onToken(cs); }
        } catch { /* skip */ }
      }
    }

    return {
      text: fullText,
      reasoning: fullReasoning || undefined,
      inputTokens: estimateTokens(prompt),
      outputTokens: estimateTokens(fullText + fullReasoning),
    };
  }
}

function extractOpenAIText(value: string | OpenAIMessageContentPart[] | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";

  return value
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      if (typeof part.text === "string") return part.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

class AnthropicProvider extends AIProvider {
  async generate(options: AIGenerateOptions): Promise<AIResponse> {
    const { prompt, contents, apiKey, modelName, maxTokens } = options;
    const key = this.resolveApiKey("ANTHROPIC_API_KEY", apiKey);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelName || "claude-sonnet-4-20250514",
        max_tokens: maxTokens || 4096,
        system: prompt,
        messages: contents.map((c) => {
          const hasImages = c.parts.some((p) => p.inlineData);
          if (hasImages) {
            return {
              role: c.role === "model" ? "assistant" : c.role,
              content: c.parts.map((p) => {
                if (p.text) return { type: "text", text: p.text };
                if (p.inlineData) return { type: "image", source: { type: "base64", media_type: p.inlineData.mimeType, data: p.inlineData.data } };
                return null;
              }).filter((x) => x !== null),
            };
          }
          return {
            role: c.role === "model" ? "assistant" : c.role,
            content: c.parts[0]?.text ?? "",
          };
        }),
      }),
    });
    const data = (await response.json()) as AnthropicResponse;
    if (data.error) throw new Error(data.error.message || "Anthropic error");
    const contentBlocks = data.content || [];
    const reasoning = contentBlocks.filter((c) => c.type === "thinking" || c.type === "redacted_thinking").map((c) => c.thinking || c.text || "").join("\n") || undefined;
    const text = contentBlocks.filter((c) => c.type === "text" || (!c.type && c.text)).map((c) => c.text || "").join("") || "";
    const inputTokens = data.usage?.input_tokens || estimateTokens(prompt);
    const outputTokens = data.usage?.output_tokens || estimateTokens(text + (reasoning || ""));
    return { text, reasoning, inputTokens, outputTokens };
  }

  async generateStream(options: AIGenerateOptions, callbacks: StreamCallbacks): Promise<AIResponse> {
    const { prompt, contents, apiKey, modelName, maxTokens } = options;
    const key = this.resolveApiKey("ANTHROPIC_API_KEY", apiKey);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelName || "claude-sonnet-4-20250514",
        max_tokens: maxTokens || 4096,
        stream: true,
        system: prompt,
        messages: contents.map((c) => ({
          role: c.role === "model" ? "assistant" : c.role,
          content: c.parts[0]?.text ?? "",
        })),
      }),
    });
    if (!response.ok) {
      const e = await response.json() as Record<string, unknown>;
      throw new Error((e.error as { message?: string })?.message || "Anthropic stream error");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buf = "";
    let fullText = "";
    let fullReasoning = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const jsonStr = trimmed.slice(6);
        try {
          const chunk = JSON.parse(jsonStr) as Record<string, unknown>;
          if (chunk.type === "content_block_delta" && chunk.delta) {
            const d = chunk.delta as Record<string, unknown>;
            if (typeof d.text === "string") { fullText += d.text; callbacks.onToken(d.text); }
            if (typeof d.thinking === "string") {
              fullReasoning += d.thinking;
              if (callbacks.onReasoning) callbacks.onReasoning(d.thinking);
              else callbacks.onToken(d.thinking);
            }
          }
        } catch { /* skip */ }
      }
    }
    return {
      text: fullText,
      reasoning: fullReasoning || undefined,
      inputTokens: estimateTokens(prompt),
      outputTokens: estimateTokens(fullText + fullReasoning),
    };
  }
}

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
  useCache?: boolean
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
  const result = await p.generate({ prompt, contents, localUrl, modelName, apiKey, temperature, maxTokens });

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
  callbacks?: StreamCallbacks
): Promise<AIResponse> {
  if (!provider) {
    throw new Error("AI provider not configured.");
  }

  const p = providers[provider];
  if (!p) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return p.generateStream({ prompt, contents, localUrl, modelName, apiKey, temperature, maxTokens }, callbacks || { onToken: () => {} });
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
  useCache?: boolean
): Promise<string> {
  const result = await generateAIResponse(prompt, contents, provider, localUrl, modelName, apiKey, temperature, maxTokens, useCache);
  return result.text;
}

export interface DualModelConfig {
  primaryProvider: string;
  primaryModel?: string;
  primaryLocalUrl?: string;
  thinkingProvider?: string;
  thinkingModel?: string;
  thinkingLocalUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
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

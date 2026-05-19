import { GoogleGenAI } from "@google/genai";
import { PROVIDER_DEFAULT_MODELS, PROVIDER_BASE_URLS } from "../utils/constants.js";
import { estimateTokens } from "./costTracker.js";

export interface AIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AIGenerateOptions {
  prompt: string;
  contents: any[];
  modelName?: string | undefined;
  apiKey?: string | undefined;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  localUrl?: string | undefined;
}

export abstract class AIProvider {
  abstract generate(options: AIGenerateOptions): Promise<AIResponse>;

  protected resolveApiKey(envVar: string, override?: string): string {
    return override || process.env[envVar] || "";
  }
}

class GeminiProvider extends AIProvider {
  private client: GoogleGenAI;

  constructor() {
    super();
    this.client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });
  }

  async generate(options: AIGenerateOptions): Promise<AIResponse> {
    const { prompt, contents, modelName } = options;
    const model = modelName || PROVIDER_DEFAULT_MODELS.gemini;
    const result = await this.client.models.generateContent({
      model: model as string,
      contents: [
        { role: "user", parts: [{ text: prompt }] },
        ...contents,
      ],
    });
    const text = result.text || "";
    return {
      text,
      inputTokens: estimateTokens(prompt),
      outputTokens: estimateTokens(text),
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    const result = await this.client.models.embedContent({
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

function buildOpenAICompatibleBody(options: AIGenerateOptions, providerName: string): any {
  const { prompt, contents, modelName, temperature, maxTokens } = options;
  const defaultModel = PROVIDER_DEFAULT_MODELS[providerName as keyof typeof PROVIDER_DEFAULT_MODELS] ?? "local-model";
  const body: any = {
    model: modelName || defaultModel,
    messages: [
      { role: "system", content: prompt },
      ...contents.map((c) => {
        const hasImages = c.parts.some((p: any) => p.inlineData);
        if (hasImages) {
          return {
            role: c.role === "model" ? "assistant" : c.role,
            content: c.parts.map((p: any) => {
              if (p.text) return { type: "text", text: p.text };
              if (p.inlineData) return { type: "image_url", image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } };
              return null;
            }).filter((x: any) => x !== null),
          };
        }
        return {
          role: c.role === "model" ? "assistant" : c.role,
          content: c.parts[0].text,
        };
      }),
    ],
  };
  if (temperature !== undefined) body.temperature = temperature;
  if (maxTokens !== undefined) body.max_tokens = maxTokens;
  return body;
}

function getEnvVarForProvider(provider: string): string {
  const map: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    grok: "XAI_API_KEY",
    baseten: "BASETEN_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    together: "TOGETHER_API_KEY",
    mistral: "MISTRAL_API_KEY",
    custom: "CUSTOM_API_KEY",
  };
  return map[provider] || "CUSTOM_API_KEY";
}

class OpenAICompatibleProvider extends AIProvider {
  constructor(private provider: string) {
    super();
  }

  async generate(options: AIGenerateOptions): Promise<AIResponse> {
    const { prompt, contents, localUrl, apiKey, modelName, temperature, maxTokens } = options;
    const baseUrl = localUrl || PROVIDER_BASE_URLS[this.provider] || "";
    const key = this.resolveApiKey(getEnvVarForProvider(this.provider), apiKey);

    const body = buildOpenAICompatibleBody({ prompt, contents, modelName, temperature, maxTokens }, this.provider);

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    const data: any = await response.json();
    if (data.error) throw new Error(data.error.message || `${this.provider} API error`);
    const text = data.choices[0].message.content;
    const inputTokens = data.usage?.prompt_tokens || estimateTokens(prompt + contents.map((c) => c.parts?.[0]?.text || "").join(" "));
    const outputTokens = data.usage?.completion_tokens || estimateTokens(text);
    return { text, inputTokens, outputTokens };
  }
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
        model: modelName || "claude-3-5-sonnet-20240620",
        max_tokens: maxTokens || 4096,
        system: prompt,
        messages: contents.map((c) => {
          const hasImages = c.parts.some((p: any) => p.inlineData);
          if (hasImages) {
            return {
              role: c.role === "model" ? "assistant" : c.role,
              content: c.parts.map((p: any) => {
                if (p.text) return { type: "text", text: p.text };
                if (p.inlineData) return { type: "image", source: { type: "base64", media_type: p.inlineData.mimeType, data: p.inlineData.data } };
                return null;
              }).filter((x: any) => x !== null),
            };
          }
          return {
            role: c.role === "model" ? "assistant" : c.role,
            content: c.parts[0].text,
          };
        }),
      }),
    });
    const data: any = await response.json();
    if (data.error) throw new Error(data.error.message || "Anthropic error");
    const text = data.content[0].text;
    const inputTokens = data.usage?.input_tokens || estimateTokens(prompt);
    const outputTokens = data.usage?.output_tokens || estimateTokens(text);
    return { text, inputTokens, outputTokens };
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

export async function generateAIContent(
  prompt: string,
  contents: any[] = [],
  provider: string = "gemini",
  localUrl?: string,
  modelName?: string,
  apiKey?: string,
  temperature?: number,
  maxTokens?: number
): Promise<string> {
  const p = providers[provider];
  if (!p) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  const result = await p.generate({ prompt, contents, localUrl, modelName, apiKey, temperature, maxTokens });
  return result.text;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const gemini = providers.gemini as GeminiProvider;
  return gemini.embed(texts);
}

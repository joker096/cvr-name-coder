import { GoogleGenAI } from "@google/genai";
import { estimateTokens } from "../costTracker.js";
import { AIProvider } from "./types.js";
import type { AIGenerateOptions, AIResponse, StreamCallbacks } from "./types.js";
import { PROVIDER_DEFAULT_MODELS } from "../../utils/constants.js";

export class GeminiProvider extends AIProvider {
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
    let fullText = "";
    let fullReasoning = "";
    for await (const chunk of streamResult) {
      const parts = (chunk.candidates?.[0]?.content as { parts?: Array<{ text?: string; thought?: boolean }> } | undefined)?.parts ?? [];
      for (const part of parts) {
        if (part.thought && part.text) {
          fullReasoning += part.text;
          if (callbacks.onReasoning) callbacks.onReasoning(part.text);
          else callbacks.onToken(part.text);
        } else if (part.text) {
          fullText += part.text;
          callbacks.onToken(part.text);
        }
      }
      if (!parts.length) {
        const t = chunk.text;
        if (t) { fullText += t; callbacks.onToken(t); }
      }
    }
    const reasoning = fullReasoning || undefined;
    const text = fullText;
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

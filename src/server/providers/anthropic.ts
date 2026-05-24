import { estimateTokens } from "../costTracker.js";
import { AIProvider } from "./types.js";
import type { AIGenerateOptions, AIResponse, StreamCallbacks } from "./types.js";

interface AnthropicResponse {
  error?: { message?: string };
  content?: Array<{ type?: string; text?: string; thinking?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export class AnthropicProvider extends AIProvider {
  async generate(options: AIGenerateOptions): Promise<AIResponse> {
    const { prompt, contents, apiKey, modelName, maxTokens, temperature } = options;
    const key = this.resolveApiKey("ANTHROPIC_API_KEY", apiKey);
    const body: Record<string, unknown> = {
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
    };
    if (temperature !== undefined) body.temperature = temperature;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
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
    const { prompt, contents, apiKey, modelName, maxTokens, temperature } = options;
    const key = this.resolveApiKey("ANTHROPIC_API_KEY", apiKey);
    const body: Record<string, unknown> = {
      model: modelName || "claude-sonnet-4-20250514",
      max_tokens: maxTokens || 4096,
      stream: true,
      system: prompt,
      messages: contents.map((c) => {
        const hasImages = c.parts.some((p) => p.inlineData);
        if (hasImages) {
          return {
            role: c.role === "model" ? "assistant" : c.role,
            content: c.parts.map((p) => {
              if (p.text) return { type: "text", text: p.text };
              if (p.inlineData) {
                return { type: "image", source: { type: "base64", media_type: p.inlineData.mimeType, data: p.inlineData.data } };
              }
              return null;
            }).filter((x) => x !== null),
          };
        }
        return {
          role: c.role === "model" ? "assistant" : c.role,
          content: c.parts[0]?.text ?? "",
        };
      }),
    };
    if (temperature !== undefined) body.temperature = temperature;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
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

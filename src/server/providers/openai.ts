import { DEFAULT_MAX_TOKENS, PROVIDER_DEFAULT_MODELS, PROVIDER_BASE_URLS } from "../../utils/constants.js";
import { estimateTokens } from "../costTracker.js";
import { AIProvider } from "./types.js";
import type { AIGenerateOptions, AIResponse, StreamCallbacks } from "./types.js";

export function buildOpenAICompatibleBody(options: AIGenerateOptions, providerName: string): Record<string, unknown> {
  const { prompt, contents, modelName, temperature, maxTokens, tools, toolMessages } = options;
  const defaultModel = PROVIDER_DEFAULT_MODELS[providerName as keyof typeof PROVIDER_DEFAULT_MODELS] ?? "local-model";
  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: prompt },
    ...contents.map((c) => {
      if (c._isToolResult) {
        return {
          role: "tool",
          tool_call_id: c._toolCallId || "",
          content: c.parts[0]?.text ?? "",
        };
      }
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
      if (c.role === "assistant" && c._toolCalls && c._toolCalls.length > 0) {
        return {
          role: "assistant",
          content: c.parts[0]?.text || null,
          tool_calls: c._toolCalls,
        };
      }
      return {
        role: c.role === "model" ? "assistant" : c.role,
        content: c.parts[0]?.text ?? "",
      };
    }),
  ];
  if (toolMessages && toolMessages.length > 0) {
    messages.push(...toolMessages.map((tm) => ({
      role: tm.role,
      tool_call_id: tm.tool_call_id,
      content: tm.content,
    })));
  }
  const body: Record<string, unknown> = {
    model: modelName || defaultModel,
    messages,
  };
  if (temperature !== undefined) body.temperature = temperature;
  body.max_tokens = maxTokens ?? DEFAULT_MAX_TOKENS;
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }
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
      tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
    };
    delta?: {
      content?: string | OpenAIMessageContentPart[];
      reasoning_content?: string | OpenAIMessageContentPart[];
      reasoning?: string | OpenAIMessageContentPart[];
      tool_calls?: Array<{ index?: number; id?: string; type?: string; function?: { name?: string; arguments?: string } }>;
    };
    finish_reason?: string | null;
    index?: number;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
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

export function extractOpenAIText(value: string | OpenAIMessageContentPart[] | undefined): string {
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

export class OpenAICompatibleProvider extends AIProvider {
  constructor(private provider: string) {
    super();
  }

  async generate(options: AIGenerateOptions): Promise<AIResponse> {
    const { prompt, contents, localUrl, apiKey, modelName, temperature, maxTokens, tools, toolMessages } = options;
    const urlError = validateLocalUrl(localUrl, this.provider);
    if (urlError) throw new Error(urlError);

    if ((this.provider === "openai" || this.provider === "groq") && modelName?.toLowerCase().includes("claude")) {
      throw new Error(`Model "${modelName}" is an Anthropic Claude model, but provider is ${this.provider}. To use Claude models, select provider "anthropic" instead.`);
    }

    const baseUrl = localUrl || PROVIDER_BASE_URLS[this.provider] || "";
    const key = this.resolveApiKey(getEnvVarForProvider(this.provider), apiKey);

    const body = buildOpenAICompatibleBody({ prompt, contents, modelName, temperature, maxTokens, tools, toolMessages }, this.provider);

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
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
    const finishReason = choice?.finish_reason ?? undefined;
    const rawToolCalls = (msg as Record<string, unknown> | undefined)?.["tool_calls"] as Array<{ id: string; type: string; function: { name: string; arguments: string } }> | undefined;
    const toolCalls = rawToolCalls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>,
    }));
    return { text, reasoning, inputTokens, outputTokens, toolCalls, finishReason };
  }

  async generateStream(options: AIGenerateOptions, callbacks: StreamCallbacks): Promise<AIResponse> {
    const { prompt, contents, localUrl, apiKey, modelName, temperature, maxTokens, tools, toolMessages } = options;
    const urlError = validateLocalUrl(localUrl, this.provider);
    if (urlError) throw new Error(urlError);

    if ((this.provider === "openai" || this.provider === "groq") && modelName?.toLowerCase().includes("claude")) {
      throw new Error(`Model "${modelName}" is an Anthropic Claude model, but provider is ${this.provider}.`);
    }

    const baseUrl = localUrl || PROVIDER_BASE_URLS[this.provider] || "";
    const key = this.resolveApiKey(getEnvVarForProvider(this.provider), apiKey);
    const body = buildOpenAICompatibleBody({ prompt, contents, modelName, temperature, maxTokens, tools, toolMessages }, this.provider);
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
    const toolCallAccum: Map<number, { id: string; name: string; args: string }> = new Map();
    let finishReason: string | undefined;
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
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              let entry = toolCallAccum.get(idx);
              if (!entry) {
                entry = { id: "", name: "", args: "" };
                toolCallAccum.set(idx, entry);
              }
              if (tc.id) entry.id = tc.id;
              if (tc.function?.name) entry.name = tc.function.name;
              if (tc.function?.arguments) entry.args += tc.function.arguments;
            }
          }
          if (chunk.choices?.[0]?.finish_reason) {
            finishReason = chunk.choices[0].finish_reason || undefined;
          }
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

    const toolCallArray = Array.from(toolCallAccum.values())
      .filter((tc) => tc.name)
      .map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: JSON.parse(tc.args || "{}") as Record<string, unknown>,
      }));
    return {
      text: fullText,
      reasoning: fullReasoning || undefined,
      inputTokens: estimateTokens(prompt),
      outputTokens: estimateTokens(fullText + fullReasoning),
      toolCalls: toolCallArray.length > 0 ? toolCallArray : undefined,
      finishReason,
    };
  }
}

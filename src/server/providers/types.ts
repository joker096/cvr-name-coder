import type { OpenAITool } from "../../types/tools.js";

export interface AIResponse {
  text: string;
  reasoning?: string | undefined;
  inputTokens: number;
  outputTokens: number;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }> | undefined;
  finishReason?: string | undefined;
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
  _toolCalls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  _toolCallId?: string;
  _isToolResult?: boolean;
}

export interface AIGenerateOptions {
  prompt: string;
  contents: Content[];
  modelName?: string | undefined;
  apiKey?: string | undefined;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  tools?: OpenAITool[] | undefined;
  toolMessages?: Array<{ role: string; tool_call_id: string; content: string }> | undefined;
  localUrl?: string | undefined;
  useCache?: boolean | undefined;
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

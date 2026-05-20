export interface AgentConfig {
  id: string;
  name: string;
  description: string | undefined;
  model: string;
  provider: string;
  temperature: number | undefined;
  maxTokens: number | undefined;
  tools: string[];
  systemPrompt: string;
  mode?: "primary" | "subagent";
}

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  model: string;
  provider: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  systemPrompt?: string;
  mode?: "primary" | "subagent";
}

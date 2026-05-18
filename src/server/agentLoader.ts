import * as fs from "fs";
import * as path from "path";
import type { AgentConfig } from "../types/agentConfig";

let cachedAgents: AgentConfig[] = [];
let agentsDir = ".cvr/agents";

export function setAgentsDir(dir: string): void {
  agentsDir = dir;
}

export function getAgentsDir(): string {
  return agentsDir;
}

export async function loadAgents(dir?: string): Promise<AgentConfig[]> {
  const targetDir = dir || agentsDir;
  const agents: AgentConfig[] = [];

  try {
    const files = await fs.promises.readdir(targetDir);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    for (const file of mdFiles) {
      const content = await fs.promises.readFile(path.join(targetDir, file), "utf-8");
      const agent = parseAgentMarkdown(content);
      if (agent) agents.push(agent);
    }
  } catch (e) {
    console.error("Failed to load agents:", e);
  }

  cachedAgents = agents;
  return agents;
}

export function getAgents(): AgentConfig[] {
  return cachedAgents;
}

export function getAgentById(id: string): AgentConfig | undefined {
  return cachedAgents.find((a) => a.id === id);
}

function parseAgentMarkdown(content: string): AgentConfig | null {
  // Parse YAML frontmatter
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = match[1]!;
  const body = match[2]!;

  // Simple YAML parsing (key: value)
  const config: Record<string, any> = {};
  for (const line of frontmatter.split("\n")) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length > 0) {
      const value = rest.join(":").trim();
      // Handle arrays: "tools: [a, b, c]"
      if (value.startsWith("[") && value.endsWith("]")) {
        config[key.trim()] = value.slice(1, -1).split(",").map((s) => s.trim());
      } else if (value === "true" || value === "false") {
        config[key.trim()] = value === "true";
      } else if (!isNaN(Number(value))) {
        config[key.trim()] = Number(value);
      } else {
        config[key.trim()] = value;
      }
    }
  }

  return {
    id: config.id || "unknown",
    name: config.name || config.id || "Unknown Agent",
    description: config.description,
    model: config.model || "gemini-2.5-pro",
    provider: config.provider || "gemini",
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    tools: config.tools,
    systemPrompt: body.trim(),
  };
}

import * as fs from "fs";
import * as path from "path";
import type { AgentConfig } from "../types/agentConfig";
import { log } from "./logger.js";

let cachedAgents: AgentConfig[] = [];
let agentsDir = ".cvr/agents";

/**
 * Sets the directory path from which agent markdown files are loaded.
 * @param dir - The directory path containing agent `.md` definition files
 */
/**
 * Sets the directory path for loading agent markdown files.
 * @param dir - Path to the agents directory
 */
export function setAgentsDir(dir: string): void {
  agentsDir = dir;
}

/**
 * Returns the current agents directory path.
 * @returns The agents directory path
 */
export function getAgentsDir(): string {
  return agentsDir;
}

/** Raw configuration parsed from agent markdown frontmatter before normalization. */
interface RawAgentConfig {
  id?: string;
  name?: string;
  description?: string;
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  systemPrompt?: string;
}

/**
 * Loads all agent configurations from markdown files in the agents directory.
 * Each `.md` file is parsed for YAML frontmatter and body content.
 * Results are cached and returned.
 * @param dir - Optional override for the agents directory (defaults to `agentsDir`)
 * @returns An array of parsed {@link AgentConfig} objects
 */
/**
 * Loads all agent configurations from markdown files in the agents directory.
 * Each `.md` file is parsed for YAML frontmatter and body content.
 * Results are cached and returned.
 * @param dir - Optional override directory path (defaults to current agentsDir)
 * @returns Array of parsed {@link AgentConfig} objects
 */
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
    log.error("Failed to load agents", e instanceof Error ? e : undefined);
  }

  cachedAgents = agents;
  return agents;
}

/**
 * Returns all cached agent configurations from the last `loadAgents()` call.
 * @returns Array of cached {@link AgentConfig} objects
 */
/**
 * Returns all cached agent configurations from the last `loadAgents()` call.
 * @returns Array of cached {@link AgentConfig} objects
 */
export function getAgents(): AgentConfig[] {
  return cachedAgents;
}

/**
 * Looks up a single agent by its ID from the cache.
 * @param id - The unique agent identifier
 * @returns The matching {@link AgentConfig} or `undefined` if not found
 */
/**
 * Looks up a single agent by its unique identifier from the cache.
 * @param id - The agent ID to find
 * @returns The matching {@link AgentConfig} or `undefined` if not found
 */
export function getAgentById(id: string): AgentConfig | undefined {
  return cachedAgents.find((a) => a.id === id);
}

/**
 * Parses a markdown document with YAML frontmatter into an {@link AgentConfig}.
 * Frontmatter keys include: id, name, description, model, provider, temperature,
 * maxTokens, and tools (JSON array).
 * @param content - Raw markdown content with `---`-delimited frontmatter
 * @returns A valid {@link AgentConfig} or `null` if parsing fails
 */
/**
 * Parses a markdown document with YAML frontmatter into an AgentConfig.
 * Frontmatter keys: id, name, description, model, provider, temperature, maxTokens, tools.
 * The body after frontmatter becomes the systemPrompt.
 * @param content - Raw markdown content with `---`-delimited frontmatter
 * @returns A valid {@link AgentConfig} or `null` if frontmatter is missing
 */
function parseAgentMarkdown(content: string): AgentConfig | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = match[1]!;
  const body = match[2]!;

  const config: RawAgentConfig = {};
  for (const line of frontmatter.split("\n")) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length > 0) {
      const value = rest.join(":").trim();
      const trimmedKey = key.trim();
      if (trimmedKey === "id" || trimmedKey === "name" || trimmedKey === "description" || trimmedKey === "model" || trimmedKey === "provider") {
        config[trimmedKey] = value;
      } else if (trimmedKey === "temperature" || trimmedKey === "maxTokens") {
        const num = Number(value);
        if (!isNaN(num)) {
          config[trimmedKey] = num;
        }
      } else if (trimmedKey === "tools") {
        if (value.startsWith("[") && value.endsWith("]")) {
          config.tools = value.slice(1, -1).split(",").map((s) => s.trim());
        }
      }
    }
  }

  return {
    id: config.id || "unknown",
    name: config.name || config.id || "Unknown Agent",
    description: config.description ?? undefined,
    model: config.model || "",
    provider: config.provider || "",
    temperature: config.temperature ?? undefined,
    maxTokens: config.maxTokens ?? undefined,
    tools: config.tools ?? [],
    systemPrompt: body.trim(),
  };
}

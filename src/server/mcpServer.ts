import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import type { Request, Response } from "express";
import { executeTool } from "./tools.js";
import { TOOL_DEFINITIONS } from "../types/tools.js";
import { loadCustomTools } from "./customToolLoader.js";
import type { CustomToolParameter } from "../types/customTool.js";
import { getAgents, getAgentById, loadAgents } from "./agentLoader.js";
import { readFile, readdir } from "fs/promises";
import * as path from "path";

const PROJECT_ROOT = process.cwd();

export interface McpConfig {
  enabled: boolean;
  transport: "stdio" | "http" | "sse";
  port?: number;
  basePath?: string;
}

export async function loadMcpConfig(): Promise<McpConfig> {
  try {
    const configPath = path.join(PROJECT_ROOT, ".cvr", "mcp.json");
    const data = await readFile(configPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { enabled: false, transport: "stdio" };
  }
}

function customParamsToSchema(params: CustomToolParameter[] | undefined) {
  if (!params || params.length === 0) {
    return { type: "object" as const, properties: {}, required: [] as string[] };
  }
  const properties: Record<string, { type: string; description: string; default?: unknown }> = {};
  const required: string[] = [];
  for (const p of params) {
    properties[p.name] = { type: p.type, description: p.description };
    if (p.default !== undefined) {
      const prop = properties[p.name];
      if (prop) prop.default = p.default;
    }
    if (p.required) {
      required.push(p.name);
    }
  }
  return { type: "object" as const, properties, required };
}

export async function createMcpServer() {
  const server = new Server(
    { name: "cvr-name-coder", version: "1.3.0" },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // --- Tools ---
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: any[] = TOOL_DEFINITIONS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.parameters,
    }));

    try {
      const customTools = await loadCustomTools();
      for (const ct of customTools) {
        tools.push({
          name: ct.id,
          description: ct.description || ct.name,
          inputSchema: customParamsToSchema(ct.parameters),
        });
      }
    } catch (e) {
      console.error("Failed to load custom tools for MCP:", e);
    }

    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await executeTool(
        { name, params: (args as Record<string, unknown>) || {} },
        "build",
        undefined,
        "mcp-session"
      );
      return {
        content: [
          {
            type: "text",
            text: result.success
              ? result.output
              : result.error || "Unknown error",
          },
        ],
        isError: !result.success,
      };
    } catch (err: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${err.message}`
      );
    }
  });

  // --- Resources ---
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      const entries = await readdir(PROJECT_ROOT, { withFileTypes: true });
      const resources = entries
        .filter(
          (e) =>
            !e.name.startsWith(".") &&
            !e.name.startsWith("node_modules") &&
            e.isFile()
        )
        .map((e) => ({
          uri: `file://${path.join(PROJECT_ROOT, e.name)}`,
          name: e.name,
          mimeType: "text/plain",
        }));
      return { resources };
    } catch (e: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list resources: ${e.message}`
      );
    }
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    if (!uri.startsWith("file://")) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Only file:// URIs are supported"
      );
    }
    const filePath = uri.slice(7);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(PROJECT_ROOT)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Path escapes project root"
      );
    }
    try {
      const content = await readFile(filePath, "utf-8");
      return {
        contents: [{ uri, mimeType: "text/plain", text: content }],
      };
    } catch (e: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read resource: ${e.message}`
      );
    }
  });

  // --- Prompts (Agents) ---
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    await loadAgents();
    const agents = getAgents();
    return {
      prompts: agents.map((a) => ({
        name: a.id,
        description: a.description || a.name,
        arguments: [
          { name: "task", description: "Task or goal for the agent", required: true },
        ],
      })),
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const agent = getAgentById(name);
    if (!agent) {
      throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
    }
    const task = String(args?.task || "");
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `${agent.systemPrompt}\n\nTask: ${task}`,
          },
        },
      ],
    };
  });

  return server;
}

export async function startMcpStdio(): Promise<void> {
  const server = await createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

const sseTransports = new Map<string, SSEServerTransport>();

export function mountMcpSseRoutes(app: any, basePath = "/mcp") {
  app.get(`${basePath}/sse`, async (_req: Request, res: Response) => {
    const server = await createMcpServer();
    const transport = new SSEServerTransport(`${basePath}/messages`, res);
    const sessionId = transport.sessionId;
    sseTransports.set(sessionId, transport);

    res.on("close", () => {
      sseTransports.delete(sessionId);
    });

    await server.connect(transport);
  });

  app.post(`${basePath}/messages`, async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = sessionId ? sseTransports.get(sessionId) : undefined;
    if (!transport) {
      res.status(503).json({ error: "SSE transport not initialized" });
      return;
    }
    await transport.handlePostMessage(req, res);
  });
}

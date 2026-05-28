import { describe, expect, it } from "vitest";

// Replicate the exact regex from extension.ts and agentLoop.ts
const ACTION_REGEX = /ACTION:\s*(\w+)/g;
const PARAMS_REGEX = /PARAMS:\s*(\{[\s\S]*?\})/g;
const MCP_CALL_REGEX = /```tool_call\n([\s\S]*?)```/g;

function parseBuiltinTools(text: string): { toolName: string | null; params: Record<string, unknown> } {
  let actionMatch;
  let toolName: string | null = null;
  let params: Record<string, unknown> = {};
  while ((actionMatch = ACTION_REGEX.exec(text)) !== null) {
    PARAMS_REGEX.lastIndex = ACTION_REGEX.lastIndex;
    const pMatch = PARAMS_REGEX.exec(text);
    toolName = actionMatch[1];
    try { params = pMatch?.[1] ? JSON.parse(pMatch[1]) : {}; } catch { params = {}; }
  }
  return { toolName, params };
}

function parseMCPTools(text: string): { server: string | null; tool: string | null; args: Record<string, unknown> } {
  let mcpMatch;
  let server: string | null = null;
  let tool: string | null = null;
  let args: Record<string, unknown> = {};
  while ((mcpMatch = MCP_CALL_REGEX.exec(text)) !== null) {
    try {
      const call = JSON.parse(mcpMatch[1]);
      if (call.server && call.tool) {
        server = call.server; tool = call.tool; args = call.arguments || {};
      }
    } catch {}
  }
  return { server, tool, args };
}

describe("toolCallParsing", () => {
  describe("ACTION: / PARAMS: format", () => {
    it("extracts tool name and params from AI response", () => {
      const text = 'ACTION: list_directory\nPARAMS: {"path":"src"}';
      const { toolName, params } = parseBuiltinTools(text);
      expect(toolName).toBe("list_directory");
      expect(params).toEqual({ path: "src" });
    });

    it("extracts the LAST tool call when multiple present", () => {
      const text = [
        'ACTION: list_directory',
        'PARAMS: {"path":"src"}',
        'Some thinking here...',
        'ACTION: read_file',
        'PARAMS: {"path":"src/index.ts"}',
      ].join("\n");
      const { toolName, params } = parseBuiltinTools(text);
      expect(toolName).toBe("read_file");
      expect(params).toEqual({ path: "src/index.ts" });
    });

    it("handles params without surrounding text", () => {
      const text = 'ACTION: execute_command\nPARAMS: {"command":"ls -la"}';
      const { toolName, params } = parseBuiltinTools(text);
      expect(toolName).toBe("execute_command");
      expect(params).toEqual({ command: "ls -la" });
    });

    it("handles malformed JSON gracefully", () => {
      const text = 'ACTION: read_file\nPARAMS: {broken json';
      const { toolName, params } = parseBuiltinTools(text);
      expect(toolName).toBe("read_file");
      expect(params).toEqual({});
    });

    it("handles no PARAMS block", () => {
      const text = "ACTION: skill_list";
      const { toolName, params } = parseBuiltinTools(text);
      expect(toolName).toBe("skill_list");
      expect(params).toEqual({});
    });

    it("handles COMPLETE marker", () => {
      const text = "COMPLETE: task finished";
      const { toolName } = parseBuiltinTools(text);
      expect(toolName).toBeNull();
    });

    it("handles plain text with no tool calls", () => {
      const text = "I have analyzed the code and here is my response.";
      const { toolName } = parseBuiltinTools(text);
      expect(toolName).toBeNull();
    });

    it("extracts tool from response with surrounding reasoning", () => {
      const text = [
        "I need to first explore the project structure.",
        "ACTION: list_directory",
        'PARAMS: {"path":"."}',
        "This will help me understand what files exist.",
      ].join("\n");
      const { toolName, params } = parseBuiltinTools(text);
      expect(toolName).toBe("list_directory");
      expect(params).toEqual({ path: "." });
    });

    it("extracts tool when ACTION appears in backticks (code block)", () => {
      const text = [
        "Let me check what's in the components folder:",
        "```",
        "ACTION: list_directory",
        'PARAMS: {"path":"src/components"}',
        "```",
      ].join("\n");
      const { toolName, params } = parseBuiltinTools(text);
      expect(toolName).toBe("list_directory");
      expect(params).toEqual({ path: "src/components" });
    });

    it("does not treat multi-word after ACTION as tool call", () => {
      const text = "The action plan is to refactor the code.";
      const { toolName } = parseBuiltinTools(text);
      expect(toolName).toBeNull();
    });

    it("handles params with deeply nested JSON", () => {
      const text = 'ACTION: edit_file\nPARAMS: {"path":"test.ts","oldString":"const x = 1;\\n","newString":"const x = 2;\\n"}';
      const { toolName, params } = parseBuiltinTools(text);
      expect(toolName).toBe("edit_file");
      expect(params).toHaveProperty("path", "test.ts");
      expect(params).toHaveProperty("oldString");
      expect(params).toHaveProperty("newString");
    });
  });

  describe("MCP tool call format (```tool_call```)", () => {
    it("extracts MCP tool call from response", () => {
      const text = 'Some text\n```tool_call\n{"server":"playwright","tool":"navigate","arguments":{"url":"https://example.com"}}\n```\nMore text';
      const { server, tool, args } = parseMCPTools(text);
      expect(server).toBe("playwright");
      expect(tool).toBe("navigate");
      expect(args).toEqual({ url: "https://example.com" });
    });

    it("extracts the LAST MCP call when multiple present", () => {
      const text = [
        '```tool_call',
        '{"server":"playwright","tool":"navigate","arguments":{"url":"https://example.com"}}',
        '```',
        '```tool_call',
        '{"server":"playwright","tool":"click","arguments":{"selector":".btn"}}',
        '```',
      ].join("\n");
      const { server, tool, args } = parseMCPTools(text);
      expect(server).toBe("playwright");
      expect(tool).toBe("click");
      expect(args).toEqual({ selector: ".btn" });
    });
  });

  describe("Combined parsing (built-in + MCP)", () => {
    it("prefers built-in tools when both present in same response", () => {
      const text = [
        'ACTION: read_file',
        'PARAMS: {"path":"config.json"}',
        '```tool_call',
        '{"server":"playwright","tool":"screenshot","arguments":{}}',
        '```',
      ].join("\n");
      const { toolName } = parseBuiltinTools(text);
      const { tool } = parseMCPTools(text);
      expect(toolName).toBe("read_file");
      expect(tool).toBe("screenshot");
    });
  });
});

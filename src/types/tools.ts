export type ToolName =
  | "read_file"
  | "list_directory"
  | "search_files"
  | "write_file"
  | "edit_file"
  | "execute_command"
  | "memory_read"
  | "memory_write"
  | "skill_list"
  | "skill_read"
  | "skill_run"
  | "rag_search";

export interface ToolCall {
  name: ToolName;
  params: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  changeId?: string;
}

export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  isReadOnly: boolean;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "read_file",
    description: "Read the contents of a file at the given path.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the file" },
      },
      required: ["path"],
    },
    isReadOnly: true,
  },
  {
    name: "list_directory",
    description: "List files and directories at the given path.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the directory" },
      },
      required: ["path"],
    },
    isReadOnly: true,
  },
  {
    name: "search_files",
    description: "Search for files by name or content using a query.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string" },
        path: { type: "string", description: "Optional relative path to limit search" },
      },
      required: ["query"],
    },
    isReadOnly: true,
  },
  {
    name: "write_file",
    description: "Write or overwrite a file with the given content.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the file" },
        content: { type: "string", description: "Full file content" },
      },
      required: ["path", "content"],
    },
    isReadOnly: false,
  },
  {
    name: "edit_file",
    description: "Edit a file by replacing an exact string with another.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the file" },
        oldString: { type: "string", description: "Exact text to replace" },
        newString: { type: "string", description: "Replacement text" },
      },
      required: ["path", "oldString", "newString"],
    },
    isReadOnly: false,
  },
  {
    name: "execute_command",
    description: "Execute a shell command in the project directory.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        cwd: { type: "string", description: "Optional working directory relative to project root" },
      },
      required: ["command"],
    },
    isReadOnly: false,
  },
  {
    name: "memory_read",
    description: "Read persistent memory (project facts or user preferences).",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "'project' for MEMORY.md or 'user' for USER.md" },
      },
      required: ["type"],
    },
    isReadOnly: true,
  },
  {
    name: "memory_write",
    description: "Write a fact to persistent memory. Use this to remember important discoveries, patterns, or user preferences across sessions.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "'project' for MEMORY.md or 'user' for USER.md" },
        content: { type: "string", description: "The fact or preference to remember" },
        section: { type: "string", description: "Optional section title (e.g., 'Project Facts', 'Code Patterns')" },
      },
      required: ["type", "content"],
    },
    isReadOnly: false,
  },
  {
    name: "skill_list",
    description: "List all available skills (reusable workflows) in the project.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    isReadOnly: true,
  },
  {
    name: "skill_read",
    description: "Read the full content of a skill by its ID.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Skill ID" },
      },
      required: ["id"],
    },
    isReadOnly: true,
  },
  {
    name: "skill_run",
    description: "Run a skill workflow by its ID. Returns the skill instructions to follow.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Skill ID" },
      },
      required: ["id"],
    },
    isReadOnly: true,
  },
  {
    name: "rag_search",
    description: "Search the RAG memory for relevant context chunks matching a query.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        topK: { type: "number", description: "Number of results (default 3)" },
      },
      required: ["query"],
    },
    isReadOnly: true,
  },
];

export const READ_ONLY_TOOLS = new Set(
  TOOL_DEFINITIONS.filter((t) => t.isReadOnly).map((t) => t.name)
);

export const ALL_TOOL_NAMES = TOOL_DEFINITIONS.map((t) => t.name);

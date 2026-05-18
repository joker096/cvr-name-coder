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
  | "rag_search"
  | "git_status"
  | "git_diff"
  | "git_commit"
  | "git_push"
  | "git_log"
  | "browser_navigate"
  | "browser_click"
  | "browser_type"
  | "browser_screenshot"
  | "browser_evaluate"
  | "browser_get_html"
  | "browser_close";

export interface ToolCall {
  name: ToolName;
  params: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  changeId?: string;
  base64?: string;
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
  {
    name: "git_status",
    description: "Get the current git status of the repository.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    isReadOnly: true,
  },
  {
    name: "git_diff",
    description: "Get the git diff for staged or unstaged changes.",
    parameters: {
      type: "object",
      properties: {
        staged: { type: "boolean", description: "Show diff for staged changes only" },
      },
      required: [],
    },
    isReadOnly: true,
  },
  {
    name: "git_commit",
    description: "Commit staged changes with a message.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "Commit message" },
      },
      required: ["message"],
    },
    isReadOnly: false,
  },
  {
    name: "git_push",
    description: "Push the current branch to the remote.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    isReadOnly: false,
  },
  {
    name: "git_log",
    description: "Get recent git commit history.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of commits to return (default 10)" },
      },
      required: [],
    },
    isReadOnly: true,
  },
  {
    name: "browser_navigate",
    description: "Navigate the browser to a URL.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
        headless: { type: "boolean", description: "Run in headless mode (default true)" },
      },
      required: ["url"],
    },
    isReadOnly: false,
  },
  {
    name: "browser_click",
    description: "Click an element on the page by CSS selector.",
    parameters: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector of the element to click" },
        headless: { type: "boolean", description: "Run in headless mode (default true)" },
      },
      required: ["selector"],
    },
    isReadOnly: false,
  },
  {
    name: "browser_type",
    description: "Type text into an input element by CSS selector.",
    parameters: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector of the input element" },
        text: { type: "string", description: "Text to type" },
        headless: { type: "boolean", description: "Run in headless mode (default true)" },
      },
      required: ["selector", "text"],
    },
    isReadOnly: false,
  },
  {
    name: "browser_screenshot",
    description: "Take a screenshot of the current page and return it as base64 PNG.",
    parameters: {
      type: "object",
      properties: {
        headless: { type: "boolean", description: "Run in headless mode (default true)" },
      },
      required: [],
    },
    isReadOnly: true,
  },
  {
    name: "browser_evaluate",
    description: "Execute JavaScript in the browser page context.",
    parameters: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript code to execute" },
        headless: { type: "boolean", description: "Run in headless mode (default true)" },
      },
      required: ["script"],
    },
    isReadOnly: false,
  },
  {
    name: "browser_get_html",
    description: "Get the full HTML of the current page.",
    parameters: {
      type: "object",
      properties: {
        headless: { type: "boolean", description: "Run in headless mode (default true)" },
      },
      required: [],
    },
    isReadOnly: true,
  },
  {
    name: "browser_close",
    description: "Close the browser for this session.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    isReadOnly: false,
  },
];

export const READ_ONLY_TOOLS = new Set(
  TOOL_DEFINITIONS.filter((t) => t.isReadOnly).map((t) => t.name)
);

export const ALL_TOOL_NAMES = TOOL_DEFINITIONS.map((t) => t.name);

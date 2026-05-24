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
  | "browser_close"
  | "git_branch"
  | "git_branches"
  | "git_switch_branch"
  | "git_pr_context"
  | "git_create_pr"
  | "git_list_prs"
  | "issue_create"
  | "issue_list"
  | "issue_view"
  | "issue_comment"
  | "design_list"
  | "design_apply"
  | "design_preview";

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
  {
    name: "git_branch",
    description: "Create a new git branch and switch to it.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Branch name" },
      },
      required: ["name"],
    },
    isReadOnly: false,
  },
  {
    name: "git_branches",
    description: "List all branches (local and remote).",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    isReadOnly: true,
  },
  {
    name: "git_switch_branch",
    description: "Switch to an existing branch.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Branch name to switch to" },
      },
      required: ["name"],
    },
    isReadOnly: false,
  },
  {
    name: "git_pr_context",
    description: "Gather PR context (diff, commits, files) for the current branch.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    isReadOnly: true,
  },
  {
    name: "git_create_pr",
    description: "Create a GitHub pull request with AI-generated title and description. Requires `gh` CLI installed and authenticated.",
    parameters: {
      type: "object",
      properties: {
        draft: { type: "boolean", description: "Create as draft PR (default false)" },
      },
      required: [],
    },
    isReadOnly: false,
  },
  {
    name: "git_list_prs",
    description: "List open pull requests.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    isReadOnly: true,
  },
  {
    name: "issue_create",
    description: "Create an issue in the configured tracker (GitHub/Jira/Linear). Requires tracker config set via Settings → Integrations.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Issue title" },
        description: { type: "string", description: "Issue description (markdown)" },
        priority: { type: "string", description: "Issue priority: low, medium, high, or urgent" },
        labels: { type: "array", description: "Labels to apply" },
      },
      required: ["title"],
    },
    isReadOnly: false,
  },
  {
    name: "issue_list",
    description: "List issues from the configured tracker.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status (e.g. 'open', 'In Progress')" },
        limit: { type: "number", description: "Max issues to return (default 20)" },
      },
      required: [],
    },
    isReadOnly: true,
  },
  {
    name: "issue_view",
    description: "View details of a specific issue by key or number.",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "Issue key (e.g. '#42', 'PROJ-123', 'TEAM-456')" },
      },
      required: ["key"],
    },
    isReadOnly: true,
  },
  {
    name: "issue_comment",
    description: "Add a comment to an issue.",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "Issue key or number" },
        body: { type: "string", description: "Comment text (markdown)" },
      },
      required: ["key", "body"],
    },
    isReadOnly: false,
  },
  {
    name: "design_list",
    description: "List all available design systems from .cvr/design-systems/. Returns id, name, category, and description for each.",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "Optional filter by category (e.g. 'Fintech', 'Developer Tools', 'Consumer')" },
      },
      required: [],
    },
    isReadOnly: true,
  },
  {
    name: "design_apply",
    description: "Apply a design system to the current project. Returns the full DESIGN.md content (colors, typography, components, layout rules) that the AI should follow. The active design system is remembered in .cvr/design-active.json.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Design system ID (e.g. 'stripe', 'linear', 'apple', 'vercel', 'default')" },
      },
      required: ["id"],
    },
    isReadOnly: true,
  },
  {
    name: "design_preview",
    description: "Preview a design system's visual signature: colors, typography sample, and component examples. Useful for comparing design systems before applying one.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Design system ID to preview" },
      },
      required: ["id"],
    },
    isReadOnly: true,
  },
];

export const READ_ONLY_TOOLS = new Set(
  TOOL_DEFINITIONS.filter((t) => t.isReadOnly).map((t) => t.name)
);

export const ALL_TOOL_NAMES = TOOL_DEFINITIONS.map((t) => t.name);

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required: string[];
    };
  };
}

export interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export function toOpenAITools(definitions?: ToolDefinition[]): OpenAITool[] {
  const defs = definitions ?? TOOL_DEFINITIONS;
  return defs.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: "object" as const,
        properties: Object.fromEntries(
          Object.entries(t.parameters.properties).map(([key, val]) => [
            key,
            { type: val.type, description: val.description },
          ])
        ),
        required: t.parameters.required,
      },
    },
  }));
}

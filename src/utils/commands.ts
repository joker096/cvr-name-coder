export type SlashCommand =
  | "/analyze"
  | "/fix"
  | "/optimize"
  | "/audit"
  | "/explain"
  | "/refactor"
  | "/review"
  | "/undo"
  | "/redo"
  | "/goal";

export interface CommandDefinition {
  command: SlashCommand;
  label: string;
  description: string;
  agent: string;
  mode: "plan" | "build" | "review";
  prompt: string;
}

const CRITICAL_RULE = `Use the real tools provided via function calling. Verify file paths before referencing them.

- Respond in plain text only
- If you need to use a tool, describe what you need in plain text
- The system will handle tool execution

If you need to list directories, read files, or perform any action, state what you need. The system will handle the tool calls.`;

export const COMMANDS: Record<SlashCommand, CommandDefinition> = {
  "/analyze": {
    command: "/analyze",
    label: "Analyze Project",
    description: "Deep project structure analysis",
    agent: "scout",
    mode: "plan",
    prompt: `You are in ANALYZE mode. Perform a deep analysis of THIS project structure.
${CRITICAL_RULE}

1. List directory structure and identify the tech stack
2. Find entry points and core modules
3. Map dependencies between components
4. Detect potential code smells or anti-patterns
5. Provide a summary with actionable insights`,
  },
  "/fix": {
    command: "/fix",
    label: "Fix Code Errors",
    description: "Scan and repair code anomalies",
    agent: "build",
    mode: "build",
    prompt: `You are in FIX mode. Scan THIS codebase for errors and anomalies.
${CRITICAL_RULE}

Workflow:
1. Use list_directory to see project structure
2. Use read_file to inspect specific files
3. Identify syntax errors, type errors, missing imports, broken references
4. Fix issues using edit_file or write_file
5. Provide a summary of found and fixed issues`,
  },
  "/optimize": {
    command: "/optimize",
    label: "Optimize Complexity",
    description: "Code complexity optimization",
    agent: "build",
    mode: "build",
    prompt: `You are in OPTIMIZE mode. Analyze and optimize code in THIS project.
${CRITICAL_RULE}

1. Identify performance bottlenecks and inefficient algorithms
2. Suggest complexity reductions (time/space)
3. Refactor hot paths for better performance
4. Remove redundant computations and dead code
5. Provide before/after complexity analysis (Big O)`,
  },
  "/audit": {
    command: "/audit",
    label: "Audit Agent Harness",
    description: "Security and best practices audit",
    agent: "scout",
    mode: "plan",
    prompt: `You are in AUDIT mode. Perform a security audit of THIS codebase.
${CRITICAL_RULE}

1. Check for security vulnerabilities (XSS, injection, unsafe eval)
2. Review authentication and authorization patterns
3. Identify hardcoded secrets or API keys
4. Check for proper error handling and logging
5. Validate input sanitization and output encoding
6. Provide a risk assessment with severity ratings`,
  },
  "/explain": {
    command: "/explain",
    label: "Explain Logic",
    description: "Decode logic and architecture",
    agent: "explore",
    mode: "plan",
    prompt: `You are in EXPLAIN mode. Explain the logic and architecture of THIS codebase.
${CRITICAL_RULE}

1. Break down the overall system architecture
2. Explain how data flows through the application
3. Clarify complex algorithms or business logic
4. Document key design decisions and trade-offs
5. Make it clear and educational`,
  },
  "/refactor": {
    command: "/refactor",
    label: "Refactor Entry",
    description: "Optimize and clean code",
    agent: "build",
    mode: "build",
    prompt: `You are in REFACTOR mode. Clean up and refactor THIS codebase.
${CRITICAL_RULE}

1. Apply DRY, SOLID, and clean code principles
2. Extract reusable functions and components
3. Rename variables and functions for clarity
4. Simplify nested conditions and loops
5. Remove duplication and improve modularity
6. Provide the refactored code with explanations`,
  },
  "/review": {
    command: "/review",
    label: "Review Changes",
    description: "Review code changes and provide feedback",
    agent: "build",
    mode: "review",
    prompt: `REVIEW: Review the current code changes in THIS project and provide structured feedback. Use real git diff tools, never invent paths.
${CRITICAL_RULE}`,
  },
  "/undo": {
    command: "/undo",
    label: "Undo Change",
    description: "Revert the last file modification",
    agent: "build",
    mode: "build",
    prompt: `UNDO: Revert the most recent file change.
${CRITICAL_RULE}`,
  },
  "/redo": {
    command: "/redo",
    label: "Redo Change",
    description: "Re-apply the last undone file modification",
    agent: "build",
    mode: "build",
    prompt: `REDO: Re-apply the most recently undone file change.
${CRITICAL_RULE}`,
  },
  "/goal": {
    command: "/goal",
    label: "Autonomous Goal",
    description: "Start an autonomous goal loop with judge evaluation",
    agent: "hephaestus",
    mode: "build",
    prompt: `GOAL MODE: You are in autonomous goal mode. Work towards the stated goal systematically.
${CRITICAL_RULE}

1. Break down the goal into actionable steps
2. Use tools to explore and understand the codebase
3. Implement changes incrementally
4. Verify each step before proceeding
5. Provide progress updates`,
  },
};

export const COMMAND_LIST = Object.values(COMMANDS);

export function parseCommand(input: string): {
  command: SlashCommand | null;
  args: string;
} {
  const trimmed = input.trim();
  const match = trimmed.match(/^\/(\w+)(\s+.*)?$/);
  if (!match) return { command: null, args: trimmed };

  const cmd = `/${match[1]}` as SlashCommand;
  if (COMMANDS[cmd]) {
    return { command: cmd, args: (match[2] || "").trim() };
  }
  return { command: null, args: trimmed };
}

export function getCommandAgent(command: SlashCommand): string | undefined {
  return COMMANDS[command]?.agent;
}

export function getCommandMode(command: SlashCommand): "plan" | "build" | "review" | undefined {
  return COMMANDS[command]?.mode;
}

export function getCommandPrompt(command: SlashCommand, userArgs: string): string {
  const def = COMMANDS[command];
  if (!def) return userArgs;
  return `${def.prompt}\n\n${userArgs ? `Additional context: ${userArgs}` : ""}`;
}

export function parseGoalCommand(input: string): { goal: string; successCriteria?: string } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/goal ")) return null;
  const rest = trimmed.slice(6).trim();
  const parts = rest.split(" — ");
  if (parts.length >= 2) {
    return { goal: (parts[0] || "").trim(), successCriteria: parts.slice(1).join(" — ").trim() };
  }
  return { goal: rest };
}

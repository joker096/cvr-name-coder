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
  prompt: string;
}

export const COMMANDS: Record<SlashCommand, CommandDefinition> = {
  "/analyze": {
    command: "/analyze",
    label: "Analyze Project",
    description: "Deep project structure analysis",
    agent: "scout",
    prompt: `You are in ANALYZE mode. Perform a deep analysis of the project structure:
1. Identify the tech stack and architecture patterns
2. Find the entry points and core modules
3. Map dependencies and relationships between components
4. Detect potential code smells or anti-patterns
5. Provide a summary with actionable insights

Focus on understanding the codebase thoroughly.`,
  },
  "/fix": {
    command: "/fix",
    label: "Fix Code Errors",
    description: "Scan and repair code anomalies",
    agent: "build",
    prompt: `You are in FIX mode. Scan the codebase for errors and anomalies:
1. Identify syntax errors, type errors, and runtime issues
2. Find missing imports, undefined variables, and broken references
3. Suggest fixes with corrected code snippets
4. Prioritize critical bugs over warnings
5. Provide a summary of all found issues and fixes

Be thorough and provide actual corrected code.`,
  },
  "/optimize": {
    command: "/optimize",
    label: "Optimize Complexity",
    description: "Code complexity optimization",
    agent: "build",
    prompt: `You are in OPTIMIZE mode. Analyze and optimize code complexity:
1. Identify performance bottlenecks and inefficient algorithms
2. Suggest complexity reductions (time/space)
3. Refactor hot paths for better performance
4. Remove redundant computations and dead code
5. Provide before/after complexity analysis (Big O)

Focus on measurable performance improvements.`,
  },
  "/audit": {
    command: "/audit",
    label: "Audit Agent Harness",
    description: "Security and best practices audit",
    agent: "scout",
    prompt: `You are in AUDIT mode. Perform a comprehensive security and best practices audit:
1. Check for security vulnerabilities (XSS, injection, unsafe eval)
2. Review authentication and authorization patterns
3. Identify hardcoded secrets or API keys
4. Check for proper error handling and logging
5. Validate input sanitization and output encoding
6. Provide a risk assessment with severity ratings

Be strict and security-focused.`,
  },
  "/explain": {
    command: "/explain",
    label: "Explain Logic",
    description: "Decode logic and architecture",
    agent: "explore",
    prompt: `You are in EXPLAIN mode. Explain the logic and architecture:
1. Break down the overall system architecture
2. Explain how data flows through the application
3. Clarify complex algorithms or business logic
4. Document key design decisions and trade-offs
5. Provide diagrams or pseudocode where helpful

Make it clear and educational.`,
  },
  "/refactor": {
    command: "/refactor",
    label: "Refactor Entry",
    description: "Optimize and clean code",
    agent: "build",
    prompt: `You are in REFACTOR mode. Clean up and refactor the code:
1. Apply DRY, SOLID, and clean code principles
2. Extract reusable functions and components
3. Rename variables and functions for clarity
4. Simplify nested conditions and loops
5. Remove duplication and improve modularity
6. Provide the refactored code with explanations

Preserve functionality while improving quality.`,
  },
  "/review": {
    command: "/review",
    label: "Review Changes",
    description: "Review code changes and provide feedback",
    agent: "build",
    prompt: "REVIEW: Review the current code changes and provide structured feedback.",
  },
  "/undo": {
    command: "/undo",
    label: "Undo Change",
    description: "Revert the last file modification",
    agent: "build",
    prompt: "UNDO: Revert the most recent file change.",
  },
  "/redo": {
    command: "/redo",
    label: "Redo Change",
    description: "Re-apply the last undone file modification",
    agent: "build",
    prompt: "REDO: Re-apply the most recently undone file change.",
  },
  "/goal": {
    command: "/goal",
    label: "Autonomous Goal",
    description: "Start an autonomous goal loop with judge evaluation",
    agent: "hephaestus",
    prompt: "",
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

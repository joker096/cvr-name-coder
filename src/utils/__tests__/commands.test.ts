import { describe, it, expect } from "vitest";
import {
  parseCommand,
  getCommandAgent,
  getCommandMode,
  getCommandPrompt,
  parseGoalCommand,
  COMMANDS,
  COMMAND_LIST,
  type SlashCommand,
} from "../commands";

describe("parseCommand", () => {
  it("should return null for non-command input", () => {
    expect(parseCommand("hello world")).toEqual({ command: null, args: "hello world" });
  });

  it("should return null for empty input", () => {
    expect(parseCommand("")).toEqual({ command: null, args: "" });
  });

  it("should parse /analyze command", () => {
    expect(parseCommand("/analyze")).toEqual({ command: "/analyze", args: "" });
  });

  it("should parse /fix command", () => {
    expect(parseCommand("/fix")).toEqual({ command: "/fix", args: "" });
  });

  it("should parse /optimize command", () => {
    expect(parseCommand("/optimize")).toEqual({ command: "/optimize", args: "" });
  });

  it("should parse /audit command", () => {
    expect(parseCommand("/audit")).toEqual({ command: "/audit", args: "" });
  });

  it("should parse /explain command", () => {
    expect(parseCommand("/explain")).toEqual({ command: "/explain", args: "" });
  });

  it("should parse /refactor command", () => {
    expect(parseCommand("/refactor")).toEqual({ command: "/refactor", args: "" });
  });

  it("should parse /review command", () => {
    expect(parseCommand("/review")).toEqual({ command: "/review", args: "" });
  });

  it("should parse /undo command", () => {
    expect(parseCommand("/undo")).toEqual({ command: "/undo", args: "" });
  });

  it("should parse /redo command", () => {
    expect(parseCommand("/redo")).toEqual({ command: "/redo", args: "" });
  });

  it("should parse /goal command", () => {
    expect(parseCommand("/goal")).toEqual({ command: "/goal", args: "" });
  });

  it("should parse command with arguments", () => {
    expect(parseCommand("/audit my security")).toEqual({
      command: "/audit",
      args: "my security",
    });
  });

  it("should parse command with extra whitespace", () => {
    expect(parseCommand("  /analyze  extra  args  ")).toEqual({
      command: "/analyze",
      args: "extra  args",
    });
  });

  it("should return null for unknown slash command", () => {
    expect(parseCommand("/unknown")).toEqual({ command: null, args: "/unknown" });
  });

  it("should return null for text starting with slash but not a command", () => {
    expect(parseCommand("/path/to/file.ts")).toEqual({
      command: null,
      args: "/path/to/file.ts",
    });
  });

  it("should handle single slash without command", () => {
    expect(parseCommand("/")).toEqual({ command: null, args: "/" });
  });
});

describe("getCommandAgent", () => {
  it("should return scout for /analyze", () => {
    expect(getCommandAgent("/analyze")).toBe("scout");
  });

  it("should return build for /fix", () => {
    expect(getCommandAgent("/fix")).toBe("build");
  });

  it("should return build for /optimize", () => {
    expect(getCommandAgent("/optimize")).toBe("build");
  });

  it("should return scout for /audit", () => {
    expect(getCommandAgent("/audit")).toBe("scout");
  });

  it("should return explore for /explain", () => {
    expect(getCommandAgent("/explain")).toBe("explore");
  });

  it("should return build for /refactor", () => {
    expect(getCommandAgent("/refactor")).toBe("build");
  });

  it("should return build for /review", () => {
    expect(getCommandAgent("/review")).toBe("build");
  });

  it("should return build for /undo", () => {
    expect(getCommandAgent("/undo")).toBe("build");
  });

  it("should return build for /redo", () => {
    expect(getCommandAgent("/redo")).toBe("build");
  });

  it("should return hephaestus for /goal", () => {
    expect(getCommandAgent("/goal")).toBe("hephaestus");
  });

  it("should return undefined for unknown command", () => {
    expect(getCommandAgent("/unknown" as any)).toBeUndefined();
  });
});

describe("getCommandMode", () => {
  it("should return plan for /analyze", () => {
    expect(getCommandMode("/analyze")).toBe("plan");
  });

  it("should return build for /fix", () => {
    expect(getCommandMode("/fix")).toBe("build");
  });

  it("should return build for /optimize", () => {
    expect(getCommandMode("/optimize")).toBe("build");
  });

  it("should return plan for /audit", () => {
    expect(getCommandMode("/audit")).toBe("plan");
  });

  it("should return plan for /explain", () => {
    expect(getCommandMode("/explain")).toBe("plan");
  });

  it("should return build for /refactor", () => {
    expect(getCommandMode("/refactor")).toBe("build");
  });

  it("should return review for /review", () => {
    expect(getCommandMode("/review")).toBe("review");
  });

  it("should return build for /undo", () => {
    expect(getCommandMode("/undo")).toBe("build");
  });

  it("should return build for /redo", () => {
    expect(getCommandMode("/redo")).toBe("build");
  });

  it("should return build for /goal", () => {
    expect(getCommandMode("/goal")).toBe("build");
  });

  it("should return undefined for unknown command", () => {
    expect(getCommandMode("/unknown" as any)).toBeUndefined();
  });
});

describe("getCommandPrompt", () => {
  it("should include prompt prefix for /optimize", () => {
    const result = getCommandPrompt("/optimize", "");
    expect(result).toContain("OPTIMIZE mode");
    expect(result).toContain("performance bottlenecks");
  });

  it("should include user args in prompt", () => {
    const result = getCommandPrompt("/audit", "security scan");
    expect(result).toContain("AUDIT mode");
    expect(result).toContain("Additional context: security scan");
  });

  it("should return userArgs without prefix for unknown command", () => {
    const result = getCommandPrompt("/unknown" as any, "hello");
    expect(result).toBe("hello");
  });

  it("should not include additional context when args are empty", () => {
    const result = getCommandPrompt("/analyze", "");
    expect(result).not.toContain("Additional context");
    expect(result).toContain("ANALYZE mode");
  });

  it("should include full prompt for /fix", () => {
    const result = getCommandPrompt("/fix", "");
    expect(result).toContain("FIX mode");
    expect(result).toContain("syntax errors");
  });

  it("should include full prompt for /explain", () => {
    const result = getCommandPrompt("/explain", "");
    expect(result).toContain("EXPLAIN mode");
    expect(result).toContain("system architecture");
  });

  it("should include full prompt for /refactor", () => {
    const result = getCommandPrompt("/refactor", "");
    expect(result).toContain("REFACTOR mode");
    expect(result).toContain("DRY, SOLID");
  });

  it("should return review prompt for /review", () => {
    const result = getCommandPrompt("/review", "");
    expect(result).toContain("REVIEW");
    expect(result).toContain("structured feedback");
  });

  it("should return undo prompt for /undo", () => {
    const result = getCommandPrompt("/undo", "");
    expect(result).toContain("UNDO: Revert the most recent file change.");
  });

  it("should return redo prompt for /redo", () => {
    const result = getCommandPrompt("/redo", "");
    expect(result).toContain("REDO: Re-apply the most recently undone file change.");
  });

  it("should return goal prompt for /goal with empty args", () => {
    const result = getCommandPrompt("/goal", "");
    expect(result).toContain("GOAL MODE");
    expect(result).toContain("autonomous goal");
  });
});

describe("parseGoalCommand", () => {
  it("should return null for non-goal input", () => {
    expect(parseGoalCommand("hello")).toBeNull();
  });

  it("should return null for /goal without subcommand", () => {
    expect(parseGoalCommand("/goal")).toBeNull();
  });

  it("should parse goal without success criteria", () => {
    expect(parseGoalCommand("/goal build a todo app")).toEqual({
      goal: "build a todo app",
    });
  });

  it("should parse goal with success criteria using em-dash", () => {
    expect(parseGoalCommand("/goal build a todo app — should work")).toEqual({
      goal: "build a todo app",
      successCriteria: "should work",
    });
  });

  it("should parse goal with multiple success criteria parts", () => {
    expect(parseGoalCommand("/goal refactor code — faster — cleaner")).toEqual({
      goal: "refactor code",
      successCriteria: "faster — cleaner",
    });
  });

  it("should trim whitespace", () => {
    expect(parseGoalCommand("  /goal   fix bug   —   patch   ")).toEqual({
      goal: "fix bug",
      successCriteria: "patch",
    });
  });

  it("should return null for /goal without args", () => {
    expect(parseGoalCommand("/goal ")).toBeNull();
  });
});

describe("COMMANDS registry", () => {
  it("should have 10 commands", () => {
    expect(Object.keys(COMMANDS)).toHaveLength(10);
  });

  it("should have all expected commands", () => {
    const keys = Object.keys(COMMANDS);
    expect(keys).toContain("/analyze");
    expect(keys).toContain("/fix");
    expect(keys).toContain("/optimize");
    expect(keys).toContain("/audit");
    expect(keys).toContain("/explain");
    expect(keys).toContain("/refactor");
    expect(keys).toContain("/review");
    expect(keys).toContain("/undo");
    expect(keys).toContain("/redo");
    expect(keys).toContain("/goal");
  });

  it("should have label and description for all commands", () => {
    for (const cmd of Object.values(COMMANDS)) {
      expect(cmd.label).toBeTruthy();
      expect(cmd.description).toBeTruthy();
      expect(typeof cmd.agent).toBe("string");
      expect(typeof cmd.prompt).toBe("string");
    }
  });
});

describe("COMMAND_LIST", () => {
  it("should match COMMANDS values", () => {
    expect(COMMAND_LIST).toEqual(Object.values(COMMANDS));
  });

  it("should have 10 entries", () => {
    expect(COMMAND_LIST).toHaveLength(10);
  });
});

describe("CRITICAL_RULE compliance", () => {
  it("should include CRITICAL_RULE in all command prompts", () => {
    for (const [cmdName, cmd] of Object.entries(COMMANDS)) {
      expect(cmd.prompt).toContain("CRITICAL:");
      expect(cmd.prompt).toContain("NEVER invent file paths");
      expect(cmd.prompt).toContain("ABSOLUTELY FORBIDDEN");
    }
  });

  it("should have mode field for all commands", () => {
    for (const [cmdName, cmd] of Object.entries(COMMANDS)) {
      expect(cmd.mode).toBeDefined();
      expect(["plan", "build", "review"]).toContain(cmd.mode);
    }
  });

  it("should have valid mode for read-only commands", () => {
    // Commands that should be read-only (plan mode)
    const readOnlyCommands = ["/analyze", "/audit", "/explain"];
    for (const cmdName of readOnlyCommands) {
      expect(COMMANDS[cmdName as SlashCommand].mode).toBe("plan");
    }
  });

  it("should have valid mode for write commands", () => {
    // Commands that should allow writing (build mode)
    const writeCommands = ["/fix", "/optimize", "/refactor", "/undo", "/redo", "/goal"];
    for (const cmdName of writeCommands) {
      expect(COMMANDS[cmdName as SlashCommand].mode).toBe("build");
    }
  });

  it("should have review mode for review command", () => {
    expect(COMMANDS["/review"].mode).toBe("review");
  });
});

describe("Command and mode integration", () => {
  it("should map commands to correct agents", () => {
    const agentMappings: Record<string, string> = {
      "/analyze": "scout",
      "/audit": "scout",
      "/explain": "explore",
      "/fix": "build",
      "/optimize": "build",
      "/refactor": "build",
      "/review": "build",
      "/undo": "build",
      "/redo": "build",
      "/goal": "hephaestus",
    };

    for (const [cmd, expectedAgent] of Object.entries(agentMappings)) {
      expect(getCommandAgent(cmd as SlashCommand)).toBe(expectedAgent);
    }
  });

  it("should map commands to correct modes", () => {
    const modeMappings: Record<string, "plan" | "build" | "review"> = {
      "/analyze": "plan",
      "/audit": "plan",
      "/explain": "plan",
      "/fix": "build",
      "/optimize": "build",
      "/refactor": "build",
      "/review": "review",
      "/undo": "build",
      "/redo": "build",
      "/goal": "build",
    };

    for (const [cmd, expectedMode] of Object.entries(modeMappings)) {
      expect(getCommandMode(cmd as SlashCommand)).toBe(expectedMode);
    }
  });

  it("should have consistent agent and mode combinations", () => {
    // scout agent should always use plan mode
    expect(getCommandMode("/analyze")).toBe("plan");
    expect(getCommandAgent("/analyze")).toBe("scout");

    expect(getCommandMode("/audit")).toBe("plan");
    expect(getCommandAgent("/audit")).toBe("scout");

    // explore agent should always use plan mode
    expect(getCommandMode("/explain")).toBe("plan");
    expect(getCommandAgent("/explain")).toBe("explore");

    // build agent can use build or review mode
    expect(getCommandMode("/fix")).toBe("build");
    expect(getCommandAgent("/fix")).toBe("build");

    expect(getCommandMode("/review")).toBe("review");
    expect(getCommandAgent("/review")).toBe("build");
  });
});

describe("Enhanced CRITICAL_RULE enforcement", () => {
  it("should prevent all fake tool call syntax variants", () => {
    for (const [cmdName, cmd] of Object.entries(COMMANDS)) {
      expect(cmd.prompt).toContain("<invoke>");
      expect(cmd.prompt).toContain("<parameter>");
      expect(cmd.prompt).toContain("<tool_calls>");
      expect(cmd.prompt).toContain("<｜DSML｜invoke>");
      expect(cmd.prompt).toContain("<｜DSML｜parameter>");
      expect(cmd.prompt).toContain("<｜DSML｜tool_calls>");
    }
  });

  it("should include FUNCTION CALLING requirement", () => {
    for (const [cmdName, cmd] of Object.entries(COMMANDS)) {
      expect(cmd.prompt).toContain("FUNCTION CALLING");
      expect(cmd.prompt).toContain("function calling mechanism");
    }
  });

  it("should include clear REQUIRED section", () => {
    for (const [cmdName, cmd] of Object.entries(COMMANDS)) {
      expect(cmd.prompt).toContain("REQUIRED:");
      expect(cmd.prompt).toContain("system will call it for you");
      expect(cmd.prompt).toContain("system handles tool execution");
    }
  });
});

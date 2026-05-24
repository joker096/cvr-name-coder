import { describe, it, expect } from "vitest";
import {
  parseCommand,
  getCommandAgent,
  getCommandPrompt,
  parseGoalCommand,
  COMMANDS,
  COMMAND_LIST,
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

  it("should return empty prompt for /goal with empty args", () => {
    const result = getCommandPrompt("/goal", "");
    expect(result.trim()).toBe("");
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

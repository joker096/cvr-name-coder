import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  parseCommand,
  getCommandAgent,
  getCommandMode,
  getCommandPrompt,
} from "../commands";

describe("Command Integration Flow", () => {
  describe("Complete command processing flow", () => {
    it("should process /analyze command correctly", () => {
      const input = "/analyze";
      const parsed = parseCommand(input);

      expect(parsed.command).toBe("/analyze");
      expect(parsed.args).toBe("");

      const agent = getCommandAgent(parsed.command!);
      const mode = getCommandMode(parsed.command!);
      const prompt = getCommandPrompt(parsed.command!, parsed.args);

      expect(agent).toBe("scout");
      expect(mode).toBe("plan");
      expect(prompt).toContain("ANALYZE mode");
      expect(prompt).toContain("CRITICAL:");
    });

    it("should process /fix command with arguments correctly", () => {
      const input = "/fix src/utils/errors.ts";
      const parsed = parseCommand(input);

      expect(parsed.command).toBe("/fix");
      expect(parsed.args).toBe("src/utils/errors.ts");

      const agent = getCommandAgent(parsed.command!);
      const mode = getCommandMode(parsed.command!);
      const prompt = getCommandPrompt(parsed.command!, parsed.args);

      expect(agent).toBe("build");
      expect(mode).toBe("build");
      expect(prompt).toContain("FIX mode");
      expect(prompt).toContain("Additional context: src/utils/errors.ts");
    });

    it("should process /audit command correctly", () => {
      const input = "/audit security";
      const parsed = parseCommand(input);

      expect(parsed.command).toBe("/audit");
      expect(parsed.args).toBe("security");

      const agent = getCommandAgent(parsed.command!);
      const mode = getCommandMode(parsed.command!);
      const prompt = getCommandPrompt(parsed.command!, parsed.args);

      expect(agent).toBe("scout");
      expect(mode).toBe("plan");
      expect(prompt).toContain("AUDIT mode");
      expect(prompt).toContain("Additional context: security");
    });

    it("should process /review command correctly", () => {
      const input = "/review";
      const parsed = parseCommand(input);

      expect(parsed.command).toBe("/review");
      expect(parsed.args).toBe("");

      const agent = getCommandAgent(parsed.command!);
      const mode = getCommandMode(parsed.command!);
      const prompt = getCommandPrompt(parsed.command!, parsed.args);

      expect(agent).toBe("build");
      expect(mode).toBe("review");
      expect(prompt).toContain("REVIEW");
    });

    it("should handle non-command input correctly", () => {
      const input = "help me fix this bug";
      const parsed = parseCommand(input);

      expect(parsed.command).toBeNull();
      expect(parsed.args).toBe("help me fix this bug");

      const agent = getCommandAgent("/unknown" as any);
      const mode = getCommandMode("/unknown" as any);

      expect(agent).toBeUndefined();
      expect(mode).toBeUndefined();
    });
  });

  describe("Command priority over UI settings", () => {
    it("should use command agent even when UI has different agent", () => {
      const input = "/analyze";
      const parsed = parseCommand(input);
      const commandAgent = getCommandAgent(parsed.command!);
      const uiAgent = "custom";

      // Command agent should take priority
      const finalAgent = commandAgent || uiAgent;
      expect(finalAgent).toBe("scout");
      expect(finalAgent).not.toBe(uiAgent);
    });

    it("should use command mode even when UI has different mode", () => {
      const input = "/analyze";
      const parsed = parseCommand(input);
      const commandMode = getCommandMode(parsed.command!);
      const uiMode = "build";

      // Command mode should take priority
      const finalMode = commandMode || uiMode;
      expect(finalMode).toBe("plan");
      expect(finalMode).not.toBe(uiMode);
    });

    it("should fall back to UI settings when no command", () => {
      const input = "help me";
      const parsed = parseCommand(input);
      const commandAgent = getCommandAgent("/unknown" as any);
      const commandMode = getCommandMode("/unknown" as any);
      const uiAgent = "build";
      const uiMode = "build";

      // Should use UI settings when no command
      const finalAgent = commandAgent || uiAgent;
      const finalMode = commandMode || uiMode;

      expect(finalAgent).toBe(uiAgent);
      expect(finalMode).toBe(uiMode);
    });
  });

  describe("CRITICAL_RULE enforcement", () => {
    it("should include CRITICAL_RULE in all command prompts", () => {
      const commands = ["/analyze", "/fix", "/optimize", "/audit", "/explain", "/refactor", "/review", "/undo", "/redo", "/goal"];

      for (const cmd of commands) {
        const prompt = getCommandPrompt(cmd as any, "");
        expect(prompt).toContain("CRITICAL:");
        expect(prompt).toContain("NEVER invent file paths");
        expect(prompt).toContain("NEVER generate fake tool call");
      }
    });

    it("should prevent fake tool call generation in prompts", () => {
      const commands = ["/analyze", "/fix", "/optimize", "/audit", "/explain", "/refactor", "/review", "/undo", "/redo", "/goal"];

      for (const cmd of commands) {
        const prompt = getCommandPrompt(cmd as any, "");
        expect(prompt).toContain("<invoke>");
        expect(prompt).toContain("<parameter>");
        expect(prompt).toContain("<tool_calls>");
      }
    });
  });

  describe("Mode-specific tool access", () => {
    it("should restrict write operations in plan mode commands", () => {
      const planCommands = ["/analyze", "/audit", "/explain"];

      for (const cmd of planCommands) {
        const mode = getCommandMode(cmd as any);
        expect(mode).toBe("plan");
      }
    });

    it("should allow write operations in build mode commands", () => {
      const buildCommands = ["/fix", "/optimize", "/refactor", "/undo", "/redo", "/goal"];

      for (const cmd of buildCommands) {
        const mode = getCommandMode(cmd as any);
        expect(mode).toBe("build");
      }
    });

    it("should use review mode for review command", () => {
      const mode = getCommandMode("/review");
      expect(mode).toBe("review");
    });
  });

  describe("Agent-mode consistency", () => {
    it("should have consistent scout agent with plan mode", () => {
      const scoutCommands = ["/analyze", "/audit"];

      for (const cmd of scoutCommands) {
        const agent = getCommandAgent(cmd as any);
        const mode = getCommandMode(cmd as any);
        expect(agent).toBe("scout");
        expect(mode).toBe("plan");
      }
    });

    it("should have consistent explore agent with plan mode", () => {
      const agent = getCommandAgent("/explain");
      const mode = getCommandMode("/explain");
      expect(agent).toBe("explore");
      expect(mode).toBe("plan");
    });

    it("should have consistent build agent with build mode", () => {
      const buildCommands = ["/fix", "/optimize", "/refactor", "/undo", "/redo"];

      for (const cmd of buildCommands) {
        const agent = getCommandAgent(cmd as any);
        const mode = getCommandMode(cmd as any);
        expect(agent).toBe("build");
        expect(mode).toBe("build");
      }
    });

    it("should have hephaestus agent with build mode for goal", () => {
      const agent = getCommandAgent("/goal");
      const mode = getCommandMode("/goal");
      expect(agent).toBe("hephaestus");
      expect(mode).toBe("build");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseCommand, getCommandMode } from "../commands";

describe("Automatic Mode Switching", () => {
  describe("Command mode detection", () => {
    it("should detect plan mode for /analyze command", () => {
      const input = "/analyze";
      const { command } = parseCommand(input);
      const mode = getCommandMode(command!);

      expect(command).toBe("/analyze");
      expect(mode).toBe("plan");
    });

    it("should detect plan mode for /audit command", () => {
      const input = "/audit security check";
      const { command } = parseCommand(input);
      const mode = getCommandMode(command!);

      expect(command).toBe("/audit");
      expect(mode).toBe("plan");
    });

    it("should detect plan mode for /explain command", () => {
      const input = "/explain architecture";
      const { command } = parseCommand(input);
      const mode = getCommandMode(command!);

      expect(command).toBe("/explain");
      expect(mode).toBe("plan");
    });

    it("should detect build mode for /fix command", () => {
      const input = "/fix src/utils/errors.ts";
      const { command } = parseCommand(input);
      const mode = getCommandMode(command!);

      expect(command).toBe("/fix");
      expect(mode).toBe("build");
    });

    it("should detect build mode for /optimize command", () => {
      const input = "/optimize performance";
      const { command } = parseCommand(input);
      const mode = getCommandMode(command!);

      expect(command).toBe("/optimize");
      expect(mode).toBe("build");
    });

    it("should detect build mode for /refactor command", () => {
      const input = "/refactor code";
      const { command } = parseCommand(input);
      const mode = getCommandMode(command!);

      expect(command).toBe("/refactor");
      expect(mode).toBe("build");
    });

    it("should detect review mode for /review command", () => {
      const input = "/review";
      const { command } = parseCommand(input);
      const mode = getCommandMode(command!);

      expect(command).toBe("/review");
      expect(mode).toBe("review");
    });

    it("should detect build mode for /undo command", () => {
      const input = "/undo";
      const { command } = parseCommand(input);
      const mode = getCommandMode(command!);

      expect(command).toBe("/undo");
      expect(mode).toBe("build");
    });

    it("should detect build mode for /redo command", () => {
      const input = "/redo";
      const { command } = parseCommand(input);
      const mode = getCommandMode(command!);

      expect(command).toBe("/redo");
      expect(mode).toBe("build");
    });

    it("should detect build mode for /goal command", () => {
      const input = "/goal build feature";
      const { command } = parseCommand(input);
      const mode = getCommandMode(command!);

      expect(command).toBe("/goal");
      expect(mode).toBe("build");
    });
  });

  describe("Mode switching scenarios", () => {
    it("should switch from build to plan for /analyze", () => {
      const currentMode = "build";
      const input = "/analyze";
      const { command } = parseCommand(input);
      const commandMode = getCommandMode(command!);

      const shouldSwitch = commandMode && commandMode !== currentMode;
      const newMode = shouldSwitch ? commandMode : currentMode;

      expect(shouldSwitch).toBe(true);
      expect(newMode).toBe("plan");
    });

    it("should switch from plan to build for /fix", () => {
      const currentMode = "plan";
      const input = "/fix";
      const { command } = parseCommand(input);
      const commandMode = getCommandMode(command!);

      const shouldSwitch = commandMode && commandMode !== currentMode;
      const newMode = shouldSwitch ? commandMode : currentMode;

      expect(shouldSwitch).toBe(true);
      expect(newMode).toBe("build");
    });

    it("should switch from build to review for /review", () => {
      const currentMode = "build";
      const input = "/review";
      const { command } = parseCommand(input);
      const commandMode = getCommandMode(command!);

      const shouldSwitch = commandMode && commandMode !== currentMode;
      const newMode = shouldSwitch ? commandMode : currentMode;

      expect(shouldSwitch).toBe(true);
      expect(newMode).toBe("review");
    });

    it("should not switch when mode matches command", () => {
      const currentMode = "plan";
      const input = "/analyze";
      const { command } = parseCommand(input);
      const commandMode = getCommandMode(command!);

      const shouldSwitch = commandMode && commandMode !== currentMode;
      const newMode = shouldSwitch ? commandMode : currentMode;

      expect(shouldSwitch).toBe(false);
      expect(newMode).toBe("plan");
    });

    it("should not switch for non-command input", () => {
      const currentMode = "build";
      const input = "help me fix this bug";
      const { command } = parseCommand(input);

      const shouldSwitch = Boolean(command && getCommandMode(command!) !== currentMode);
      const newMode = shouldSwitch ? getCommandMode(command!)! : currentMode;

      expect(shouldSwitch).toBe(false);
      expect(newMode).toBe("build");
    });
  });

  describe("Mode switching logic", () => {
    it("should handle all plan mode commands", () => {
      const planCommands = ["/analyze", "/audit", "/explain"];
      const currentMode = "build";

      for (const cmd of planCommands) {
        const { command } = parseCommand(cmd);
        const commandMode = getCommandMode(command!);
        const shouldSwitch = commandMode && commandMode !== currentMode;

        expect(shouldSwitch).toBe(true);
        expect(commandMode).toBe("plan");
      }
    });

    it("should handle all build mode commands", () => {
      const buildCommands = ["/fix", "/optimize", "/refactor", "/undo", "/redo", "/goal"];
      const currentMode = "plan";

      for (const cmd of buildCommands) {
        const { command } = parseCommand(cmd);
        const commandMode = getCommandMode(command!);
        const shouldSwitch = commandMode && commandMode !== currentMode;

        expect(shouldSwitch).toBe(true);
        expect(commandMode).toBe("build");
      }
    });

    it("should handle review mode command", () => {
      const currentMode = "build";
      const input = "/review";
      const { command } = parseCommand(input);
      const commandMode = getCommandMode(command!);
      const shouldSwitch = commandMode && commandMode !== currentMode;

      expect(shouldSwitch).toBe(true);
      expect(commandMode).toBe("review");
    });
  });

  describe("Edge cases", () => {
    it("should handle command with extra whitespace", () => {
      const currentMode = "build";
      const input = "  /analyze  extra  args  ";
      const { command } = parseCommand(input);
      const commandMode = getCommandMode(command!);

      const shouldSwitch = commandMode && commandMode !== currentMode;
      const newMode = shouldSwitch ? commandMode : currentMode;

      expect(shouldSwitch).toBe(true);
      expect(newMode).toBe("plan");
    });

    it("should handle command with arguments", () => {
      const currentMode = "plan";
      const input = "/fix src/utils/errors.ts line 42";
      const { command } = parseCommand(input);
      const commandMode = getCommandMode(command!);

      const shouldSwitch = Boolean(commandMode && commandMode !== currentMode);
      const newMode = shouldSwitch ? commandMode : currentMode;

      expect(shouldSwitch).toBe(true);
      expect(newMode).toBe("build");
    });

    it("should handle unknown command", () => {
      const currentMode = "build";
      const input = "/unknown";
      const { command } = parseCommand(input);

      const shouldSwitch = Boolean(command && getCommandMode(command!) !== currentMode);
      const newMode = shouldSwitch ? getCommandMode(command!)! : currentMode;

      expect(shouldSwitch).toBe(false);
      expect(newMode).toBe("build");
    });

    it("should handle empty input", () => {
      const currentMode = "build";
      const input = "";
      const { command } = parseCommand(input);

      const shouldSwitch = Boolean(command && getCommandMode(command!) !== currentMode);
      const newMode = shouldSwitch ? getCommandMode(command!)! : currentMode;

      expect(shouldSwitch).toBe(false);
      expect(newMode).toBe("build");
    });
  });
});

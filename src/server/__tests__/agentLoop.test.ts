import { describe, expect, it, vi } from "vitest";
import { AgentLoop } from "../agentLoop";

describe("AgentLoop", () => {
  it("marks the loop as aborted instead of erroring when aborted before a step", async () => {
    const loop = new AgentLoop("test goal", {
      thinkFn: vi.fn(async () => "COMPLETE: done"),
    });

    loop.abort();
    const state = await loop.run();

    expect(state.status).toBe("aborted");
    expect(state.steps.some((step) => step.thought.includes("aborted"))).toBe(false);
  });

  it("preserves abort state after tool execution finishes", async () => {
    const loop = new AgentLoop("test goal", {
      thinkFn: vi.fn(async () => 'ACTION: read_file\nPARAMS: {"path":"README.md"}'),
      executeToolFn: vi.fn(async () => {
        loop.abort();
        return { success: true, output: "ok" };
      }),
    });

    const step = await loop.runSingleStep();

    expect(step.observation).toContain("[ABORTED]");
    expect(loop.getState().status).toBe("aborted");
  });

  it("should complete task in one step with COMPLETE marker", async () => {
    const loop = new AgentLoop("say hello", {
      thinkFn: vi.fn(async () => "COMPLETE: Task finished successfully"),
    });

    const state = await loop.run();

    expect(state.status).toBe("completed");
    expect(state.steps).toHaveLength(1);
    expect(state.steps[0].thought).toContain("COMPLETE");
    expect(state.steps[0].action).toBeUndefined();
  });

  it("should complete task in one step with DONE marker", async () => {
    const loop = new AgentLoop("analyze code", {
      thinkFn: vi.fn(async () => "DONE: analysis complete"),
    });

    const state = await loop.run();

    expect(state.status).toBe("completed");
    expect(state.steps).toHaveLength(1);
    expect(state.steps[0].thought).toBe("DONE: analysis complete");
    expect(state.steps[0].action).toBeUndefined();
  });

  it("should execute multi-step task: read then report", async () => {
    let callIndex = 0;
    const thinkFn = vi.fn(async () => {
      callIndex++;
      if (callIndex === 1) {
        return 'ACTION: read_file\nPARAMS: {"path":"src/app.ts"}';
      }
      return "COMPLETE: read file and analyzed";
    });

    const executeToolFn = vi.fn(async (toolCall) => {
      if (toolCall.name === "read_file") {
        return { success: true, output: "file contents here" };
      }
      return { success: false, output: "", error: "unknown tool" };
    });

    const loop = new AgentLoop("analyze app.ts", {
      thinkFn,
      executeToolFn,
    });

    const state = await loop.run();

    expect(state.status).toBe("completed");
    expect(state.steps).toHaveLength(2);
    expect(state.steps[0].action).toEqual({ tool: "read_file", params: { path: "src/app.ts" } });
    expect(state.steps[0].observation).toContain("file contents here");
    expect(state.steps[1].thought).toBe("COMPLETE: read file and analyzed");
    expect(executeToolFn).toHaveBeenCalledTimes(1);
  });

  it("should execute multi-step: write, then verify, then complete", async () => {
    let callIndex = 0;
    const thinkFn = vi.fn(async () => {
      callIndex++;
      if (callIndex === 1) {
        return 'ACTION: write_file\nPARAMS: {"path":"test.txt","content":"hello"}';
      }
      if (callIndex === 2) {
        return 'ACTION: read_file\nPARAMS: {"path":"test.txt"}';
      }
      return "COMPLETE: file written and verified";
    });

    const executeToolFn = vi.fn(async (toolCall) => {
      if (toolCall.name === "write_file") {
        return { success: true, output: "file written" };
      }
      if (toolCall.name === "read_file") {
        return { success: true, output: "hello" };
      }
      return { success: false, output: "", error: "unknown" };
    });

    const loop = new AgentLoop("create and verify file", {
      thinkFn,
      executeToolFn,
    });

    const state = await loop.run();

    expect(state.status).toBe("completed");
    expect(state.steps).toHaveLength(3);
    expect(executeToolFn).toHaveBeenCalledTimes(2);
    expect(state.steps[0].action?.tool).toBe("write_file");
    expect(state.steps[1].action?.tool).toBe("read_file");
    expect(state.steps[2].action).toBeUndefined();
  });

  it("should stop at maxSteps and mark as error", async () => {
    const thinkFn = vi.fn(async () => 'ACTION: read_file\nPARAMS: {"path":"file.txt"}');
    const executeToolFn = vi.fn(async () => ({ success: true, output: "contents" }));

    const loop = new AgentLoop("infinite task", {
      thinkFn,
      executeToolFn,
      maxSteps: 3,
    });

    const state = await loop.run();

    expect(state.status).toBe("error");
    expect(state.currentStep).toBe(3);
    expect(state.steps).toHaveLength(3);
    expect(thinkFn).toHaveBeenCalledTimes(3);
  });

  it("should handle tool execution errors and continue", async () => {
    let callIndex = 0;
    const thinkFn = vi.fn(async () => {
      callIndex++;
      if (callIndex === 1) {
        return 'ACTION: read_file\nPARAMS: {"path":"missing.txt"}';
      }
      return "COMPLETE: tried to read file but recovered";
    });

    const executeToolFn = vi.fn(async () => {
      return { success: false, output: "", error: "file not found" };
    });

    const loop = new AgentLoop("read missing file", {
      thinkFn,
      executeToolFn,
    });

    const state = await loop.run();

    expect(state.status).toBe("completed");
    expect(state.steps).toHaveLength(2);
    expect(state.steps[0].observation).toContain("error");
  });

  it("should throw on thinkFn exception and set status to error", async () => {
    const loop = new AgentLoop("crash task", {
      thinkFn: vi.fn(async () => {
        throw new Error("AI provider timeout");
      }),
    });

    await expect(loop.run()).rejects.toThrow("AI provider timeout");
    expect(loop.getState().status).toBe("error");
  });

  it("should call onStatus callback for state transitions", async () => {
    const onStatus = vi.fn();
    const thinkFn = vi.fn(async () => "COMPLETE: done");
    const loop = new AgentLoop("status task", {
      thinkFn,
      onStatus,
    });

    await loop.run();

    expect(onStatus).toHaveBeenCalledWith("completed");
  });

  it("should call onStep callback for each step", async () => {
    const onStep = vi.fn();
    let callIndex = 0;
    const thinkFn = vi.fn(async () => {
      callIndex++;
      if (callIndex === 1) {
        return 'ACTION: read_file\nPARAMS: {"path":"f.txt"}';
      }
      return "COMPLETE: done";
    });
    const executeToolFn = vi.fn(async () => ({ success: true, output: "ok" }));
    const loop = new AgentLoop("step task", {
      thinkFn,
      executeToolFn,
      onStep,
    });

    await loop.run();

    expect(onStep).toHaveBeenCalledTimes(2);
  });

  it("should set additional context that appears in prompt", async () => {
    const thinkFn = vi.fn(async (prompt: string) => {
      if (prompt.includes("Additional context")) {
        return "COMPLETE: context was injected";
      }
      return 'ACTION: read_file\nPARAMS: {"path":"f.txt"}';
    });
    const executeToolFn = vi.fn(async () => ({ success: true, output: "ok" }));

    const loop = new AgentLoop("context task", {
      thinkFn,
      executeToolFn,
    });

    loop.setAdditionalContext("IMPORTANT: do not modify files");

    const state = await loop.run();

    expect(state.status).toBe("completed");
    const firstCallPrompt = thinkFn.mock.calls[0][0] as string;
    expect(firstCallPrompt).toContain("IMPORTANT: do not modify files");
  });

  it("should handle action with JSON params on multiple lines", async () => {
    const thinkFn = vi.fn(async () =>
      'ACTION: write_file\nPARAMS: {\n  "path": "test.ts",\n  "content": "export const x = 1;"\n}'
    );
    const executeToolFn = vi.fn(async () => ({ success: true, output: "written" }));

    const loop = new AgentLoop("write file", {
      thinkFn,
      executeToolFn,
      maxSteps: 1,
    });

    const state = await loop.run();

    expect(state.steps[0].action).toEqual({
      tool: "write_file",
      params: { path: "test.ts", content: "export const x = 1;" },
    });
  });

  it("should handle malformed JSON in params gracefully", async () => {
    const thinkFn = vi.fn(async () =>
      'ACTION: execute_command\nPARAMS: {broken json'
    );
    const executeToolFn = vi.fn(async () => ({ success: true, output: "ran" }));

    const loop = new AgentLoop("broken task", {
      thinkFn,
      executeToolFn,
      maxSteps: 1,
    });

    const state = await loop.run();

    expect(state.steps[0].action).toEqual({
      tool: "execute_command",
      params: {},
    });
  });

  it("should handle action without params block", async () => {
    const thinkFn = vi.fn(async () => "ACTION: skill_list");
    const executeToolFn = vi.fn(async () => ({ success: true, output: "skills" }));

    const loop = new AgentLoop("list skills", {
      thinkFn,
      executeToolFn,
      maxSteps: 1,
    });

    const state = await loop.run();

    expect(state.steps[0].action).toEqual({
      tool: "skill_list",
      params: {},
    });
  });

  it("should return current state snapshot via getState", () => {
    const loop = new AgentLoop("snap task", {
      thinkFn: vi.fn(async () => "COMPLETE: done"),
    });

    const state = loop.getState();

    expect(state.goal).toBe("snap task");
    expect(state.status).toBe("planning");
    expect(state.steps).toEqual([]);
    expect(state.currentStep).toBe(0);
    expect(state.maxSteps).toBe(20);
  });

  it("should not auto-create skills for tasks with fewer than 3 steps", async () => {
    const thinkFn = vi.fn(async () => "COMPLETE: simple task");
    const loop = new AgentLoop("short task", {
      thinkFn,
    });

    const state = await loop.run();

    expect(state.status).toBe("completed");
    expect(state.steps.length).toBeLessThan(3);
  });
});

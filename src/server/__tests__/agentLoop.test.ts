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
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isTaskComplete,
  shouldContinueNeeded,
  extractToolCalls,
  parseSSEStream,
  buildMessages,
  getProviderDefaults,
  getCacheKey,
  checkCache,
  setCache,
} from "../shared";

describe("isTaskComplete", () => {
  it("returns true for TASK_COMPLETE marker", () => {
    expect(isTaskComplete("TASK_COMPLETE everything is done")).toBe(true);
  });

  it("returns true for DONE marker", () => {
    expect(isTaskComplete("DONE: finished successfully")).toBe(true);
  });

  it("returns false for regular content without markers", () => {
    expect(isTaskComplete("Here is the result of the analysis")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isTaskComplete("")).toBe(false);
  });

  it("returns true for content containing DONE anywhere", () => {
    expect(isTaskComplete("The analysis shows we are DONE with the module")).toBe(true);
  });

  it("returns true for content containing TASK_COMPLETE anywhere", () => {
    expect(isTaskComplete("Step 1 complete. TASK_COMPLETE: all good")).toBe(true);
  });

  it("handles case-sensitive markers only", () => {
    expect(isTaskComplete("task_complete: done")).toBe(false);
    expect(isTaskComplete("Done with everything")).toBe(false);
  });
});

describe("shouldContinueNeeded", () => {
  it("returns true for CONTINUE_NEEDED marker", () => {
    expect(shouldContinueNeeded("CONTINUE_NEEDED more steps required")).toBe(true);
  });

  it("returns true for TASK_INCOMPLETE marker", () => {
    expect(shouldContinueNeeded("TASK_INCOMPLETE partially done")).toBe(true);
  });

  it("returns false for completed content", () => {
    expect(shouldContinueNeeded("TASK_COMPLETE done")).toBe(false);
  });

  it("returns false for regular content", () => {
    expect(shouldContinueNeeded("Let me check something")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(shouldContinueNeeded("")).toBe(false);
  });
});

describe("extractToolCalls", () => {
  it("extracts fenced tool_call JSON blocks", () => {
    const content = [
      '```tool_call',
      '{"server":"local","tool":"read_file","arguments":{"path":"src/app.ts"}}',
      '```',
    ].join("\n");

    const calls = extractToolCalls(content);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      server: "local",
      tool: "read_file",
      arguments: { path: "src/app.ts" },
    });
  });

  it("extracts XML-style tool_call blocks", () => {
    const content = [
      "<tool_call>",
      "<name>write_file</name>",
      "<params>",
      '{"path":"test.txt","content":"hello"}',
      "</params>",
      "</tool_call>",
    ].join("\n");

    const calls = extractToolCalls(content);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      server: "local",
      tool: "write_file",
      arguments: { path: "test.txt", content: "hello" },
    });
  });

  it("extracts multiple tool calls from mixed content", () => {
    const content = [
      "Let me read the file first.",
      '```tool_call',
      '{"server":"local","tool":"read_file","arguments":{"path":"README.md"}}',
      '```',
      "Now let me write something.",
      "<tool_call>",
      "<name>write_file</name>",
      "<params>",
      '{"path":"output.txt","content":"done"}',
      "</params>",
      "</tool_call>",
    ].join("\n");

    const calls = extractToolCalls(content);

    expect(calls).toHaveLength(2);
    expect(calls[0].tool).toBe("read_file");
    expect(calls[1].tool).toBe("write_file");
  });

  it("skips tool calls without server field in fenced format", () => {
    const content = [
      '```tool_call',
      '{"tool":"read_file","arguments":{"path":"f.txt"}}',
      '```',
    ].join("\n");

    const calls = extractToolCalls(content);

    expect(calls).toHaveLength(0);
  });

  it("skips malformed JSON gracefully", () => {
    const content = [
      '```tool_call',
      "{not valid json}",
      '```',
    ].join("\n");

    const calls = extractToolCalls(content);

    expect(calls).toHaveLength(0);
  });

  it("skips malformed XML params gracefully", () => {
    const content = [
      "<tool_call>",
      "<name>read_file</name>",
      "<params>",
      "not valid json",
      "</params>",
      "</tool_call>",
    ].join("\n");

    const calls = extractToolCalls(content);

    expect(calls).toHaveLength(0);
  });

  it("returns empty array for content without tool calls", () => {
    expect(extractToolCalls("Just some text without tool calls")).toEqual([]);
  });

  it("returns empty array for empty content", () => {
    expect(extractToolCalls("")).toEqual([]);
  });
});

describe("parseSSEStream", () => {
  it("parses complete SSE lines and returns remainder", () => {
    const buffer = 'data: {"content":"Hello"}\n\ndata: {"content":"World"}\n\npartial';
    const { lines, remaining } = parseSSEStream(buffer);

    expect(lines).toEqual([
      'data: {"content":"Hello"}',
      '',
      'data: {"content":"World"}',
      '',
    ]);
    expect(remaining).toBe("partial");
  });

  it("handles empty buffer", () => {
    const { lines, remaining } = parseSSEStream("");

    expect(lines).toEqual([]);
    expect(remaining).toBe("");
  });

  it("handles single complete line", () => {
    const { lines, remaining } = parseSSEStream("data: [DONE]\n");

    expect(lines).toEqual(["data: [DONE]"]);
    expect(remaining).toBe("");
  });

  it("handles buffer ending with complete line", () => {
    const { lines, remaining } = parseSSEStream("line1\nline2\n");
    expect(lines).toEqual(["line1", "line2"]);
    expect(remaining).toBe("");
  });
});

describe("buildMessages", () => {
  it("prepends system prompt and converts content parts to messages", () => {
    const prompt = "You are a helpful assistant";
    const contents = [
      { role: "user" as const, parts: [{ text: "Hello" }] },
      { role: "model" as const, parts: [{ text: "Hi there" }] },
      { role: "assistant" as const, parts: [{ text: "How can I help?" }] },
    ];

    const messages = buildMessages(prompt, contents);

    expect(messages).toHaveLength(4);
    expect(messages[0]).toEqual({ role: "system", content: prompt });
    expect(messages[1]).toEqual({ role: "user", content: "Hello" });
    expect(messages[2]).toEqual({ role: "assistant", content: "Hi there" });
    expect(messages[3]).toEqual({ role: "assistant", content: "How can I help?" });
  });

  it("handles empty contents", () => {
    const messages = buildMessages("system prompt", []);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({ role: "system", content: "system prompt" });
  });
});

describe("getProviderDefaults", () => {
  it("returns openai defaults", () => {
    const defaults = getProviderDefaults("openai");
    expect(defaults.baseUrl).toBe("https://api.openai.com/v1");
    expect(defaults.defaultModel).toBe("gpt-4.1");
    expect(defaults.envKey).toBe("OPENAI_API_KEY");
  });

  it("returns gemini defaults", () => {
    const defaults = getProviderDefaults("gemini");
    expect(defaults.baseUrl).toBe("");
    expect(defaults.defaultModel).toBe("gemini-2.5-flash");
  });

  it("returns fallback for unknown provider", () => {
    const defaults = getProviderDefaults("nonexistent");

    expect(defaults.baseUrl).toBe("");
    expect(defaults.defaultModel).toBe("model");
    expect(defaults.envKey).toBe("");
  });
});

describe("getCacheKey", () => {
  it("generates deterministic cache key", () => {
    const key = getCacheKey(
      "You are a helpful assistant",
      [
        { role: "user" as const, parts: [{ text: "help" }] },
        { role: "assistant" as const, parts: [{ text: "ok" }] },
      ],
      "openai",
      "gpt-4"
    );

    expect(key).toContain("openai");
    expect(key).toContain("gpt-4");
    expect(key).toContain("2");
  });
});

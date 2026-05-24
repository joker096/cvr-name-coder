import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
  };
});

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue("[]"),
    writeFile: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockRejectedValue(new Error("not found")),
    stat: vi.fn().mockRejectedValue(new Error("not found")),
  };
});

vi.mock("../memoryStore.js", () => ({
  getMemoryContext: vi.fn().mockResolvedValue(""),
}));

vi.mock("../agentLoader.js", () => ({
  getAgentById: vi.fn().mockReturnValue(undefined),
}));

vi.mock("../instructionLoader.js", () => ({
  getInstructionsContext: vi.fn().mockResolvedValue([]),
}));

vi.mock("../customToolLoader.js", () => ({
  loadCustomTools: vi.fn().mockReturnValue([]),
  executeCustomTool: vi.fn(),
}));

vi.mock("../hooks.js", () => ({
  hookRegistry: {
    execute: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../costTracker.js", () => ({
  trackCost: vi.fn().mockResolvedValue(undefined),
  estimateTokens: vi.fn().mockReturnValue(100),
}));

vi.mock("../logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../cache.js", () => ({
  aiCache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
  },
}));

vi.mock("../contextWindow.js", () => ({
  ContextWindow: vi.fn().mockImplementation(function (this: any, _config: any) {
    this.messages = [];
    this.add = (role: string, content: string) => {
      this.messages.push({ role, content });
    };
    this.getMessages = () => this.messages;
  }),
  Priority: { HIGH: "high", NORMAL: "normal" },
}));

vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join("/").replaceAll("\\", "/")),
    dirname: actual.dirname,
    resolve: actual.resolve,
  };
});

vi.mock("../providers.js", () => ({
  generateAIResponse: vi.fn(),
  generateStreamResponse: vi.fn(),
  generateAIContent: vi.fn(),
  generateWithDualModel: vi.fn(),
  generateWithDualModelResponse: vi.fn(),
  generateEmbeddings: vi.fn(),
  AIProvider: vi.fn(),
  summarizeHistory: vi.fn(),
}));

import { readFile, writeFile, mkdir, access } from "fs/promises";
import { registerRoutes } from "../routes/chat";
import { generateAIResponse, generateStreamResponse } from "../providers.js";

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockMkdir = vi.mocked(mkdir);
const mockAccess = vi.mocked(access);
const mockGenerate = vi.mocked(generateAIResponse);
const mockGenerateStream = vi.mocked(generateStreamResponse);

function createMockApp(req: any, res: any) {
  return {
    post: vi.fn((path: string, ...args: any[]) => {
      if (path === "/api/chat") {
        const lastArg = args[args.length - 1];
        if (typeof lastArg === "function") lastArg(req, res);
      }
      // "/api/clear" is registered too but we skip it
    }),
    get: vi.fn(),
  } as any;
}

function createMockReq(overrides: Record<string, any> = {}) {
  return {
    body: { message: "test", config: { aiProvider: "openai", aiModel: "gpt-4", mode: "build" } },
    headers: {},
    on: vi.fn(),
    ...overrides,
  } as any;
}

function createMockRes() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    write: vi.fn(),
    end: vi.fn(),
  };
  return res;
}

describe("Chat route - JSON response path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFile.mockResolvedValue("[]");
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockAccess.mockRejectedValue(new Error("not found"));
    mockGenerate.mockResolvedValue({
      text: "Here is the response from AI",
      inputTokens: 100,
      outputTokens: 50,
    });
    mockGenerateStream.mockResolvedValue({
      text: "Streamed response",
      inputTokens: 100,
      outputTokens: 50,
    });
  });

  it("passes the correct content to generateAIResponse and completes", async () => {
    let wasGenerated = false;
    mockGenerate.mockImplementation(async () => {
      wasGenerated = true;
      return { text: "OK", inputTokens: 10, outputTokens: 10 };
    });

    const req = { body: { message: "Write a function", config: { aiProvider: "openai", aiModel: "gpt-4", mode: "build" } }, headers: { accept: "application/json" }, on: vi.fn() } as any;
    const res = createMockRes();
    const app = createMockApp(req, res);

    registerRoutes(app);

    await vi.waitFor(() => expect(res.json).toHaveBeenCalled(), { timeout: 5000 });

    const jsonArg = res.json.mock.calls[0][0];
    expect(wasGenerated).toBe(true);
    expect(jsonArg.content).toBeDefined();
    expect(jsonArg.continueNeeded).toBe(false);
  });

  it("returns AI response in JSON format when no SSE accept header", async () => {
    mockGenerate.mockImplementation(async () => ({
      text: "Here is the response from AI",
      inputTokens: 100,
      outputTokens: 50,
    }));

    const req = createMockReq({
      headers: { accept: "application/json" },
    });
    const res = createMockRes();
    const app = createMockApp(req, res);

    registerRoutes(app);

    await vi.waitFor(() => expect(res.json).toHaveBeenCalled());

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg).toHaveProperty("content");
    expect(jsonArg).toHaveProperty("tokenUsage");
    expect(jsonArg.continueNeeded).toBe(false);
  });

});

describe("Chat route - error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFile.mockResolvedValue("[]");
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockAccess.mockRejectedValue(new Error("not found"));
    mockGenerateStream.mockResolvedValue({ text: "stream", inputTokens: 10, outputTokens: 10 });
  });

  it("returns 400 when AI provider is not configured", async () => {
    const req = createMockReq({
      body: { message: "test", config: { aiProvider: undefined as any } },
    });
    const res = createMockRes();
    const app = createMockApp(req, res);

    registerRoutes(app);

    await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(400));
    expect(res.json.mock.calls[0][0]).toHaveProperty("error");
  });

  it("returns 500 when generateAIResponse throws", async () => {
    mockGenerate.mockRejectedValue(new Error("API timeout"));

    const req = createMockReq({ headers: { accept: "application/json" } });
    const res = createMockRes();
    const app = createMockApp(req, res);

    registerRoutes(app);

    await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(500));
    expect(res.json.mock.calls[0][0]).toHaveProperty("error");
  });
});

describe("Chat route - history persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFile.mockResolvedValue("[]");
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockAccess.mockRejectedValue(new Error("not found"));
    mockGenerateStream.mockResolvedValue({ text: "stream", inputTokens: 10, outputTokens: 10 });
  });

  it("saves history entries after successful JSON chat", async () => {
    mockGenerate.mockResolvedValue({ text: "OK", inputTokens: 10, outputTokens: 10 });

    const req = createMockReq({ headers: { accept: "application/json" } });
    const res = createMockRes();
    const app = createMockApp(req, res);

    registerRoutes(app);

    await vi.waitFor(() => expect(res.json).toHaveBeenCalled(), { timeout: 5000 });

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.content).toBeDefined();
    expect(jsonArg.continueNeeded).toBe(false);
  });

  it("saves conversation to history after tool loop", async () => {
    mockGenerate
      .mockResolvedValueOnce({
        text: "",
        toolCalls: [{ id: "tc1", name: "memory_read", arguments: { type: "project" } }],
        inputTokens: 50,
        outputTokens: 30,
      })
      .mockResolvedValueOnce({
        text: "Done analyzing memory",
        inputTokens: 50,
        outputTokens: 40,
      });

    const req = createMockReq({ headers: { accept: "application/json" } });
    const res = createMockRes();
    const app = createMockApp(req, res);

    registerRoutes(app);

    await vi.waitFor(() => expect(res.json).toHaveBeenCalled(), { timeout: 5000 });

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.content).toContain("Done analyzing memory");
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });
});

describe("Chat route - SSE response path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFile.mockResolvedValue("[]");
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockAccess.mockRejectedValue(new Error("not found"));
    mockGenerate.mockResolvedValue({
      text: "response",
      inputTokens: 100,
      outputTokens: 50,
    });
    mockGenerateStream.mockResolvedValue({
      text: "Streamed response text",
      inputTokens: 100,
      outputTokens: 50,
    });
  });

  it("sets SSE headers and streams content tokens", async () => {
    mockGenerateStream.mockImplementation(async (_prompt: any, _contents: any, _provider: any, _url: any, _model: any, _key: any, _temp: any, _max: any, callbacks: any) => {
      callbacks?.onToken?.("Hello");
      callbacks?.onToken?.(" world");
      return { text: "Hello world", inputTokens: 100, outputTokens: 50 };
    });

    const req = createMockReq({
      headers: { accept: "text/event-stream" },
    });
    const res = createMockRes();
    const app = createMockApp(req, res);

    registerRoutes(app);

    await vi.waitFor(() => expect(res.end).toHaveBeenCalled());

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache");

    const allWrites = res.write.mock.calls.map((c: any) => c[0]).join("");
    expect(allWrites).toContain("Hello");
    expect(allWrites).toContain("world");
    expect(allWrites).toContain('"done":true');
  });

  it("sends done marker with continueNeeded false", async () => {
    const req = createMockReq({
      headers: { accept: "text/event-stream" },
    });
    const res = createMockRes();
    const app = createMockApp(req, res);

    registerRoutes(app);

    await vi.waitFor(() => expect(res.end).toHaveBeenCalled());

    const allWrites = res.write.mock.calls.map((c: any) => c[0]).join("");
    expect(allWrites).toContain('"done":true');
    expect(allWrites).toContain('"continueNeeded":false');
  });

  it("filters hallucinated tool call XML from SSE tokens", async () => {
    mockGenerateStream.mockImplementation(async (_p: any, _c: any, _prov: any, _u: any, _m: any, _k: any, _t: any, _mx: any, callbacks: any) => {
      callbacks?.onToken?.("normal text");
      callbacks?.onToken?.("<invoke name=\"read_file\">some</invoke>");
      callbacks?.onToken?.(" more text");
      return { text: "test", inputTokens: 100, outputTokens: 50 };
    });

    const req = createMockReq({
      headers: { accept: "text/event-stream" },
    });
    const res = createMockRes();
    const app = createMockApp(req, res);

    registerRoutes(app);

    await vi.waitFor(() => expect(res.end).toHaveBeenCalled());

    const allWrites = res.write.mock.calls.map((c: any) => c[0]).join("");
    expect(allWrites).toContain("normal text");
    expect(allWrites).toContain("more text");
    expect(allWrites).not.toContain("<invoke");
  });

  it("streams tool call notifications during multi-step execution", async () => {
    mockGenerate
      .mockResolvedValueOnce({
        text: "Let me read a file",
        toolCalls: [
          { id: "tc1", name: "read_file", arguments: { path: "test.ts" } },
        ],
        inputTokens: 100,
        outputTokens: 50,
      })
      .mockResolvedValueOnce({
        text: "File contents analyzed",
        inputTokens: 100,
        outputTokens: 50,
      });

    mockGenerateStream.mockResolvedValue({
      text: "Final streamed output",
      inputTokens: 100,
      outputTokens: 50,
    });

    const req = createMockReq({
      headers: { accept: "text/event-stream" },
    });
    const res = createMockRes();
    const app = createMockApp(req, res);

    registerRoutes(app);

    await vi.waitFor(() => expect(res.end).toHaveBeenCalled());

    const allWrites = res.write.mock.calls.map((c: any) => c[0]).join("");
    expect(allWrites).toContain("toolCalls");
    expect(allWrites).toContain("read_file");
  });
});

describe("Chat route - tool loop execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFile.mockResolvedValue("[]");
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockAccess.mockRejectedValue(new Error("not found"));
    mockGenerateStream.mockResolvedValue({
      text: "done",
      inputTokens: 10,
      outputTokens: 10,
    });
  });

  it("executes single tool call and returns final response", async () => {
    mockGenerate
      .mockResolvedValueOnce({
        text: "step 1",
        toolCalls: [
          { id: "t1", name: "read_file", arguments: { path: "src/index.ts" } },
        ],
        inputTokens: 100,
        outputTokens: 50,
      })
      .mockResolvedValueOnce({
        text: "I have read the file and analyzed it",
        inputTokens: 100,
        outputTokens: 80,
      });

    const req = createMockReq({
      headers: { accept: "application/json" },
    });
    const res = createMockRes();
    const app = createMockApp(req, res);

    registerRoutes(app);

    await vi.waitFor(() => expect(res.json).toHaveBeenCalled());

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.content).toContain("I have read the file");
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it("handles empty AI response text", async () => {
    mockGenerate
      .mockResolvedValueOnce({
        text: "",
        toolCalls: [
          { id: "t1", name: "read_file", arguments: { path: "f.txt" } },
        ],
        inputTokens: 100,
        outputTokens: 50,
      })
      .mockResolvedValueOnce({ text: "", inputTokens: 10, outputTokens: 10 });

    const req = createMockReq({
      headers: { accept: "application/json" },
    });
    const res = createMockRes();
    const app = createMockApp(req, res);

    registerRoutes(app);

    await vi.waitFor(() => expect(res.json).toHaveBeenCalled());

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.content).toBe("");
  });

  it("handles client disconnect during SSE streaming", async () => {
    let closeCallback: (() => void) | undefined;

    const req = createMockReq({
      headers: { accept: "text/event-stream" },
      on: vi.fn((event: string, cb: () => void) => {
        if (event === "close") closeCallback = cb;
      }),
    });
    const res = createMockRes();
    const app = createMockApp(req, res);

    mockGenerateStream.mockImplementation(async (_p: any, _c: any, _prov: any, _u: any, _m: any, _k: any, _t: any, _mx: any, callbacks: any) => {
      if (closeCallback) closeCallback();
      callbacks?.onToken?.("partial");
      return { text: "partial", inputTokens: 10, outputTokens: 10 };
    });

    registerRoutes(app);

    await vi.waitFor(() => expect(req.on).toHaveBeenCalledWith("close", expect.any(Function)));
  });
});

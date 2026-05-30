import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageItem } from "./MessageItem";
import type { Message } from "../../types/chat";

describe("MessageItem", () => {
  const mockT = {
    input: "INPUT",
    agent: "AGENT",
    reviewText: "REVIEW",
    toolsLabel: "TOOLS",
    toolCall: "TOOL CALL",
    copied: "Copied!",
    copy: "Copy",
  };

  const mockMessage: Message = {
    id: "msg1",
    role: "user",
    content: "Test message",
    timestamp: Date.now(),
  };

  it("should render user message content", () => {
    render(<MessageItem message={mockMessage} t={mockT} />);
    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  it("should render model message content", () => {
    const modelMessage: Message = { ...mockMessage, role: "model" };
    render(<MessageItem message={modelMessage} t={mockT} />);
    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  it("should render markdown content as text", () => {
    const mdMessage: Message = { ...mockMessage, content: "**Bold** and *italic* text" };
    render(<MessageItem message={mdMessage} t={mockT} />);
    expect(screen.getByText("Bold", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("italic", { exact: false })).toBeInTheDocument();
  });

  it("should render inline code content", () => {
    const codeMessage: Message = { ...mockMessage, content: "Use `const x = 1` for variables" };
    render(<MessageItem message={codeMessage} t={mockT} />);
    expect(screen.getByText("const x = 1", { exact: false })).toBeInTheDocument();
  });

  it("should render code block content", () => {
    const codeBlockMessage: Message = { ...mockMessage, content: "```javascript\nconst x = 1;\n```" };
    render(<MessageItem message={codeBlockMessage} t={mockT} />);
    expect(screen.getByText("javascript", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("const x = 1", { exact: false })).toBeInTheDocument();
  });

  it("should apply correct styling for user message", () => {
    const { container } = render(<MessageItem message={mockMessage} t={mockT} />);
    const avatar = container.querySelector('[class*="bg-dash-text-muted"]');
    expect(avatar).toBeInTheDocument();
  });

  it("should apply correct styling for model message", () => {
    const modelMessage: Message = { ...mockMessage, role: "model" };
    const { container } = render(<MessageItem message={modelMessage} t={mockT} />);
    const avatar = container.querySelector('[class*="bg-dash-accent"]');
    expect(avatar).toBeInTheDocument();
  });

  it("should render with model message card styling", () => {
    const modelMessage: Message = { ...mockMessage, role: "model" };
    const { container } = render(<MessageItem message={modelMessage} t={mockT} />);
    const card = container.querySelector('[class*="bg-dash-surface/30"]');
    expect(card).toBeInTheDocument();
  });

  it("should apply card styling for assistant role", () => {
    const assistantMessage: Message = { ...mockMessage, role: "assistant" };
    const { container } = render(<MessageItem message={assistantMessage} t={mockT} />);
    const card = container.querySelector('[class*="bg-dash-surface/30"]');
    expect(card).toBeInTheDocument();
  });

  it("should display provider and model for AI messages", () => {
    const assistantMessage: Message = { ...mockMessage, role: "assistant" };
    render(
      <MessageItem
        message={assistantMessage}
        providerLabel="Gemini"
        modelName="gemini-2.5-flash"
        t={mockT}
      />
    );
    expect(screen.getByText("Gemini")).toBeInTheDocument();
    expect(screen.getByText("/gemini-2.5-flash")).toBeInTheDocument();
  });

  it("should prefer message provider and model metadata", () => {
    const assistantMessage: Message = {
      ...mockMessage,
      role: "assistant",
      provider: "local",
      modelName: "llama3",
    };
    render(
      <MessageItem
        message={assistantMessage}
        providerLabel="Gemini"
        modelName="gemini-2.5-flash"
        t={mockT}
      />
    );
    expect(screen.getByText("local")).toBeInTheDocument();
    expect(screen.getByText("/llama3")).toBeInTheDocument();
    expect(screen.queryByText("Gemini")).not.toBeInTheDocument();
  });

  it("should not display provider info for user messages", () => {
    render(
      <MessageItem
        message={mockMessage}
        providerLabel="Gemini"
        modelName="gemini-2.5-flash"
        t={mockT}
      />
    );
    expect(screen.queryByText("Gemini")).not.toBeInTheDocument();
  });

  it("should render review message", () => {
    const reviewMessage: Message = {
      id: "msg2",
      role: "review",
      content: "",
      timestamp: Date.now(),
      reviewData: { comments: [], summary: "Review summary" },
    };
    render(<MessageItem message={reviewMessage} t={mockT} />);
    expect(screen.getByText(/REVIEW/)).toBeInTheDocument();
  });

  it("should render tool call message", () => {
    const toolMessage: Message = {
      id: "msg3",
      role: "tool_call",
      content: "",
      timestamp: Date.now(),
      toolCall: {
        id: "tc1",
        toolName: "read_file",
        params: { path: "/test.txt" },
        status: "complete",
        result: "file content",
      },
    };
    render(<MessageItem message={toolMessage} t={mockT} />);
    expect(screen.getByText(/TOOLS/)).toBeInTheDocument();
    expect(screen.getByText("read_file")).toBeInTheDocument();
    expect(screen.getByText("complete")).toBeInTheDocument();
  });

  it("should show copy button for assistant messages", () => {
    const assistantMessage: Message = { ...mockMessage, role: "assistant" };
    const { container } = render(<MessageItem message={assistantMessage} t={mockT} />);
    const title = container.querySelector('[title="Copy"]');
    expect(title).toBeInTheDocument();
  });

  it("should not show copy button for user messages", () => {
    const { container } = render(<MessageItem message={mockMessage} t={mockT} />);
    const title = container.querySelector('[title="Copy"]');
    expect(title).not.toBeInTheDocument();
  });

  it("should render token usage for AI messages", () => {
    const msg: Message = {
      ...mockMessage,
      role: "assistant",
      tokenUsage: { input: 100, output: 50 },
    };
    render(
      <MessageItem message={msg} providerLabel="Test" modelName="test" t={mockT} />
    );
    expect(screen.getByText("100", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("50", { exact: false })).toBeInTheDocument();
  });

  it("should render thinking block for messages with reasoning", () => {
    const msg: Message = {
      ...mockMessage,
      role: "assistant",
      content: "Final answer",
      reasoning: "Let me think about this...",
    };
    render(<MessageItem message={msg} t={{ ...mockT, thinkLabel: "Thoughts" }} />);
    expect(screen.getByText("Thoughts")).toBeInTheDocument();
    expect(screen.getByText("Final answer")).toBeInTheDocument();
  });
});

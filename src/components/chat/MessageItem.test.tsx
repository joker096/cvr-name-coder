import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageItem } from "./MessageItem";
import type { Message } from "./../types/chat";

describe("MessageItem", () => {
  const mockT = {
    input: "INPUT",
    agent: "AGENT",
  };

  const mockMessage: Message = {
    id: "msg1",
    role: "user",
    content: "Test message",
    timestamp: Date.now(),
  };

  it("should render user message", () => {
    render(
      <MessageItem
        message={mockMessage}
        index={0}
        t={mockT}
      />
    );

    expect(screen.getByText("[INPUT]")).toBeInTheDocument();
    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  it("should render model message", () => {
    const modelMessage: Message = {
      ...mockMessage,
      role: "model",
    };

    render(
      <MessageItem
        message={modelMessage}
        index={0}
        t={mockT}
      />
    );

    expect(screen.getByText("[AGENT]")).toBeInTheDocument();
  });

  it("should render with custom agent label", () => {
    const modelMessage: Message = {
      ...mockMessage,
      role: "model",
    };

    render(
      <MessageItem
        message={modelMessage}
        index={0}
        agentLabel="Custom Agent"
        t={mockT}
      />
    );

    expect(screen.getByText("[CUSTOM AGENT]")).toBeInTheDocument();
  });

  it("should render markdown content", () => {
    const markdownMessage: Message = {
      ...mockMessage,
      content: "**Bold** and *italic* text",
    };

    render(
      <MessageItem
        message={markdownMessage}
        index={0}
        t={mockT}
      />
    );

    expect(screen.getByText("Bold")).toBeInTheDocument();
    expect(screen.getByText("italic")).toBeInTheDocument();
  });

  it("should render inline code", () => {
    const codeMessage: Message = {
      ...mockMessage,
      content: "Use `const x = 1` for variables",
    };

    render(
      <MessageItem
        message={codeMessage}
        index={0}
        t={mockT}
      />
    );

    expect(screen.getByText("const x = 1")).toBeInTheDocument();
  });

  it("should render code block", () => {
    const codeBlockMessage: Message = {
      ...mockMessage,
      content: "```javascript\nconst x = 1;\n```",
    };

    render(
      <MessageItem
        message={codeBlockMessage}
        index={0}
        t={mockT}
      />
    );

    expect(screen.getByText("javascript")).toBeInTheDocument();
    expect(screen.getByText("const")).toBeInTheDocument();
  });

  it("should apply correct styling for user message", () => {
    const { container } = render(
      <MessageItem
        message={mockMessage}
        index={0}
        t={mockT}
      />
    );

    const label = container.querySelector('[class*="text-dash-text-muted"]');
    expect(label).toBeInTheDocument();
  });

  it("should apply correct styling for model message", () => {
    const modelMessage: Message = {
      ...mockMessage,
      role: "model",
    };

    const { container } = render(
      <MessageItem
        message={modelMessage}
        index={0}
        t={mockT}
      />
    );

    const label = container.querySelector('[class*="text-dash-accent"]');
    expect(label).toBeInTheDocument();
  });

  it("should render with model message card styling", () => {
    const modelMessage: Message = {
      ...mockMessage,
      role: "model",
    };

    const { container } = render(
      <MessageItem
        message={modelMessage}
        index={0}
        t={mockT}
      />
    );

    const card = container.querySelector('[class*="bg-dash-surface/30"]');
    expect(card).toBeInTheDocument();
  });

  it("should apply card styling for assistant role", () => {
    const assistantMessage: Message = {
      ...mockMessage,
      role: "assistant",
    };

    const { container } = render(
      <MessageItem
        message={assistantMessage}
        index={0}
        t={mockT}
      />
    );

    const card = container.querySelector('[class*="bg-dash-surface/30"]');
    expect(card).toBeInTheDocument();
    expect(screen.getByText("[AGENT]")).toBeInTheDocument();
  });

  it("should display provider and model for AI messages", () => {
    const assistantMessage: Message = {
      ...mockMessage,
      role: "assistant",
    };

    render(
      <MessageItem
        message={assistantMessage}
        index={0}
        agentLabel="BUILD"
        providerLabel="Gemini"
        modelName="gemini-2.5-flash"
        t={mockT}
      />
    );

    expect(screen.getByText("Gemini")).toBeInTheDocument();
    expect(screen.getByText("gemini-2.5-flash")).toBeInTheDocument();
  });

  it("should not display provider info for user messages", () => {
    render(
      <MessageItem
        message={mockMessage}
        index={0}
        providerLabel="Gemini"
        modelName="gemini-2.5-flash"
        t={mockT}
      />
    );

    expect(screen.queryByText("Gemini")).not.toBeInTheDocument();
  });
});

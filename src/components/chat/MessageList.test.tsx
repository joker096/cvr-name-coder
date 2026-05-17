import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageList } from "../MessageList";
import type { Message } from "../../types/chat";

describe("MessageList", () => {
  const mockT = {
    input: "INPUT",
    agent: "AGENT",
    think: "THINK",
    processing: "Processing...",
    welcome: "Welcome",
    startConversation: "Start a conversation to begin",
  };

  const mockMessages: Message[] = [
    {
      id: "msg1",
      role: "user",
      content: "Hello",
      timestamp: Date.now(),
    },
    {
      id: "msg2",
      role: "model",
      content: "Hi there!",
      timestamp: Date.now(),
    },
  ];

  it("should render empty state when no messages", () => {
    render(
      <MessageList
        messages={[]}
        t={mockT}
      />
    );

    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Start a conversation to begin")).toBeInTheDocument();
  });

  it("should render messages", () => {
    render(
      <MessageList
        messages={mockMessages}
        t={mockT}
      />
    );

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there!")).toBeInTheDocument();
  });

  it("should render with custom agent label", () => {
    render(
      <MessageList
        messages={mockMessages}
        agentLabel="Custom Agent"
        t={mockT}
      />
    );

    expect(screen.getByText("[CUSTOM AGENT]")).toBeInTheDocument();
  });

  it("should render loading state when looming", () => {
    render(
      <MessageList
        messages={mockMessages}
        t={mockT}
        isLooming={true}
      />
    );

    expect(screen.getByText("[THINK]")).toBeInTheDocument();
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it("should render custom loading text", () => {
    render(
      <MessageList
        messages={mockMessages}
        t={mockT}
        isLooming={true}
        loadingText="Thinking..."
      />
    );

    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  it("should not render empty state when looming", () => {
    render(
      <MessageList
        messages={[]}
        t={mockT}
        isLooming={true}
      />
    );

    expect(screen.queryByText("Welcome")).not.toBeInTheDocument();
    expect(screen.getByText("[THINK]")).toBeInTheDocument();
  });

  it("should render all messages in order", () => {
    const { container } = render(
      <MessageList
        messages={mockMessages}
        t={mockT}
      />
    );

    const messageItems = container.querySelectorAll('[class*="flex flex-col sm:flex-row"]');
    expect(messageItems).toHaveLength(2);
  });

  it("should render loading animation dots", () => {
    const { container } = render(
      <MessageList
        messages={mockMessages}
        t={mockT}
        isLooming={true}
      />
    );

    const dots = container.querySelectorAll('[class*="animate-bounce"]');
    expect(dots).toHaveLength(3);
  });
});

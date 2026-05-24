import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatContainer } from "./ChatContainer";
import type { Message } from "../../types/chat";

describe("ChatContainer", () => {
  const defaultProps = {
    messages: [],
    input: "",
    onInputChange: vi.fn(),
    onSendMessage: vi.fn(),
    t: {
      input: "INPUT",
      agent: "AGENT",
      think: "THINK",
      processing: "Processing...",
      welcome: "Welcome",
      startConversation: "Start a conversation to begin",
      promptPlaceholder: "Type your message...",
      cancel: "Cancel",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render MessageList and InputArea", () => {
    render(<ChatContainer {...defaultProps} />);
    expect(screen.getByText("Start a conversation to begin")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("should render messages", () => {
    const messages: Message[] = [{ id: "msg1", role: "user", content: "Hello", timestamp: Date.now() }];
    render(<ChatContainer {...defaultProps} messages={messages} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("should call onInputChange when typing", () => {
    render(<ChatContainer {...defaultProps} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(defaultProps.onInputChange).toHaveBeenCalledWith("Hello");
  });

  it("should call onSendMessage when send button is clicked", () => {
    render(<ChatContainer {...defaultProps} input="Hello" />);
    const sendButton = screen.getByTitle("Send message");
    fireEvent.click(sendButton);
    expect(defaultProps.onSendMessage).toHaveBeenCalled();
  });

  it("should call onCancelMessage when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<ChatContainer {...defaultProps} isLooming={true} onCancelMessage={onCancel} />);
    const cancelButton = screen.getByRole("button");
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalled();
  });

  it("should render loading state when looming", () => {
    render(<ChatContainer {...defaultProps} isLooming={true} />);
    expect(screen.getByText(/THINK/)).toBeInTheDocument();
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it("should render custom loading text", () => {
    render(<ChatContainer {...defaultProps} isLooming={true} loadingText="Thinking..." />);
    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  it("should render custom placeholder", () => {
    render(<ChatContainer {...defaultProps} placeholder="Type something..." />);
    const textarea = screen.getByPlaceholderText("Type something...");
    expect(textarea).toBeInTheDocument();
  });

  it("should disable InputArea when disabled", () => {
    render(<ChatContainer {...defaultProps} disabled={true} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeDisabled();
  });

  it("should apply custom className", () => {
    const { container } = render(<ChatContainer {...defaultProps} className="custom-class" />);
    expect(container.firstChild).toHaveClass("custom-class");
  });
});

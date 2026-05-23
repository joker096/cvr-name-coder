import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InputArea } from "./InputArea";

describe("InputArea IME composition handling", () => {
  const defaultProps = {
    value: "Hello",
    onChange: vi.fn(),
    onSend: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should NOT call onSend when Enter is pressed during IME composition", () => {
    render(<InputArea {...defaultProps} />);

    const textarea = screen.getByRole("textbox");

    // Create a keyboard event with isComposing=true
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: false,
      bubbles: true,
    });
    // Override isComposing on the native event
    Object.defineProperty(event, "isComposing", {
      value: true,
      writable: false,
    });

    fireEvent(textarea, event);

    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  it("should call onSend when Enter is pressed normally (no composition)", () => {
    render(<InputArea {...defaultProps} />);

    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(defaultProps.onSend).toHaveBeenCalledTimes(1);
  });

  it("should NOT call onSend when Shift+Enter is pressed", () => {
    render(<InputArea {...defaultProps} />);

    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  it("should NOT select slash command when Enter is pressed during IME composition", () => {
    render(<InputArea {...defaultProps} value="/ana" />);

    const textarea = screen.getByRole("textbox");

    // Type to show commands
    fireEvent.change(textarea, { target: { value: "/analyze" } });

    // Create composition Enter event
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: false,
      bubbles: true,
    });
    Object.defineProperty(event, "isComposing", {
      value: true,
      writable: false,
    });

    fireEvent(textarea, event);

    // onSend should NOT be called, and command should NOT be selected
    expect(defaultProps.onSend).not.toHaveBeenCalled();
    expect(defaultProps.onChange).not.toHaveBeenCalledWith("/analyze ");
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InputArea } from "./InputArea";

describe("InputArea", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
    onSend: vi.fn(),
  };

  const getButtons = () => screen.getAllByRole("button");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render textarea", () => {
    render(<InputArea {...defaultProps} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
  });

  it("should render with placeholder", () => {
    render(
      <InputArea
        {...defaultProps}
        placeholder="Type something..."
      />
    );

    const textarea = screen.getByPlaceholderText("Type something...");
    expect(textarea).toBeInTheDocument();
  });

  it("should call onChange when typing", () => {
    render(<InputArea {...defaultProps} />);

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello" } });

    expect(defaultProps.onChange).toHaveBeenCalledWith("Hello");
  });

  it("should call onSend when Enter is pressed", () => {
    render(<InputArea {...defaultProps} value="Hello" />);

    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(defaultProps.onSend).toHaveBeenCalled();
  });

  it("should not call onSend when Shift+Enter is pressed", () => {
    render(<InputArea {...defaultProps} value="Hello" />);

    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  it("should render send button when not looming", () => {
    render(<InputArea {...defaultProps} value="" />);

    const sendButton = screen.getByTitle("Send message");
    expect(sendButton).toBeInTheDocument();
  });

  it("should disable send button when input is empty", () => {
    render(<InputArea {...defaultProps} value="" />);

    const sendButton = screen.getByTitle("Send message");
    expect(sendButton).toBeDisabled();
  });

  it("should enable send button when input has value", () => {
    render(<InputArea {...defaultProps} value="Hello" />);

    const sendButton = screen.getByTitle("Send message");
    expect(sendButton).not.toBeDisabled();
  });

  it("should call onSend when send button is clicked", () => {
    render(<InputArea {...defaultProps} value="Hello" />);

    const sendButton = screen.getByTitle("Send message");
    fireEvent.click(sendButton);

    expect(defaultProps.onSend).toHaveBeenCalled();
  });

  it("should render cancel button when looming", () => {
    render(
      <InputArea
        {...defaultProps}
        isLooming={true}
        onCancel={vi.fn()}
      />
    );

    const cancelButton = screen.getByTitle("Cancel");
    expect(cancelButton).toBeInTheDocument();
  });

  it("should call onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(
      <InputArea
        {...defaultProps}
        isLooming={true}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByTitle("Cancel");
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it("should disable textarea when disabled prop is true", () => {
    render(
      <InputArea
        {...defaultProps}
        disabled={true}
      />
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeDisabled();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <InputArea
        {...defaultProps}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should show clear button when input has value", () => {
    render(<InputArea {...defaultProps} value="Hello" />);

    const clearButton = screen.getByTitle("Clear input");
    expect(clearButton).toBeInTheDocument();
  });

  it("should not show clear button when input is empty", () => {
    render(<InputArea {...defaultProps} value="" />);

    expect(screen.queryByTitle("Clear input")).not.toBeInTheDocument();
  });

  it("should clear input when clear button is clicked", () => {
    const onChange = vi.fn();
    render(<InputArea {...defaultProps} value="Hello" onChange={onChange} />);

    const clearButton = screen.getByTitle("Clear input");
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("should show cancel title from t.cancel", () => {
    const onCancel = vi.fn();
    render(
      <InputArea
        {...defaultProps}
        isLooming={true}
        onCancel={onCancel}
        t={{ cancel: "Abort" }}
      />
    );

    const cancelButton = screen.getByRole("button");
    expect(cancelButton).toHaveAttribute("title", "Abort");
  });

  it("should default cancel title to Cancel", () => {
    render(
      <InputArea
        {...defaultProps}
        isLooming={true}
        onCancel={vi.fn()}
        lang="en"
      />
    );

    const cancelButton = screen.getByRole("button");
    expect(cancelButton).toHaveAttribute("title", "Cancel");
  });
});

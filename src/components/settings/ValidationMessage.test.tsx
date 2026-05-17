import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ValidationMessage } from "../ValidationMessage";

describe("ValidationMessage", () => {
  const defaultProps = {
    type: "error" as const,
    message: "This is an error message",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render error message", () => {
    render(<ValidationMessage {...defaultProps} />);

    expect(screen.getByText("This is an error message")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("should render warning message", () => {
    render(
      <ValidationMessage
        {...defaultProps}
        type="warning"
        message="This is a warning"
      />
    );

    expect(screen.getByText("This is a warning")).toBeInTheDocument();
  });

  it("should render success message", () => {
    render(
      <ValidationMessage
        {...defaultProps}
        type="success"
        message="Success!"
      />
    );

    expect(screen.getByText("Success!")).toBeInTheDocument();
  });

  it("should render info message", () => {
    render(
      <ValidationMessage
        {...defaultProps}
        type="info"
        message="Information"
      />
    );

    expect(screen.getByText("Information")).toBeInTheDocument();
  });

  it("should apply error styling", () => {
    const { container } = render(<ValidationMessage {...defaultProps} />);

    expect(container.firstChild).toHaveClass(
      "bg-dash-error/10",
      "border-dash-error/30",
      "text-dash-error"
    );
  });

  it("should apply warning styling", () => {
    const { container } = render(
      <ValidationMessage
        {...defaultProps}
        type="warning"
      />
    );

    expect(container.firstChild).toHaveClass(
      "bg-dash-warning/10",
      "border-dash-warning/30",
      "text-dash-warning"
    );
  });

  it("should apply success styling", () => {
    const { container } = render(
      <ValidationMessage
        {...defaultProps}
        type="success"
      />
    );

    expect(container.firstChild).toHaveClass(
      "bg-dash-success/10",
      "border-dash-success/30",
      "text-dash-success"
    );
  });

  it("should apply info styling", () => {
    const { container } = render(
      <ValidationMessage
        {...defaultProps}
        type="info"
      />
    );

    expect(container.firstChild).toHaveClass(
      "bg-dash-accent/10",
      "border-dash-accent/30",
      "text-dash-accent"
    );
  });

  it("should render dismiss button when onDismiss is provided", () => {
    const onDismiss = vi.fn();
    render(
      <ValidationMessage
        {...defaultProps}
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByLabelText("Dismiss");
    expect(dismissButton).toBeInTheDocument();
  });

  it("should call onDismiss when dismiss button is clicked", () => {
    const onDismiss = vi.fn();
    render(
      <ValidationMessage
        {...defaultProps}
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByLabelText("Dismiss");
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalled();
  });

  it("should not render dismiss button when onDismiss is not provided", () => {
    render(<ValidationMessage {...defaultProps} />);

    expect(screen.queryByLabelText("Dismiss")).not.toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <ValidationMessage
        {...defaultProps}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should render icon for error type", () => {
    const { container } = render(<ValidationMessage {...defaultProps} />);

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render icon for warning type", () => {
    const { container } = render(
      <ValidationMessage
        {...defaultProps}
        type="warning"
      />
    );

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render icon for success type", () => {
    const { container } = render(
      <ValidationMessage
        {...defaultProps}
        type="success"
      />
    );

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render icon for info type", () => {
    const { container } = render(
      <ValidationMessage
        {...defaultProps}
        type="info"
      />
    );

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render in flex layout", () => {
    const { container } = render(<ValidationMessage {...defaultProps} />);

    expect(container.firstChild).toHaveClass("flex", "items-start", "gap-2");
  });

  it("should render with border and rounded corners", () => {
    const { container } = render(<ValidationMessage {...defaultProps} />);

    expect(container.firstChild).toHaveClass("border", "rounded-lg");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProviderSelector, type Provider } from "./ProviderSelector";

describe("ProviderSelector", () => {
  const mockProviders: Provider[] = [
    { id: "gemini", icon: { type: "lucide", name: "sparkles" }, label: "Google Gemini", type: "cloud" },
    { id: "openai", icon: { type: "lucide", name: "zap" }, label: "OpenAI", type: "cloud" },
    { id: "anthropic", icon: { type: "lucide", name: "bot" }, label: "Anthropic", type: "cloud" },
  ];

  const defaultProps = {
    providers: mockProviders,
    selectedProvider: "gemini" as const,
    onSelectProvider: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all providers", () => {
    render(<ProviderSelector {...defaultProps} />);

    expect(screen.getByText("Google Gemini")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
  });

  it("should highlight selected provider", () => {
    render(<ProviderSelector {...defaultProps} />);

    const geminiButton = screen.getByText("Google Gemini").closest("button");
    expect(geminiButton).toHaveClass("border-dash-accent");
  });

  it("should not highlight unselected provider", () => {
    render(
      <ProviderSelector
        {...defaultProps}
        selectedProvider="openai"
      />
    );

    const geminiButton = screen.getByText("Google Gemini").closest("button");
    expect(geminiButton).not.toHaveClass("border-dash-accent");
  });

  it("should call onSelectProvider when provider is clicked", () => {
    render(<ProviderSelector {...defaultProps} />);

    const openaiButton = screen.getByText("OpenAI").closest("button");
    openaiButton?.click();

    expect(defaultProps.onSelectProvider).toHaveBeenCalledWith("openai");
  });

  it("should apply custom className", () => {
    const { container } = render(
      <ProviderSelector
        {...defaultProps}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should render in grid layout", () => {
    const { container } = render(<ProviderSelector {...defaultProps} />);

    expect(container.firstChild).toHaveClass("grid");
  });

  it("should set aria-pressed for selected provider", () => {
    render(<ProviderSelector {...defaultProps} />);

    const geminiButton = screen.getByText("Google Gemini").closest("button");
    expect(geminiButton).toHaveAttribute("aria-pressed", "true");

    const openaiButton = screen.getByText("OpenAI").closest("button");
    expect(openaiButton).toHaveAttribute("aria-pressed", "false");
  });

  it("should handle empty providers array", () => {
    render(
      <ProviderSelector
        {...defaultProps}
        providers={[]}
      />
    );

    expect(screen.queryByText("Google Gemini")).not.toBeInTheDocument();
  });

  it("should handle single provider", () => {
    render(
      <ProviderSelector
        {...defaultProps}
        providers={[mockProviders[0]]}
      />
    );

    expect(screen.getByText("Google Gemini")).toBeInTheDocument();
    expect(screen.queryByText("OpenAI")).not.toBeInTheDocument();
  });
});

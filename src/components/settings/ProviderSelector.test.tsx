import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProviderSelector, type Provider } from "./ProviderSelector";
import { Settings, Zap } from "lucide-react";

describe("ProviderSelector", () => {
  const mockProviders: Provider[] = [
    { id: "gemini", icon: Settings, label: "Google Gemini" },
    { id: "openai", icon: Zap, label: "OpenAI" },
    { id: "anthropic", icon: Settings, label: "Anthropic" },
  ];

  const defaultProps = {
    providers: mockProviders,
    selectedProvider: "gemini",
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
    expect(geminiButton).toHaveClass("bg-dash-accent/10", "border-dash-accent", "text-dash-accent");
  });

  it("should not highlight unselected provider", () => {
    render(
      <ProviderSelector
        {...defaultProps}
        selectedProvider="openai"
      />
    );

    const geminiButton = screen.getByText("Google Gemini").closest("button");
    expect(geminiButton).not.toHaveClass("bg-dash-accent/10", "border-dash-accent", "text-dash-accent");
  });

  it("should call onSelectProvider when provider is clicked", () => {
    render(<ProviderSelector {...defaultProps} />);

    const openaiButton = screen.getByText("OpenAI").closest("button");
    openaiButton?.click();

    expect(defaultProps.onSelectProvider).toHaveBeenCalledWith("openai");
  });

  it("should render provider icons", () => {
    render(<ProviderSelector {...defaultProps} />);

    const icons = screen.getAllByRole("img");
    expect(icons).toHaveLength(3);
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

    expect(container.firstChild).toHaveClass("grid", "grid-cols-2", "gap-2");
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

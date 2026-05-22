import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProviderSelector, type Provider } from "./ProviderSelector";

const ALL_PROVIDERS: Provider[] = [
  { id: "gemini", icon: { type: "lucide", name: "sparkles" }, label: "Google Gemini", type: "cloud" },
  { id: "openai", icon: { type: "lucide", name: "zap" }, label: "OpenAI", type: "cloud" },
  { id: "anthropic", icon: { type: "lucide", name: "bot" }, label: "Anthropic", type: "cloud" },
  { id: "deepseek", icon: { type: "lucide", name: "search" }, label: "DeepSeek", type: "cloud" },
  { id: "grok", icon: { type: "lucide", name: "brain" }, label: "Grok", type: "cloud" },
  { id: "groq", icon: { type: "lucide", name: "cpu" }, label: "Groq", type: "cloud" },
  { id: "baseten", icon: { type: "lucide", name: "server" }, label: "Baseten", type: "cloud" },
  { id: "openrouter", icon: { type: "lucide", name: "network" }, label: "OpenRouter", type: "cloud" },
  { id: "together", icon: { type: "lucide", name: "link" }, label: "Together AI", type: "cloud" },
  { id: "mistral", icon: { type: "lucide", name: "cloud" }, label: "Mistral AI", type: "cloud" },
  { id: "local", icon: { type: "lucide", name: "laptop" }, label: "Local", type: "local" },
  { id: "custom", icon: { type: "lucide", name: "settings" }, label: "Custom", type: "cloud" },
];

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

describe("ProviderSelector API key URLs", () => {
  const defaultProps = {
    providers: ALL_PROVIDERS,
    selectedProvider: "gemini" as const,
    onSelectProvider: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render key icon links for all cloud providers", () => {
    render(<ProviderSelector {...defaultProps} />);

    const keyLinks = screen.getAllByTitle("Get API key");
    expect(keyLinks.length).toBeGreaterThanOrEqual(10);
  });

  it("should render key link for each cloud provider", () => {
    render(<ProviderSelector {...defaultProps} />);

    expect(screen.getByText("Google Gemini").parentElement?.querySelector("a")?.getAttribute("href")).toBe("https://aistudio.google.com/apikeys");
    expect(screen.getByText("OpenAI").parentElement?.querySelector("a")?.getAttribute("href")).toBe("https://platform.openai.com/api-keys");
    expect(screen.getByText("Anthropic").parentElement?.querySelector("a")?.getAttribute("href")).toBe("https://console.anthropic.com/");
    expect(screen.getByText("DeepSeek").parentElement?.querySelector("a")?.getAttribute("href")).toBe("https://platform.deepseek.com/api_keys");
    expect(screen.getByText("Groq").parentElement?.querySelector("a")?.getAttribute("href")).toBe("https://console.groq.com/keys");
    expect(screen.getByText("OpenRouter").parentElement?.querySelector("a")?.getAttribute("href")).toBe("https://openrouter.ai/keys");
    expect(screen.getByText("Together AI").parentElement?.querySelector("a")?.getAttribute("href")).toBe("https://api.together.xyz/settings/api-keys");
    expect(screen.getByText("Mistral AI").parentElement?.querySelector("a")?.getAttribute("href")).toBe("https://admin.mistral.ai/organization/api-keys");
    expect(screen.getByText("Baseten").parentElement?.querySelector("a")?.getAttribute("href")).toBe("https://www.baseten.co/settings/api-keys");
  });

  it("should not render key link for local provider", () => {
    render(<ProviderSelector {...defaultProps} />);
    const localButton = screen.getByText("Local").closest("button");
    expect(localButton?.querySelector("a")).toBeNull();
  });

  it("should open key links in new tab", () => {
    render(<ProviderSelector {...defaultProps} />);
    const geminiLink = screen.getByText("Google Gemini").parentElement?.querySelector("a");
    expect(geminiLink).toHaveAttribute("target", "_blank");
    expect(geminiLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});

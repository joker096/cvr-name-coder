import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModelConfig } from "../ModelConfig";

describe("ModelConfig", () => {
  const defaultProps = {
    provider: "openai",
    config: {},
    onChange: vi.fn(),
    t: {
      customApiKey: "API Key",
      customBaseUrl: "Base URL",
      localUrl: "Local URL",
      localModelName: "Model Name",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render API key field for OpenAI", () => {
    render(<ModelConfig {...defaultProps} />);

    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("sk-...")).toBeInTheDocument();
  });

  it("should render API key field for Anthropic", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="anthropic"
      />
    );

    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
  });

  it("should render API key and base URL for custom provider", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="custom"
      />
    );

    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
    expect(screen.getByLabelText("Base URL")).toBeInTheDocument();
  });

  it("should render API key and base URL for DeepSeek", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="deepseek"
      />
    );

    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
    expect(screen.getByLabelText("Local URL")).toBeInTheDocument();
    expect(screen.getByText("OFFICIAL")).toBeInTheDocument();
  });

  it("should render API key and base URL for Grok", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="grok"
      />
    );

    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
    expect(screen.getByLabelText("Local URL")).toBeInTheDocument();
    expect(screen.getByText("OFFICIAL")).toBeInTheDocument();
  });

  it("should render API key and base URL for Groq", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="groq"
      />
    );

    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
    expect(screen.getByLabelText("Local URL")).toBeInTheDocument();
    expect(screen.getByText("OFFICIAL")).toBeInTheDocument();
  });

  it("should render local URL and model name for local provider", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="local"
      />
    );

    expect(screen.getByLabelText("Local URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Model Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("http://localhost:11434")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("llama2-7b")).toBeInTheDocument();
  });

  it("should not render any fields for Gemini", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="gemini"
      />
    );

    expect(screen.queryByLabelText("API Key")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Base URL")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Local URL")).not.toBeInTheDocument();
  });

  it("should call onChange when API key is changed", () => {
    render(<ModelConfig {...defaultProps} />);

    const apiKeyInput = screen.getByLabelText("API Key");
    fireEvent.change(apiKeyInput, { target: { value: "sk-test123" } });

    expect(defaultProps.onChange).toHaveBeenCalledWith({ apiKey: "sk-test123" });
  });

  it("should call onChange when base URL is changed", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="custom"
      />
    );

    const baseUrlInput = screen.getByLabelText("Base URL");
    fireEvent.change(baseUrlInput, { target: { value: "https://api.example.com" } });

    expect(defaultProps.onChange).toHaveBeenCalledWith({ baseUrl: "https://api.example.com" });
  });

  it("should call onChange when local URL is changed", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="local"
      />
    );

    const localUrlInput = screen.getByLabelText("Local URL");
    fireEvent.change(localUrlInput, { target: { value: "http://localhost:11434" } });

    expect(defaultProps.onChange).toHaveBeenCalledWith({ localUrl: "http://localhost:11434" });
  });

  it("should call onChange when local model name is changed", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="local"
      />
    );

    const modelNameInput = screen.getByLabelText("Model Name");
    fireEvent.change(modelNameInput, { target: { value: "llama2-7b" } });

    expect(defaultProps.onChange).toHaveBeenCalledWith({ localModelName: "llama2-7b" });
  });

  it("should set official URL when OFFICIAL button is clicked for DeepSeek", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="deepseek"
      />
    );

    const officialButton = screen.getByText("OFFICIAL");
    fireEvent.click(officialButton);

    expect(defaultProps.onChange).toHaveBeenCalledWith({ baseUrl: "https://api.deepseek.com" });
  });

  it("should set official URL when OFFICIAL button is clicked for Grok", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="grok"
      />
    );

    const officialButton = screen.getByText("OFFICIAL");
    fireEvent.click(officialButton);

    expect(defaultProps.onChange).toHaveBeenCalledWith({ baseUrl: "https://api.x.ai/v1" });
  });

  it("should set official URL when OFFICIAL button is clicked for Groq", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="groq"
      />
    );

    const officialButton = screen.getByText("OFFICIAL");
    fireEvent.click(officialButton);

    expect(defaultProps.onChange).toHaveBeenCalledWith({ baseUrl: "https://api.groq.com/openai/v1" });
  });

  it("should apply custom className", () => {
    const { container } = render(
      <ModelConfig
        {...defaultProps}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should render with existing config values", () => {
    render(
      <ModelConfig
        {...defaultProps}
        config={{
          apiKey: "sk-existing",
          baseUrl: "https://api.example.com",
        }}
      />
    );

    const apiKeyInput = screen.getByLabelText("API Key");
    const baseUrlInput = screen.getByLabelText("Base URL");

    expect(apiKeyInput).toHaveValue("sk-existing");
    expect(baseUrlInput).toHaveValue("https://api.example.com");
  });
});

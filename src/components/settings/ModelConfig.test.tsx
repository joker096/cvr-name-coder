import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModelConfig } from "./ModelConfig";

describe("ModelConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  const mockModels = [
    { id: "gpt-4", name: "GPT-4" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  ];

  const defaultProps = {
    provider: "openai" as const,
    config: {},
    models: mockModels,
    onChange: vi.fn(),
    t: {
      customApiKey: "API Key",
      customBaseUrl: "Base URL",
      localUrl: "Local URL",
      modelName: "Model Name",
      selectModel: "Select a model...",
      customModel: "Custom / Other...",
      enterModelName: "Enter model name",
      chatEngineDesc: "AI model for chat",
      apiKeyServerSide: "API keys stored server-side",
      customUrl: "Custom URL",
    },
  };

  it("should render model selector for OpenAI", () => {
    render(<ModelConfig {...defaultProps} />);

    expect(screen.getByText("Model Name")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should render model selector for Anthropic", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="anthropic"
      />
    );

    expect(screen.getByText("Model Name")).toBeInTheDocument();
  });

  it("should render local URL and model name for local provider", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="local"
        models={[]}
      />
    );

    expect(screen.getByPlaceholderText("http://localhost:11434")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("llama3")).toBeInTheDocument();
  });

  it("should render custom URL for custom provider", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="custom"
        models={[]}
      />
    );

    expect(screen.getByPlaceholderText("https://api.example.com")).toBeInTheDocument();
  });

  it("should call onChange when local URL is changed", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="local"
        models={[]}
      />
    );

    const localUrlInput = screen.getByPlaceholderText("http://localhost:11434");
    fireEvent.change(localUrlInput, { target: { value: "http://localhost:11434" } });

    expect(defaultProps.onChange).toHaveBeenCalledWith({ localUrl: "http://localhost:11434" });
  });

  it("should call onChange when local model name is changed", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="local"
        models={[]}
      />
    );

    const modelNameInput = screen.getByPlaceholderText("llama3");
    fireEvent.change(modelNameInput, { target: { value: "llama3" } });

    expect(defaultProps.onChange).toHaveBeenCalledWith({ localModelName: "llama3" });
  });

  it("should call onChange when custom URL is changed", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="custom"
        models={[]}
      />
    );

    const customUrlInput = screen.getByPlaceholderText("https://api.example.com");
    fireEvent.change(customUrlInput, { target: { value: "https://api.example.com" } });

    expect(defaultProps.onChange).toHaveBeenCalledWith({ customUrl: "https://api.example.com" });
  });

  it("should call onChange when model is selected", () => {
    render(<ModelConfig {...defaultProps} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "gpt-4" } });

    expect(defaultProps.onChange).toHaveBeenCalledWith({ aiModel: "gpt-4" });
  });

  it("should show custom model input when custom is selected", () => {
    render(<ModelConfig {...defaultProps} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "__custom__" } });

    expect(screen.getByPlaceholderText("Enter model name")).toBeInTheDocument();
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
          aiModel: "gpt-4",
        }}
      />
    );

    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("gpt-4");
  });

  it("should render with existing local config values", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="local"
        models={[]}
        config={{
          localUrl: "http://localhost:11434",
          localModelName: "llama3",
        }}
      />
    );

    const localUrlInput = screen.getByDisplayValue("http://localhost:11434");
    const modelNameInput = screen.getByPlaceholderText("llama3");

    expect(localUrlInput).toHaveValue("http://localhost:11434");
    expect(modelNameInput).toHaveValue("llama3");
  });

  it("should NOT show generic model input for local provider", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="local"
        models={[]}
        config={{
          localModelName: "mistral",
          aiModel: "gemini-2.5-flash",
        }}
      />
    );

    expect(screen.getByPlaceholderText("llama3")).toHaveValue("mistral");
    expect(screen.queryByDisplayValue("gemini-2.5-flash")).not.toBeInTheDocument();
  });

  it("should show only localModelName, not aiModel, for local provider", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="local"
        models={[]}
      />
    );

    const modelNameLabels = screen.getAllByText("Model Name");
    expect(modelNameLabels.length).toBe(1);
  });

  it("should detect local models and render a dropdown", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [{ name: "llama3.1" }, { name: "mistral-small" }, { name: "qwen2.5" }] }),
    } as Response);

    render(
      <ModelConfig
        {...defaultProps}
        provider="local"
        models={[]}
        config={{
          localUrl: "http://localhost:11434",
          localModelName: "",
          aiModel: "",
        }}
      />
    );

    const select = await screen.findByRole("combobox");
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "qwen2.5" } });
    expect(defaultProps.onChange).toHaveBeenCalledWith({ localModelName: "qwen2.5", aiModel: "qwen2.5" });
  });

  it("should show dropdown (not text input) for non-local provider", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="deepseek"
        models={[]}
        config={{ aiModel: "deepseek-chat" }}
      />
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Enter model name")).not.toBeInTheDocument();
  });

  it("should show model selector when models list is provided", () => {
    render(
      <ModelConfig
        {...defaultProps}
        provider="openai"
        models={[
          { id: "gpt-4", name: "GPT-4" },
          { id: "gpt-4o", name: "GPT-4o" },
        ]}
      />
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("GPT-4")).toBeInTheDocument();
    expect(screen.getByText("GPT-4o")).toBeInTheDocument();
  });
});


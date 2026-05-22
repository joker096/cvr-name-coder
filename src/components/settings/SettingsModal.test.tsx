import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsModal } from "./SettingsModal";
import type { ChatConfig, Preset } from "./../types/settings";

describe("SettingsModal", () => {
  const mockConfig: ChatConfig = {
    aiProvider: "gemini",
    aiModel: "gemini-2.5-pro",
    localUrl: "",
    localModelName: "",
    customKey: "",
    customUrl: "",
  };

  const mockKernelConfig: ChatConfig = {
    aiProvider: "openai",
    aiModel: "gpt-4",
    localUrl: "",
    localModelName: "",
    customKey: "",
    customUrl: "",
  };

  const mockPresets: Preset[] = [
    {
      id: "preset1",
      name: "Development",
      description: "For coding tasks",
      config: mockConfig,
      createdAt: Date.now(),
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    config: mockConfig,
    kernelConfig: mockKernelConfig,
    presets: mockPresets,
    onSave: vi.fn(),
    onPresetSave: vi.fn(),
    onPresetApply: vi.fn(),
    onPresetDelete: vi.fn(),
    t: {
      settings: "Settings",
      chatEngine: "Chat Engine",
      kernelEngine: "Kernel Engine",
      selectProvider: "Select Provider",
      cloudGemini: "Google Gemini",
      openaiProvider: "OpenAI",
      anthropicProvider: "Anthropic",
      deepseekProvider: "DeepSeek",
      grokProvider: "Grok",
      localModel: "Local",
      customProvider: "Custom",
      presets: "Presets",
      createPreset: "Create Preset",
      cancel: "Cancel",
      presetName: "Preset Name",
      presetDescription: "Description (optional)",
      savePreset: "Save Preset",
      noPresets: "No presets saved yet",
      noDescription: "No description",
      applyPreset: "Apply Preset",
      deletePreset: "Delete Preset",
      customApiKey: "API Key",
      customBaseUrl: "Base URL",
      localUrl: "Local URL",
      localModelName: "Model Name",
      mcpSettings: "MCP settings coming soon",
      mcpTools: "MCP Tools",
      howToAddMcp: "How to add MCP servers",
      mcpStep1: "Step 1",
      mcpStep2: "Step 2",
      mcpStep3: "Step 3",
      mcpServerOutbound: "Expose cvr.name as MCP server",
      mcpOutboundDesc: "Desc",
      mcpEndpoints: "API Endpoints",
      mcpGetConfig: "List servers",
      mcpSetConfig: "Update config",
      mcpCallTool: "Call tool",
      mcpRefresh: "Restart servers",
      save: "Save",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when isOpen is false", () => {
    render(
      <SettingsModal
        {...defaultProps}
        isOpen={false}
      />
    );

    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("should render when isOpen is true", () => {
    render(<SettingsModal {...defaultProps} />);

    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("should call onClose when close button is clicked", () => {
    render(<SettingsModal {...defaultProps} />);

    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("should call onClose when backdrop is clicked", () => {
    const { container } = render(<SettingsModal {...defaultProps} />);

    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("should render tabs", () => {
    render(<SettingsModal {...defaultProps} />);

    expect(screen.getByText("Chat Engine")).toBeInTheDocument();
    expect(screen.getByText("Kernel Engine")).toBeInTheDocument();
    expect(screen.getByText("MCP")).toBeInTheDocument();
  });

  it("should switch tabs when tab is clicked", () => {
    render(<SettingsModal {...defaultProps} />);

    const kernelTab = screen.getByText("Kernel Engine");
    fireEvent.click(kernelTab);

    expect(screen.getByText("OpenAI")).toBeInTheDocument();
  });

  it("should render provider selector", () => {
    render(<SettingsModal {...defaultProps} />);

    expect(screen.getByText("Google Gemini")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
  });

  it("should render model config", () => {
    render(<SettingsModal {...defaultProps} />);

    expect(screen.getByText("API Key")).toBeInTheDocument();
  });

  it("should render preset manager", () => {
    render(<SettingsModal {...defaultProps} />);

    expect(screen.getByText("Presets")).toBeInTheDocument();
    expect(screen.getByText("Development")).toBeInTheDocument();
  });

  it("should call onSave when save button is clicked", () => {
    render(<SettingsModal {...defaultProps} />);

    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    expect(defaultProps.onSave).toHaveBeenCalledWith(mockConfig, mockKernelConfig);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("should call onClose when cancel button is clicked", () => {
    render(<SettingsModal {...defaultProps} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("should render MCP tab content", () => {
    render(<SettingsModal {...defaultProps} />);

    const mcpTab = screen.getByText("MCP");
    fireEvent.click(mcpTab);

    expect(screen.getByText("MCP Tools")).toBeInTheDocument();
  });

  it("should render MCP setup instructions", () => {
    render(<SettingsModal {...defaultProps} />);

    const mcpTab = screen.getByText("MCP");
    fireEvent.click(mcpTab);

    expect(screen.getByText("How to add MCP servers")).toBeInTheDocument();
    expect(screen.getByText("Expose cvr.name as MCP server")).toBeInTheDocument();
    expect(screen.getByText("API Endpoints")).toBeInTheDocument();
  });

  it("should render MCP API endpoints list", () => {
    render(<SettingsModal {...defaultProps} />);

    const mcpTab = screen.getByText("MCP");
    fireEvent.click(mcpTab);

    expect(screen.getByText(/List servers/)).toBeInTheDocument();
    expect(screen.getByText(/Update config/)).toBeInTheDocument();
    expect(screen.getByText(/Call tool/)).toBeInTheDocument();
    expect(screen.getByText(/Restart servers/)).toBeInTheDocument();
  });

  it("should render MCP config example", () => {
    render(<SettingsModal {...defaultProps} />);

    const mcpTab = screen.getByText("MCP");
    fireEvent.click(mcpTab);

    expect(screen.getByText(/my-server/)).toBeInTheDocument();
    expect(screen.getByText(/@scope\/mcp-server/)).toBeInTheDocument();
    expect(screen.getByText(/"enabled": true/)).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <SettingsModal
        {...defaultProps}
        className="custom-class"
      />
    );

    const modal = container.querySelector('[class*="bg-dash-bg"]');
    expect(modal).toHaveClass("custom-class");
  });

  it("should handle provider change", () => {
    render(<SettingsModal {...defaultProps} />);

    const openaiButton = screen.getByText("OpenAI").closest("button");
    fireEvent.click(openaiButton!);

    expect(screen.getByText("API Key")).toBeInTheDocument();
  });

  it("should handle preset save", () => {
    render(<SettingsModal {...defaultProps} />);

    const createButton = screen.getByText("Create Preset");
    fireEvent.click(createButton);

    const nameInput = screen.getByPlaceholderText("Preset Name");
    fireEvent.change(nameInput, { target: { value: "New Preset" } });

    const saveButton = screen.getByText("Save Preset");
    fireEvent.click(saveButton);

    expect(defaultProps.onPresetSave).toHaveBeenCalled();
  });

  it("should handle preset apply", () => {
    render(<SettingsModal {...defaultProps} />);

    const applyButtons = screen.getAllByTitle("Apply Preset");
    fireEvent.click(applyButtons[0]);

    expect(defaultProps.onPresetApply).toHaveBeenCalledWith(mockPresets[0]);
  });

  it("should handle preset delete", () => {
    render(<SettingsModal {...defaultProps} />);

    const deleteButtons = screen.getAllByTitle("Delete Preset");
    fireEvent.click(deleteButtons[0]);

    expect(defaultProps.onPresetDelete).toHaveBeenCalledWith("preset1");
  });

  it("should render with Russian language", () => {
    render(
      <SettingsModal
        {...defaultProps}
        lang="ru"
      />
    );

    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("should render with English language", () => {
    render(
      <SettingsModal
        {...defaultProps}
        lang="en"
      />
    );

    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});

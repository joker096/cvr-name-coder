import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PresetManager } from "./PresetManager";
import type { Preset, ChatConfig } from "./../types/settings";

describe("PresetManager", () => {
  const mockConfig: ChatConfig = {
    aiProvider: "gemini",
    aiModel: "gemini-2.5-pro",
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
      config: {
        aiProvider: "openai",
        aiModel: "gpt-4",
        localUrl: "",
        localModelName: "",
        customKey: "",
        customUrl: "",
      },
      createdAt: Date.now(),
    },
    {
      id: "preset2",
      name: "Writing",
      description: "For content creation",
      config: mockConfig,
      createdAt: Date.now(),
    },
  ];

  const defaultProps = {
    presets: mockPresets,
    currentConfig: mockConfig,
    onSavePreset: vi.fn(),
    onApplyPreset: vi.fn(),
    onDeletePreset: vi.fn(),
    t: {
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
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all presets", () => {
    render(<PresetManager {...defaultProps} />);

    expect(screen.getByText("Development")).toBeInTheDocument();
    expect(screen.getByText("Writing")).toBeInTheDocument();
  });

  it("should render empty state when no presets", () => {
    render(
      <PresetManager
        {...defaultProps}
        presets={[]}
      />
    );

    expect(screen.getByText("No presets saved yet")).toBeInTheDocument();
  });

  it("should show create form when Create Preset is clicked", () => {
    render(<PresetManager {...defaultProps} />);

    const createButton = screen.getByText("Create Preset");
    fireEvent.click(createButton);

    expect(screen.getByPlaceholderText("Preset Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Description (optional)")).toBeInTheDocument();
    expect(screen.getByText("Save Preset")).toBeInTheDocument();
  });

  it("should hide create form when Cancel is clicked", () => {
    render(<PresetManager {...defaultProps} />);

    const createButton = screen.getByText("Create Preset");
    fireEvent.click(createButton);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(screen.queryByPlaceholderText("Preset Name")).not.toBeInTheDocument();
  });

  it("should call onSavePreset when preset is saved", () => {
    render(<PresetManager {...defaultProps} />);

    const createButton = screen.getByText("Create Preset");
    fireEvent.click(createButton);

    const nameInput = screen.getByPlaceholderText("Preset Name");
    fireEvent.change(nameInput, { target: { value: "New Preset" } });

    const saveButton = screen.getByText("Save Preset");
    fireEvent.click(saveButton);

    expect(defaultProps.onSavePreset).toHaveBeenCalledWith({
      name: "New Preset",
      description: "",
      config: mockConfig,
    });
  });

  it("should not save preset with empty name", () => {
    render(<PresetManager {...defaultProps} />);

    const createButton = screen.getByText("Create Preset");
    fireEvent.click(createButton);

    const saveButton = screen.getByText("Save Preset");
    fireEvent.click(saveButton);

    expect(defaultProps.onSavePreset).not.toHaveBeenCalled();
  });

  it("should disable save button when name is empty", () => {
    render(<PresetManager {...defaultProps} />);

    const createButton = screen.getByText("Create Preset");
    fireEvent.click(createButton);

    const saveButton = screen.getByText("Save Preset");
    expect(saveButton).toBeDisabled();
  });

  it("should call onApplyPreset when apply button is clicked", () => {
    render(<PresetManager {...defaultProps} />);

    const applyButtons = screen.getAllByTitle("Apply Preset");
    fireEvent.click(applyButtons[0]);

    expect(defaultProps.onApplyPreset).toHaveBeenCalledWith(mockPresets[0]);
  });

  it("should call onDeletePreset when delete button is clicked", () => {
    render(<PresetManager {...defaultProps} />);

    const deleteButtons = screen.getAllByTitle("Delete Preset");
    fireEvent.click(deleteButtons[0]);

    expect(defaultProps.onDeletePreset).toHaveBeenCalledWith("preset1");
  });

  it("should highlight current config preset", () => {
    render(<PresetManager {...defaultProps} />);

    const writingPreset = screen.getByText("Writing").closest("div[class*='bg-dash-accent/10']");
    expect(writingPreset).toBeInTheDocument();
  });

  it("should not highlight non-current config preset", () => {
    render(<PresetManager {...defaultProps} />);

    const developmentPreset = screen.getByText("Development").closest("div[class*='bg-dash-surface']");
    expect(developmentPreset).toBeInTheDocument();
  });

  it("should show check icon for current config preset", () => {
    render(<PresetManager {...defaultProps} />);

    const checkIcons = document.querySelectorAll("svg");
    const checkIcon = Array.from(checkIcons).find((icon) =>
      icon.getAttribute("class")?.includes("text-dash-success")
    );
    expect(checkIcon).toBeDefined();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <PresetManager
        {...defaultProps}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should render preset description", () => {
    render(<PresetManager {...defaultProps} />);

    expect(screen.getByText("For coding tasks")).toBeInTheDocument();
    expect(screen.getByText("For content creation")).toBeInTheDocument();
  });

  it("should render preset config info", () => {
    render(<PresetManager {...defaultProps} />);

    expect(screen.getByText("openai / gpt-4")).toBeInTheDocument();
    expect(screen.getByText("gemini / gemini-2.5-pro")).toBeInTheDocument();
  });

  it("should handle preset with no description", () => {
    const presetWithoutDescription: Preset = {
      ...mockPresets[0],
      description: "",
    };

    render(
      <PresetManager
        {...defaultProps}
        presets={[presetWithoutDescription]}
      />
    );

    expect(screen.getByText("No description")).toBeInTheDocument();
  });
});

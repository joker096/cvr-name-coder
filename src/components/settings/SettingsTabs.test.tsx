import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsTabs, type SettingsTabConfig } from "./SettingsTabs";

describe("SettingsTabs", () => {
  const mockTabs: SettingsTabConfig[] = [
    { id: "chat", label: "Chat Engine" },
    { id: "kernel", label: "Kernel Engine" },
    { id: "mcp", label: "MCP" },
  ];

  const defaultProps = {
    tabs: mockTabs,
    activeTab: "chat" as const,
    onTabChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all tabs", () => {
    render(<SettingsTabs {...defaultProps} />);

    expect(screen.getByText("Chat Engine")).toBeInTheDocument();
    expect(screen.getByText("Kernel Engine")).toBeInTheDocument();
    expect(screen.getByText("MCP")).toBeInTheDocument();
  });

  it("should highlight active tab", () => {
    render(<SettingsTabs {...defaultProps} />);

    const chatTab = screen.getByText("Chat Engine");
    expect(chatTab).toHaveClass("bg-dash-accent", "text-white", "shadow-lg");
  });

  it("should not highlight inactive tab", () => {
    render(<SettingsTabs {...defaultProps} />);

    const kernelTab = screen.getByText("Kernel Engine");
    expect(kernelTab).not.toHaveClass("bg-dash-accent", "text-white", "shadow-lg");
    expect(kernelTab).toHaveClass("text-dash-text-muted");
  });

  it("should call onTabChange when tab is clicked", () => {
    render(<SettingsTabs {...defaultProps} />);

    const kernelTab = screen.getByText("Kernel Engine");
    kernelTab.click();

    expect(defaultProps.onTabChange).toHaveBeenCalledWith("kernel");
  });

  it("should apply custom className", () => {
    const { container } = render(
      <SettingsTabs
        {...defaultProps}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should render in flex layout", () => {
    const { container } = render(<SettingsTabs {...defaultProps} />);

    expect(container.firstChild).toHaveClass("flex", "gap-2");
  });

  it("should set aria-pressed for active tab", () => {
    render(<SettingsTabs {...defaultProps} />);

    const chatTab = screen.getByText("Chat Engine");
    expect(chatTab).toHaveAttribute("aria-pressed", "true");

    const kernelTab = screen.getByText("Kernel Engine");
    expect(kernelTab).toHaveAttribute("aria-pressed", "false");
  });

  it("should set role tab for all tabs", () => {
    render(<SettingsTabs {...defaultProps} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
  });

  it("should handle empty tabs array", () => {
    render(
      <SettingsTabs
        {...defaultProps}
        tabs={[]}
      />
    );

    expect(screen.queryByText("Chat Engine")).not.toBeInTheDocument();
  });

  it("should handle single tab", () => {
    render(
      <SettingsTabs
        {...defaultProps}
        tabs={[mockTabs[0]]}
      />
    );

    expect(screen.getByText("Chat Engine")).toBeInTheDocument();
    expect(screen.queryByText("Kernel Engine")).not.toBeInTheDocument();
  });

  it("should switch active tab", () => {
    const { rerender } = render(<SettingsTabs {...defaultProps} />);

    const chatTab = screen.getByText("Chat Engine");
    expect(chatTab).toHaveClass("bg-dash-accent");

    rerender(
      <SettingsTabs
        {...defaultProps}
        activeTab="kernel"
      />
    );

    const kernelTab = screen.getByText("Kernel Engine");
    expect(kernelTab).toHaveClass("bg-dash-accent");
  });

  it("should apply hover styles to inactive tabs", () => {
    render(<SettingsTabs {...defaultProps} />);

    const kernelTab = screen.getByText("Kernel Engine");
    expect(kernelTab).toHaveClass("hover:text-white", "hover:bg-neutral-800/50");
  });
});

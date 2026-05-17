import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryPanel } from "../MemoryPanel";
import type { Memory } from "../../types/chat";

describe("MemoryPanel", () => {
  const mockMemories: Memory[] = [
    {
      id: "mem1",
      content: "Test memory 1",
      timestamp: Date.now(),
    },
    {
      id: "mem2",
      content: "Test memory 2",
      timestamp: Date.now(),
    },
  ];

  const defaultProps = {
    memories: mockMemories,
    lang: "en",
    t: {
      memoryClusters: "Memory Clusters",
      noMemory: "No memory clusters yet",
    },
  };

  it("should render memory panel", () => {
    render(<MemoryPanel {...defaultProps} />);

    expect(screen.getByText("Memory Clusters")).toBeInTheDocument();
  });

  it("should render all memories", () => {
    render(<MemoryPanel {...defaultProps} />);

    expect(screen.getByText("Test memory 1")).toBeInTheDocument();
    expect(screen.getByText("Test memory 2")).toBeInTheDocument();
  });

  it("should render empty state when no memories", () => {
    render(
      <MemoryPanel
        {...defaultProps}
        memories={[]}
      />
    );

    expect(screen.getByText("No memory clusters yet")).toBeInTheDocument();
  });

  it("should render memories in reverse order", () => {
    const { container } = render(<MemoryPanel {...defaultProps} />);

    const memoryCards = container.querySelectorAll('[class*="border-l-2"]');
    expect(memoryCards).toHaveLength(2);

    const firstCard = memoryCards[0];
    const secondCard = memoryCards[1];

    expect(firstCard.textContent).toContain("Test memory 2");
    expect(secondCard.textContent).toContain("Test memory 1");
  });

  it("should render history icon", () => {
    const { container } = render(<MemoryPanel {...defaultProps} />);

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <MemoryPanel
        {...defaultProps}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should render with Russian language", () => {
    render(
      <MemoryPanel
        {...defaultProps}
        lang="ru"
      />
    );

    expect(screen.getByText("Memory Clusters")).toBeInTheDocument();
  });

  it("should render with English language", () => {
    render(
      <MemoryPanel
        {...defaultProps}
        lang="en"
      />
    );

    expect(screen.getByText("Memory Clusters")).toBeInTheDocument();
  });

  it("should render memory cards with correct content", () => {
    render(<MemoryPanel {...defaultProps} />);

    expect(screen.getByText("Test memory 1")).toBeInTheDocument();
    expect(screen.getByText("Test memory 2")).toBeInTheDocument();
  });

  it("should render in flex layout", () => {
    const { container } = render(<MemoryPanel {...defaultProps} />);

    expect(container.firstChild).toHaveClass("flex", "flex-col", "gap-3");
  });

  it("should render memory clusters label", () => {
    render(<MemoryPanel {...defaultProps} />);

    const label = screen.getByText("Memory Clusters");
    expect(label).toHaveClass("text-[13px]", "uppercase", "tracking-widest", "text-dash-text-label", "font-extrabold");
  });

  it("should render empty state with correct styling", () => {
    render(
      <MemoryPanel
        {...defaultProps}
        memories={[]}
      />
    );

    const emptyState = screen.getByText("No memory clusters yet");
    expect(emptyState).toHaveClass("p-2", "text-[10px]", "text-dash-text-muted", "italic", "border", "border-dashed", "border-dash-border", "rounded", "text-center");
  });
});

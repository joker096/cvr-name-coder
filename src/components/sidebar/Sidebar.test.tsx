import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar, type SidebarTab } from "../Sidebar";
import type { Memory } from "../../types/chat";
import type { Skill } from "../SkillsPanel";

describe("Sidebar", () => {
  const mockMemories: Memory[] = [
    {
      id: "mem1",
      content: "Test memory",
      timestamp: Date.now(),
    },
  ];

  const mockSkills: Skill[] = [
    {
      id: "skill1",
      name: "Test Skill",
      description: "Test description",
      icon: () => <span>⚙️</span>,
      status: "learned",
      category: "research",
    },
  ];

  const defaultProps = {
    isOpen: true,
    activeTab: "memory" as SidebarTab,
    onTabChange: vi.fn(),
    memories: mockMemories,
    skills: mockSkills,
    onLearnSkill: vi.fn(),
    lang: "en",
    t: {
      memory: "Memory",
      skills: "Skills",
      memoryClusters: "Memory Clusters",
      noMemory: "No memory",
      learnedSkills: "Learned Skills",
      skillStore: "Skill Store",
      noLearnedSkills: "No learned skills",
      noAvailableSkills: "No available skills",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render sidebar when isOpen is true", () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("Skills")).toBeInTheDocument();
  });

  it("should not render sidebar when isOpen is false", () => {
    render(
      <Sidebar
        {...defaultProps}
        isOpen={false}
      />
    );

    expect(screen.queryByText("Memory")).not.toBeInTheDocument();
  });

  it("should render memory panel when activeTab is memory", () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText("Memory Clusters")).toBeInTheDocument();
    expect(screen.getByText("Test memory")).toBeInTheDocument();
  });

  it("should render skills panel when activeTab is skills", () => {
    render(
      <Sidebar
        {...defaultProps}
        activeTab="skills"
      />
    );

    expect(screen.getByText("Learned Skills")).toBeInTheDocument();
    expect(screen.getByText("Test Skill")).toBeInTheDocument();
  });

  it("should call onTabChange when memory tab is clicked", () => {
    render(
      <Sidebar
        {...defaultProps}
        activeTab="skills"
      />
    );

    const memoryTab = screen.getByText("Memory");
    fireEvent.click(memoryTab);

    expect(defaultProps.onTabChange).toHaveBeenCalledWith("memory");
  });

  it("should call onTabChange when skills tab is clicked", () => {
    render(<Sidebar {...defaultProps} />);

    const skillsTab = screen.getByText("Skills");
    fireEvent.click(skillsTab);

    expect(defaultProps.onTabChange).toHaveBeenCalledWith("skills");
  });

  it("should highlight active tab", () => {
    render(<Sidebar {...defaultProps} />);

    const memoryTab = screen.getByText("Memory");
    expect(memoryTab).toHaveClass("bg-dash-accent/10", "text-dash-accent");

    const skillsTab = screen.getByText("Skills");
    expect(skillsTab).not.toHaveClass("bg-dash-accent/10", "text-dash-accent");
  });

  it("should set aria-pressed for active tab", () => {
    render(<Sidebar {...defaultProps} />);

    const memoryTab = screen.getByText("Memory");
    expect(memoryTab).toHaveAttribute("aria-pressed", "true");

    const skillsTab = screen.getByText("Skills");
    expect(skillsTab).toHaveAttribute("aria-pressed", "false");
  });

  it("should set role tab for tabs", () => {
    render(<Sidebar {...defaultProps} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
  });

  it("should apply custom className", () => {
    const { container } = render(
      <Sidebar
        {...defaultProps}
        className="custom-class"
      />
    );

    const sidebar = container.querySelector('[class*="w-72"]');
    expect(sidebar).toHaveClass("custom-class");
  });

  it("should render with fixed width", () => {
    const { container } = render(<Sidebar {...defaultProps} />);

    const sidebar = container.querySelector('[class*="w-72"]');
    expect(sidebar).toBeInTheDocument();
  });

  it("should render with border", () => {
    const { container } = render(<Sidebar {...defaultProps} />);

    const sidebar = container.querySelector('[class*="border-r"]');
    expect(sidebar).toBeInTheDocument();
  });

  it("should render in flex layout", () => {
    const { container } = render(<Sidebar {...defaultProps} />);

    const sidebar = container.querySelector('[class*="flex"]');
    expect(sidebar).toBeInTheDocument();
  });

  it("should call onLearnSkill when skill is learned", () => {
    render(
      <Sidebar
        {...defaultProps}
        activeTab="skills"
        skills={[
          {
            ...mockSkills[0],
            status: "available",
          },
        ]}
      />
    );

    const learnButton = screen.getByLabelText("Learn Test Skill");
    fireEvent.click(learnButton);

    expect(defaultProps.onLearnSkill).toHaveBeenCalledWith("skill1");
  });

  it("should render with Russian language", () => {
    render(
      <Sidebar
        {...defaultProps}
        lang="ru"
      />
    );

    expect(screen.getByText("Memory")).toBeInTheDocument();
  });

  it("should render with English language", () => {
    render(
      <Sidebar
        {...defaultProps}
        lang="en"
      />
    );

    expect(screen.getByText("Memory")).toBeInTheDocument();
  });

  it("should render empty state for memories", () => {
    render(
      <Sidebar
        {...defaultProps}
        memories={[]}
      />
    );

    expect(screen.getByText("No memory")).toBeInTheDocument();
  });

  it("should render empty state for skills", () => {
    render(
      <Sidebar
        {...defaultProps}
        activeTab="skills"
        skills={[]}
      />
    );

    expect(screen.getByText("No learned skills yet")).toBeInTheDocument();
  });
});

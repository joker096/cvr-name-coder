import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar, type SidebarTab } from "./Sidebar.tsx";

vi.mock("../../hooks/usePersistentMemory", () => ({
  usePersistentMemory: () => ({
    memory: { raw: "", sections: {} },
    user: { raw: "", sections: {} },
    loading: false,
    saving: false,
    saveMemory: vi.fn(),
    saveUser: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("../../hooks/useSessionSearch", () => ({
  useSessionSearch: () => ({ results: [], loading: false, search: vi.fn(), clear: vi.fn() }),
  useSessions: () => ({ sessions: [], loading: false, fetchSessions: vi.fn(), createSession: vi.fn(), deleteSessionById: vi.fn() }),
}));

vi.mock("../../hooks/useCron", () => ({
  useCron: () => ({ tasks: [], addTask: vi.fn(), removeTask: vi.fn(), toggleTask: vi.fn() }),
}));

describe("Sidebar", () => {
  const mockSkills = [
    {
      id: "skill1",
      name: "Test Skill",
      description: "Test description",
      icon: () => <span>⚙️</span>,
      status: "learned" as const,
      category: "research" as const,
    },
  ];

  const defaultProps = {
    isOpen: true,
    activeTab: "memory" as SidebarTab,
    onTabChange: vi.fn(),
    skills: mockSkills,
    onLearnSkill: vi.fn(),
    t: {
      memory: "Memory",
      skills: "Skills",
      sessions: "Sessions",
      cron: "Cron",
      plugins: "Plugins",
      rules: "Rules",
      persistentMemory: "Persistent Memory",
      userPreferences: "User Preferences",
      user: "User",
      noMemory: "No persistent memory yet.",
      learnedSkills: "Learned Skills",
      skillStore: "Skill Store",
      noLearnedSkills: "No learned skills",
      noAvailableSkills: "No available skills",
    },
  };

  it("should render sidebar when open", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByRole("tab", { name: /Memory/i })).toBeInTheDocument();
  });

  it("should render all tabs", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByRole("tab", { name: /Memory/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Skills/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Sessions/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Cron/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Plugins/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Rules/i })).toBeInTheDocument();
  });

  it("should call onTabChange when tab clicked", () => {
    render(<Sidebar {...defaultProps} />);
    const skillsTab = screen.getByRole("tab", { name: /Skills/i });
    fireEvent.click(skillsTab);
    expect(defaultProps.onTabChange).toHaveBeenCalledWith("skills");
  });

  it("should highlight active tab", () => {
    render(<Sidebar {...defaultProps} />);
    const memoryTab = screen.getByRole("tab", { name: /Memory/i });
    expect(memoryTab).toHaveClass("bg-dash-accent/10");
  });
});

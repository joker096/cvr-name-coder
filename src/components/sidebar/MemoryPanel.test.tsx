import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryPanel } from "./MemoryPanel.tsx";

// Mock the hook
vi.mock("../../hooks/usePersistentMemory", () => ({
  usePersistentMemory: () => ({
    memory: {
      raw: "# Key Facts\nProject uses React",
      sections: { "Key Facts": "Project uses React" },
    },
    user: {
      raw: "# Preferences\nDark mode",
      sections: { "Preferences": "Dark mode" },
    },
    loading: false,
    saving: false,
    saveMemory: vi.fn(),
    saveUser: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("MemoryPanel", () => {
  const defaultProps = {
    t: {
      persistentMemory: "Persistent Memory",
      userPreferences: "User Preferences",
      memory: "Memory",
      user: "User",
      noMemory: "No persistent memory yet.",
      edit: "Edit",
      save: "Save",
      cancel: "Cancel",
      refresh: "Refresh",
    },
  };

  it("should render memory panel", () => {
    render(<MemoryPanel {...defaultProps} />);
    expect(screen.getByText("Persistent Memory")).toBeInTheDocument();
  });

  it("should render memory sections", () => {
    render(<MemoryPanel {...defaultProps} />);
    expect(screen.getByText("Key Facts")).toBeInTheDocument();
    expect(screen.getByText("Project uses React")).toBeInTheDocument();
  });

  it("should switch to user tab", () => {
    render(<MemoryPanel {...defaultProps} />);
    const userTab = screen.getByText("User");
    fireEvent.click(userTab);
    expect(screen.getByText("User Preferences")).toBeInTheDocument();
  });
});

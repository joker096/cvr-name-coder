import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionsPanel } from "./SessionsPanel.tsx";

vi.mock("../../hooks/useSessionSearch", () => ({
  useSessionSearch: () => ({
    results: [],
    loading: false,
    search: vi.fn(),
    clear: vi.fn(),
  }),
  useSessions: () => ({
    sessions: [
      { id: "s1", title: "Test Session", createdAt: Date.now(), updatedAt: Date.now() },
    ],
    loading: false,
    fetchSessions: vi.fn(),
    createSession: vi.fn(),
    deleteSessionById: vi.fn(),
  }),
}));

describe("SessionsPanel", () => {
  const defaultProps = {
    t: {
      sessions: "Sessions",
      searchSessions: "Search sessions...",
      allSessions: "All Sessions",
      noSessions: "No sessions yet",
      refresh: "Refresh",
      delete: "Delete",
    },
  };

  it("should render sessions panel", () => {
    render(<SessionsPanel {...defaultProps} />);
    expect(screen.getByText("Sessions")).toBeInTheDocument();
  });

  it("should render session list", () => {
    render(<SessionsPanel {...defaultProps} />);
    expect(screen.getByText("Test Session")).toBeInTheDocument();
  });
});

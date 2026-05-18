import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CronPanel } from "./CronPanel.tsx";

vi.mock("../../hooks/useCron", () => ({
  useCron: () => ({
    tasks: [
      { id: "t1", name: "Backup", schedule: "every 1 hour", command: "agent:backup", enabled: true },
    ],
    addTask: vi.fn(),
    removeTask: vi.fn(),
    toggleTask: vi.fn(),
  }),
}));

describe("CronPanel", () => {
  const defaultProps = {
    t: {
      scheduledTasks: "Scheduled Tasks",
      addTask: "Add Task",
      taskName: "Task name",
      schedule: "Schedule",
      command: "Command",
      save: "Save",
      cancel: "Cancel",
      noTasks: "No scheduled tasks",
      enable: "Enable",
      disable: "Disable",
      delete: "Delete",
    },
  };

  it("should render cron panel", () => {
    render(<CronPanel {...defaultProps} />);
    expect(screen.getByText("Scheduled Tasks")).toBeInTheDocument();
  });

  it("should show add task form", () => {
    render(<CronPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Add Task"));
    expect(screen.getByPlaceholderText("Task name")).toBeInTheDocument();
  });

  it("should render existing tasks", () => {
    render(<CronPanel {...defaultProps} />);
    expect(screen.getByText("Backup")).toBeInTheDocument();
  });
});

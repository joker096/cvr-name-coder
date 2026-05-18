import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RulesPanel } from "./RulesPanel.tsx";

describe("RulesPanel", () => {
  const defaultProps = {
    t: {
      rules: "Rules",
      noRules: "No rules configured",
      priority: "Priority",
      view: "View",
      close: "Close",
      loading: "Loading...",
    },
  };

  it("should render rules panel", () => {
    render(<RulesPanel {...defaultProps} />);
    expect(screen.getByText("Rules")).toBeInTheDocument();
  });
});

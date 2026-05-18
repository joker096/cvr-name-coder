import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PluginsPanel } from "./PluginsPanel.tsx";

describe("PluginsPanel", () => {
  const defaultProps = {
    t: {
      plugins: "Plugins",
      noPlugins: "No plugins installed",
      enable: "Enable",
      disable: "Disable",
      loading: "Loading...",
    },
  };

  it("should render plugins panel", () => {
    render(<PluginsPanel {...defaultProps} />);
    expect(screen.getByText("Plugins")).toBeInTheDocument();
  });
});

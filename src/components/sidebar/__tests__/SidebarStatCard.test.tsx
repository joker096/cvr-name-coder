import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarStatCard } from "../SidebarStatCard";

describe("SidebarStatCard", () => {
  it("renders label and value", () => {
    render(<SidebarStatCard label="Skills" value={440} />);
    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("440")).toBeInTheDocument();
  });

  it("renders string values correctly", () => {
    render(<SidebarStatCard label="Memory" value="3 items" />);
    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("3 items")).toBeInTheDocument();
  });

  it("has compact padding class (p-2)", () => {
    const { container } = render(<SidebarStatCard label="Test" value={1} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("p-2");
  });

  it("has compact font size for value (text-sm)", () => {
    const { container } = render(<SidebarStatCard label="Test" value={1} />);
    const valueEl = container.querySelector(".font-bold");
    expect(valueEl?.className).toContain("text-sm");
  });

  it("has compact label styling (text-[9px])", () => {
    const { container } = render(<SidebarStatCard label="Test" value={1} />);
    const labelEl = container.querySelector(".uppercase");
    expect(labelEl?.className).toContain("text-[9px]");
  });

  it("has reduced tracking (tracking-[1px])", () => {
    const { container } = render(<SidebarStatCard label="Test" value={1} />);
    const labelEl = container.querySelector(".uppercase");
    expect(labelEl?.className).toContain("tracking-[1px]");
  });

  it("has smaller bottom margin on label (mb-0.5)", () => {
    const { container } = render(<SidebarStatCard label="Test" value={1} />);
    const labelEl = container.querySelector(".uppercase");
    expect(labelEl?.className).toContain("mb-0.5");
  });

  it("applies custom className", () => {
    const { container } = render(<SidebarStatCard label="Test" value={1} className="custom-class" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("custom-class");
  });

  it("renders zero value", () => {
    render(<SidebarStatCard label="Items" value={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SkillsPanel, type Skill } from "../SkillsPanel";
import { Settings, Zap } from "lucide-react";

describe("SkillsPanel", () => {
  const mockSkills: Skill[] = [
    {
      id: "skill1",
      name: "Code Analysis",
      description: "Analyze code patterns",
      icon: Settings,
      status: "learned",
      category: "research",
    },
    {
      id: "skill2",
      name: "API Design",
      description: "Design REST APIs",
      icon: Zap,
      status: "available",
      category: "devops",
    },
  ];

  const defaultProps = {
    skills: mockSkills,
    onLearnSkill: vi.fn(),
    t: {
      learnedSkills: "Learned Skills",
      skillStore: "Skill Store",
      noLearnedSkills: "No learned skills yet",
      noAvailableSkills: "No available skills",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render skills panel", () => {
    render(<SkillsPanel {...defaultProps} />);

    expect(screen.getByText("Learned Skills")).toBeInTheDocument();
    expect(screen.getByText("Skill Store")).toBeInTheDocument();
  });

  it("should render learned skills", () => {
    render(<SkillsPanel {...defaultProps} />);

    expect(screen.getByText("Code Analysis")).toBeInTheDocument();
    expect(screen.getByText("Analyze code patterns")).toBeInTheDocument();
  });

  it("should render available skills", () => {
    render(<SkillsPanel {...defaultProps} />);

    expect(screen.getByText("API Design")).toBeInTheDocument();
    expect(screen.getByText("Design REST APIs")).toBeInTheDocument();
  });

  it("should render empty state for learned skills", () => {
    render(
      <SkillsPanel
        {...defaultProps}
        skills={[mockSkills[1]]}
      />
    );

    expect(screen.getByText("No learned skills yet")).toBeInTheDocument();
  });

  it("should render empty state for available skills", () => {
    render(
      <SkillsPanel
        {...defaultProps}
        skills={[mockSkills[0]]}
      />
    );

    expect(screen.getByText("No available skills")).toBeInTheDocument();
  });

  it("should call onLearnSkill when learn button is clicked", () => {
    render(<SkillsPanel {...defaultProps} />);

    const learnButton = screen.getByLabelText("Learn API Design");
    fireEvent.click(learnButton);

    expect(defaultProps.onLearnSkill).toHaveBeenCalledWith("skill2");
  });

  it("should render learned skills with accent styling", () => {
    const { container } = render(<SkillsPanel {...defaultProps} />);

    const learnedSkill = container.querySelector('[class*="border-dash-accent/20"]');
    expect(learnedSkill).toBeInTheDocument();
  });

  it("should render available skills with muted styling", () => {
    const { container } = render(<SkillsPanel {...defaultProps} />);

    const availableSkill = container.querySelector('[class*="opacity-60"]');
    expect(availableSkill).toBeInTheDocument();
  });

  it("should render icons for skills", () => {
    const { container } = render(<SkillsPanel {...defaultProps} />);

    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("should render Rocket icon for learned skills", () => {
    const { container } = render(<SkillsPanel {...defaultProps} />);

    const rocketIcon = container.querySelector('[class*="text-dash-text-label"]');
    expect(rocketIcon).toBeInTheDocument();
  });

  it("should render Compass icon for skill store", () => {
    const { container } = render(<SkillsPanel {...defaultProps} />);

    const compassIcon = container.querySelector('[class*="text-dash-accent"]');
    expect(compassIcon).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <SkillsPanel
        {...defaultProps}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should render in space-y layout", () => {
    const { container } = render(<SkillsPanel {...defaultProps} />);

    expect(container.firstChild).toHaveClass("space-y-4");
  });

  it("should render skill descriptions", () => {
    render(<SkillsPanel {...defaultProps} />);

    expect(screen.getByText("Analyze code patterns")).toBeInTheDocument();
    expect(screen.getByText("Design REST APIs")).toBeInTheDocument();
  });

  it("should render skill names", () => {
    render(<SkillsPanel {...defaultProps} />);

    expect(screen.getByText("Code Analysis")).toBeInTheDocument();
    expect(screen.getByText("API Design")).toBeInTheDocument();
  });

  it("should not call onLearnSkill when not provided", () => {
    render(
      <SkillsPanel
        {...defaultProps}
        onLearnSkill={undefined}
      />
    );

    const learnButton = screen.getByLabelText("Learn API Design");
    expect(() => fireEvent.click(learnButton)).not.toThrow();
  });

  it("should render border between sections", () => {
    const { container } = render(<SkillsPanel {...defaultProps} />);

    const border = container.querySelector('[class*="border-t"]');
    expect(border).toBeInTheDocument();
  });
});

import React from "react";
import { SectionButton } from "../../shared/SectionButton";

interface GitSectionTabsProps {
  active: "status" | "diff" | "log";
  onChange: (section: "status" | "diff" | "log") => void;
  t: any;
}

export const GitSectionTabs: React.FC<GitSectionTabsProps> = ({ active, onChange, t }) => (
  <div className="flex bg-neutral-900/80 border border-dash-border rounded p-0.5">
    <SectionButton isActive={active === "status"} onClick={() => onChange("status")}>
      {t.status || "Status"}
    </SectionButton>
    <SectionButton isActive={active === "diff"} onClick={() => onChange("diff")}>
      {t.diff || "Diff"}
    </SectionButton>
    <SectionButton isActive={active === "log"} onClick={() => onChange("log")}>
      {t.log || "Log"}
    </SectionButton>
  </div>
);

import React from "react";
import { Rocket, Compass, Save } from "lucide-react";
import { cn } from "../../utils/cn";

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "learned" | "available";
  category: "research" | "devops" | "content" | "knowledge";
}

interface SkillsPanelProps {
  skills: Skill[];
  onLearnSkill?: (skillId: string) => void;
  t: any;
  className?: string;
}

export const SkillsPanel: React.FC<SkillsPanelProps> = ({
  skills,
  onLearnSkill,
  t,
  className,
}) => {
  const learnedSkills = skills.filter((s) => s.status === "learned");
  const availableSkills = skills.filter((s) => s.status === "available");

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-3">
        <div className="text-[13px] uppercase tracking-widest text-dash-text-label font-extrabold flex items-center justify-between">
          {t.learnedSkills || "Learned Skills"}
          <Rocket className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="grid gap-2">
          {learnedSkills.length === 0 ? (
            <div className="p-2 text-[10px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
              {t.noLearnedSkills || "No learned skills yet"}
            </div>
          ) : (
            learnedSkills.map((skill) => (
              <div
                key={skill.id}
                className="p-2 bg-dash-card border border-dash-accent/20 rounded-md flex items-start gap-2 relative overflow-hidden group"
              >
                <div
                  className="absolute top-0 right-0 w-8 h-8 bg-dash-accent/10 rotate-45 translate-x-4 -translate-y-4"
                  aria-hidden="true"
                />
                <skill.icon
                  className="w-3.5 h-3.5 text-dash-accent shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-dash-text-primary leading-tight">
                    {skill.name}
                  </div>
                  <div className="text-[9px] text-dash-text-muted leading-tight mt-0.5">
                    {skill.description}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-dash-border">
        <div className="text-[11px] uppercase tracking-widest text-dash-accent font-extrabold flex items-center justify-between">
          {t.skillStore || "Skill Store"}
          <Compass className="w-2.5 h-2.5" aria-hidden="true" />
        </div>
        <div className="grid gap-2">
          {availableSkills.length === 0 ? (
            <div className="p-2 text-[10px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
              {t.noAvailableSkills || "No available skills"}
            </div>
          ) : (
            availableSkills.map((skill) => (
              <div
                key={skill.id}
                className="p-2 bg-neutral-900 border border-dash-border rounded-md flex items-start gap-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer group"
              >
                <skill.icon
                  className="w-3.5 h-3.5 text-dash-text-label shrink-0 mt-0.5 group-hover:text-dash-success transition-colors"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-dash-text-muted group-hover:text-dash-text-primary transition-colors">
                    {skill.name}
                  </div>
                  <div className="text-[9px] text-dash-text-muted leading-tight mt-0.5">
                    {skill.description}
                  </div>
                </div>
                <button
                  onClick={() => onLearnSkill?.(skill.id)}
                  className="self-center p-1 rounded hover:bg-neutral-800 text-dash-text-muted hover:text-dash-success"
                  aria-label={`Learn ${skill.name}`}
                >
                  <Save className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

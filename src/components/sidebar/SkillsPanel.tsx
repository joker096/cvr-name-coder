import React, { useState, useEffect } from "react";
import { Rocket, Compass, Search, Brain, Zap, Shield, Terminal, FileText, X, Eye } from "lucide-react";
import { cn } from "../../utils/cn";
import { COMMAND_LIST } from "../../utils/commands";

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "learned" | "available";
  category: "research" | "devops" | "content" | "knowledge";
}

interface ApiSkill {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  content?: string;
}

interface SkillsPanelProps {
  skills?: Skill[];
  onLearnSkill?: ((skillId: string) => void) | undefined;
  t: any;
  className?: string;
}

// Map commands to skill icons
const COMMAND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/analyze": Search,
  "/fix": Shield,
  "/optimize": Zap,
  "/audit": Compass,
  "/explain": Brain,
  "/refactor": Terminal,
};

// Map commands to categories
const COMMAND_CATEGORIES: Record<string, string> = {
  "/analyze": "research",
  "/fix": "devops",
  "/optimize": "devops",
  "/audit": "research",
  "/explain": "knowledge",
  "/refactor": "devops",
};

export const SkillsPanel: React.FC<SkillsPanelProps> = ({
  skills: externalSkills,
  onLearnSkill,
  t,
  className,
}) => {
  const [apiSkills, setApiSkills] = useState<ApiSkill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<ApiSkill | null>(null);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data) => {
        if (data.skills) setApiSkills(data.skills);
      })
      .catch(() => {});
  }, []);

  // Build skills from real commands
  const commandSkills: Skill[] = COMMAND_LIST.map((cmd) => ({
    id: cmd.command,
    name: cmd.label,
    description: cmd.description,
    icon: COMMAND_ICONS[cmd.command] || Terminal,
    status: "learned" as const,
    category: (COMMAND_CATEGORIES[cmd.command] || "knowledge") as any,
  }));

  const mappedApiSkills: Skill[] = apiSkills.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    icon: FileText,
    status: "available" as const,
    category: "knowledge" as any,
  }));

  const allSkills = externalSkills && externalSkills.length > 0 ? externalSkills : [...commandSkills, ...mappedApiSkills];
  const learnedSkills = allSkills.filter((s) => s.status === "learned");
  const availableSkills = allSkills.filter((s) => s.status === "available");

  const handleViewSkill = async (id: string) => {
    try {
      const res = await fetch(`/api/skills/${id}`);
      const data = await res.json();
      if (data.id) setSelectedSkill(data as ApiSkill);
    } catch (e) {
      console.error("Failed to load skill:", e);
    }
  };

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
                className="p-2 bg-dash-surface border border-dash-accent/20 rounded-md flex items-start gap-2 relative overflow-hidden group"
              >
                <div
                  className="absolute top-0 right-0 w-8 h-8 bg-dash-accent/10 rotate-45 translate-x-4 -translate-y-4"
                  aria-hidden="true"
                />
                <skill.icon
                  className="w-3.5 h-3.5 text-dash-accent shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-dash-text-primary leading-tight">
                    {skill.name}
                  </div>
                  <div className="text-[9px] text-dash-text-muted leading-tight mt-0.5">
                    {skill.description}
                  </div>
                  <div className="text-[9px] font-mono text-dash-accent/70 mt-1">
                    {skill.id}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {availableSkills.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-dash-border">
          <div className="text-[11px] uppercase tracking-widest text-dash-accent font-extrabold flex items-center justify-between">
            {t.skillStore || "Skill Store"}
            <Compass className="w-2.5 h-2.5" aria-hidden="true" />
          </div>
          <div className="grid gap-2">
            {availableSkills.map((skill) => (
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleViewSkill(skill.id)}
                    className="self-center p-1 rounded hover:bg-neutral-800 text-dash-text-muted hover:text-dash-accent"
                    title={t.view || "View"}
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onLearnSkill?.(skill.id)}
                    className="self-center p-1 rounded hover:bg-neutral-800 text-dash-text-muted hover:text-dash-success"
                    aria-label={`Learn ${skill.name}`}
                  >
                    <Rocket className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-dash-bg border border-dash-border rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-3 border-b border-dash-border">
              <div className="text-[13px] font-bold text-dash-text-primary">{selectedSkill.name}</div>
              <button
                onClick={() => setSelectedSkill(null)}
                className="p-1 hover:bg-neutral-800 rounded text-dash-text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 overflow-y-auto flex-1 space-y-3">
              <div className="text-[10px] text-dash-text-muted">{selectedSkill.description}</div>
              {selectedSkill.triggers && selectedSkill.triggers.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-dash-text-muted font-bold mb-1">
                    {t.triggers || "Triggers"}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedSkill.triggers.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 bg-dash-accent/10 text-dash-accent text-[9px] rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedSkill.content && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-dash-text-muted font-bold mb-1">
                    {t.content || "Content"}
                  </div>
                  <pre className="p-2 bg-neutral-900 border border-dash-border rounded text-[10px] font-mono text-dash-text-primary whitespace-pre-wrap overflow-auto max-h-64">
                    {selectedSkill.content}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { Rocket, MessageSquare, GitBranch, BookOpen, Clock, Puzzle, Scale, RefreshCw } from "lucide-react";
import { DashboardSection } from "./DashboardSection";
import { StatusSection } from "./StatusSection";

interface Skill {
  id: string;
  name: string;
  description: string;
  status: string;
}

interface ApiSkill {
  id: string;
  name: string;
  description: string;
  triggers: string[];
}

interface DashboardPanelProps {
  skills: Skill[];
  skillsCount: number;
  toolsCount: number;
  memoryCount: number;
  serverRunning: boolean;
  sessionsCount?: number;
}

export const DashboardPanel: React.FC<DashboardPanelProps> = ({
  skills: _externalSkills, skillsCount: _extSkillsCount, toolsCount, memoryCount,
  serverRunning, sessionsCount = 0,
}) => {
  const [apiSkills, setApiSkills] = useState<ApiSkill[]>([]);
  const [skillsCount, setSkillsCount] = useState(_extSkillsCount);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data) => {
        if (data.skills && Array.isArray(data.skills)) {
          setApiSkills(data.skills);
          setSkillsCount(data.skills.length);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="w-72 bg-dash-bg border-r border-dash-border flex flex-col shrink-0 overflow-y-auto no-scrollbar">
      <StatusSection serverRunning={serverRunning} />

      <div className="flex flex-col gap-0.5 px-2 pb-1">
        <DashboardSection title="Skills" icon={Rocket} count={skillsCount} defaultOpen>
          {apiSkills.length === 0 ? (
            <p className="text-[11px] text-dash-text-muted py-1">Loading skills...</p>
          ) : (
            <div className="flex flex-col gap-1">
              {apiSkills.slice(0, 10).map((skill) => (
                <div key={skill.id} className="flex items-center gap-2 text-[11px] text-dash-text-secondary py-1">
                  <span className="w-1 h-1 rounded-full bg-dash-accent shrink-0" />
                  <span className="truncate">{skill.name}</span>
                </div>
              ))}
              {apiSkills.length > 10 && (
                <span className="text-[10px] text-dash-text-muted">+{apiSkills.length - 10} more</span>
              )}
            </div>
          )}
        </DashboardSection>

        <DashboardSection title="Sessions" icon={MessageSquare} count={sessionsCount}>
          <p className="text-[11px] text-dash-text-muted py-1">Active sessions list</p>
        </DashboardSection>

        <DashboardSection title="Git" icon={GitBranch}>
          <p className="text-[11px] text-dash-text-muted py-1">Git status and quick actions</p>
        </DashboardSection>

        <DashboardSection title="Memory" icon={BookOpen} count={memoryCount}>
          <p className="text-[11px] text-dash-text-muted py-1">Memory items</p>
        </DashboardSection>

        <DashboardSection title="Cron" icon={Clock}>
          <p className="text-[11px] text-dash-text-muted py-1">Scheduled tasks</p>
        </DashboardSection>

        <DashboardSection title="Plugins" icon={Puzzle}>
          <p className="text-[11px] text-dash-text-muted py-1">Installed plugins</p>
        </DashboardSection>

        <DashboardSection title="Rules" icon={Scale}>
          <p className="text-[11px] text-dash-text-muted py-1">Project rules</p>
        </DashboardSection>

        <DashboardSection title="Sync" icon={RefreshCw}>
          <p className="text-[11px] text-dash-text-muted py-1">Sync status</p>
        </DashboardSection>
      </div>

      {/* Stats — secondary info at the bottom */}
      <div className="mt-auto px-2 pb-2">
        <div className="card-interactive p-2">
          <div className="text-[9px] font-mono uppercase tracking-wider text-dash-text-label mb-1.5">
            Resources
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div>
              <div className="text-[12px] font-bold font-mono text-dash-text-primary">{skillsCount}</div>
              <div className="text-[9px] font-mono text-dash-text-muted">Skills</div>
            </div>
            <div>
              <div className="text-[12px] font-bold font-mono text-dash-text-primary">{toolsCount}</div>
              <div className="text-[9px] font-mono text-dash-text-muted">Tools</div>
            </div>
            <div>
              <div className="text-[12px] font-bold font-mono text-dash-text-primary">{memoryCount}</div>
              <div className="text-[9px] font-mono text-dash-text-muted">Memory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

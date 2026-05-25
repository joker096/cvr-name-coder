import React, { lazy, Suspense, useState, useMemo, memo } from "react";
import { cn } from "../../utils/cn";
import { AccordionItem } from "../shared/AccordionItem";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { StatsGrid } from "./StatsGrid";
import { SectionHeader } from "./SectionHeader";
import { SECTIONS_CONFIG, type SectionKey, type SectionDef } from "./sectionConfig";

const SkillsPanel = lazy(() => import("./SkillsPanel").then(m => ({ default: m.SkillsPanel })));
const SessionsPanel = lazy(() => import("./SessionsPanel").then(m => ({ default: m.SessionsPanel })));
const GitPanel = lazy(() => import("./GitPanel").then(m => ({ default: m.GitPanel })));
const CronPanel = lazy(() => import("./CronPanel").then(m => ({ default: m.CronPanel })));
const PluginsPanel = lazy(() => import("./PluginsPanel").then(m => ({ default: m.PluginsPanel })));
const RulesPanel = lazy(() => import("./RulesPanel").then(m => ({ default: m.RulesPanel })));
const SyncPanel = lazy(() => import("./SyncPanel").then(m => ({ default: m.SyncPanel })));
const MemoryPanel = lazy(() => import("./MemoryPanel").then(m => ({ default: m.MemoryPanel })));

interface LeftPanelProps {
  skillsCount: number;
  toolsCount: number;
  memoryCount: number;
  agentsCount: number;
  t: any;
  className?: string;
  isVisible?: boolean;
}

const PanelLoader: React.FC<{ section: SectionKey; t: any }> = memo(({ section, t }) => {
  switch (section) {
    case "skills":
      return <SkillsPanel t={t} />;
    case "sessions":
      return <SessionsPanel t={t} />;
    case "git":
      return <GitPanel t={t} />;
    case "memory":
      return <MemoryPanel t={t} />;
    case "cron":
      return <CronPanel t={t} />;
    case "plugins":
      return <PluginsPanel t={t} />;
    case "rules":
      return <RulesPanel t={t} />;
    case "sync":
      return <SyncPanel t={t} />;
    default:
      return null;
  }
});

export const LeftPanel: React.FC<LeftPanelProps> = memo(({
  skillsCount,
  toolsCount,
  memoryCount,
  agentsCount,
  t,
  className,
  isVisible: _isVisible,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const SECTION_HELP: Record<SectionKey, string> = {
    skills: t.skillsHelp || "Installed skills are loaded via the Skill tool. They provide specialized workflows (e.g. react-expert, python-pro). Manage skills from the Skills tab.",
    sessions: t.sessionsHelp || "View and search through your chat session history. Click a session to load it.",
    git: t.gitHelp || "Git status, diff viewer, commit log, and quick commit/push actions. Requires a git repository.",
    memory: t.memoryHelp || "AI writes persistent memories here as it learns about your project. Edit sections directly — changes save to MEMORY.md / USER.md.",
    cron: t.cronHelp || "Schedule recurring tasks with cron-like expressions. Define name, schedule (e.g. 'every 5 minutes'), and command.",
    plugins: t.pluginsHelp || "MCP plugins provide external tools. Place .js files in .cvr/tools/ directory — auto-loaded on restart.",
    rules: t.rulesHelp || "User-defined instruction rules stored as .md files in .cvr/rules/. Edit content and priority directly — higher priority rules load first.",
    sync: t.syncHelp || "Team sync settings — configure provider (Git/File/API), encryption, conflict resolution, and sync interval.",
  };

  const sections = useMemo<SectionDef[]>(() => SECTIONS_CONFIG.map((s) => {
    const def: SectionDef = {
      key: s.key,
      label: t[`${s.key}Label`] || s.key,
      icon: s.icon,
      help: SECTION_HELP[s.key],
    };
    if (s.key === "skills") def.count = skillsCount;
    if (s.key === "memory") def.count = memoryCount;
    return def;
  }), [t, skillsCount, memoryCount]);

  return (
    <div className={cn("w-[380px] min-w-[380px] border-r border-[#1a1a1a] bg-[#0d0d0d] flex flex-col overflow-y-auto", className)}>
      <StatsGrid
        skillsCount={skillsCount}
        toolsCount={toolsCount}
        memoryCount={memoryCount}
        agentsCount={agentsCount}
        t={t}
      />

      {sections.map((section) => (
        <AccordionItem
          key={section.key}
          id={section.key}
          isOpen={!!expanded[section.key]}
          onToggle={toggle}
          header={<SectionHeader section={section} />}
        >
          <Suspense fallback={<LoadingSpinner />}>
            <PanelLoader section={section.key} t={t} />
          </Suspense>
        </AccordionItem>
      ))}

      <div className="pb-4" />
    </div>
  );
});

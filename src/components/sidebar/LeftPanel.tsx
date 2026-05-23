import React, { lazy, Suspense, useState } from "react";
import { Wand2, MessageSquare, GitBranch, BookOpen, Clock, Puzzle, Scale, RefreshCw, HelpCircle } from "lucide-react";
import { cn } from "../../utils/cn";
import { AccordionItem } from "../shared/AccordionItem";
import { SidebarStatCard } from "./SidebarStatCard";
import { LoadingSpinner } from "../shared/LoadingSpinner";

const SkillsPanel = lazy(() => import("./SkillsPanel").then(m => ({ default: m.SkillsPanel })));
const SessionsPanel = lazy(() => import("./SessionsPanel").then(m => ({ default: m.SessionsPanel })));
const GitPanel = lazy(() => import("./GitPanel").then(m => ({ default: m.GitPanel })));
const CronPanel = lazy(() => import("./CronPanel").then(m => ({ default: m.CronPanel })));
const PluginsPanel = lazy(() => import("./PluginsPanel").then(m => ({ default: m.PluginsPanel })));
const RulesPanel = lazy(() => import("./RulesPanel").then(m => ({ default: m.RulesPanel })));
const SyncPanel = lazy(() => import("./SyncPanel").then(m => ({ default: m.SyncPanel })));
const MemoryPanel = lazy(() => import("./MemoryPanel").then(m => ({ default: m.MemoryPanel })));

type SectionKey = "skills" | "sessions" | "git" | "memory" | "cron" | "plugins" | "rules" | "sync";

interface LeftPanelProps {
  skillsCount: number;
  toolsCount: number;
  memoryCount: number;
  agentsCount: number;
  t: any;
  className?: string;
}

interface SectionDef {
  key: SectionKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  help?: string;
}

const SECTIONS_CONFIG: Omit<SectionDef, "label" | "help" | "count">[] = [
  { key: "skills", icon: Wand2 },
  { key: "sessions", icon: MessageSquare },
  { key: "git", icon: GitBranch },
  { key: "memory", icon: BookOpen },
  { key: "cron", icon: Clock },
  { key: "plugins", icon: Puzzle },
  { key: "rules", icon: Scale },
  { key: "sync", icon: RefreshCw },
];

const PanelLoader: React.FC<{ section: SectionKey; t: any }> = ({ section, t }) => {
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
};

export const LeftPanel: React.FC<LeftPanelProps> = ({
  skillsCount,
  toolsCount,
  memoryCount,
  agentsCount,
  t,
  className,
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

  const sections: SectionDef[] = SECTIONS_CONFIG.map((s) => {
    const def: SectionDef = {
      key: s.key,
      label: t[`${s.key}Label`] || s.key,
      icon: s.icon,
      help: SECTION_HELP[s.key],
    };
    if (s.key === "skills") def.count = skillsCount;
    if (s.key === "memory") def.count = memoryCount;
    return def;
  });

  const renderSectionHeader = (section: SectionDef) => {
    const Icon = section.icon;
    return (
      <div className="flex items-center gap-2 w-full">
        <Icon className="w-3.5 h-3.5 text-[#777]" />
        {section.label}
        <span className="relative group ml-auto">
          <HelpCircle className="w-3 h-3 text-[#555] hover:text-[#888] cursor-help" />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 px-2.5 py-1.5 bg-neutral-950 border border-[#333] rounded text-[10px] leading-relaxed text-[#aaa] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50 shadow-xl">
            {section.help}
          </span>
        </span>
        {section.count !== undefined && (
          <span className="bg-[#1a1a1e] border border-[#333] rounded px-2 py-0.5 text-[10px] text-[#888]">
            {section.count}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={cn("w-[380px] min-w-[380px] border-r border-[#1a1a1a] bg-[#0d0d0d] flex flex-col overflow-y-auto", className)}>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-4 pb-3">
        <SidebarStatCard label={t.skillsLabel || "Skills"} value={skillsCount} />
        <SidebarStatCard label={t.toolsLabel || "Tools"} value={toolsCount} />
        <SidebarStatCard label={t.memoryLabel || "Memory"} value={`${memoryCount} ${t.items || "items"}`} />
        <SidebarStatCard label={t.agentsLabel || "Agents"} value={agentsCount} />
      </div>

      {/* Accordion Sections */}
      {sections.map((section) => (
        <AccordionItem
          key={section.key}
          id={section.key}
          isOpen={!!expanded[section.key]}
          onToggle={toggle}
          header={renderSectionHeader(section)}
        >
          <Suspense fallback={<LoadingSpinner />}>
            <PanelLoader section={section.key} t={t} />
          </Suspense>
        </AccordionItem>
      ))}

      <div className="pb-4" />
    </div>
  );
};

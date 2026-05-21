import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronRight, Wand2, MessageSquare, GitBranch, BookOpen, Clock, Puzzle, Scale, RefreshCw, HelpCircle } from "lucide-react";
import { cn } from "../../utils/cn";
import { MemoryPanel } from "./MemoryPanel";
import { SessionsPanel } from "./SessionsPanel";
import { GitPanel } from "./GitPanel";
import { CronPanel } from "./CronPanel";
import { PluginsPanel } from "./PluginsPanel";
import { RulesPanel } from "./RulesPanel";
import { SyncPanel } from "./SyncPanel";

type SectionKey = "skills" | "sessions" | "git" | "memory" | "cron" | "plugins" | "rules" | "sync";

interface LeftPanelProps {
  skillsCount: number;
  skillsList: string[];
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
  help: string;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  skillsCount,
  skillsList = [],
  toolsCount,
  memoryCount,
  agentsCount,
  t,
  className,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key]}));

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

  const SECTIONS: SectionDef[] = [
    { key: "skills", label: t.skillsLabel || "Skills", icon: Wand2, count: skillsCount, help: SECTION_HELP.skills },
    { key: "sessions", label: t.sessionsLabel || "Sessions", icon: MessageSquare, help: SECTION_HELP.sessions },
    { key: "git", label: t.gitLabel || "Git", icon: GitBranch, help: SECTION_HELP.git },
    { key: "memory", label: t.memoryLabel || "Memory", icon: BookOpen, count: memoryCount, help: SECTION_HELP.memory },
    { key: "cron", label: t.cronLabel || "Cron", icon: Clock, help: SECTION_HELP.cron },
    { key: "plugins", label: t.pluginsLabel || "Plugins", icon: Puzzle, help: SECTION_HELP.plugins },
    { key: "rules", label: t.rulesLabel || "Rules", icon: Scale, help: SECTION_HELP.rules },
    { key: "sync", label: t.syncLabel || "Sync", icon: RefreshCw, help: SECTION_HELP.sync },
  ];

  const renderSectionContent = (key: SectionKey) => {
    switch (key) {
      case "skills":
        return skillsList.length > 0 ? (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {skillsList.map((name, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-[#aaa]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5b8def]" />
                {name}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-[#555]">{t.noSkills || "No skills yet"}</p>
        );
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

  return (
    <div className={cn("w-[380px] min-w-[380px] border-r border-[#1a1a1a] bg-[#0d0d0d] flex flex-col overflow-y-auto", className)}>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-4 pb-3">
        <div className="bg-[#161618] border border-[#222] rounded-lg p-3.5">
          <div className="text-[10px] font-mono text-[#666] tracking-[1.5px] mb-2 uppercase">{t.skillsLabel || "Skills"}</div>
          <div className="text-2xl font-bold font-mono text-[#e0e0e0]">{skillsCount}</div>
        </div>
        <div className="bg-[#161618] border border-[#222] rounded-lg p-3.5">
          <div className="text-[10px] font-mono text-[#666] tracking-[1.5px] mb-2 uppercase">{t.toolsLabel || "Tools"}</div>
          <div className="text-2xl font-bold font-mono text-[#e0e0e0]">{toolsCount}</div>
        </div>
        <div className="bg-[#161618] border border-[#222] rounded-lg p-3.5 col-span-1">
          <div className="text-[10px] font-mono text-[#666] tracking-[1.5px] mb-2 uppercase">{t.memoryLabel || "Memory"}</div>
          <div className="text-xl font-bold font-mono text-[#e0e0e0]">{memoryCount} {t.items || "items"}</div>
        </div>
        <div className="bg-[#161618] border border-[#222] rounded-lg p-3.5">
          <div className="text-[10px] font-mono text-[#666] tracking-[1.5px] mb-2 uppercase">{t.agentsLabel || "Agents"}</div>
          <div className="text-2xl font-bold font-mono text-[#e0e0e0]">{agentsCount}</div>
        </div>
      </div>

      {/* Accordion Sections */}
      {SECTIONS.map((section) => {
        const isOpen = !!expanded[section.key];
        const Icon = section.icon;
        return (
          <div key={section.key} className="px-4 mb-1.5">
            <button
              onClick={() => toggle(section.key)}
              className="w-full flex items-center justify-between bg-[#161618] border border-[#222] rounded-lg px-3.5 py-2.5 text-[11px] font-mono tracking-[1.5px] text-[#999] hover:text-[#ccc] transition-colors"
            >
              <div className="flex items-center gap-2">
                {isOpen
                  ? <ChevronDown className="w-3 h-3 text-[#555]" />
                  : <ChevronRight className="w-3 h-3 text-[#555]" />
                }
                <Icon className="w-3.5 h-3.5 text-[#777]" />
                {section.label}
                <span className="relative group ml-auto">
                  <HelpCircle className="w-3 h-3 text-[#555] hover:text-[#888] cursor-help" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 px-2.5 py-1.5 bg-neutral-950 border border-[#333] rounded text-[10px] leading-relaxed text-[#aaa] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50 shadow-xl">
                    {section.help}
                  </span>
                </span>
              </div>
              {section.count !== undefined && (
                <span className="bg-[#1a1a1e] border border-[#333] rounded px-2 py-0.5 text-[10px] text-[#888]">
                  {section.count}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#161618] border border-t-0 border-[#222] rounded-b-lg -mt-[1px] px-3.5 py-3 max-h-[350px] overflow-y-auto"
                >
                  {renderSectionContent(section.key)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <div className="pb-4" />
    </div>
  );
};

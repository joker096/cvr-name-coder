import React, { memo, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Rocket, Clock, Puzzle, Scale, MessageSquare, GitBranch, RefreshCw } from "lucide-react";
import { cn } from "../../utils/cn";
import { MemoryPanel } from "./MemoryPanel";
import { SkillsPanel, type Skill } from "./SkillsPanel";
import { SessionsPanel } from "./SessionsPanel";
import { CronPanel } from "./CronPanel";
import { PluginsPanel } from "./PluginsPanel";
import { RulesPanel } from "./RulesPanel";
import { GitPanel } from "./GitPanel";
import { SyncPanel } from "./SyncPanel";

export type SidebarTab = "memory" | "skills" | "sessions" | "cron" | "plugins" | "rules" | "git" | "sync";

const TAB_CONFIG: Record<SidebarTab, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  memory: { label: "Memory", icon: BookOpen },
  skills: { label: "Skills", icon: Rocket },
  sessions: { label: "Sessions", icon: MessageSquare },
  cron: { label: "Cron", icon: Clock },
  plugins: { label: "Plugins", icon: Puzzle },
  rules: { label: "Rules", icon: Scale },
  git: { label: "Git", icon: GitBranch },
  sync: { label: "Sync", icon: RefreshCw },
};

interface SidebarProps {
  isOpen: boolean;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  skills: Skill[];
  onLearnSkill?: (skillId: string) => void;
  t: any;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = memo(({
  isOpen,
  activeTab,
  onTabChange,
  skills,
  onLearnSkill,
  t,
  className,
}) => {
  const tabs: SidebarTab[] = useMemo(() => ["memory", "skills", "sessions", "git", "sync", "cron", "plugins", "rules"], []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "w-72 bg-dash-bg border-r border-dash-border flex flex-col shrink-0",
            className
          )}
        >
          <div className="flex bg-neutral-900/80 border-b border-dash-border p-1 shrink-0 gap-0.5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const config = TAB_CONFIG[tab];
              const Icon = config.icon;
              return (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-all rounded whitespace-nowrap",
                    activeTab === tab
                      ? "bg-dash-accent/10 text-dash-accent"
                      : "text-dash-text-muted hover:text-white"
                  )}
                  aria-pressed={activeTab === tab}
                  role="tab"
                  title={t[tab] || config.label}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{t[tab] || config.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1 no-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab === "memory" && (
                <motion.div
                  key="memory"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <MemoryPanel t={t} />
                </motion.div>
              )}
              {activeTab === "skills" && (
                <motion.div
                  key="skills"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <SkillsPanel
                    skills={skills}
                    onLearnSkill={onLearnSkill}
                    t={t}
                  />
                </motion.div>
              )}
              {activeTab === "sessions" && (
                <motion.div
                  key="sessions"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <SessionsPanel t={t} />
                </motion.div>
              )}
              {activeTab === "cron" && (
                <motion.div
                  key="cron"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <CronPanel t={t} />
                </motion.div>
              )}
              {activeTab === "plugins" && (
                <motion.div
                  key="plugins"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <PluginsPanel t={t} />
                </motion.div>
              )}
              {activeTab === "rules" && (
                <motion.div
                  key="rules"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <RulesPanel t={t} />
                </motion.div>
              )}
              {activeTab === "git" && (
                <motion.div
                  key="git"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <GitPanel t={t} />
                </motion.div>
              )}
              {activeTab === "sync" && (
                <motion.div
                  key="sync"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <SyncPanel t={t} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

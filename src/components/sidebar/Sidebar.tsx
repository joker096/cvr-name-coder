import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../utils/cn";
import { MemoryPanel } from "./MemoryPanel";
import { SkillsPanel, type Skill } from "./SkillsPanel";
import type { Memory } from "../../types/chat";

export type SidebarTab = "memory" | "skills";

interface SidebarProps {
  isOpen: boolean;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  memories: Memory[];
  skills: Skill[];
  onLearnSkill?: (skillId: string) => void;
  lang: string;
  t: any;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  memories,
  skills,
  onLearnSkill,
  lang,
  t,
  className,
}) => {
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
          <div className="flex bg-neutral-900/80 border-b border-dash-border p-1 shrink-0">
            <button
              onClick={() => onTabChange("memory")}
              className={cn(
                "flex-1 py-1.5 text-[12px] uppercase font-bold tracking-widest transition-all rounded",
                activeTab === "memory"
                  ? "bg-dash-accent/10 text-dash-accent"
                  : "text-dash-text-muted hover:text-white"
              )}
              aria-pressed={activeTab === "memory"}
              role="tab"
            >
              {t.memory || "Memory"}
            </button>
            <button
              onClick={() => onTabChange("skills")}
              className={cn(
                "flex-1 py-1.5 text-[12px] uppercase font-bold tracking-widest transition-all rounded",
                activeTab === "skills"
                  ? "bg-dash-accent/10 text-dash-accent"
                  : "text-dash-text-muted hover:text-white"
              )}
              aria-pressed={activeTab === "skills"}
              role="tab"
            >
              {t.skills || "Skills"}
            </button>
          </div>

          <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1 no-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab === "memory" ? (
                <motion.div
                  key="memory"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <MemoryPanel
                    memories={memories}
                    lang={lang}
                    t={t}
                  />
                </motion.div>
              ) : (
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
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

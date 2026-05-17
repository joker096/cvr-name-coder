import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "../../utils/cn";
import { Tooltip } from "./Tooltip";
import { Info, ShieldAlert, TrendingUp, Flag, Database, Layers, Check, Copy } from "lucide-react";
import type { Memory } from "../../types/chat";

interface MemoryCardProps {
  memory: Memory;
  lang: string;
  t: any;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, lang, t }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(memory.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const category = useMemo(() => {
    const c = memory.content.toUpperCase();
    if (c.includes("FACTS") || c.includes("KEY_FACTS") || c.includes("ФАКТЫ"))
      return {
        label: "FACTS",
        color: "border-blue-500",
        bg: "bg-blue-500/10",
        icon: Info,
        text: "text-blue-400",
        badge: "bg-blue-500/20",
      };
    if (c.includes("RULES") || c.includes("INVARIANT_RULES") || c.includes("ПРАВИЛА"))
      return {
        label: "RULES",
        color: "border-purple-500",
        bg: "bg-purple-500/10",
        icon: ShieldAlert,
        text: "text-purple-400",
        badge: "bg-purple-500/20",
      };
    if (c.includes("PROGRESS") || c.includes("СОСТОЯНИЕ") || c.includes("ПРОГРЕСС"))
      return {
        label: "PROG",
        color: "border-emerald-500",
        bg: "bg-emerald-500/10",
        icon: TrendingUp,
        text: "text-emerald-400",
        badge: "bg-emerald-500/20",
      };
    if (c.includes("GOALS") || c.includes("PENDING") || c.includes("ЦЕЛИ"))
      return {
        label: "GOAL",
        color: "border-orange-500",
        bg: "bg-orange-500/10",
        icon: Flag,
        text: "text-orange-400",
        badge: "bg-orange-500/20",
      };
    if (c.includes("SCHEMA") || c.includes("DATA") || c.includes("СТРУКТУРА"))
      return {
        label: "DATA",
        color: "border-cyan-500",
        bg: "bg-cyan-500/10",
        icon: Database,
        text: "text-cyan-400",
        badge: "bg-cyan-500/20",
      };
    return {
      label: "MEM",
      color: "border-dash-accent",
      bg: "bg-dash-accent/10",
      icon: Layers,
      text: "text-dash-accent",
      badge: "bg-dash-accent/20",
    };
  }, [memory.content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setIsExpanded(!isExpanded)}
      className={cn(
        "p-2 border-l-2 rounded-r group hover:bg-neutral-800/60 transition-all relative overflow-hidden cursor-pointer",
        category.color,
        category.bg,
        isExpanded ? "ring-1 ring-inset ring-white/10" : ""
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1">
          <div
            className={cn(
              "px-1 py-0.5 rounded text-[7px] font-black tracking-widest uppercase",
              category.badge,
              category.text
            )}
          >
            {category.label}
          </div>
          <category.icon
            className={cn("w-2 h-2", category.text, "opacity-70")}
            aria-hidden="true"
          />
          <span className="text-[8px] text-dash-text-muted font-mono opacity-30">
            #{memory.id.slice(0, 4)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip content={t.copyCluster || "Copy"}>
            <button
              onClick={handleCopy}
              aria-label={copied ? "Copied" : "Copy cluster"}
              className={cn(
                "p-0.5 rounded transition-all",
                copied
                  ? "bg-dash-success/20 text-dash-success"
                  : "opacity-0 group-hover:opacity-100 hover:bg-neutral-700 text-dash-text-muted hover:text-white"
              )}
            >
              {copied ? <Check className="w-2 h-2" /> : <Copy className="w-2 h-2" />}
            </button>
          </Tooltip>
        </div>
      </div>
      <div
        className={cn(
          "text-[10px] font-medium text-dash-text-primary leading-tight selection:bg-dash-accent/30 transition-all",
          !isExpanded && "line-clamp-2"
        )}
      >
        {memory.content}
      </div>
      <div className="text-[8px] text-dash-text-muted mt-1.5 flex items-center justify-between font-mono border-t border-dashed border-white/5 pt-1.5">
        <div className="flex items-center gap-1.5">
          <span className="opacity-40 uppercase tracking-tighter">
            PTR:0x{memory.id.slice(0, 4)}
          </span>
          {memory.content.length > 80 && (
            <span className="text-dash-accent opacity-60 text-[7px] uppercase font-bold">
              {isExpanded ? "Collapse" : "Expand"}
            </span>
          )}
        </div>
        <span className="opacity-60">
          {new Date(memory.timestamp).toLocaleTimeString(lang === "ru" ? "ru-RU" : "en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </motion.div>
  );
};

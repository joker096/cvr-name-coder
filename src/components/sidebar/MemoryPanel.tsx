import React from "react";
import { AnimatePresence } from "motion/react";
import { History } from "lucide-react";
import { MemoryCard } from "../shared/MemoryCard";
import type { Memory } from "../../types/chat";

interface MemoryPanelProps {
  memories: Memory[];
  lang: string;
  t: any;
  className?: string;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  memories,
  lang,
  t,
  className,
}) => {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="text-[13px] uppercase tracking-widest text-dash-text-label font-extrabold flex items-center justify-between">
        {t.memoryClusters || "Memory Clusters"}
        <History className="w-4 h-4" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {memories.length === 0 ? (
            <div className="p-2 text-[10px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
              {t.noMemory || "No memory clusters yet"}
            </div>
          ) : (
            memories
              .slice()
              .reverse()
              .map((memory) => (
                <MemoryCard key={memory.id} memory={memory} lang={lang} t={t} />
              ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

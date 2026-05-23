import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronRight, GitPullRequest } from "lucide-react";
import { cn } from "../../../utils/cn";

interface DiffEntry {
  file: string;
  status: string;
  diff: string;
}

interface GitDiffSectionProps {
  diffs: DiffEntry[];
  expandedDiffs: Set<string>;
  onToggleDiff: (file: string) => void;
  t: any;
}

export const GitDiffSection: React.FC<GitDiffSectionProps> = ({
  diffs,
  expandedDiffs,
  onToggleDiff,
  t,
}) => {
  if (diffs.length === 0) {
    return (
      <div className="p-3 text-[11px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
        {t.noDiff || "No diff to show."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {diffs.map((diff) => (
        <div key={diff.file} className="border border-dash-border rounded bg-neutral-900/50">
          <button
            type="button"
            onClick={() => onToggleDiff(diff.file)}
            className="w-full flex items-center justify-between px-2 py-1 bg-neutral-900/80 border-b border-dash-border text-[10px] font-bold uppercase tracking-wider text-dash-accent hover:bg-neutral-800 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <GitPullRequest className="w-3 h-3" />
              <span className="truncate">{diff.file}</span>
              <span
                className={cn(
                  "px-1 rounded text-[9px]",
                  diff.status === "added" && "bg-green-500/20 text-green-400",
                  diff.status === "deleted" && "bg-red-500/20 text-red-400",
                  diff.status === "renamed" && "bg-yellow-500/20 text-yellow-400",
                  diff.status === "modified" && "bg-dash-accent/20 text-dash-accent"
                )}
              >
                {diff.status}
              </span>
            </div>
            {expandedDiffs.has(diff.file) ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
          <AnimatePresence>
            {expandedDiffs.has(diff.file) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <pre className="p-2 text-[9px] font-mono text-dash-text-primary whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {diff.diff}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

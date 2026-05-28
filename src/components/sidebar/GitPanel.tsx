import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useGit } from "../../hooks/useGit";
import { cn } from "../../utils/cn";
import { GitPanelHeader } from "./git/GitPanelHeader";
import { GitBranchInfo } from "./git/GitBranchInfo";
import { GitErrorMessage } from "./git/GitErrorMessage";
import { GitSectionTabs } from "./git/GitSectionTabs";
import { GitStatusSection } from "./git/GitStatusSection";
import { GitDiffSection } from "./git/GitDiffSection";
import { GitLogSection } from "./git/GitLogSection";

interface GitPanelProps {
  t: any;
  className?: string;
}

export const GitPanel: React.FC<GitPanelProps> = ({ t, className }) => {
  const { status, diffs, commits, loading, committing, pushing, error, commit, push, refresh } = useGit();
  const [commitMessage, setCommitMessage] = useState("");
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<"status" | "diff" | "log">("status");

  const toggleDiff = (file: string) => {
    setExpandedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(file)) {
        next.delete(file);
      } else {
        next.add(file);
      }
      return next;
    });
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    try {
      await commit(commitMessage);
      setCommitMessage("");
    } catch {
      // Error handled by hook
    }
  };

  const handlePush = async () => {
    try {
      await push();
    } catch {
      // Error handled by hook
    }
  };

  const isRepo = status !== null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <GitPanelHeader title={t.gitPanel || "Git"} loading={loading} onRefresh={refresh} t={t} />

      {error && <GitErrorMessage error={error} />}

      {loading && !status ? (
        <div className="p-3 text-[11px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
          {t.loading || "Loading..."}
        </div>
      ) : !isRepo ? (
        <div className="p-3 text-[11px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
          {t.noGitRepo || "Not a git repository."}
        </div>
      ) : (
        <>
          {status.branch && (
            <GitBranchInfo branch={status.branch} ahead={status.ahead} behind={status.behind} />
          )}
          <GitSectionTabs active={activeSection} onChange={setActiveSection} t={t} />

          <AnimatePresence mode="wait">
            {activeSection === "status" && (
              <motion.div
                key="status"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-2"
              >
                {status && (
                  <GitStatusSection
                    status={status}
                    commitMessage={commitMessage}
                    onCommitMessageChange={setCommitMessage}
                    onCommit={handleCommit}
                    onPush={handlePush}
                    committing={committing}
                    pushing={pushing}
                    t={t}
                  />
                )}
              </motion.div>
            )}

            {activeSection === "diff" && (
              <motion.div
                key="diff"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-1"
              >
                <GitDiffSection
                  diffs={diffs}
                  expandedDiffs={expandedDiffs}
                  onToggleDiff={toggleDiff}
                  t={t}
                />
              </motion.div>
            )}

            {activeSection === "log" && (
              <motion.div
                key="log"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-1"
              >
                <GitLogSection commits={commits} t={t} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

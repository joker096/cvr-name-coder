import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GitBranch, GitCommit, GitPullRequest, RefreshCw, ChevronDown, ChevronRight, FilePlus, FileMinus, FileEdit, FileWarning, Upload } from "lucide-react";
import { useGit } from "../../hooks/useGit";
import { cn } from "../../utils/cn";

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

  const getFileIcon = (_file: string, type: "modified" | "staged" | "untracked" | "deleted" | "renamed") => {
    switch (type) {
      case "deleted":
        return <FileMinus className="w-3 h-3 text-red-400" />;
      case "untracked":
        return <FilePlus className="w-3 h-3 text-green-400" />;
      case "renamed":
        return <FileWarning className="w-3 h-3 text-yellow-400" />;
      default:
        return <FileEdit className="w-3 h-3 text-dash-accent" />;
    }
  };

  const isRepo = status !== null;
  const hasChanges = status && !status.clean;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[13px] uppercase tracking-widest text-dash-text-label font-extrabold flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          {t.gitPanel || "Git"}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
            title={t.refresh || "Refresh"}
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Branch Info */}
      {status && status.branch && (
        <div className="flex items-center gap-2 px-2 py-1 bg-neutral-900/50 border border-dash-border rounded text-[11px] font-mono">
          <GitBranch className="w-3 h-3 text-dash-accent" />
          <span className="text-dash-text-primary">{status.branch}</span>
          {status.ahead > 0 && (
            <span className="text-dash-accent">+{status.ahead}</span>
          )}
          {status.behind > 0 && (
            <span className="text-red-400">-{status.behind}</span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-[11px] text-red-400">
          {error}
        </div>
      )}

      {!isRepo ? (
        <div className="p-3 text-[11px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
          {t.noGitRepo || "Not a git repository."}
        </div>
      ) : (
        <>
          {/* Section Tabs */}
          <div className="flex bg-neutral-900/80 border border-dash-border rounded p-0.5">
            <button
              onClick={() => setActiveSection("status")}
              className={cn(
                "flex-1 py-1 text-[10px] uppercase font-bold tracking-wider transition-all rounded",
                activeSection === "status"
                  ? "bg-dash-accent/10 text-dash-accent"
                  : "text-dash-text-muted hover:text-white"
              )}
            >
              {t.status || "Status"}
            </button>
            <button
              onClick={() => setActiveSection("diff")}
              className={cn(
                "flex-1 py-1 text-[10px] uppercase font-bold tracking-wider transition-all rounded",
                activeSection === "diff"
                  ? "bg-dash-accent/10 text-dash-accent"
                  : "text-dash-text-muted hover:text-white"
              )}
            >
              {t.diff || "Diff"}
            </button>
            <button
              onClick={() => setActiveSection("log")}
              className={cn(
                "flex-1 py-1 text-[10px] uppercase font-bold tracking-wider transition-all rounded",
                activeSection === "log"
                  ? "bg-dash-accent/10 text-dash-accent"
                  : "text-dash-text-muted hover:text-white"
              )}
            >
              {t.log || "Log"}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeSection === "status" && (
              <motion.div
                key="status"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-2"
              >
                {status.clean ? (
                  <div className="p-3 text-[11px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
                    {t.workingTreeClean || "Working tree clean"}
                  </div>
                ) : (
                  <>
                    {status.staged.length > 0 && (
                      <div className="border border-dash-border rounded bg-neutral-900/50">
                        <div className="px-2 py-1 bg-neutral-900/80 border-b border-dash-border text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          {t.staged || "Staged"} ({status.staged.length})
                        </div>
                        <div className="p-1">
                          {status.staged.map((file) => (
                            <div key={file} className="flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-dash-text-primary">
                              {getFileIcon(file, "staged")}
                              <span className="truncate">{file}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {status.modified.length > 0 && (
                      <div className="border border-dash-border rounded bg-neutral-900/50">
                        <div className="px-2 py-1 bg-neutral-900/80 border-b border-dash-border text-[10px] font-bold uppercase tracking-wider text-dash-accent">
                          {t.modified || "Modified"} ({status.modified.length})
                        </div>
                        <div className="p-1">
                          {status.modified.map((file) => (
                            <div key={file} className="flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-dash-text-primary">
                              {getFileIcon(file, "modified")}
                              <span className="truncate">{file}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {status.deleted.length > 0 && (
                      <div className="border border-dash-border rounded bg-neutral-900/50">
                        <div className="px-2 py-1 bg-neutral-900/80 border-b border-dash-border text-[10px] font-bold uppercase tracking-wider text-red-400">
                          {t.deleted || "Deleted"} ({status.deleted.length})
                        </div>
                        <div className="p-1">
                          {status.deleted.map((file) => (
                            <div key={file} className="flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-dash-text-primary">
                              {getFileIcon(file, "deleted")}
                              <span className="truncate">{file}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {status.untracked.length > 0 && (
                      <div className="border border-dash-border rounded bg-neutral-900/50">
                        <div className="px-2 py-1 bg-neutral-900/80 border-b border-dash-border text-[10px] font-bold uppercase tracking-wider text-green-400">
                          {t.untracked || "Untracked"} ({status.untracked.length})
                        </div>
                        <div className="p-1">
                          {status.untracked.map((file) => (
                            <div key={file} className="flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-dash-text-primary">
                              {getFileIcon(file, "untracked")}
                              <span className="truncate">{file}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {status.renamed.length > 0 && (
                      <div className="border border-dash-border rounded bg-neutral-900/50">
                        <div className="px-2 py-1 bg-neutral-900/80 border-b border-dash-border text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                          {t.renamed || "Renamed"} ({status.renamed.length})
                        </div>
                        <div className="p-1">
                          {status.renamed.map((file) => (
                            <div key={file} className="flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-dash-text-primary">
                              {getFileIcon(file, "renamed")}
                              <span className="truncate">{file}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Commit Area */}
                    {hasChanges && (
                      <div className="flex flex-col gap-2 mt-2">
                        <textarea
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          placeholder={t.commitMessagePlaceholder || "Enter commit message..."}
                          className="w-full h-16 bg-neutral-900 border border-dash-border rounded p-2 text-[11px] font-mono text-dash-text-primary resize-none focus:outline-none focus:border-dash-accent"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleCommit}
                            disabled={!commitMessage.trim() || committing}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-dash-accent/20 text-dash-accent text-[11px] font-bold uppercase tracking-wider rounded hover:bg-dash-accent/30 transition-colors disabled:opacity-50"
                          >
                            <GitCommit className="w-3 h-3" />
                            {committing ? t.committing || "Committing..." : t.commit || "Commit"}
                          </button>
                          <button
                            onClick={handlePush}
                            disabled={pushing}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-neutral-800 text-dash-text-muted text-[11px] font-bold uppercase tracking-wider rounded hover:bg-neutral-700 transition-colors disabled:opacity-50"
                          >
                            <Upload className="w-3 h-3" />
                            {pushing ? t.pushing || "Pushing..." : t.push || "Push"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
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
                {diffs.length === 0 ? (
                  <div className="p-3 text-[11px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
                    {t.noDiff || "No diff to show."}
                  </div>
                ) : (
                  diffs.map((diff) => (
                    <div key={diff.file} className="border border-dash-border rounded bg-neutral-900/50">
                      <button
                        onClick={() => toggleDiff(diff.file)}
                        className="w-full flex items-center justify-between px-2 py-1 bg-neutral-900/80 border-b border-dash-border text-[10px] font-bold uppercase tracking-wider text-dash-accent hover:bg-neutral-800 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <GitPullRequest className="w-3 h-3" />
                          <span className="truncate">{diff.file}</span>
                          <span className={cn(
                            "px-1 rounded text-[9px]",
                            diff.status === "added" && "bg-green-500/20 text-green-400",
                            diff.status === "deleted" && "bg-red-500/20 text-red-400",
                            diff.status === "renamed" && "bg-yellow-500/20 text-yellow-400",
                            diff.status === "modified" && "bg-dash-accent/20 text-dash-accent"
                          )}>
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
                  ))
                )}
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
                {commits.length === 0 ? (
                  <div className="p-3 text-[11px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
                    {t.noCommits || "No commits yet."}
                  </div>
                ) : (
                  commits.map((commit) => (
                    <div key={commit.hash} className="border border-dash-border rounded bg-neutral-900/50 p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <GitCommit className="w-3 h-3 text-dash-accent shrink-0" />
                        <span className="text-[9px] font-mono text-dash-text-muted">{commit.shortHash}</span>
                      </div>
                      <div className="text-[10px] text-dash-text-primary font-medium truncate">
                        {commit.message}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-dash-text-muted">{commit.author}</span>
                        <span className="text-[9px] text-dash-text-muted">{commit.date}</span>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

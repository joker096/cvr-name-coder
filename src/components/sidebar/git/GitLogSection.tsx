import React from "react";
import { GitCommit } from "lucide-react";

interface CommitEntry {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

interface GitLogSectionProps {
  commits: CommitEntry[];
  t: any;
}

export const GitLogSection: React.FC<GitLogSectionProps> = ({ commits, t }) => {
  if (commits.length === 0) {
    return (
      <div className="p-3 text-[11px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
        {t.noCommits || "No commits yet."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {commits.map((commit) => (
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
      ))}
    </div>
  );
};

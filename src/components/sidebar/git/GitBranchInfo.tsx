import React from "react";
import { GitBranch } from "lucide-react";

interface GitBranchInfoProps {
  branch: string;
  ahead: number;
  behind: number;
}

export const GitBranchInfo: React.FC<GitBranchInfoProps> = ({ branch, ahead, behind }) => (
  <div className="flex items-center gap-2 px-2 py-1 bg-neutral-900/50 border border-dash-border rounded text-[11px] font-mono">
    <GitBranch className="w-3 h-3 text-dash-accent" />
    <span className="text-dash-text-primary">{branch}</span>
    {ahead > 0 && <span className="text-dash-accent">+{ahead}</span>}
    {behind > 0 && <span className="text-red-400">-{behind}</span>}
  </div>
);

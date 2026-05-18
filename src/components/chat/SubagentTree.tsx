import React from "react";
import type { SubagentTask } from "../../server/subagentManager";

interface SubagentTreeProps {
  tasks: SubagentTask[];
}

export const SubagentTree: React.FC<SubagentTreeProps> = ({ tasks }) => {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs font-mono text-dash-accent uppercase tracking-widest">
        Subagents ({tasks.length})
      </div>
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`p-2 rounded border text-xs font-mono ${
            task.status === "completed"
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : task.status === "failed"
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-dash-accent/5 border-dash-accent/20 text-dash-text-muted"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="truncate">{task.goal.substring(0, 50)}</span>
            <span className="uppercase">{task.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

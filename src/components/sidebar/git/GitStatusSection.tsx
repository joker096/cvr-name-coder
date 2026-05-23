import React from "react";
import { FilePlus, FileMinus, FileEdit, FileWarning } from "lucide-react";
import { GitCommitForm } from "./GitCommitForm";

interface GitStatus {
  staged: string[];
  modified: string[];
  deleted: string[];
  untracked: string[];
  renamed: string[];
  clean: boolean;
}

interface GitStatusSectionProps {
  status: GitStatus;
  commitMessage: string;
  onCommitMessageChange: (v: string) => void;
  onCommit: () => void;
  onPush: () => void;
  committing: boolean;
  pushing: boolean;
  t: any;
}

const FileIcon: React.FC<{ type: "modified" | "staged" | "untracked" | "deleted" | "renamed" }> = ({ type }) => {
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

const FileGroup: React.FC<{
  label: string;
  files: string[];
  type: "modified" | "staged" | "untracked" | "deleted" | "renamed";
  colorClass: string;
}> = ({ label, files, type, colorClass }) => {
  if (files.length === 0) return null;
  return (
    <div className="border border-dash-border rounded bg-neutral-900/50">
      <div className={`px-2 py-1 bg-neutral-900/80 border-b border-dash-border text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
        {label} ({files.length})
      </div>
      <div className="p-1">
        {files.map((file) => (
          <div key={file} className="flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-dash-text-primary">
            <FileIcon type={type} />
            <span className="truncate">{file}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const GitStatusSection: React.FC<GitStatusSectionProps> = ({
  status,
  commitMessage,
  onCommitMessageChange,
  onCommit,
  onPush,
  committing,
  pushing,
  t,
}) => {
  if (status.clean) {
    return (
      <div className="p-3 text-[11px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
        {t.workingTreeClean || "Working tree clean"}
      </div>
    );
  }

  const hasChanges = !status.clean;

  return (
    <div className="flex flex-col gap-2">
      <FileGroup label={t.staged || "Staged"} files={status.staged} type="staged" colorClass="text-emerald-400" />
      <FileGroup label={t.modified || "Modified"} files={status.modified} type="modified" colorClass="text-dash-accent" />
      <FileGroup label={t.deleted || "Deleted"} files={status.deleted} type="deleted" colorClass="text-red-400" />
      <FileGroup label={t.untracked || "Untracked"} files={status.untracked} type="untracked" colorClass="text-green-400" />
      <FileGroup label={t.renamed || "Renamed"} files={status.renamed} type="renamed" colorClass="text-yellow-400" />

      {hasChanges && (
        <GitCommitForm
          commitMessage={commitMessage}
          onCommitMessageChange={onCommitMessageChange}
          onCommit={onCommit}
          onPush={onPush}
          committing={committing}
          pushing={pushing}
          t={t}
        />
      )}
    </div>
  );
};

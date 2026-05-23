import React from "react";
import { GitCommit, Upload } from "lucide-react";

interface GitCommitFormProps {
  commitMessage: string;
  onCommitMessageChange: (v: string) => void;
  onCommit: () => void;
  onPush: () => void;
  committing: boolean;
  pushing: boolean;
  t: any;
}

export const GitCommitForm: React.FC<GitCommitFormProps> = ({
  commitMessage,
  onCommitMessageChange,
  onCommit,
  onPush,
  committing,
  pushing,
  t,
}) => (
  <div className="flex flex-col gap-2 mt-2">
    <textarea
      value={commitMessage}
      onChange={(e) => onCommitMessageChange(e.target.value)}
      placeholder={t.commitMessagePlaceholder || "Enter commit message..."}
      className="w-full h-16 bg-neutral-900 border border-dash-border rounded p-2 text-[11px] font-mono text-dash-text-primary resize-none focus:outline-none focus:border-dash-accent"
    />
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCommit}
        disabled={!commitMessage.trim() || committing}
        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-dash-accent/20 text-dash-accent text-[11px] font-bold uppercase tracking-wider rounded hover:bg-dash-accent/30 transition-colors disabled:opacity-50"
      >
        <GitCommit className="w-3 h-3" />
        {committing ? t.committing || "Committing..." : t.commit || "Commit"}
      </button>
      <button
        type="button"
        onClick={onPush}
        disabled={pushing}
        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-neutral-800 text-dash-text-muted text-[11px] font-bold uppercase tracking-wider rounded hover:bg-neutral-700 transition-colors disabled:opacity-50"
      >
        <Upload className="w-3 h-3" />
        {pushing ? t.pushing || "Pushing..." : t.push || "Push"}
      </button>
    </div>
  </div>
);

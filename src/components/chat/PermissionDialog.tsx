import React from "react";
import type { PendingPermission } from "../../types/permissions";

interface PermissionDialogProps {
  pending: PendingPermission[];
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  pending,
  onApprove,
  onDeny,
}) => {
  if (pending.length === 0) return null;

  const current = pending[0]!;
  const { tool, params } = current.request;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card p-6 max-w-md w-full space-y-4">
        <h3 className="text-sm font-semibold text-dash-text-primary">
          Permission Required
        </h3>
        <p className="text-[12px] text-dash-text-secondary">
          Agent wants to execute:{" "}
          <code className="text-dash-accent bg-dash-accent-soft/30 px-1.5 py-0.5 rounded text-[11px] font-mono">
            {tool}
          </code>
        </p>
        {params && (
          <pre className="text-[11px] font-mono text-dash-text-secondary bg-dash-bg rounded p-3 overflow-auto max-h-40 border border-dash-border">
            {JSON.stringify(params, null, 2)}
          </pre>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={() => onDeny(current.id)}
            className="px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-dash-text-muted card-interactive rounded-md"
          >
            Deny
          </button>
          <button
            onClick={() => onApprove(current.id)}
            className="px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-white bg-dash-accent hover:bg-dash-accent-hover rounded-md transition-colors"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
};

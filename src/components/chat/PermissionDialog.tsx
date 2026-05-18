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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dash-bg border border-dash-border rounded-lg shadow-2xl max-w-lg w-full mx-4 p-4 space-y-4">
        <div className="text-lg font-bold text-dash-text-primary">
          Permission Required
        </div>
        <div className="text-sm text-dash-text-muted">
          The agent wants to execute: <code className="bg-neutral-800 px-1 rounded">{tool}</code>
        </div>
        {params && (
          <pre className="text-xs bg-neutral-900 p-2 rounded overflow-auto max-h-40 font-mono">
            {JSON.stringify(params, null, 2)}
          </pre>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => onDeny(current.id)}
            className="px-4 py-2 text-sm text-dash-text-muted hover:text-white transition-colors"
          >
            Deny
          </button>
          <button
            onClick={() => onApprove(current.id)}
            className="px-4 py-2 text-sm bg-dash-accent text-white rounded hover:bg-dash-accent/90 transition-colors"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
};

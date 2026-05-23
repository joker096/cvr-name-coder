import React from "react";

interface GitErrorMessageProps {
  error: string;
}

export const GitErrorMessage: React.FC<GitErrorMessageProps> = ({ error }) => (
  <div className="px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-[11px] text-red-400">
    {error}
  </div>
);

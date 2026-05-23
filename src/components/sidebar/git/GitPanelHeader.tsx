import React from "react";
import { GitBranch, RefreshCw } from "lucide-react";
import { IconButton } from "../../shared/IconButton";
import { PanelHeader } from "../../shared/PanelHeader";

interface GitPanelHeaderProps {
  title: string;
  loading: boolean;
  onRefresh: () => void;
  t: any;
}

export const GitPanelHeader: React.FC<GitPanelHeaderProps> = ({ title, loading, onRefresh, t }) => (
  <PanelHeader
    icon={<GitBranch className="w-4 h-4" />}
    title={title}
    actions={
      <IconButton
        icon={<RefreshCw className={loading ? "animate-spin" : ""} />}
        label={t.refresh || "Refresh"}
        onClick={onRefresh}
        disabled={loading}
      />
    }
  />
);

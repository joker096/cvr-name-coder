import React from "react";
import type { ChatConfig } from "../../types/settings";

interface SystemPromptSectionProps {
  currentConfig: ChatConfig;
  onSystemPromptChange: (prompt: string) => void;
  t: Record<string, string>;
}

export const SystemPromptSection: React.FC<SystemPromptSectionProps> = ({
  currentConfig,
  onSystemPromptChange,
  t,
}) => (
  <div className="space-y-2 pt-2.5 border-t border-dash-border">
    <h3 className="text-[10px] font-bold text-dash-text-muted uppercase tracking-widest">
      {t.systemPrompt || "System Prompt / Persona"}
    </h3>
    <textarea
      value={currentConfig.systemPrompt || ""}
      onChange={(e) => onSystemPromptChange(e.target.value)}
      rows={4}
      className="w-full px-2.5 py-1.5 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs resize-none"
      placeholder={t.systemPromptPlaceholder || "Enter a custom system prompt to define AI behavior and persona..."}
    />
  </div>
);

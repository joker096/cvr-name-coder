import React from "react";
import type { ChatConfig } from "../../types/settings";

interface GenerationSectionProps {
  currentConfig: ChatConfig;
  onTemperatureChange: (temp: number) => void;
  onMaxTokensChange: (tokens: number) => void;
  t: Record<string, string>;
}

export const GenerationSection: React.FC<GenerationSectionProps> = ({
  currentConfig,
  onTemperatureChange,
  onMaxTokensChange,
  t,
}) => (
  <div className="space-y-2 pt-2.5 border-t border-dash-border">
    <h3 className="text-[10px] font-bold text-dash-text-muted uppercase tracking-widest">
      {t.generationParams || "Generation Parameters"}
    </h3>
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-dash-text-primary">
          {t.temperature || "Temperature"}
        </label>
        <span className="text-[9px] font-mono text-dash-accent">
          {currentConfig.temperature ?? 0.7}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={2}
        step={0.1}
        value={currentConfig.temperature ?? 0.7}
        onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
        className="w-full accent-dash-accent"
      />
      <div className="flex justify-between text-[8px] text-dash-text-muted mt-1">
        <span>Precise (0)</span>
        <span>Balanced (0.7)</span>
        <span>Creative (2)</span>
      </div>
    </div>
    <div>
      <label className="block text-xs font-medium text-dash-text-primary mb-2">
        {t.maxTokens || "Max Tokens"}
      </label>
      <input
        type="number"
        min={256}
        max={32768}
        step={256}
        value={currentConfig.maxTokens ?? 4096}
        onChange={(e) => onMaxTokensChange(parseInt(e.target.value))}
        className="w-full px-2.5 py-1.5 bg-dash-bg border border-dash-border rounded text-dash-text-primary focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs"
      />
    </div>
  </div>
);

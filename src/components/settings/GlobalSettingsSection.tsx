import React from "react";
import { ToggleSwitch } from "../shared/ToggleSwitch";

interface GlobalSettingsSectionProps {
  isAutonomous: boolean;
  autoCommit: boolean;
  autoLoopDelay: number;
  onToggleAutonomous?: (() => void) | undefined;
  onToggleAutoCommit?: (() => void) | undefined;
  onChangeAutoLoopDelay?: ((delay: number) => void) | undefined;
  t: Record<string, string>;
}

export const GlobalSettingsSection: React.FC<GlobalSettingsSectionProps> = ({
  isAutonomous,
  autoCommit,
  autoLoopDelay,
  onToggleAutonomous,
  onToggleAutoCommit,
  onChangeAutoLoopDelay,
  t,
}) => (
  <div className="mt-4 pt-3 border-t border-dash-border space-y-3">
    <h3 className="text-[10px] font-bold text-dash-text-muted uppercase tracking-widest">
      {t.globalSettings || "Global Settings"}
    </h3>
    <ToggleSwitch
      checked={isAutonomous}
      onChange={onToggleAutonomous ?? (() => {})}
      label={t.autonomousMode || "Autonomous Mode"}
      description={t.autonomousDesc || "Allow AI to trigger itself for multi-step tasks"}
    />
    <ToggleSwitch
      checked={autoCommit}
      onChange={onToggleAutoCommit ?? (() => {})}
      label={t.autoCommit || "Auto-Commit"}
      description={t.autoCommitDesc || "Automatically commit changes after successful agent loop"}
    />
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs font-medium text-dash-text-primary">
            {t.autoLoopDelay || "Auto-Loop Delay"}
          </div>
          <div className="text-[9px] text-dash-text-muted">
            {t.autoLoopDelayDesc || "Delay between autonomous iterations (ms)"}
          </div>
        </div>
        <span className="text-[9px] font-mono text-dash-accent">{autoLoopDelay}ms</span>
      </div>
      <input
        type="range"
        min={500}
        max={10000}
        step={500}
        value={autoLoopDelay}
        onChange={(e) => onChangeAutoLoopDelay?.(parseInt(e.target.value))}
        className="w-full accent-dash-accent"
      />
      <div className="flex justify-between text-[8px] text-dash-text-muted mt-1">
        <span>Fast (500ms)</span>
        <span>Normal (2000ms)</span>
        <span>Slow (10s)</span>
      </div>
    </div>
  </div>
);

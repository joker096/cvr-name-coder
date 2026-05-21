import React from "react";
import { ToggleSwitch } from "../shared/ToggleSwitch";
import type { ChatConfig } from "../../types/settings";

interface VisionSectionProps {
  currentConfig: ChatConfig;
  onVisionToggle: () => void;
  onMaxImageSizeChange: (size: number) => void;
  t: Record<string, string>;
}

export const VisionSection: React.FC<VisionSectionProps> = ({
  currentConfig,
  onVisionToggle,
  onMaxImageSizeChange,
  t,
}) => (
  <div className="space-y-2 pt-2.5 border-t border-dash-border">
    <h3 className="text-[10px] font-bold text-dash-text-muted uppercase tracking-widest">
      {t.visionSettings || "Vision Settings"}
    </h3>
    <ToggleSwitch
      checked={currentConfig.visionEnabled ?? true}
      onChange={onVisionToggle}
      label={t.visionEnabled || "Enable Vision"}
      description={t.visionEnabledDesc || "Allow image upload and vision model usage"}
    />
    {currentConfig.visionEnabled && (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-dash-text-primary">
            {t.maxImageSize || "Max Image Size"}
          </label>
          <span className="text-[9px] font-mono text-dash-accent">
            {currentConfig.maxImageSize ?? 1024}px
          </span>
        </div>
        <input
          type="range"
          min={512}
          max={2048}
          step={128}
          value={currentConfig.maxImageSize ?? 1024}
          onChange={(e) => onMaxImageSizeChange(parseInt(e.target.value))}
          className="w-full accent-dash-accent"
        />
        <div className="flex justify-between text-[8px] text-dash-text-muted mt-1">
          <span>Small (512px)</span>
          <span>Medium (1024px)</span>
          <span>Large (2048px)</span>
        </div>
      </div>
    )}
  </div>
);

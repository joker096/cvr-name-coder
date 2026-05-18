import React, { useState } from "react";
import { Save, Trash2, Check } from "lucide-react";
import { cn } from "../../utils/cn";
import type { Preset, ChatConfig } from "../../types/settings";

interface PresetManagerProps {
  presets: Preset[];
  currentConfig: ChatConfig;
  onSavePreset: (preset: Omit<Preset, "id" | "createdAt">) => void;
  onApplyPreset: (preset: Preset) => void;
  onDeletePreset: (id: string) => void;
  t: any;
  className?: string;
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  presets,
  currentConfig,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
  t,
  className,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      return;
    }

    onSavePreset({
      name: presetName,
      description: presetDescription,
      config: currentConfig,
    });

    setPresetName("");
    setPresetDescription("");
    setShowCreateForm(false);
  };

  const isCurrentConfig = (preset: Preset): boolean => {
    return (
      preset.config.aiProvider === currentConfig.aiProvider &&
      preset.config.aiModel === currentConfig.aiModel &&
      preset.config.customUrl === currentConfig.customUrl &&
      preset.config.localUrl === currentConfig.localUrl &&
      preset.config.localModelName === currentConfig.localModelName
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] uppercase font-bold text-dash-text-muted tracking-widest">
          {t.presets || "Presets"}
        </span>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="text-[12px] text-dash-accent hover:text-dash-accent/80 font-mono"
        >
          {showCreateForm ? (t.cancel || "Cancel") : (t.createPreset || "Create Preset")}
        </button>
      </div>

      {showCreateForm && (
        <div className="space-y-2 p-3 bg-dash-card border border-dash-border rounded-lg">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder={t.presetName || "Preset Name"}
            className="w-full bg-dash-bg border border-dash-border rounded px-3 py-2 text-sm font-mono text-dash-text-primary focus:border-dash-accent outline-none"
          />
          <textarea
            value={presetDescription}
            onChange={(e) => setPresetDescription(e.target.value)}
            placeholder={t.presetDescription || "Description (optional)"}
            className="w-full bg-dash-bg border border-dash-border rounded px-3 py-2 text-sm font-mono text-dash-text-primary focus:border-dash-accent outline-none resize-none"
            rows={2}
          />
          <button
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            className="w-full py-2 bg-dash-accent hover:bg-dash-accent/80 disabled:bg-neutral-800 disabled:text-neutral-700 rounded text-sm font-bold text-white transition-all"
          >
            {t.savePreset || "Save Preset"}
          </button>
        </div>
      )}

      {presets.length === 0 && !showCreateForm && (
        <div className="text-center py-4 text-dash-text-muted text-sm">
          {t.noPresets || "No presets saved yet"}
        </div>
      )}

      <div className="space-y-2">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className={cn(
              "p-3 border rounded-lg transition-all",
              isCurrentConfig(preset)
                ? "bg-dash-accent/10 border-dash-accent/30"
                : "bg-dash-card border-dash-border hover:border-dash-accent/30"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-dash-text-primary truncate">
                    {preset.name}
                  </span>
                  {isCurrentConfig(preset) && (
                    <Check className="w-3 h-3 text-dash-success shrink-0" />
                  )}
                </div>
                <p className="text-xs text-dash-text-muted truncate">
                  {preset.description || t.noDescription || "No description"}
                </p>
                <div className="mt-1 text-[10px] text-dash-text-label font-mono">
                  {preset.config.aiProvider} / {preset.config.aiModel}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => onApplyPreset(preset)}
                  className="p-1.5 hover:bg-dash-accent/10 rounded transition-colors text-dash-accent"
                  title={t.applyPreset || "Apply Preset"}
                >
                  <Save className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onDeletePreset(preset.id)}
                  className="p-1.5 hover:bg-dash-warning/10 rounded transition-colors text-dash-warning"
                  title={t.deletePreset || "Delete Preset"}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

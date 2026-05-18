import React, { useState, useEffect } from "react";
import { Puzzle, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "../../utils/cn";

export interface Plugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
}

interface PluginsPanelProps {
  t: any;
  className?: string;
}

export const PluginsPanel: React.FC<PluginsPanelProps> = ({ t, className }) => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plugins");
      const data = await res.json();
      setPlugins(data.plugins || []);
    } catch (e) {
      console.error("Failed to fetch plugins:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  const togglePlugin = async (id: string, enable: boolean) => {
    try {
      await fetch(`/api/plugins/${id}/${enable ? "enable" : "disable"}`, { method: "POST" });
      setPlugins((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: enable } : p)));
    } catch (e) {
      console.error("Failed to toggle plugin:", e);
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="text-[13px] uppercase tracking-widest text-dash-text-label font-extrabold flex items-center justify-between">
        {t.plugins || "Plugins"}
        <Puzzle className="w-4 h-4" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-[10px] text-dash-text-muted italic">{t.loading || "Loading..."}</div>
        ) : plugins.length === 0 ? (
          <div className="p-2 text-[10px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
            {t.noPlugins || "No plugins installed"}
          </div>
        ) : (
          plugins.map((plugin) => (
            <div
              key={plugin.id}
              className={cn(
                "p-2 bg-neutral-900 border rounded flex items-center justify-between",
                plugin.enabled ? "border-dash-accent/20" : "border-dash-border opacity-60"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-dash-text-primary">{plugin.name}</div>
                <div className="text-[9px] text-dash-text-muted font-mono">v{plugin.version}</div>
              </div>
              <button
                onClick={() => togglePlugin(plugin.id, !plugin.enabled)}
                className="p-1 hover:bg-neutral-800 rounded transition-colors"
                title={plugin.enabled ? t.disable || "Disable" : t.enable || "Enable"}
              >
                {plugin.enabled ? (
                  <ToggleRight className="w-4 h-4 text-dash-success" />
                ) : (
                  <ToggleLeft className="w-4 h-4 text-dash-text-muted" />
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

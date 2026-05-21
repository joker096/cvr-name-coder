import React, { useState, useEffect } from "react";
import { Puzzle, ToggleLeft, ToggleRight, HelpCircle } from "lucide-react";
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

      <div className="p-2 bg-neutral-900/50 border border-dash-border rounded text-[10px] text-dash-text-muted leading-relaxed">
        <div className="flex items-start gap-1.5">
          <HelpCircle className="w-3 h-3 text-dash-accent shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-dash-text-primary block mb-0.5">{t.howToInstall || "How to install plugins:"}</span>
            {t.pluginsHelp || "Place JavaScript files in the"} <code className="text-dash-accent bg-neutral-800 px-1 rounded">.cvr/tools/</code> {t.pluginsHelp2 || "directory. Plugins are auto-loaded on restart. Example plugin:"}
          </div>
        </div>
        <pre className="mt-1.5 bg-neutral-950 p-1.5 rounded text-[9px] text-dash-text-primary overflow-x-auto">
{`// .cvr/tools/my-plugin.js
module.exports = {
  id: "my-plugin",
  name: "My Plugin",
  version: "1.0.0",
  init() { /* setup */ },
  async execute(params) { return { result: "done" }; }
}`}
        </pre>
      </div>

      <div className="p-2 bg-neutral-900/50 border border-dash-border rounded text-[10px] text-dash-text-muted leading-relaxed">
        <div className="font-bold text-dash-text-primary mb-1">{t.recommendedPlugins || "Recommended MCP plugins (npm):"}</div>
        <div className="space-y-1">
          {[
            { cmd: "npx @modelcontextprotocol/server-filesystem /path", desc: t.pluginFilesystem || "Secure file operations" },
            { cmd: "npx @modelcontextprotocol/server-git", desc: t.pluginGit || "Git repo tools" },
            { cmd: "npx @modelcontextprotocol/server-fetch", desc: t.pluginFetch || "Web content fetching" },
            { cmd: "npx @modelcontextprotocol/server-memory", desc: t.pluginMemory || "Knowledge graph memory" },
            { cmd: "npx @modelcontextprotocol/server-postgres DB_URL", desc: t.pluginPostgres || "PostgreSQL read-only access" },
            { cmd: "npx @modelcontextprotocol/server-github", desc: t.pluginGithub || "GitHub API integration" },
            { cmd: "npx @modelcontextprotocol/server-puppeteer", desc: t.pluginPuppeteer || "Browser automation" },
            { cmd: "npx @modelcontextprotocol/server-brave-search", desc: t.pluginBraveSearch || "Web search via Brave API" },
          ].map((p) => (
            <div key={p.cmd} className="flex items-start gap-1.5">
              <span className="text-dash-accent shrink-0 mt-0.5">&#8226;</span>
              <div>
                <code className="text-dash-accent bg-neutral-800 px-1 rounded text-[9px]">{p.cmd}</code>
                <span className="block text-[9px] text-dash-text-muted">{p.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-[10px] text-dash-text-muted italic">{t.loading || "Loading..."}</div>
        ) : plugins.length === 0 ? (
          <div className="p-2 text-[10px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
            {t.noPlugins || "No plugins installed. See guide above."}
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

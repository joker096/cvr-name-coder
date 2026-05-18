import { readdir, readFile, access } from "fs/promises";
import * as path from "path";
import type { PluginManifest, PluginInstance } from "../types/plugin";
import { hookRegistry } from "./hooks.js";

const PLUGINS_DIR = path.resolve(process.cwd(), ".cvr", "plugins");
let _pluginsDir = PLUGINS_DIR;
let _plugins: PluginInstance[] = [];

export function setPluginsDir(dir: string): void {
  _pluginsDir = dir;
}

export async function loadPlugins(): Promise<PluginInstance[]> {
  try {
    await access(_pluginsDir);
  } catch {
    _plugins = [];
    return [];
  }

  const entries = await readdir(_pluginsDir, { withFileTypes: true });
  const plugins: PluginInstance[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pluginPath = path.join(_pluginsDir, entry.name);
    const manifestPath = path.join(pluginPath, "manifest.json");
    try {
      const raw = await readFile(manifestPath, "utf-8");
      const manifest: PluginManifest = JSON.parse(raw);
      if (manifest.id) {
        plugins.push({ manifest, enabled: true, dir: pluginPath });
      }
    } catch {
      // Skip invalid plugins
    }
  }

  _plugins = plugins;
  return plugins;
}

export async function registerPlugins(): Promise<void> {
  const plugins = await loadPlugins();
  for (const plugin of plugins) {
    if (!plugin.enabled) continue;
    await registerPlugin(plugin);
  }
}

async function registerPlugin(plugin: PluginInstance): Promise<void> {
  // Register hooks
  if (plugin.manifest.hooks) {
    for (const hook of plugin.manifest.hooks) {
      try {
        const fn = new Function("ctx", hook.handler) as (ctx: any) => Promise<void> | void;
        hookRegistry.register({
          id: `${plugin.manifest.id}:${hook.point}`,
          hookPoint: hook.point as any,
          handler: fn,
          priority: hook.priority || 0,
        });
      } catch (e) {
        console.error(`Failed to register hook ${hook.point} for plugin ${plugin.manifest.id}:`, e);
      }
    }
  }
}

export function getPlugins(): PluginInstance[] {
  return [..._plugins];
}

export function getPlugin(id: string): PluginInstance | undefined {
  return _plugins.find((p) => p.manifest.id === id);
}

export function disablePlugin(id: string): void {
  const plugin = _plugins.find((p) => p.manifest.id === id);
  if (plugin) plugin.enabled = false;
}

export function enablePlugin(id: string): void {
  const plugin = _plugins.find((p) => p.manifest.id === id);
  if (plugin) plugin.enabled = true;
}

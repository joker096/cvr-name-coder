import { readdir, readFile, access } from "fs/promises";
import * as path from "path";
import type { PluginManifest, PluginInstance } from "../types/plugin";
import { log } from "./logger.js";

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
  // SECURITY: Dynamic code execution from manifest.json is disabled.
  // Plugins are loaded as declarative metadata only.
  // To add runtime behavior, load a companion JS module via require/import
  // after manifest validation and signature verification (future feature).
  if (plugin.manifest.hooks) {
    log.warn(`Plugin ${plugin.manifest.id}: hooks declared in manifest.json are ignored for security. Use a signed JS module instead.`);
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

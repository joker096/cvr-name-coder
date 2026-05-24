import { readdir, readFile, access } from "fs/promises";
import * as path from "path";
import type { PluginManifest, PluginInstance } from "../types/plugin";
import { log } from "./logger.js";

const PLUGINS_DIR = path.resolve(process.cwd(), ".cvr", "plugins");
let _pluginsDir = PLUGINS_DIR;
let _plugins: PluginInstance[] = [];

/**
 * Sets the directory path where plugins are stored.
 * @param dir - Absolute path to the plugins directory
 */
export function setPluginsDir(dir: string): void {
  _pluginsDir = dir;
}

/**
 * Loads plugin manifests from the plugins directory.
 * Each plugin directory must contain a valid `manifest.json` file.
 * Skips invalid or missing manifests silently.
 * @returns Array of loaded plugin instances
 */
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

/**
 * Loads and registers all enabled plugins.
 * Security note: Dynamic code execution from manifest.json is disabled;
 * only declarative metadata is loaded.
 */
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

/**
 * Returns a shallow copy of all currently loaded plugins.
 * @returns Array of plugin instances
 */
export function getPlugins(): PluginInstance[] {
  return [..._plugins];
}

/**
 * Finds a single plugin by its manifest ID.
 * @param id - The plugin manifest ID to look up
 * @returns The matching plugin instance, or undefined if not found
 */
export function getPlugin(id: string): PluginInstance | undefined {
  return _plugins.find((p) => p.manifest.id === id);
}

/**
 * Disables a plugin by its manifest ID.
 * @param id - The plugin manifest ID to disable
 */
export function disablePlugin(id: string): void {
  const plugin = _plugins.find((p) => p.manifest.id === id);
  if (plugin) plugin.enabled = false;
}

/**
 * Enables a plugin by its manifest ID.
 * @param id - The plugin manifest ID to enable
 */
export function enablePlugin(id: string): void {
  const plugin = _plugins.find((p) => p.manifest.id === id);
  if (plugin) plugin.enabled = true;
}

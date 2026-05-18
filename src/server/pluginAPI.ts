import { getPlugins, loadPlugins, registerPlugins, enablePlugin, disablePlugin } from "./pluginManager.js";

export interface PluginAPI {
  version: string;
  getPlugins: () => ReturnType<typeof getPlugins>;
  loadPlugins: () => ReturnType<typeof loadPlugins>;
  registerPlugins: () => ReturnType<typeof registerPlugins>;
  enablePlugin: (id: string) => void;
  disablePlugin: (id: string) => void;
}

export const pluginAPI: PluginAPI = {
  version: "1.0.0",
  getPlugins,
  loadPlugins,
  registerPlugins,
  enablePlugin,
  disablePlugin,
};

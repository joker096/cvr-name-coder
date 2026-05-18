export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  hooks?: Array<{
    point: string;
    handler: string; // function body as string
    priority?: number;
  }>;
  tools?: Array<{
    id: string;
    name: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
    }>;
    handler: string; // function body as string
    readOnly: boolean;
  }>;
}

export interface PluginInstance {
  manifest: PluginManifest;
  enabled: boolean;
  dir: string;
}

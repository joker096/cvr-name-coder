export interface CustomToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  default?: unknown;
}

export interface CustomToolDefinition {
  id: string;
  name: string;
  description: string;
  parameters: CustomToolParameter[];
  handler: {
    type: "command";
    template: string; // e.g. "git log --oneline -{count}"
    cwd?: string;
  } | {
    type: "node";
    script: string; // JavaScript function body as string
  };
  readOnly: boolean;
}

export interface CustomToolResult {
  success: boolean;
  output: string;
  error?: string;
}

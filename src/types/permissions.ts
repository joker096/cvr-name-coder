export type PermissionAction = "allow" | "ask" | "deny";

export interface PermissionRule {
  pattern: string; // glob pattern or regex-like string
  action: PermissionAction;
  scope?: "global" | "project" | "session";
}

export interface PermissionConfig {
  rules: PermissionRule[];
  defaultAction: PermissionAction;
}

export interface PermissionCheckResult {
  action: PermissionAction;
  rule?: PermissionRule;
  reason?: string;
}

export interface PermissionRequest {
  tool: string;
  params: Record<string, any>;
  filePath?: string;
  command?: string;
}

export interface PendingPermission {
  id: string;
  request: PermissionRequest;
  timestamp: number;
  resolved: boolean;
  approved?: boolean;
}

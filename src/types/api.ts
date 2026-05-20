import type { ChatConfig } from './settings';
import type { Message } from './chat';

export interface HistoryEntry {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  createdAt?: Date;
}

export interface MemoryEntry {
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  images?: string[];
  config?: Partial<ChatConfig>;
  kernelConfig?: Partial<ChatConfig>;
  agent?: string;
}

export interface ChatResponse {
  content: string;
  continueNeeded?: boolean;
  error?: string;
}

export interface ToolExecuteRequest {
  toolCall: {
    name: string;
    params: Record<string, unknown>;
  };
  mode?: 'plan' | 'build' | 'review';
  sessionId?: string;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  changeId?: string;
  base64?: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  uptime: number;
  timestamp: string;
  version: string;
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface SessionSearchResult {
  id: string;
  title: string;
  snippet: string;
  score: number;
}

export interface MemorySection {
  title: string;
  content: string;
}

export interface MemoryResponse {
  raw: string;
  sections: MemorySection[];
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  content?: string;
}

export interface PermissionRequest {
  tool: string;
  params: Record<string, unknown>;
  filePath?: string;
  command?: string;
}

export interface PermissionResult {
  action: 'allow' | 'deny' | 'ask';
  reason?: string;
  rule?: { pattern: string; action: string };
}

export interface PendingPermission {
  id: string;
  request: PermissionRequest;
  createdAt: number;
}

export interface AgentLoopState {
  goal: string;
  status: 'planning' | 'executing' | 'observing' | 'completed' | 'error';
  currentStep: number;
  maxSteps: number;
  steps: Array<{
    id: number;
    thought: string;
    action?: { tool: string; params: Record<string, unknown> };
    observation?: string;
    timestamp: number;
  }>;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
}

export interface GitDiff {
  path: string;
  additions: number;
  deletions: number;
  hunks: Array<{
    header: string;
    lines: Array<{
      type: 'add' | 'delete' | 'context';
      content: string;
    }>;
  }>;
}

export interface BrowserSession {
  id: string;
  url: string;
  active: boolean;
}

export interface CostEntry {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: number;
}

export interface CostSummary {
  total: number;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
  entries: CostEntry[];
}

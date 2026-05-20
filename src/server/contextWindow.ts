import { estimateTokens } from './costTracker.js';
import { log } from './logger.js';

export enum Priority {
  CRITICAL = 5,
  HIGH = 3,
  NORMAL = 1,
  LOW = 0,
}

export interface ContextMessage {
  role: string;
  content: string;
  priority: Priority;
  timestamp: number;
  id: string;
}

export interface ContextWindowOptions {
  maxTokens?: number;
  tokenBuffer?: number;
}

export class ContextWindow {
  private messages: ContextMessage[] = [];
  private maxTokens: number;
  private tokenBuffer: number;
  private nextId = 0;

  constructor(options: ContextWindowOptions = {}) {
    this.maxTokens = options.maxTokens ?? 128000;
    this.tokenBuffer = options.tokenBuffer ?? 16000;
  }

  add(role: string, content: string, priority: Priority = Priority.NORMAL): void {
    this.messages.push({
      role,
      content,
      priority,
      timestamp: Date.now(),
      id: String(this.nextId++),
    });
  }

  addMany(msgs: Array<{ role: string; content: string; priority?: Priority }>): void {
    for (const m of msgs) {
      this.add(m.role, m.content, m.priority ?? Priority.NORMAL);
    }
  }

  clear(): void {
    this.messages = [];
  }

  size(): number {
    return this.messages.length;
  }

  totalTokens(): number {
    return this.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  }

  getMessages(): ContextMessage[] {
    const effectiveBudget = this.maxTokens - this.tokenBuffer;
    const systemMsgs = this.messages.filter((m) => m.priority === Priority.CRITICAL);
    const rest = this.messages.filter((m) => m.priority !== Priority.CRITICAL);

    const systemTokens = systemMsgs.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    let remainingBudget = effectiveBudget - systemTokens;

    if (remainingBudget <= 0) {
      log.warn('Context window: system messages exceed budget');
      return systemMsgs;
    }

    const sorted = [...rest].sort((a, b) => b.priority - a.priority || b.timestamp - a.timestamp);
    const result: ContextMessage[] = [...systemMsgs];
    let usedTokens = 0;

    for (const msg of sorted) {
      const msgTokens = estimateTokens(msg.content);
      if (usedTokens + msgTokens <= remainingBudget) {
        result.push(msg);
        usedTokens += msgTokens;
      }
    }

    const trimmed = this.messages.length - result.length;
    if (trimmed > 0) {
      log.debug('Context window trimmed', {
        total: this.messages.length,
        kept: result.length,
        trimmed,
        budget: effectiveBudget,
        used: systemTokens + usedTokens,
      });
    }

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }

  getStats(): { total: number; kept: number; trimmed: number; budget: number; used: number } {
    const kept = this.getMessages();
    return {
      total: this.messages.length,
      kept: kept.length,
      trimmed: this.messages.length - kept.length,
      budget: this.maxTokens - this.tokenBuffer,
      used: kept.reduce((s, m) => s + estimateTokens(m.content), 0),
    };
  }
}

export const globalContextWindow = new ContextWindow();

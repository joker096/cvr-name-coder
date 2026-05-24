import { estimateTokens } from './costTracker.js';
import { log } from './logger.js';

/**
 * Priority levels for context window messages.
 * Higher values indicate greater importance, ensuring the message is kept when trimming.
 */
export enum Priority {
  /** Must always be included (e.g. system instructions). */
  CRITICAL = 5,
  /** Important but can be trimmed under extreme pressure. */
  HIGH = 3,
  /** Standard priority for most messages. */
  NORMAL = 1,
  /** Low priority; trimmed first when the budget is exceeded. */
  LOW = 0,
}

/**
 * A message stored in the context window with priority and timestamp metadata.
 */
export interface ContextMessage {
  /** The role of the message sender (e.g. "user", "assistant", "system"). */
  role: string;
  /** The message content text. */
  content: string;
  /** The priority level used when trimming the context window. */
  priority: Priority;
  /** Unix timestamp (ms) when the message was added. */
  timestamp: number;
  /** Unique identifier for this message instance. */
  id: string;
}

/**
 * Configuration options for the context window.
 */
export interface ContextWindowOptions {
  /** Maximum total tokens allowed in the context window. Default: 128000. */
  maxTokens?: number;
  /** Token buffer reserved for the response, subtracted from maxTokens. Default: 16000. */
  tokenBuffer?: number;
}

/**
 * Manages a sliding context window for LLM conversations.
 * Adds messages with priorities, tracks token usage, and trims the window
 * to stay within a specified token budget.
 */
export class ContextWindow {
  private messages: ContextMessage[] = [];
  private maxTokens: number;
  private tokenBuffer: number;
  private nextId = 0;

  /**
   * Creates a new ContextWindow.
   * @param {ContextWindowOptions} [options={}] - Configuration options for the window.
   */
  constructor(options: ContextWindowOptions = {}) {
    this.maxTokens = options.maxTokens ?? 128000;
    this.tokenBuffer = options.tokenBuffer ?? 16000;
  }

  /**
   * Adds a single message to the context window.
   * @param {string} role - The role of the message sender.
   * @param {string} content - The message content.
   * @param {Priority} [priority=Priority.NORMAL] - The priority level for this message.
   */
  add(role: string, content: string, priority: Priority = Priority.NORMAL): void {
    this.messages.push({
      role,
      content,
      priority,
      timestamp: Date.now(),
      id: String(this.nextId++),
    });
  }

  /**
   * Adds multiple messages to the context window in a single call.
   * @param {Array<{ role: string; content: string; priority?: Priority }>} msgs - Array of messages to add.
   */
  addMany(msgs: Array<{ role: string; content: string; priority?: Priority }>): void {
    for (const m of msgs) {
      this.add(m.role, m.content, m.priority ?? Priority.NORMAL);
    }
  }

  /**
   * Removes all messages from the context window.
   */
  clear(): void {
    this.messages = [];
  }

  /**
   * Returns the current number of messages in the context window.
   * @returns {number} The message count.
   */
  size(): number {
    return this.messages.length;
  }

  /**
   * Calculates the estimated total token count of all messages.
   * @returns {number} The estimated total token count.
   */
  totalTokens(): number {
    return this.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  }

  /**
   * Returns the messages that fit within the token budget, sorted by timestamp.
   * CRITICAL priority messages are always included. Remaining messages are selected
   * by priority (highest first), then recency, until the budget is exhausted.
   * @returns {ContextMessage[]} The set of messages that fit in the current budget.
   */
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

  /**
   * Returns statistics about the context window including total, kept, and trimmed counts.
   * @returns {{ total: number; kept: number; trimmed: number; budget: number; used: number }} Window statistics.
   */
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

/**
 * Global singleton context window instance used across the application.
 */
export const globalContextWindow = new ContextWindow();

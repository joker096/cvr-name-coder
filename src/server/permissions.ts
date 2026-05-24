import {
  PermissionConfig,
  PermissionCheckResult,
  PermissionRequest,
  PendingPermission,
} from "../types/permissions";
import { randomUUID } from "crypto";
import { EventEmitter } from "events";

/**
 * Permission engine for controlling tool execution access.
 * 
 * Evaluates permission rules against tool requests to determine
 * whether to allow, deny, or ask for user confirmation.
 * 
 * @example
 * ```ts
 * const engine = new PermissionEngine({
 *   rules: [
 *     { pattern: 'read_file', action: 'allow' },
 *     { pattern: 'write_file', action: 'ask' },
 *     { pattern: '*.env*', action: 'deny' },
 *   ],
 *   defaultAction: 'ask'
 * });
 * 
 * const result = engine.check({ tool: 'write_file', filePath: 'src/index.ts' });
 * // result.action === 'ask'
 * ```
 */
export class PermissionEngine {
  private config: PermissionConfig;
  private pending = new Map<string, PendingPermission>();
  private emitter = new EventEmitter();

  /**
   * Creates a new PermissionEngine instance.
   * @param config - Permission configuration with rules and default action
   */
  constructor(config: PermissionConfig) {
    this.config = config;
  }

  /**
   * Checks a permission request against configured rules.
   * Rules are evaluated in order, with the last matching rule winning.
   * @param request - The permission request to check
   * @returns The check result with action and matching rule (if any)
   */
  check(request: PermissionRequest): PermissionCheckResult {
    // Check rules in order, last match wins
    let lastMatch: PermissionCheckResult | null = null;

    for (const rule of this.config.rules) {
      if (this.matches(request, rule.pattern)) {
        lastMatch = { action: rule.action, rule };
      }
    }

    return lastMatch || { action: this.config.defaultAction };
  }

  private matches(request: PermissionRequest, pattern: string): boolean {
    // Check tool name, file path, and command independently
    return (
      this.globMatch(request.tool, pattern) ||
      (request.filePath ? this.globMatch(request.filePath, pattern) : false) ||
      (request.command ? this.globMatch(request.command, pattern) : false)
    );
  }

  private globMatch(text: string, pattern: string): boolean {
    // Implement simple glob matching
    // Convert glob to regex: * -> .*, ? -> ., escape special chars
    const regex = new RegExp(
      "^" +
        pattern
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/\?/g, ".") +
        "$",
      "i"
    );
    return regex.test(text);
  }

  /**
   * Creates a pending permission request for user approval.
   * Used when action is 'ask' and user confirmation is needed.
   * @param request - The permission request
   * @returns The created pending permission with unique ID
   */
  createPending(request: PermissionRequest): PendingPermission {
    const id = randomUUID();
    const pending: PendingPermission = {
      id,
      request,
      timestamp: Date.now(),
      resolved: false,
    };
    this.pending.set(id, pending);
    return pending;
  }

  /**
   * Resolves a pending permission request.
   * @param id - The pending permission ID
   * @param approved - Whether the request was approved
   */
  resolve(id: string, approved: boolean): void {
    const pending = this.pending.get(id);
    if (pending) {
      pending.resolved = true;
      pending.approved = approved;
      this.emitter.emit(`resolved:${id}`, approved);
      // Auto-delete after a short delay to prevent memory accumulation
      setTimeout(() => this.pending.delete(id), 300000); // 5 minutes
    }
  }

  /**
   * Waits for a pending permission request to be resolved.
   * Returns false if the request times out or is not found.
   * @param id - The pending permission ID to wait for
   * @param timeoutMs - Maximum time to wait in milliseconds
   * @returns A Promise resolving to true if approved, false if denied or timed out
   */
  async waitForResolution(id: string, timeoutMs: number): Promise<boolean> {
    const pending = this.pending.get(id);
    if (!pending) return false;
    if (pending.resolved) return pending.approved ?? false;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.emitter.off(`resolved:${id}`, onResolved);
        resolve(false);
      }, timeoutMs);

      const onResolved = (approved: boolean) => {
        clearTimeout(timer);
        resolve(approved);
      };

      this.emitter.once(`resolved:${id}`, onResolved);
    });
  }

  /**
   * Retrieves a pending permission request by ID.
   * @param id - The pending permission ID
   * @returns The pending permission, or undefined if not found
   */
  getPending(id: string): PendingPermission | undefined {
    return this.pending.get(id);
  }

  /**
   * Lists all unresolved (not yet approved/denied) pending permissions.
   * @returns Array of unresolved pending permissions
   */
  listPending(): PendingPermission[] {
    return Array.from(this.pending.values()).filter((p) => !p.resolved);
  }

  /**
   * Removes all resolved (approved or denied) pending permissions from memory.
   * Prevents memory accumulation from old permission requests.
   */
  clearResolved(): void {
    for (const [id, p] of this.pending) {
      if (p.resolved) this.pending.delete(id);
    }
  }
}

import {
  PermissionConfig,
  PermissionCheckResult,
  PermissionRequest,
  PendingPermission,
} from "../types/permissions";
import { randomUUID } from "crypto";
import { EventEmitter } from "events";

export class PermissionEngine {
  private config: PermissionConfig;
  private pending = new Map<string, PendingPermission>();
  private emitter = new EventEmitter();

  constructor(config: PermissionConfig) {
    this.config = config;
  }

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

  getPending(id: string): PendingPermission | undefined {
    return this.pending.get(id);
  }

  listPending(): PendingPermission[] {
    return Array.from(this.pending.values()).filter((p) => !p.resolved);
  }

  clearResolved(): void {
    for (const [id, p] of this.pending) {
      if (p.resolved) this.pending.delete(id);
    }
  }
}

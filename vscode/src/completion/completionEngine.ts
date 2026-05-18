import type { CompletionRequest, CompletionResponse } from '../types/completion.js';

export class CompletionEngine {
  private port: number = 0;
  private cache: Map<string, CompletionResponse> = new Map();
  private pendingController: AbortController | null = null;

  setPort(port: number): void {
    this.port = port;
  }

  async requestCompletion(req: CompletionRequest, signal?: AbortSignal): Promise<CompletionResponse> {
    if (!this.port) return { items: [] };

    this.pendingController?.abort();
    const controller = new AbortController();
    this.pendingController = controller;

    const cacheKey = `${req.filePath}:${req.language}:${req.textBeforeCursor.slice(-200)}:${req.textAfterCursor.slice(-100)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const combinedSignal = signal ? this.combineSignals(controller.signal, signal) : controller.signal;

      const response = await fetch(`http://127.0.0.1:${this.port}/api/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: combinedSignal,
      });

      if (!response.ok) return { items: [] };

      const data: CompletionResponse = await response.json();
      this.addToCache(cacheKey, data);
      return data;
    } catch {
      return { items: [] };
    }
  }

  private combineSignals(s1: AbortSignal, s2: AbortSignal): AbortSignal {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    s1.addEventListener('abort', onAbort, { once: true });
    s2.addEventListener('abort', onAbort, { once: true });
    if (s1.aborted || s2.aborted) controller.abort();
    return controller.signal;
  }

  private addToCache(key: string, value: CompletionResponse): void {
    if (this.cache.size >= 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clearCache(): void {
    this.cache.clear();
  }
}

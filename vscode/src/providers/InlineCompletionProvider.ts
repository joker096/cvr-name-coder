import * as vscode from 'vscode';
import { CompletionEngine } from '../completion/completionEngine.js';
import type { CompletionConfig, CompletionRequest } from '../types/completion.js';

export class CvrInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private engine: CompletionEngine,
    private config: CompletionConfig,
  ) {}

  updateConfig(config: CompletionConfig): void {
    this.config = config;
  }

  private debounce(): Promise<void> {
    return new Promise(resolve => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      if (this.config.debounceMs > 0) {
        this.debounceTimer = setTimeout(resolve, this.config.debounceMs);
      } else {
        resolve();
      }
    });
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    if (!this.config.enabled) return undefined;

    await this.debounce();

    const lineBefore = Math.max(0, position.line - this.config.maxPrefixLines);
    const textBeforeCursor = document.getText(
      new vscode.Range(new vscode.Position(lineBefore, 0), position)
    );

    const suffixEndLine = Math.min(document.lineCount - 1, position.line + this.config.maxSuffixLines);
    const suffixEndChar = document.lineAt(suffixEndLine).text.length;
    const textAfterCursor = document.getText(
      new vscode.Range(position, new vscode.Position(suffixEndLine, suffixEndChar))
    );

    const request: CompletionRequest = {
      textBeforeCursor,
      textAfterCursor,
      filePath: document.uri.fsPath,
      language: document.languageId,
      maxLines: this.config.maxSuffixLines,
    };

    const controller = new AbortController();
    const disposable = token.onCancellationRequested(() => controller.abort());
    try {
      const response = await this.engine.requestCompletion(request, controller.signal);
      if (!response.items || response.items.length === 0) return undefined;

      return response.items.map(item => new vscode.InlineCompletionItem(
        item.text,
        item.range ? new vscode.Range(item.range[0], 0, item.range[1], 0) : undefined,
      ));
    } catch {
      return undefined;
    } finally {
      disposable.dispose();
    }
  }
}

import * as vscode from 'vscode';
import type { InlineEditRequest } from '../types/edit.js';

export class InlineEditProvider {
  async edit(request: InlineEditRequest, port: number): Promise<string | null> {
    const url = `http://127.0.0.1:${port}/api/edit/inline`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.replacement ?? null;
  }

  showDiff(original: string, modified: string, fileName: string): void {
    const originalUri = vscode.Uri.parse(`untitled:${fileName}.original`);
    const modifiedUri = vscode.Uri.parse(`untitled:${fileName}.modified`);

    vscode.commands.executeCommand('vscode.diff', originalUri, modifiedUri, `Inline Edit: ${fileName}`);
  }
}

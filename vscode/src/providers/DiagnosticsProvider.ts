import * as vscode from 'vscode';

export const DIAGNOSTIC_COLLECTION_NAME = 'cvr-edits';

const POST_EDIT_PATTERNS: Array<{
  pattern: RegExp;
  message: string;
  severity: vscode.DiagnosticSeverity;
}> = [
  { pattern: /\bdebugger\b/, message: 'debugger statement left in code', severity: vscode.DiagnosticSeverity.Warning },
  { pattern: /console\.(log|debug|info|warn|error)\s*\(/, message: 'console statement in edited code', severity: vscode.DiagnosticSeverity.Information },
  { pattern: /TODO:/, message: 'TODO left in code', severity: vscode.DiagnosticSeverity.Hint },
  { pattern: /FIXME:/, message: 'FIXME left in code', severity: vscode.DiagnosticSeverity.Warning },
  { pattern: /it\.only\b|describe\.only\b/, message: '.only() test detected - may skip other tests', severity: vscode.DiagnosticSeverity.Warning },
];

export class DiagnosticsProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private enabled: boolean;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_COLLECTION_NAME);
    this.enabled = true;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.diagnosticCollection.clear();
    }
  }

  async checkFileAfterEdit(filePath: string): Promise<void> {
    if (!this.enabled) return;

    const uri = vscode.Uri.file(filePath);
    const diagnostics: vscode.Diagnostic[] = [];

    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();
      const lines = text.split('\n');

      for (const check of POST_EDIT_PATTERNS) {
        const regex = new RegExp(check.pattern.source, check.pattern.flags.includes('g') ? check.pattern.flags : check.pattern.flags + 'g');

        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          const lineIndex = text.substring(0, match.index).split('\n').length - 1;
          if (lineIndex < lines.length) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);

            diagnostics.push(
              new vscode.Diagnostic(
                new vscode.Range(startPos, endPos),
                check.message,
                check.severity
              )
            );
          }
        }
      }

      this.diagnosticCollection.set(uri, diagnostics);
    } catch (e) {
      console.error('Diagnostics check failed for', filePath, e);
    }
  }

  clear(): void {
    this.diagnosticCollection.clear();
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
  }
}

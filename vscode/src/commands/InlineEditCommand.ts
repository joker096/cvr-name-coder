import * as vscode from 'vscode';
import { InlineEditProvider } from '../providers/InlineEditProvider.js';
import type { InlineEditRequest } from '../types/edit.js';

export function registerInlineEditCommand(context: vscode.ExtensionContext, getPort: () => number | null): void {
  const provider = new InlineEditProvider();

  context.subscriptions.push(
    vscode.commands.registerCommand('cvr.inlineEdit', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
      }

      if (editor.selection.isEmpty) {
        vscode.window.showErrorMessage('No code selected. Select code first.');
        return;
      }

      const instruction = await vscode.window.showInputBox({
        prompt: 'Describe the edit to apply to the selected code',
        placeHolder: 'e.g., extract to function, add error handling, rename variable...',
      });

      if (!instruction) return;

      const document = editor.document;
      const selection = editor.selection;
      const selectedCode = document.getText(selection);
      const wholeFile = document.getText();

      const request: InlineEditRequest = {
        selectedCode,
        filePath: document.uri.fsPath || document.uri.toString(),
        language: document.languageId,
        instruction,
        wholeFile,
        selectionStart: {
          line: selection.start.line,
          character: selection.start.character,
        },
        selectionEnd: {
          line: selection.end.line,
          character: selection.end.character,
        },
      };

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'cvr.name: Applying inline edit...',
          cancellable: false,
        },
        async () => {
          try {
            const port = getPort();
            if (port === null) {
              vscode.window.showErrorMessage('Server not ready yet. Try again in a moment.');
              return;
            }
            const replacement = await provider.edit(request, port);
            if (replacement === null) return;

            await editor.edit((editBuilder) => {
              editBuilder.replace(selection, replacement);
            });
          } catch (e: any) {
            vscode.window.showErrorMessage(`Inline edit failed: ${e.message}`);
          }
        }
      );
    })
  );
}

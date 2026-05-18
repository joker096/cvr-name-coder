import * as vscode from 'vscode';

export class DiffViewProvider {
  async showChangeDiff(
    originalContent: string,
    newContent: string,
    filePath: string,
    label: string
  ): Promise<boolean> {
    const originalDoc = await vscode.workspace.openTextDocument({
      content: originalContent,
    });
    const newDoc = await vscode.workspace.openTextDocument({
      content: newContent,
    });

    await vscode.commands.executeCommand(
      'vscode.diff',
      originalDoc.uri,
      newDoc.uri,
      `${filePath}: ${label}`
    );

    const accept = await vscode.window.showInformationMessage(
      'Apply this change?',
      { modal: true },
      'Apply',
      'Skip'
    );

    return accept === 'Apply';
  }
}

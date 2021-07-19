import * as vscode from 'vscode';

export default async (uri: vscode.Uri, position: vscode.Position) => {
  return await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider',
    uri,
    position,
  ) || [];
};


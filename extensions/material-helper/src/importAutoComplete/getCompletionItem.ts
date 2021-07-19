import * as vscode from 'vscode';

export default function getCompletionItem(itemText: string, moduleName: string = '${1:moduleName}'): vscode.CompletionItem {
  const completionItem = new vscode.CompletionItem(`import '${itemText}'`, vscode.CompletionItemKind.Variable);
  completionItem.detail = 'AppWorks';
  completionItem.insertText = new vscode.SnippetString(`import ${moduleName} from '${itemText}';`);
  return completionItem;
}

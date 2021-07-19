import * as vscode from 'vscode';
import getCompletionItem from './getCompletionItem';

/**
 * get items from project Framework
 * if project is ICE project, help import 'ice'
 * if project is Rax project, help import 'rax'
 */
export default (
  projectFramework: string,
  alreadyImportSet: Set<string>,
): vscode.CompletionItem[] => {
  const items: vscode.CompletionItem[] = [];
  if (projectFramework === 'icejs' && !alreadyImportSet.has('ice')) {
    items.push(getCompletionItem('ice', '{ ${1} }'));
  } else if (['rax-app', 'rax-component'].includes(projectFramework) && !alreadyImportSet.has('rax')) {
    items.push(getCompletionItem('rax', '{ ${1} }'));
  }
  return items;
};

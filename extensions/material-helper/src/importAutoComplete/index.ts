import * as vscode from 'vscode';
import * as path from 'path';
import { getProjectFramework } from '@appworks/project-service';
import getAlreadyImportSet from './getAlreadyImportSet';
import getRouteItems from './getRouteItems';
import getStoreItems from './getStoreItems';
import getFrameworkItems from './getFrameworkItems';
import getComponentItems from './getComponentItems';
import getFileItems from './getFileItems';

async function provideCompletionItems(document: vscode.TextDocument): Promise<vscode.CompletionItem[]> {
  const items: vscode.CompletionItem[] = [];
  const alreadyImportSet = getAlreadyImportSet(document);
  const projectFramework = await getProjectFramework();
  const filename = path.basename(document.fileName);
  const filePath = path.dirname(document.fileName);
  const directoryPath = path.dirname(document.fileName);

  items.push(...await getStoreItems(filename, filePath, projectFramework, alreadyImportSet));
  items.push(...await getRouteItems(filename, filePath, projectFramework, alreadyImportSet));
  items.push(...await getComponentItems(filename, filePath, alreadyImportSet));
  items.push(...await getFileItems(filename, directoryPath, alreadyImportSet));
  items.push(...getFrameworkItems(projectFramework, alreadyImportSet));
  return items;
}

export default () => {
  vscode.languages.registerCompletionItemProvider(
    ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'],
    {
      provideCompletionItems,
    },
    'import',
  );
};


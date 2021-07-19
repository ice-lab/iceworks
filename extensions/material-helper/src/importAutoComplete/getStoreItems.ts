import * as vscode from 'vscode';
import * as path from 'path';
import getFilenameWithoutExtname from './getFilenameWithoutExtname';
import getCompletionItem from './getCompletionItem';

function checkIsValidate(filename: string, projectFramework: string): boolean {
  const validateStoreFilenames = ['store.js', 'store.ts'];
  const validateFramework = ['icejs', 'rax-app'];
  return validateStoreFilenames.includes(filename) && validateFramework.includes(projectFramework);
}

/**
 * get items in store.[j|t]s from models folder
 * Example:
 *  import xxx from './models/xxx';
 */
export default async (
  filename: string,
  filePath: string,
  projectFramework: string,
  alreadyImportSet: Set<string>,
): Promise<vscode.CompletionItem[]> => {
  const items: vscode.CompletionItem[] = [];
  if (checkIsValidate(filename, projectFramework)) {
    try {
      const modelsDirectoryPath = path.resolve(filePath, 'models');
      const modelsDirectoryUri = vscode.Uri.parse(modelsDirectoryPath);
      // if modelsDirectoryUri is not exist, the error will be thrown and this complete is not work.
      const files = await vscode.workspace.fs.readDirectory(modelsDirectoryUri);
      for (const file of files) {
        const importSourceValue = `./models/${getFilenameWithoutExtname(file[0])}`;
        if (!alreadyImportSet.has(path.join(importSourceValue))) {
          items.push(getCompletionItem(importSourceValue));
        }
      }
    } catch (e) {
      // ignore
    }
  }
  return items;
};


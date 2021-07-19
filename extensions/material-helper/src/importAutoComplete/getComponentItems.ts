import * as vscode from 'vscode';
import * as path from 'path';
import getCompletionItem from './getCompletionItem';
import getFilenameWithoutExtname from './getFilenameWithoutExtname';

function checkIsValidateOfReactComponent(currentFilename: string, alreadyImportSet: Set<string>): boolean {
  return (
    ['.jsx', '.tsx'].includes(path.extname(currentFilename)) ||
    alreadyImportSet.has('react') || alreadyImportSet.has('rax')
  );
}

/**
 * get items from Components folder
 * it take effect only when user type in react file;
 * Example:
 *  import xxx from './components'
 */
export default async (
  filename: string,
  filePath: string,
  alreadyImportSet: Set<string>,
): Promise<vscode.CompletionItem[]> => {
  const items: vscode.CompletionItem[] = [];
  try {
    if (checkIsValidateOfReactComponent(filename, alreadyImportSet)) {
      const componentsDirectoryPath = path.resolve(filePath, 'components');
      const componentsDirectoryUri = vscode.Uri.parse(componentsDirectoryPath);
      const files = await vscode.workspace.fs.readDirectory(componentsDirectoryUri);
      files.forEach((file) => {
        const importSourceValue = `./components/${getFilenameWithoutExtname(file[0])}`;
        if (!alreadyImportSet.has(path.join(importSourceValue))) {
          items.push(getCompletionItem(importSourceValue));
        }
      });
    }
  } catch (err) {
    // ignore;
  }
  return items;
};

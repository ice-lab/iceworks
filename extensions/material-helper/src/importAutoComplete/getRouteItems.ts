import * as vscode from 'vscode';
import * as path from 'path';
import getFilenameWithoutExtname from './getFilenameWithoutExtname';
import getCompletionItem from './getCompletionItem';

function checkIsValidate(filename: string, projectFramework: string): boolean {
  const validateStoreFilenames = ['routes.ts', 'routes.js'];
  const validateFramework = ['icejs'];
  return validateStoreFilenames.includes(filename) && validateFramework.includes(projectFramework);
}

/**
 * check the file is layouts or pages directory
 * @param fileType;
 * @param filename;
 */
function checkValidateOfIsDirectory([filename, fileType]: [string, vscode.FileType]): boolean {
  return fileType === vscode.FileType.Directory && ['layouts', 'pages'].includes(filename);
}

async function getItemsFromDirectory(
  directoryPath: string,
  directoryName: string,
  alreadyImportSet: Set<string>,
): Promise<vscode.CompletionItem[]> {
  const items: vscode.CompletionItem[] = [];
  const uri = vscode.Uri.parse(directoryPath);
  const files = await vscode.workspace.fs.readDirectory(uri);
  for (const file of files) {
    const filenameWithoutExtname = getFilenameWithoutExtname(file[0]);
    const importSourceValue = `./${directoryName}/${filenameWithoutExtname}`;
    if (!alreadyImportSet.has(path.join(importSourceValue))) {
      items.push(getCompletionItem(importSourceValue));
    }
  }
  return items;
}

/**
 * get items in route.[t|j]s from layouts & pages directory
 * Example:
 *  import xxx from './pages/xxx';
 *  import xxx from './layouts/xxx';
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
      const uri = vscode.Uri.parse(filePath);
      const files = await vscode.workspace.fs.readDirectory(uri);
      for (const file of files) {
        const filenameInDirectory = file[0];
        if (checkValidateOfIsDirectory(file)) {
          /* eslint-disable no-await-in-loop */
          items.push(
            ...await getItemsFromDirectory(
              path.resolve(filePath, filenameInDirectory),
              filenameInDirectory,
              alreadyImportSet,
            ),
          );
        }
      }
    } catch (e) {
      console.log(e);
    }
  }
  return items;
};

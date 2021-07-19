import * as vscode from 'vscode';
import * as path from 'path';
import getCompletionItem from './getCompletionItem';
import getFilenameWithoutExtname from './getFilenameWithoutExtname';

interface IValidateRule {
  validateCallback: Function;
  args: any[];
}

function checkValidateOfIndexFile(importFileName: string): boolean {
  const indexFilename = 'index';
  const filenameWithoutExtname = path.basename(importFileName, path.extname(importFileName));
  return !(filenameWithoutExtname === indexFilename);
}
function checkValidateOfTsDeclarationFile(importFileName: string): boolean {
  return !importFileName.endsWith('.d.ts');
}

function checkValidateOfAlreadyImport(importFileName: string, alreadyImportSet: Set<string>): boolean {
  return !alreadyImportSet.has(importFileName);
}

function checkValidateOfCurrentFile(importFileName: string, currentFilename): boolean {
  return importFileName !== currentFilename;
}

const checkIsValidate = (validateRules: IValidateRule[]) => {
  return validateRules.every((validateRule) => {
    return validateRule.validateCallback(...validateRule.args);
  });
};

function getItemsFromFile(
  filename: string,
  importFilename: string,
  alreadyImportSet: Set<string>,
): vscode.CompletionItem[] {
  const items: vscode.CompletionItem[] = [];
  const importSourceValue = `./${getFilenameWithoutExtname(importFilename)}`;
  const validateRules: IValidateRule[] = [
    {
      validateCallback: checkValidateOfIndexFile,
      args: [importFilename],
    },
    {
      validateCallback: checkValidateOfTsDeclarationFile,
      args: [importFilename],
    },
    {
      validateCallback: checkValidateOfAlreadyImport,
      args: [path.join(importSourceValue), alreadyImportSet],
    },
    {
      validateCallback: checkValidateOfCurrentFile,
      args: [importFilename, filename],
    },
  ];
  if (checkIsValidate(validateRules)) {
    items.push(getCompletionItem(importSourceValue));
  }
  return items;
}

/**
 * get file's items from current directory
 * Example:
 *  current directory has index.module.scss, utils.ts, ...
 *  import xxx from './index.module.scss';
 *  import xxx from './utils';
 *  import xxx from './xxx';
 */
export default async (
  filename: string,
  directoryPath: string,
  alreadyImportSet: Set<string>,
): Promise<vscode.CompletionItem[]> => {
  const items: vscode.CompletionItem[] = [];
  try {
    const directoryUri = vscode.Uri.parse(directoryPath);
    const files = await vscode.workspace.fs.readDirectory(directoryUri);
    for (const file of files) {
      const [importFilename, fileType] = [file[0], file[1]];
      if (fileType === vscode.FileType.File) {
        items.push(...getItemsFromFile(filename, importFilename, alreadyImportSet));
      }
    }
  } catch (e) {
    console.error(e);
  }
  return items;
};


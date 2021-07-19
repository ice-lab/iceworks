import * as vscode from 'vscode';
import * as path from 'path';
import { getProjectFramework } from '@appworks/project-service';
import * as ejs from 'ejs';
import * as util from 'util';
import * as fs from 'fs';

const renderFileAsync = util.promisify(ejs.renderFile);
const writeFileAsync = util.promisify(fs.writeFile);

enum CreateFileTypes {
  Null,
  Store,
  Models,
}

function checkIsTsorJsFile(filename: string) {
  return ['.js', '.ts'].includes(path.extname(filename));
}


/**
 * check the file is or not validate Store.[t|j]s file
 * conditions:
 *  1. the filename must is store.[t|j]s
 *  2. the filePath must start with xxx/src or xxx/src/pages/xxx;
 */

function checkIsValidateStoreFile(srcDir: string, filePath: string, filename: string): boolean {
  const pagesDir = 'src/pages';
  // the file's directory  is or not xxx/src |  xxx/src/pages/xxx/
  const isInValidateDir = !!vscode.workspace.workspaceFolders?.find((workspaceFolder) => {
    return (
      // It prevent user create store.[t|j]s file in models folder,
      !filePath.endsWith('/models') &&
      (
        path.join(workspaceFolder.uri.fsPath, srcDir) === filePath ||
        filePath.startsWith(path.join(workspaceFolder.uri.fsPath, pagesDir))
      )
    );
  });

  const storeFilenames = ['store.ts', 'store.js'];
  return storeFilenames.includes(filename) && isInValidateDir;
}


/**
 * check the file is or not validate model file
 * conditions:
 *  1. file must .js or .ts filename extension;
 *
 */
function checkIsValidateInModelsFolder(srcDir: string, filePath: string, filename: string): boolean {
  // models folder
  // Example: xxx/models/xx.[t|j]s;
  const modelsDir = '/models';
  const isInValidateModelsDir = !!vscode.workspace.workspaceFolders?.find((workspaceFolder) => {
    return (
      filePath.includes(path.join(workspaceFolder.uri.fsPath, srcDir)) &&
      filePath.endsWith(modelsDir)
    );
  });
  return isInValidateModelsDir && checkIsTsorJsFile(filename);
}

function getCreateFileType(file: vscode.Uri): CreateFileTypes {
  const { fsPath } = file;
  const srcDir = 'src';
  const filename = path.basename(fsPath);
  const filePath = path.dirname(fsPath);
  if (checkIsValidateStoreFile(srcDir, filePath, filename)) {
    return CreateFileTypes.Store;
  } else if (checkIsValidateInModelsFolder(srcDir, filePath, filename)) {
    return CreateFileTypes.Models;
  } else {
    return CreateFileTypes.Null;
  }
}

async function checkIsValidate(file: vscode.Uri, projectFramework: string): Promise<[CreateFileTypes, boolean]> {
  if (['rax-app', 'icejs'].includes(projectFramework)) {
    const createFileType = getCreateFileType(file);
    return [createFileType, createFileType !== CreateFileTypes.Null];
  }
  return [CreateFileTypes.Null, false];
}

async function fillContent(
  file: vscode.Uri,
  projectFramework: string,
  createFileType: CreateFileTypes,
) {
  const { fsPath: newFsPath } = file;
  const dependency = projectFramework === 'icejs' ? 'ice' : 'rax-app';
  const templateName = createFileType === CreateFileTypes.Models ? 'models' : 'store';
  const templatePath = path.join(__dirname, `${templateName}.ts.ejs`);
  const content = await renderFileAsync(templatePath, { dependency });
  await writeFileAsync(newFsPath, content);
}

export default async (file: vscode.Uri) => {
  const projectFramework = await getProjectFramework();
  const [createFileType, isValidate] = await checkIsValidate(file, projectFramework);
  if (isValidate) {
    // auto fill content with the type of file;
    await fillContent(file, projectFramework, createFileType);
  }
};

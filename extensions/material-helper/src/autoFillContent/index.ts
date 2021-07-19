import * as vscode from 'vscode';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';
import * as ejs from 'ejs';
import * as upperFirst from 'lodash.upperfirst';
import * as camelCase from 'lodash.camelcase';
import { getProjectLanguageType, getProjectType } from '@appworks/project-utils';
import { getDataFromSettingJson } from '@appworks/common-service';
import autoFillInStore from './autoFillInStore';

const renderFileAsync = util.promisify(ejs.renderFile);
const writeFileAsync = util.promisify(fs.writeFile);

function checkIsCreatedDir(fsPath: string) {
  return path.extname(fsPath) === '';
}

function checkIsValidateType(fsPath: string) {
  return ['.tsx', '.jsx'].includes(path.extname(fsPath));
}

const srcDir = 'src';

function checkIsInValidateFolder(fsPath: string): boolean {
  return !!vscode.workspace.workspaceFolders?.find((workspaceFolder) => {
    return fsPath.includes(path.join(workspaceFolder.uri.fsPath, srcDir));
  });
}

function checkIsInComponentDir(fsPath: string) {
  return !!vscode.workspace.workspaceFolders?.find((workspaceFolder) => {
    const srcDirPath = path.join(workspaceFolder.uri.fsPath, srcDir);
    const componentsDirPath = path.join(srcDirPath, 'components');
    const pagesDirPath = path.join(srcDirPath, 'pages');
    const layoutsDirPath = path.join(srcDirPath, 'layouts');
    return fsPath.includes(pagesDirPath) ||
      fsPath.includes(componentsDirPath) ||
      fsPath.includes(layoutsDirPath);
  });
}

const indexFilename = 'index';
function checkIsIndexNames(name: string): boolean {
  return [indexFilename].includes(name);
}

/**
 * TODO
 * Code snippet effect, which can have a better editing experience
 */
async function filContent(fsPath: string): Promise<string> {
  const isCreatedFolder = checkIsCreatedDir(fsPath);
  const workspaceRootPath = vscode.workspace.workspaceFolders?.find((workspaceFolder) => fsPath.includes(workspaceFolder.uri.fsPath))?.uri.fsPath as string;
  const filename = path.basename(fsPath, path.extname(fsPath));
  const dirname = path.basename(path.dirname(fsPath));
  const name = upperFirst(camelCase(checkIsIndexNames(filename) ? dirname : filename));
  const projectType = await getProjectType(workspaceRootPath);
  const templatePath = path.join(__dirname, `component.${projectType}.tsx.ejs`);
  const content = await renderFileAsync(templatePath, { name });

  let newFsPath = fsPath;
  if (isCreatedFolder) {
    const projectLanguageType = await getProjectLanguageType(workspaceRootPath);
    newFsPath = path.join(fsPath, `${indexFilename}.${projectLanguageType}x`);
  }

  await writeFileAsync(newFsPath, content);
  return newFsPath;
}

export default function () {
  vscode.workspace.onDidCreateFiles(async ({ files }) => {
    await Promise.all(files.map(async (file) => {
      const { fsPath } = file;
      const isInValidateFolder = checkIsInValidateFolder(fsPath);
      if (isInValidateFolder) {
        const isCreatedFolder = checkIsCreatedDir(fsPath);
        const enableAutoCreateIndexFile = getDataFromSettingJson('autoCreateIndexFile');
        const enableAutoFillComponentCode = getDataFromSettingJson('autoFillComponentCode');
        if (isCreatedFolder && enableAutoCreateIndexFile) {
          const isInComponentDir = checkIsInComponentDir(fsPath);
          const createdDirname = path.basename(fsPath);
          const isCreatedBlackListDir = ['hooks', 'components', 'models'].includes(createdDirname);
          if (isInComponentDir && !isCreatedBlackListDir) {
            const newFilename = await filContent(fsPath);
            await vscode.workspace.openTextDocument(newFilename);
          }
        } else if (!isCreatedFolder && enableAutoFillComponentCode) {
          const isValidateType = checkIsValidateType(fsPath);
          const createdDirname = path.basename(path.dirname(fsPath));
          const createdFilename = path.basename(fsPath, path.extname(fsPath));
          const isCreatedBlackListFile = ['components'].includes(createdDirname) && checkIsIndexNames(createdFilename);
          if (isValidateType && !isCreatedBlackListFile) {
            await filContent(fsPath);
          }
        }
      }
      await autoFillInStore(file);
    }));
  });

  /**
   * TODO
   *
   * When the file name changes, judge whether the file has been modified.
   * If not, rename the component with the latest file name.
   */
  vscode.workspace.onDidRenameFiles(() => {
    console.log('onDidRenameFiles');
  });
}

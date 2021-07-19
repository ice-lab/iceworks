import * as vscode from 'vscode';
import * as fsExtra from 'fs-extra';
import { downloadAndGenerateProject } from '@iceworks/generate-project';
import { checkPathExists, getDataFromSettingJson, CONFIGURATION_KEY_NPM_REGISTRY, checkIsAliInternal } from '@appworks/common-service';
import {
  checkIsTargetProjectType as originCheckIsTargetProjectType,
  checkIsTargetProjectFramework as originCheckIsTargetProjectFramework,
  getProjectType as originGetProjectType,
  getProjectFramework as originGetProjectFramework,
} from '@appworks/project-utils';
import * as simpleGit from 'simple-git/promise';
import { Recorder } from '@appworks/recorder';
import * as path from 'path';
import { ALI_GITLAB_URL, ALI_DIP_PRO, ALI_DEF_WORK_URL } from '@appworks/constant';
import { projectPath, jsxFileExtnames } from './constant';
import { generatorCreatetask, getGeneratorTaskStatus, applyRepository, getBasicInfo } from './def';
import { getGitInfo } from '@appworks/project-utils/lib/git';
import i18n from './i18n';
import { getProjectPackageJSON } from './utils';
import { IDEFProjectField, IProjectField } from './types';

export * from './constant';
export * from './dependency';

const { name: pkgName, version: pkgVersion } = require('../package.json');

const recorder = new Recorder(pkgName, pkgVersion);

export async function autoSetContext() {
  const isPegasus = await checkIsPegasusProject();
  const languageType = await getProjectLanguageType();
  const type = await getProjectType();
  const framework = await getProjectFramework();
  const isNotTargetType = !await checkIsTargetProjectType();
  const isNotTargetFramework = !await checkIsTargetProjectFramework();
  vscode.commands.executeCommand('setContext', 'appworks:projectIsNotTargetType', isNotTargetType);
  vscode.commands.executeCommand('setContext', 'appworks:projectIsNotTargetFramework', isNotTargetFramework);
  vscode.commands.executeCommand('setContext', 'appworks:projectIsPegasus', isPegasus);
  vscode.commands.executeCommand('setContext', 'appworks:projectLanguageType', languageType);
  vscode.commands.executeCommand('setContext', 'appworks:projectType', type);
  vscode.commands.executeCommand('setContext', 'appworks:projectFramework', framework);
}

export async function checkIsTargetProjectType() {
  return await originCheckIsTargetProjectType(projectPath);
}

export async function checkIsTargetProjectFramework() {
  return await originCheckIsTargetProjectFramework(projectPath);
}

export async function getFeedbackLink() {
  const framework = await getProjectFramework();
  if (framework === 'icejs') {
    return 'https://c.tb.cn/F3.ZpKQYk';
  } else if (framework === 'rax-app') {
    return 'https://c.tb.cn/F3.ZLhGNW';
  }
}

export async function getProjectLanguageType() {
  const hasTsconfig = fsExtra.existsSync(path.join(projectPath, 'tsconfig.json'));

  const framework = await getProjectFramework();
  let isTypescript = false;

  if (framework !== 'unknown') {
    const hasAppJs =
      fsExtra.existsSync(path.join(projectPath, 'src/app.js')) ||
      fsExtra.existsSync(path.join(projectPath, 'src/app.jsx'));
    isTypescript = hasTsconfig && !hasAppJs;
  } else {
    isTypescript = hasTsconfig;
  }

  return isTypescript ? 'ts' : 'js';
}

export async function getProjectType() {
  return await originGetProjectType(projectPath);
}

export async function getProjectBaseInfo() {
  const { name, description } = await getProjectPackageJSON();
  const type = await getProjectType();
  const framework = await getProjectFramework();
  const feedbackLink = await getFeedbackLink();
  return {
    name,
    description,
    type,
    framework,
    path: projectPath,
    feedbackLink,
  };
}

export async function getProjectGitInfo() {
  const info = await getGitInfo(projectPath);
  return info;
}

export async function getProjectDefInfo(clientToken: string) {
  const isAliInternal = await checkIsAliInternal();
  if (!isAliInternal) {
    return { isDef: false };
  }
  const { group, project } = await getProjectGitInfo();
  const info = await getBasicInfo(`${group}/${project}`, clientToken);
  return {
    ...info,
    defUrl: `${ALI_DEF_WORK_URL}/app/${info.id}`,
    idpUrl: ALI_DIP_PRO,
  };
}

export async function checkIsPegasusProject() {
  let isPegasus = false;
  const abcConfigFile = path.join(projectPath, 'abc.json');
  if (fsExtra.existsSync(abcConfigFile)) {
    const abcConfig = await fsExtra.readJSON(abcConfigFile);
    if (abcConfig.type === 'pegasus' && abcConfig.group && abcConfig.name) {
      isPegasus = true;
    }
  }

  return isPegasus;
}

export async function getProjectFramework() {
  return await originGetProjectFramework(projectPath);
}

export function getIceVersion(packageJSON): string {
  const dependencies = packageJSON.dependencies || {};
  const hasIceDesignBase = dependencies['@icedesign/base'];
  return hasIceDesignBase ? '0.x' : '1.x';
}

export function checkIsTemplate(fsPath: string): boolean {
  const fsExtname = path.extname(fsPath);
  return jsxFileExtnames.indexOf(fsExtname) !== -1;
}

export async function getFolderPath(openLabel = 'Open'): Promise<string | undefined> {
  const options: vscode.OpenDialogOptions = {
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    openLabel,
  };
  const selectFolderUri = await vscode.window.showOpenDialog(options);
  if (selectFolderUri) {
    const { fsPath } = selectFolderUri[0];
    return fsPath;
  }
}

export async function createProject(projectField: IProjectField): Promise<string> {
  const { projectPath: setProjectPath, projectName, scaffold, source } = projectField;
  const { type } = source;
  let ejsOptions = {};
  if (projectField.ejsOptions) {
    ejsOptions = modifyEjsOptions(projectField.ejsOptions);
  }
  const projectDir: string = path.join(setProjectPath, projectName);
  const isProjectDirExists = await checkPathExists(projectDir);
  if (isProjectDirExists) {
    throw new Error(i18n.format('package.projectService.index.folderExists', { projectDir }));
  }
  const { npm, version } = scaffold.source;
  const registry = getDataFromSettingJson(CONFIGURATION_KEY_NPM_REGISTRY);
  await downloadAndGenerateProject(projectDir, npm, version, registry, projectName, ejsOptions);
  recorder.record({
    module: 'project',
    action: 'create',
    data: {
      type,
      npm,
    },
  });
  return projectDir;
}

export async function openLocalProjectFolder(projectDir: string, ...args): Promise<void> {
  const webviewPanel = args[1];
  const isProjectDirExists = await checkPathExists(projectDir);
  if (!isProjectDirExists) {
    throw new Error(i18n.format('package.projectService.index.noLocalPath', { projectDir }));
  }
  const newWindow = !!vscode.workspace.rootPath;
  if (newWindow) webviewPanel.dispose();
  vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectDir), newWindow);
}

export async function createDEFProjectAndCloneRepository(DEFProjectField: IDEFProjectField): Promise<string> {
  const { projectPath: setProjectPath, projectName, group, project, source, scaffold } = DEFProjectField;
  const { type } = source;
  const { npm } = scaffold.source;
  const projectDir = path.join(setProjectPath, projectName);
  const isProjectDirExists = await checkPathExists(projectDir);
  if (isProjectDirExists) {
    throw new Error(i18n.format('package.projectService.index.folderExists', { projectDir }));
  }
  await createDEFProject(DEFProjectField);
  await cloneRepositoryToLocal(projectDir, group, project);
  recorder.record({
    module: 'project',
    action: 'create',
    data: {
      type,
      npm,
    },
  });
  return projectDir;
}

export async function createDEFProject(DEFProjectField: IDEFProjectField): Promise<void> {
  const { clientToken } = DEFProjectField;
  const response = await generatorCreatetask(DEFProjectField);
  const { data } = response.data;
  const taskId = data.task_id;
  await getGeneratorTaskStatus(taskId, clientToken);
  await applyRepository(DEFProjectField);
}

async function cloneRepositoryToLocal(projectDir, group, project): Promise<void> {
  const isProjectDirExists = await checkPathExists(projectDir);
  if (isProjectDirExists) {
    throw new Error(i18n.format('package.projectService.index.folderExists', { projectDir }));
  }
  const repoPath = `${ALI_GITLAB_URL}:${group}/${project}.git`;
  await simpleGit().clone(repoPath, projectDir);
}

function modifyEjsOptions(ejsOptions) {
  let enableMPA = false;
  let enablePHA = false;
  let targets = ['web']; // rax project targets config can't be null.

  const { appType } = ejsOptions;

  if (appType === 'web-mpa') {
    enableMPA = true;
    enablePHA = true;
    targets = ['web'];
  } else if (appType === 'miniapp') {
    targets = ['web', 'miniapp', 'wechat-miniprogram'];
  } else if (appType === 'kraken-mpa') {
    enableMPA = true;
    targets = ['web', 'kraken'];
  } else if (appType === 'weex-mpa') {
    enableMPA = true;
    targets = ['web', 'weex'];
  }

  return {
    ...ejsOptions,
    mpa: enableMPA,
    pha: enablePHA,
    targets,
  };
}

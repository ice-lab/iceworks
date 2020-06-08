/* eslint-disable */
import * as vscode from 'vscode';
import * as rimraf from 'rimraf';
import * as fse from 'fs-extra';
import * as util from 'util';
import * as path from 'path';
import latestVersion from 'latest-version';
import { getPackageLocalVersion } from 'ice-npm-utils';
import { pathExists, executeCommand } from '../utils';
import { getDataFromSettingJson, createNpmCommand } from '@iceworks/common-service';
import { NodeDepTypes, ITerminalMap } from '../types';
import { nodeDepTypes } from '../constants';

const rimrafAsync = util.promisify(rimraf);

export class DepNodeProvider implements vscode.TreeDataProvider<DependencyNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<DependencyNode | undefined> = new vscode.EventEmitter<DependencyNode | undefined>();

  readonly onDidChangeTreeData: vscode.Event<DependencyNode | undefined> = this._onDidChangeTreeData.event;

  packageJsonPath: string;

  defaultVersion: string;

  constructor(private workspaceRoot: string) {
    this.packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    this.defaultVersion = '-';
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: DependencyNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: DependencyNode) {
    if (!this.workspaceRoot) {
      return Promise.resolve([]);
    }

    if (element) {
      const { label } = element;
      const deps = this.getDepsInPackageJson(this.packageJsonPath, (label as NodeDepTypes));
      return deps;
    } else {
      return Promise.resolve(
        nodeDepTypes.map(nodeDepType => new DependencyNode(nodeDepType, vscode.TreeItemCollapsibleState.Collapsed)));
    }
  }

  private getDepVersion(moduleName: string): string {
    try {
      const version = getPackageLocalVersion(this.workspaceRoot, moduleName);
      return version;
    } catch (err) {
      return this.defaultVersion;  // when the package version is not found, it shows defaultVersion
    }
  };

  private async getDepsInPackageJson(packageJsonPath: string, label: NodeDepTypes) {
    if (pathExists(packageJsonPath)) {
      const packageJson = JSON.parse(await fse.readFile(packageJsonPath, 'utf-8'));
      const workspaceDir: string = path.dirname(packageJsonPath);

      function toDep(moduleName: string, version: string, outdated: boolean) {
        const packageManager = getDataFromSettingJson('packageManager');
        const isYarn = packageManager === 'yarn';
        const npmCommand = createNpmCommand(isYarn ? 'upgrade' : 'update', moduleName);
        const command = outdated ?
          {
            command: 'iceworksApp.nodeDependencies.upgrade',
            title: 'Upgrade Dependency',
            arguments: [workspaceDir, npmCommand]
          } :
          undefined;
        return new DependencyNode(moduleName, vscode.TreeItemCollapsibleState.None, command, version, outdated);
      };

      const deps: DependencyNode[] = [];
      if (packageJson[label]) {
        for (const dep of Object.keys(packageJson[label])) {
          const version = this.getDepVersion(dep);
          let outdated: boolean;
          if (version === this.defaultVersion) {  // when the package version is defaultVersion, don't show the outdated
            outdated = false;
          } else {
            outdated = await this.getNpmOutdated(dep, version);
          }
          deps.push(toDep(dep, version, outdated));
        }
      }

      return deps;
    } else {
      return [];
    }
  }

  private async getNpmOutdated(moduleName: string, version: string) {
    try {
      const latest = await latestVersion(moduleName);
      return version !== latest;
    } catch (err) {
      console.error(err);
      return false;
    };
  };

  public packageJsonExists() {
    return pathExists(this.packageJsonPath);
  }

  public getInstallScript() {
    const workspaceDir: string = path.dirname(this.packageJsonPath);
    const npmCommand = createNpmCommand('install');
    const command: vscode.Command = {
      command: 'iceworksApp.nodeDependencies.install',
      title: 'Install Dependencies',
      arguments: [workspaceDir, npmCommand]
    };
    return command;
  }

  public async getReinstallScript() {
    const workspaceDir: string = path.dirname(this.packageJsonPath);
    const nodeModulesPath = path.join(workspaceDir, 'node_modules');
    if (pathExists(nodeModulesPath)) {
      await rimrafAsync(nodeModulesPath);
    }
    const npmCommand = createNpmCommand('install');
    const command: vscode.Command = {
      command: 'iceworksApp.nodeDependencies.reinstall',
      title: 'Reinstall Dependencies',
      arguments: [workspaceDir, npmCommand]
    };
    return command;

  }

  public getAddDependencyScript(depType: NodeDepTypes, packageName: string) {
    const workspaceDir: string = path.dirname(this.packageJsonPath);
    const packageManager = getDataFromSettingJson('packageManager');
    const isYarn = packageManager === 'yarn';
    const isDevDep = depType === 'devDependencies';

    const npmCommandAction = isYarn ? 'add' : 'install';
    const extraAction = isDevDep ? '-D' : isYarn ? '' : '-S';
    const npmCommand = createNpmCommand(npmCommandAction, packageName, extraAction);
    const command: vscode.Command = {
      command: 'iceworksApp.nodeDependencies.addDepsAndDevDeps',
      title: 'Add Dependency',
      arguments: [workspaceDir, npmCommand]
    };
    return command;
  }
}

export class DependencyNode extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly version?: string,
    public readonly outDated?: boolean
  ) {
    super(label, collapsibleState);
  }

  get description(): string {
    return this.version ? this.version : '';
  }

  contextValue = this.version ? this.outDated ? 'outdatedDependency' : 'dependency' : this.label;

  iconPath = {
    light: path.join(__filename, '..', '..', '..', 'assets', 'light', this.version ? 'dependency.svg' : 'dependency-entry.svg'),
    dark: path.join(__filename, '..', '..', '..', 'assets', 'dark', this.version ? 'dependency.svg' : 'dependency-entry.svg')
  };
}

export function addDepCommandHandler(terminals: ITerminalMap, nodeDependenciesInstance: any) {
  const quickPick = vscode.window.createQuickPick();
  quickPick.items = nodeDepTypes.map(label => ({ label, detail: `Install ${label}` }));
  quickPick.onDidChangeSelection(selection => {
    if (selection[0]) {
      showDepInputBox(terminals, nodeDependenciesInstance, selection[0].label as NodeDepTypes)
        .catch(console.error);
    }
  });
  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.show();
};

export async function showDepInputBox(terminals: ITerminalMap, nodeDependenciesInstance: any, depType: NodeDepTypes) {
  const result = await vscode.window.showInputBox({
    placeHolder: 'Please input the module name you want to install. For example lodash / loadsh@latest',
  });
  if (!result) {
    return;
  }
  executeCommand(terminals, nodeDependenciesInstance.getAddDependencyScript(depType, result));
}
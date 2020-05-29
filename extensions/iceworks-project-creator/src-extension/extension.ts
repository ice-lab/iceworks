import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';
import { officialMaterialSources } from './constants';
import { downloadAndGenerateProject } from '@iceworks/generate-project';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('projectCreator.start', () => {
			ProjectCreatorPanel.createOrShow(context.extensionPath);
		})
	);
}

class ProjectCreatorPanel {
	public static currentPanel: ProjectCreatorPanel | undefined;

	public static readonly viewType = 'iceworksProjectCreator';

	public readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
		// If we already have a panel, show it.
		if (ProjectCreatorPanel.currentPanel) {
			ProjectCreatorPanel.currentPanel._panel.reveal(column);
			return;
		}
		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			ProjectCreatorPanel.viewType,
			'iceworks Project Creator',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
			}
		);

		ProjectCreatorPanel.currentPanel = new ProjectCreatorPanel(panel, extensionPath);
	}

	public dispose() {
		ProjectCreatorPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private update() {
		this._panel.webview.html = this.getWebviewContent(this._panel.webview);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// init html Content
		this.update();

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this.update();
				}
			},
			null,
			this._disposables
		);

		this._panel.webview.onDidReceiveMessage(async message => {
			if (message.command === 'getProjectPath') {
				try {
					const options: vscode.OpenDialogOptions = {
						canSelectFolders: true,
						canSelectFiles: false,
						canSelectMany: false,
						openLabel: 'Open',
					};
					const selectFolderUri = await vscode.window.showOpenDialog(options);
					const { fsPath } = selectFolderUri[0];
					panel.webview.postMessage({ command: 'getProjectPath', res: fsPath });
				} catch (error) {
					panel.webview.postMessage({ command: 'getProjectPath', error });
				}
			}

			if (message.command === 'getScaffolds') {
				const scaffolds = {};
				const sourcesKeys = Object.keys(officialMaterialSources);
				try {
					for (let key of sourcesKeys) {
						const response = await axios.get(officialMaterialSources[key]);
						scaffolds[key] = response.data.scaffolds;
					}
					panel.webview.postMessage({ command: 'getScaffolds', res: scaffolds });
				} catch (error) {
					panel.webview.postMessage({ command: 'getScaffolds', error });
					vscode.window.showErrorMessage(`command: 'getScaffolds' error: ${error}`);
				}
			}

			if (message.command === 'showErrorMessage') {
				const args = message.args;
				const errorMessage = args[0];
				vscode.window.showErrorMessage(errorMessage);
				panel.webview.postMessage({ command: 'showErrorMessage' });
			}

			if (message.command === 'createProject') {
				try {
					const args = message.args;
					const data = args[0];
					const { projectPath, projectName, scaffold } = data;
					const projectDir = path.join(projectPath, projectName);
					const npmName = scaffold.source.npm;
					await downloadAndGenerateProject(projectDir, npmName);
					panel.webview.postMessage({ command: 'createProject' });
				} catch (error) {
					panel.webview.postMessage({ command: 'createProject', error });
					vscode.window.showErrorMessage(`command: 'createProject' error: ${error}`);
				}
			}
		}, undefined, this._disposables);
	}

	private getWebviewContent(webview: vscode.Webview) {
		const basePath = path.join(this._extensionPath, 'out/assets/');

		const scriptPathOnDisk = vscode.Uri.file(path.join(basePath, 'js/index.js'));
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
		const stylePathOnDisk = vscode.Uri.file(path.join(basePath, 'css/index.css'));
		const styleUri = webview.asWebviewUri(stylePathOnDisk);
		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();
		return (
			`<!DOCTYPE html>
				<html lang="en">
				<head>
						<meta charset="UTF-8">
						<meta name="viewport" content="width=device-width, initial-scale=1.0">
						<meta name="theme-color" content="#000000">
						<title>iceworks Project Creator</title>
						<link rel="stylesheet" type="text/css" href="${styleUri}">
						<style>
							body {
								background: white;
							}
						</style>
				</head>
				<body>
						<div id="ice-container"></div>
						<script nonce="${nonce}" src="${scriptUri}"></script>
				</body>
				</html>
			`
		);
	}
}

function getNonce(): string {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

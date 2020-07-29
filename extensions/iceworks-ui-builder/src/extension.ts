import * as vscode from 'vscode';
import { connectService, getHtmlForWebview } from '@iceworks/vscode-webview/lib/vscode';
import { initExtension, Logger } from '@iceworks/common-service';
import services from './services/index';
import i18n from './i18n';

// eslint-disable-next-line
const { name, version } = require('../package.json');

const { window, ViewColumn } = vscode;

export function activate(context: vscode.ExtensionContext) {
  const { extensionPath, subscriptions, globalState } = context;

  console.log('Congratulations, your extension "iceworks-component-builder" is now active!');

  // data collection
  const logger = new Logger(name, globalState);
  logger.recordMainDAU();
  logger.recordExtensionActivate(version);

  // auto set configuration
  initExtension(context);

  function activeComponentCreatorWebview() {
    const webviewPanel: vscode.WebviewPanel = window.createWebviewPanel(
      'iceworks',
      i18n.format('extension.iceworksComponentBuilder.extension.webviewTitle'),
      ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    webviewPanel.webview.html = getHtmlForWebview(extensionPath, 'componentcreator');
    connectService(webviewPanel, context, { services, logger });
  }
  subscriptions.push(
    vscode.commands.registerCommand('iceworks-ui-builder.create-component', function () {
      activeComponentCreatorWebview();
    })
  );

  function activePageGeneraterWebview() {
    const webviewPanel: vscode.WebviewPanel = window.createWebviewPanel(
      'iceworks',
      i18n.format('extension.iceworksPageBuilder.extensnion.webViewTitle'),
      ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    webviewPanel.webview.html = getHtmlForWebview(extensionPath, 'pagegenerater');
    connectService(webviewPanel, context, { services, logger });
  }
  subscriptions.push(
    vscode.commands.registerCommand('iceworks-ui-builder.generate-page', function () {
      activePageGeneraterWebview();
    })
  );
}

export function deactivate() {}
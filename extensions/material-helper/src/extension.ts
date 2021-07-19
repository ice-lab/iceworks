import * as vscode from 'vscode';
import { connectService, getHtmlForWebview } from '@appworks/connector/lib/vscode';
import { initExtension, registerCommand } from '@appworks/common-service';
import { autoSetContext as autoSetContextByProject } from '@appworks/project-service';
import { ICEWORKS_ICON_PATH } from '@appworks/constant';
import services from './services/index';
import propsAutoComplete from './propsAutoComplete';
import autoFillContent from './autoFillContent';
import i18n from './i18n';
import registerComponentDocSupport from './componentDocSupport';
import recorder from './utils/recorder';
import { registerDebugCommand } from './utils/debugMaterials';
import { createComponentsTreeView } from './views/componentsView';
import { createPagesTreeView } from './views/pagesView';
import mtopAutoComplete from './mtopAutoComplete';
import propTypesAutoComplete from './propTypesAutoComplete';

const { window, ViewColumn } = vscode;

export function activate(context: vscode.ExtensionContext) {
  const { extensionPath, subscriptions } = context;

  console.log('Congratulations, your extension "material-helper" is now active!');
  recorder.recordActivate();

  // auto set configuration
  initExtension(context);
  autoSetContextByProject();

  // set material importer
  let materialImporterWebviewPanel: vscode.WebviewPanel | undefined;
  function activeMaterialImporterWebview() {
    if (materialImporterWebviewPanel) {
      materialImporterWebviewPanel.reveal();
    } else {
      let columnToShowIn = ViewColumn.One;
      let layout = { orientation: 0, groups: [{}] };
      if (window.activeTextEditor) {
        columnToShowIn = ViewColumn.Beside;
        layout = { orientation: 0, groups: [{ size: 0.7 }, { size: 0.3 }] };
      }

      materialImporterWebviewPanel = window.createWebviewPanel(
        'AppWorks',
        i18n.format('extension.iceworksMaterialHelper.materailImporter.title'),
        { viewColumn: columnToShowIn, preserveFocus: true },
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          enableFindWidget: true,
        },
      );
      materialImporterWebviewPanel.webview.html = getHtmlForWebview(extensionPath, 'materialimporter');
      materialImporterWebviewPanel.iconPath = vscode.Uri.parse(ICEWORKS_ICON_PATH);
      materialImporterWebviewPanel.onDidDispose(
        () => {
          materialImporterWebviewPanel = undefined;
        },
        null,
        context.subscriptions,
      );

      vscode.commands.executeCommand('vscode.setEditorLayout', layout);

      connectService(materialImporterWebviewPanel, context, { services, recorder });
    }
  }
  subscriptions.push(
    registerCommand('material-helper.material-importer.start', () => {
      const { visibleTextEditors } = vscode.window;
      if (visibleTextEditors.length) {
        activeMaterialImporterWebview();
      } else {
        vscode.window.showErrorMessage(i18n.format('extension.iceworksMaterialHelper.extension.start.errorMessage'));
      }
    }),
  );

  function activeComponentCreatorWebview() {
    const webviewPanel: vscode.WebviewPanel = window.createWebviewPanel(
      'appworks',
      i18n.format('extension.iceworksMaterialHelper.componentCreator.webviewTitle'),
      ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );
    webviewPanel.webview.html = getHtmlForWebview(extensionPath, 'componentcreator');
    webviewPanel.iconPath = vscode.Uri.parse(ICEWORKS_ICON_PATH);
    connectService(webviewPanel, context, { services, recorder });
  }
  subscriptions.push(
    registerCommand('material-helper.component-creator.start', () => {
      activeComponentCreatorWebview();
    }),
  );

  function activePageGeneratorWebview() {
    const webviewPanel: vscode.WebviewPanel = window.createWebviewPanel(
      'appworks',
      i18n.format('extension.iceworksMaterialHelper.pageGenerator.webViewTitle'),
      ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );
    webviewPanel.webview.html = getHtmlForWebview(extensionPath, 'pagegenerator');
    webviewPanel.iconPath = vscode.Uri.parse(ICEWORKS_ICON_PATH);
    connectService(webviewPanel, context, { services, recorder });
  }
  subscriptions.push(
    registerCommand('material-helper.page-generator.start', () => {
      activePageGeneratorWebview();
    }),
  );

  registerDebugCommand(subscriptions);

  propsAutoComplete();
  mtopAutoComplete();
  registerComponentDocSupport();
  autoFillContent();

  // views
  createComponentsTreeView(context);
  createPagesTreeView(context);

  // help user complete React Component's propTypes; 
  propTypesAutoComplete();
}

export function deactivate() { }

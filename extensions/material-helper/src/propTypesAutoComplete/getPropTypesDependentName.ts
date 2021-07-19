import { parse } from '@babel/parser';
import getBabelParserPlugins from '../utils/getBabelParserPlugins';
import getImportDependentName from './getImportDependentName';
import * as vscode from 'vscode';


export default (code: string, uri: vscode.Uri): string => {
  let defaultPropTypesDependentName = 'PropTypes';
  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: getBabelParserPlugins('jsx'),
    });

    const propTypesDependentName = getImportDependentName(ast, 'prop-types');
    if (propTypesDependentName) {
      defaultPropTypesDependentName = propTypesDependentName;
    } else {
      // register a commend for insert `import PropTypes from 'prop-types';` code;
      const Disposable = vscode.commands.registerCommand('material-helper.auto-import-prop-types', () => {
        try {
          const edit = new vscode.WorkspaceEdit();
          const insertText = "import PropTypes from 'prop-types';\n";
          edit.insert(
            uri,
            new vscode.Position(0, 0),
            insertText,
          );
          vscode.workspace.applyEdit(edit);
        } catch (e) {
          // ignore
        }
        Disposable.dispose();
      });
    }
  } catch (e) {
    // ignore
  }
  return defaultPropTypesDependentName;
};

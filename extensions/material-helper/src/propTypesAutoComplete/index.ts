import * as vscode from 'vscode';
import getDefinitions from './getDefinitions';
import getJsxPropKeys from './getJsxPropKeys';
import getPropTypesDependentName from './getPropTypesDependentName';

async function provideCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position,
): Promise<vscode.CompletionItem[]> {
  const items: vscode.CompletionItem[] = [];
  const { Position, Range } = vscode;
  const triggerPosition = new Position(position.line, position.character - 1);
  const definitions = await getDefinitions(document.uri, triggerPosition);
  definitions.forEach((definition) => {
    const propKeys = getJsxPropKeys(document, definition);
    if (propKeys.length > 0) {
      const code = document.getText(new Range(new Position(0, 0), triggerPosition));
      const PROP_TYPES = getPropTypesDependentName(code, document.uri);
      const snippet = ['propTypes = {'];
      propKeys.forEach((propKey, index) => {
        snippet.push(`\t${propKey}: ${PROP_TYPES}.\${${index + 1}:any},`);
      });
      snippet.push('};');
      items.push({
        label: 'propTypes = ',
        detail: 'AppWorks',
        kind: vscode.CompletionItemKind.Field,
        insertText: new vscode.SnippetString(snippet.join('\n')),
        command: { title: 'auto-import-prop-types', command: 'material-helper.auto-import-prop-types' },
      });
    }
  });
  return items;
}

export default async () => {
  vscode.languages.registerCompletionItemProvider(['javascript', 'javascriptreact'], {
    provideCompletionItems,
  }, '.');
};

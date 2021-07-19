import * as vscode from 'vscode';
import { recordDAU } from '@appworks/recorder';
import getCurrentJsxElement from './getCurrentJsxElement';
import getDefinitions from './getDefinitions';
import getPropKeyCompletionItems from './getPropKeyCompletionItems';

async function provideCompletionItems(document, position): Promise<vscode.CompletionItem[]> {
  let items: vscode.CompletionItem[] = [];

  const { Position } = vscode;
  const documentText = document.getText();
  const cursorPosition = document.offsetAt(position);
  const currentJsxElement: any = getCurrentJsxElement(documentText, cursorPosition);
  const currentJsxElementTagName = currentJsxElement ? currentJsxElement.name.name : '';

  if (
    currentJsxElement &&
    currentJsxElement.loc &&
    // Only works in React/Rax Component (begin with capital letters).
    currentJsxElementTagName[0] === currentJsxElementTagName[0].toUpperCase()
  ) {
    const definitions = await getDefinitions(
      document.uri,
      new Position(
        // Example: <|Text
        currentJsxElement.loc.start.line - 1,
        currentJsxElement.loc.start.column + 2,
      ),
    );

    definitions.forEach((definition: any) => {
      const componentPath = (definition.targetUri || definition.uri).path;
      items = items.concat(getPropKeyCompletionItems(componentPath));
    });
  }
  if (items.length) {
    recordDAU();
  }

  return items;
}

// Set completion
export default function propsAutoComplete() {
  vscode.languages.registerCompletionItemProvider(['javascript', 'javascriptreact', 'typescript', 'typescriptreact'], {
    provideCompletionItems,
  });
}

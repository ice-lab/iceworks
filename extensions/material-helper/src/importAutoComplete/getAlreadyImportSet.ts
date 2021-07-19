import * as vscode from 'vscode';
import getBabelParserPlugins from '../utils/getBabelParserPlugins';
import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import { ImportDeclaration } from '@babel/types';
import { join } from 'path';

export default (doc: vscode.TextDocument): Set<string> => {
  const importSet: Set<string> = new Set();
  const documentText = doc.getText();
  try {
    const ast = parse(documentText, {
      sourceType: 'module',
      plugins: getBabelParserPlugins('jsx'),
    });
    traverse(ast, {
      ImportDeclaration(path: NodePath<ImportDeclaration>) {
        const { node } = path;
        const moduleName = node.source.value;
        importSet.add(join(moduleName));
      },
    });
  } catch (e) {
    console.log(e);
  }

  return importSet;
};

import * as vscode from 'vscode';
import { parse } from '@babel/parser';
import getBabelParserPlugins from '../utils/getBabelParserPlugins';
import checkIsJsxComponent from './checkIsJsxComponent';
import getJsxPropKeysFromAst from '../utils/getJsxPropKeysFromAst';

function checkIsCapitalizeWord(word: string | undefined): boolean {
  return !!word && word[0] === word[0].toUpperCase();
}

export default (doc: vscode.TextDocument, location: vscode.Location): string[] => {
  const definitionsCode = doc.getText(location?.targetRange);
  const originSelectionCode = doc.getText(location?.originSelectionRange);
  try {
    const ast = parse(definitionsCode, {
      sourceType: 'module',
      plugins: getBabelParserPlugins('jsx'),
    });
    if (checkIsCapitalizeWord(originSelectionCode) && checkIsJsxComponent(ast)) {
      return getJsxPropKeysFromAst(ast);
    }
  } catch (e) {
    // ignore
  }
  return [];
};

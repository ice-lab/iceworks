import * as fs from 'fs';
import { parse } from '@babel/parser';
import getBabelParserPlugins from '../utils/getBabelParserPlugins';
import getJsxPropKeysFromAst from '../utils/getJsxPropKeysFromAst';

// Get props keys from component code,
// * destructuring arguments: const User({xxx, xxx}) {}
// * assignment: const { xxx } = props
// * expression: props.xxx
export default function getPropKeysFromCode(componentPath: string): string[] {
  let propKeys: string[] = [];
  try {
    const ast = parse(fs.readFileSync(componentPath, 'utf-8'), {
      sourceType: 'module',
      plugins: getBabelParserPlugins('jsx'),
    });

    if (ast) {
      propKeys = propKeys.concat(getJsxPropKeysFromAst(ast));
    }
  } catch (error) {
    // ignore
  }
  console.log(propKeys)

  return propKeys;
}

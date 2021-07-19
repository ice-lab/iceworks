import {
  File,
  ReturnStatement,
  isJSXFragment,
  isJSXElement,
} from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';

export default (ast: File): boolean => {
  let isJsxComponent = false;
  try {
    traverse(ast, {
      ReturnStatement(path: NodePath<ReturnStatement>) {
        const { node } = path;
        const returnArgument = node.argument;
        if (isJSXFragment(returnArgument) || isJSXElement(returnArgument)) {
          isJsxComponent = true;
        }
      },
    });
  } catch (e) {
    // ignore
  }
  return isJsxComponent;
};

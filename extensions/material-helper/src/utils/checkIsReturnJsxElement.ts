import {
  isJSXElement,
  isJSXFragment,
  Node,
  Expression,
  ReturnStatement,
} from '@babel/types';
import traverse, { NodePath, Scope } from '@babel/traverse';


function checkIsJsxElement(node: Expression | null | undefined): boolean {
  return isJSXElement(node) || isJSXFragment(node);
}
function checkIsReturnJsxElement(node: Node | Expression, scope: Scope): boolean {
  let isReturnJsxElement = false;
  try {
    traverse(node,
      {
        ReturnStatement(path: NodePath<ReturnStatement>) {
          const { argument } = path.node;
          isReturnJsxElement = checkIsJsxElement(argument);
        },
      },
      scope);
  } catch (e) {
    // ignore
  }

  return isReturnJsxElement;
}

export default checkIsReturnJsxElement;

import traverse, { NodePath, Scope } from '@babel/traverse';
import { Node, File, FunctionDeclaration, ArrowFunctionExpression } from '@babel/types';
import checkIsReturnJsxElement from './checkIsReturnJsxElement';

function getPropKeysFromObjectPattern(node: Node, scope: Scope): string[] {
  const propKeys: string[] = [];
  const isJsxComponent = checkIsReturnJsxElement(node, scope);
  if (isJsxComponent) {
    const param = node?.params?.[0];
    if (param && param.type === 'ObjectPattern') {
      param?.properties?.forEach((property) => {
        propKeys.push(property?.key.name);
      });
    }
  }
  return propKeys;
}

export default (ast: File): string[] => {
  let propKeys: string[] = [];
  try {
    // https://babeljs.io/docs/en/babel-traverse
    traverse(ast, {
      // Get props from destructuring arguments;
      // Example: function User({xxx, xxx}) {}
      FunctionDeclaration(path: NodePath<FunctionDeclaration>) {
        const { node, scope } = path;
        propKeys = propKeys.concat(getPropKeysFromObjectPattern(node, scope));
      },
      ArrowFunctionExpression(path: NodePath<ArrowFunctionExpression>) {
        const { node, scope } = path;
        propKeys = propKeys.concat(getPropKeysFromObjectPattern(node, scope));
      },

      // Get props destructuring assignment.
      // Example: const { xxx } = props;
      VariableDeclarator(path) {
        const { id } = path.node;
        const { init } = path.node;

        if (init.name === 'props') {
          (id.properties || []).forEach((property) => {
            propKeys.push(property.key.name);
          });
        }
      },

      // Get props member expression.
      // Example: props.xxx
      MemberExpression(path) {
        const { property } = path.node;
        const object: any = path.node;
        if (object.name === 'props') {
          propKeys.push(property.name);
        }
      },
    });
  } catch (error) {
    // ignore
  }
  return propKeys;
};

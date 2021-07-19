import { File, ImportDeclaration } from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';

export default (ast: File, dependent: string): string => {
  let importDependentName = '';
  traverse(ast, {
    ImportDeclaration(path: NodePath<ImportDeclaration>) {
      const { node } = path;
      if (node.source.value === dependent) {
        importDependentName = node.specifiers[0].local.name;
      }
    },
  });
  return importDependentName || '';
};

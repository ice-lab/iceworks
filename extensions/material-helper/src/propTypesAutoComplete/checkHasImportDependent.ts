import { File, ImportDeclaration } from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';

export default (ast: File, dependent: string): boolean => {
  let isImport = false;
  traverse(ast, {
    ImportDeclaration(path: NodePath<ImportDeclaration>) {
      const { node } = path;
      if (node.source.value === dependent) {
        isImport = true;
      }
    },
  });
  return isImport;
};

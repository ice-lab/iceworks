import * as path from 'path';

export default (fileName: string): string => {
  if (['.js', '.ts', '.jsx', '.tsx'].includes(path.extname(fileName))) {
    return path.basename(fileName, path.extname(fileName));
  } else {
    return fileName;
  }
};

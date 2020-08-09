import * as path from 'path';
import * as fse from 'fs-extra';
import { isAliNpm } from 'ice-npm-utils';

interface IOptions {
  rootDir: string;
  npmName?: string;
  enableDefPublish?: boolean;
  enablePegasus?: boolean;
};

export default async function formatProject(
  { rootDir, npmName, enableDefPublish, enablePegasus }: IOptions,
): Promise<void> {
  const abcPath = path.join(rootDir, 'abc.json');
  const pkgPath = path.join(rootDir, 'package.json');
  const buildJsonPath = path.join(rootDir, 'build.json');
  const buildData = fse.readJsonSync(buildJsonPath);
  const pkgData = fse.readJsonSync(pkgPath);
  let abcData = null;

  if (isAliNpm(npmName)) {
    pkgData.publishConfig = {
      registry: 'https://registry.npm.alibaba-inc.com',
    };
  }

  if (enableDefPublish || enablePegasus) {
    abcData = {
      type: 'rax',
      builder: '@ali/builder-component',
    };

    if (enablePegasus) {
      pkgData.devDependencies['@ali/build-plugin-rax-seed'] = '^1.0.0';
      buildData.plugins.push(['@ali/build-plugin-rax-seed', {
        majorVersionIsolation: false,
      }]);
    }
  }

  abcData && fse.writeJSONSync(abcPath, abcData, { spaces: 2 });
  fse.writeJSONSync(buildJsonPath, buildData, { spaces: 2 });
  fse.writeJSONSync(pkgPath, pkgData, { spaces: 2 });
}
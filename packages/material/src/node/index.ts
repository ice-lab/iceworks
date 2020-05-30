import axios from 'axios';
import packageJSON from 'package-json';
const kebabCase = require('lodash.kebabcase');

const iceMaterial = 'http://ice.alicdn.com/assets/materials/react-materials.json';
const materialBaseHomePageUrl = 'https://ice.work/component';
const materialBaseRepositoryUrl = 'https://github.com/alibaba-fusion/next/tree/master/src';
const materialBaseSource = 'https://ice.alicdn.com/assets/base-components-1.x.json';

const isIceMaterial = (source: string) => {
  return source === iceMaterial;
};

const cache: any = {};
export const getData = async function(source: string) {
  let data;
  if (cache[source]) {
    data = cache[source];
  }

  if (!data) {
    const result = await axios({ url: source });
    const materialData = result.data;

    // TODO 飞冰物料源添加基础组件
    let bases;
    if (isIceMaterial(source)) {
      try {
        const result = await axios({ url: materialBaseSource });
        bases = result.data.map((base: any) => {
          const { name, title, type, importStatement } = base;
          return {
            name,
            title,
            categories: [type],
            importStatement,
            homepage: `${materialBaseHomePageUrl}/${name.toLowerCase()}`,
            repository: `${materialBaseRepositoryUrl}/${kebabCase(name)}`,
            source: {
              type: 'npm',
              npm: '@alifd/next',
              version: '1.18.16',
              registry: 'http://registry.npmjs.com',
            },
          };
        });
      } catch (error) {
        // TODO 上报错误，但是在前台不显示
      }
    }

    data = {
      ...materialData,
      blocks: materialData.blocks || [],
      components: materialData.components || [],
      scaffolds: materialData.scaffolds || [],
      bases,
    };

    cache[source] = data;
  }

  return data;
}

export const getTarballURLByMaterielSource = async function(source: any): Promise<string> {
  const {version, npm} = source;
  let registryUrl = source.registry;

  // Using taobao registry to increase download speed
  if (registryUrl === 'https://registry.npmjs.org') {
    registryUrl = 'https://registry.npm.taobao.org';
  }

  const packageData: any = await packageJSON(npm, {
    version,
    registryUrl,
  });

  return packageData.dist.tarball;
}

import React, { useState, useEffect, useRef } from 'react';
import { Tab, Loading } from '@alifd/next';
import * as cloneDeep from 'lodash.clonedeep';
import { useRequest } from 'ahooks';
import callService from '@/callService';
import CodeMod from '../CodeMod';
import ServerError from '@/components/ServerError';
import NotFound from '@/components/NotFound';
import styles from './index.module.scss';

const CodeMods = () => {
  const [codeMods, setCodeMods] = useState([]);
  const initCon = useRef(false);
  const { loading, error, run } = useRequest(() => callService('codemod', 'getCodeMods'), { initialData: [], manual: true });

  useEffect(() => {
    async function init() {
      const data = await run();
      initCon.current = true;
      setCodeMods(data);
    }

    init();
  }, []);

  function onChangeAll(checked, cname) {
    const newCodeMods = cloneDeep(codeMods);
    const cIndex = codeMods.findIndex(({ name }) => name === cname);
    newCodeMods[cIndex].transforms = codeMods[cIndex].transforms.map((transform) => {
      return {
        ...transform,
        checked,
      };
    });
    setCodeMods(newCodeMods);
  }
  function onChangeOne(checked, cname, value) {
    const newCodeMods = cloneDeep(codeMods);
    const cIndex = codeMods.findIndex(({ name }) => name === cname);
    const tIndex = codeMods[cIndex].transforms.findIndex(({ filename }) => filename === value);
    newCodeMods[cIndex].transforms = cloneDeep(newCodeMods[cIndex].transforms);
    newCodeMods[cIndex].transforms[tIndex].checked = checked;
    setCodeMods(newCodeMods);
  }

  return (
    <Loading visible={loading} className={styles.wrap} tip="Fetching, it takes a few seconds or more...">
      {(!loading && codeMods.length > 0) &&
        <Tab shape="pure">
          {
            codeMods.map((codeMod) => {
              const { name: cname, description } = codeMod;
              return (
                <Tab.Item
                  title={
                    <div className={styles.title}>
                      <span>{cname}</span>
                    </div>
                  }
                  key={cname}
                >
                  <div className={styles.content}>
                    <div className={styles.description}>
                      {'>'} {description}
                    </div>
                    <CodeMod
                      codeMod={codeMod}
                      onChangeAll={onChangeAll}
                      onChangeOne={onChangeOne}
                    />
                  </div>
                </Tab.Item>
              );
            })
          }
        </Tab>
      }
      {(initCon.current && !codeMods.length) && <NotFound />}
      { error && <ServerError /> }
    </Loading>
  );
};

export default CodeMods;

import axios from 'axios';
import { checkAliInternal } from 'ice-npm-utils';
import configure, { recordKey } from '@appworks/configure';
// eslint-disable-next-line
const checkIsElectron = require('is-electron');

export interface ILogParam {
  module: string;
  action: string;
  data?: any;
}

export interface IGoldlogParam extends ILogParam {
  namespace: string;
}

export type RecordType = 'PV' | 'UV';

let vscodeEnv;
let isAlibaba: boolean;

const outside = '_outside';
const MAIN_KEY = 'main';
// Compatible with old logic
const RECORD_MODULE_KEY = 'logger';

try {
  // eslint-disable-next-line
  const vscode = require('vscode');
  vscodeEnv = vscode.env;
} catch (error) {
  console.error(error);
}

function checkIsO2() {
  const O2Version = process.env.O2_VERSION;
  return O2Version;
}

function getLogCode() {
  const isElectron = checkIsElectron();
  const isO2 = checkIsO2();

  let logCode = 'pack_app';
  if (isO2) {
    if (isElectron) { // Client
      logCode = 'pack_o2';
    } else { // WebIDE
      logCode = 'pack_web';
    }
  }

  return logCode;
}

export async function recordPV(originParam: IGoldlogParam, recordType?: RecordType, url?: string) {
  recordType = recordType || 'PV';

  if (!url) {
    const logCode = getLogCode();
    if (typeof isAlibaba === 'undefined') {
      try {
        isAlibaba = await checkAliInternal();
      } catch (error) {
      // ignore error
      }
    }
    url = `http://gm.mmstat.com/iceteam.iceworks.${logCode}${!isAlibaba ? outside : ''}`;
  }

  const param = {
    ...originParam,
    // eslint-disable-next-line
    record_type: recordType,
    cache: Math.random(),
  };

  try {
    const dataKeyArray = Object.keys(param);
    const gokey = dataKeyArray.reduce((finalStr, currentKey, index) => {
      const currentData = typeof param[currentKey] === 'string' ? param[currentKey] : JSON.stringify(param[currentKey]);
      return `${finalStr}${currentKey}=${currentData}${dataKeyArray.length - 1 === index ? '' : '&'}`;
    }, '');

    const data = {
      gmkey: 'CLK',
      gokey: encodeURIComponent(gokey),
      logtype: '2',
    };

    console.log('recorder[type]', recordType);
    console.log('recorder[url]:', url);
    // console.log('recorder[param]:', param);

    await axios({
      method: 'post',
      url,
      headers: {
        'content-type': 'text/plain;charset=UTF-8',
        origin: 'https://www.taobao.com',
        referer: 'https://www.taobao.com/',
      },
      data,
    });
  } catch (error) {
    error.name = 'goldlog-error';
    console.error(error);
  }
}

export async function recordUV(originParam: IGoldlogParam, storeInstance = configure, storeRecordKey = recordKey, url?: string) {
  const nowtDate = new Date().toDateString();
  const dauKey = `${JSON.stringify(originParam)}`;
  const records = storeInstance.get(storeRecordKey);
  const lastDate = records[dauKey];
  if (nowtDate !== lastDate) {
    records[dauKey] = nowtDate;
    storeInstance.set(storeRecordKey, records);
    return await recordPV(originParam, 'UV', url);
  }
}

export async function record(originParam: IGoldlogParam) {
  await recordPV(originParam);
  await recordUV(originParam);
}

export function recordDAU(locale = vscodeEnv ? vscodeEnv.language : 'zh-CN') {
  return recordUV({
    namespace: MAIN_KEY,
    module: RECORD_MODULE_KEY,
    action: 'dau',
    data: {
      platform: process.platform,
      locale,
    },
  });
}

// call in DefinitionProvider
export function recordDefinitionProvider() {
  return recordUV({
    namespace: MAIN_KEY,
    module: RECORD_MODULE_KEY,
    action: 'definitionProvider',
  });
}

// call in HoverProvider
export function recordHoverProvider() {
  return recordUV({
    namespace: MAIN_KEY,
    module: RECORD_MODULE_KEY,
    action: 'hoverProvider',
  });
}

// call in CompletionItemProvider
export function recordCompletionItemProvider() {
  return recordUV({
    namespace: MAIN_KEY,
    module: RECORD_MODULE_KEY,
    action: 'completionItemProvider',
  });
}

// call in completion item select commands
export function recordCompletionItemSelect() {
  return recordUV({
    namespace: MAIN_KEY,
    module: RECORD_MODULE_KEY,
    action: 'completionItemSelect',
  });
}

// active a extension
function recordActivate(data: { extension: string; version?: string }) {
  return record({
    namespace: MAIN_KEY,
    module: RECORD_MODULE_KEY,
    action: 'activate',
    data,
  });
}

export class Recorder {
  private namespace: string = MAIN_KEY;

  private version: string;

  constructor(namespace?: string, version?: string) {
    if (namespace) {
      this.namespace = namespace;
    }
    this.version = version;
  }

  record(param: ILogParam) {
    return record({
      namespace: this.namespace,
      ...param,
    });
  }

  recordPV(param: ILogParam) {
    return recordPV({
      namespace: this.namespace,
      ...param,
    });
  }

  recordUV(param: ILogParam) {
    return recordUV({
      namespace: this.namespace,
      ...param,
    });
  }

  recordActivate() {
    recordActivate({
      extension: this.namespace,
      version: this.version,
    });

    this.record({
      module: 'main',
      action: 'activate',
      data: {
        version: this.version,
      },
    });
  }
}

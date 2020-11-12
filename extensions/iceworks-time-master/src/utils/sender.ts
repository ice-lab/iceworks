import { getUserInfo, checkIsAliInternal } from '@iceworks/common-service';
import * as path from 'path';
import axios from 'axios';
import * as fse from 'fs-extra';
import { KeystrokeStats } from '../recorders/keystrokeStats';
import { FileChange, FileChangeInfo, FileEventInfo } from '../storages/filesChange';
import { getAppDataDirPath } from './storage';
import { getEditorInfo, getExtensionInfo, getSystemInfo, SystemInfo, EditorInfo, ExtensionInfo } from './env';
import { ProjectInfo } from '../storages/project';
import forIn = require('lodash.forin');

const KEYSTROKES_RECORD = 'keystrokes';
const EDITOR_TIME_RECORD = 'editor_time';

interface ProjectParams extends Omit<ProjectInfo, 'name'|'directory'> {
  projectName: PropType<ProjectInfo, 'name'>;
  projectDirectory: PropType<ProjectInfo, 'directory'>;
}

interface UserInfo {
  userId: string;
}

export interface KeystrokesPayload extends
  ProjectParams,
  EditorInfo,
  ExtensionInfo,
  SystemInfo,
  UserInfo,
  Omit<FileChangeInfo, keyof FileEventInfo> {
}

export interface EditorTimePayload extends ProjectParams, EditorInfo, ExtensionInfo, SystemInfo, UserInfo {
  durationSeconds: number;
}

/**
 * ONLY SEND DATA IN ALIBABA INTERNAL!!!
 */
async function checkIsSendable() {
  return await checkIsAliInternal();
}

function transformKeyStrokeStatsToKeystrokesPayload(keystrokeStats: KeystrokeStats): KeystrokesPayload[] {
  const data: KeystrokesPayload[] = [];
  const { files, project } = keystrokeStats;
  const { name: projectName, directory: projectDirectory, gitRepository, gitBranch, gitTag } = project;
  forIn(files, (fileChange: FileChange) => {
    data.push({
      ...fileChange,
      projectName,
      projectDirectory,
      gitRepository,
      gitBranch,
      gitTag,

      // placeholder
      userId: '',
      editorName: '',
      editorVersion: '',
      extensionName: '',
      extensionVersion: '',
      os: '',
      hostname: '',
      timezone: '',
    });
  });
  return data;
}

export async function appendKeystrokesPayload(keystrokeStats: KeystrokeStats) {
  const playload = transformKeyStrokeStatsToKeystrokesPayload(keystrokeStats);
  await appendPayloadData(KEYSTROKES_RECORD, playload);
}

/**
 * TODO
 */
export async function appendEditorTimePayload() {
  // hold
}

export async function sendPayload() {
  const isSendable = await checkIsSendable();
  await Promise.all([KEYSTROKES_RECORD, EDITOR_TIME_RECORD].map(async (TYPE) => {
    if (isSendable) {
      await sendPayloadData(TYPE);
    } else {
      await clearPayloadData(TYPE);
    }
  }));
}

async function send(api: string, originParam: any) {
  const param = {
    ...originParam,
    cache: Math.random(),
  };

  try {
    const dataKeyArray = Object.keys(param);
    const gokey = dataKeyArray.reduce((finalStr, currentKey, index) => {
      const currentData = typeof param[currentKey] === 'string' ? param[currentKey] : JSON.stringify(param[currentKey]);
      return `${finalStr}${currentKey}=${currentData}${dataKeyArray.length - 1 === index ? '' : '&'}`;
    }, '');

    await axios({
      method: 'post',
      url: `http://gm.mmstat.com/${api}`,
      headers: {
        'content-type': 'text/plain;charset=UTF-8',
        origin: 'https://www.taobao.com',
        referer: 'https://www.taobao.com/',
      },
      data: {
        gmkey: 'CLK',
        gokey: encodeURIComponent(gokey),
        logtype: '2',
      },
    });
  } catch (error) {
    console.error(error);
  }
}

/**
 * TODO batch send to server
 */
async function sendPayloadData(type: string) {
  const { empId } = await getUserInfo();
  const playload = await getPayloadData(type);
  const { editorName, editorVersion } = getEditorInfo();
  const { extensionName, extensionVersion } = getExtensionInfo();
  const { os, hostname, timezone } = await getSystemInfo();
  await Promise.all(playload.map(async (record: any) => {
    await send(`iceteam.iceworks.time_master_${type}`, {
      ...record,
      userId: empId,
      editorName,
      editorVersion,
      extensionName,
      extensionVersion,
      os,
      hostname,
      timezone,
    });
  }));
  await clearPayloadData(type);
}

async function getPayloadData(type: string) {
  const file = getPayloadFile(type);
  let playload = [];
  try {
    playload = await fse.readJson(file);
  } catch (e) {
    // ignore error
  }
  return playload;
}

async function clearPayloadData(type: string) {
  await savePayloadData(type, []);
}

async function savePayloadData(type: string, playload: EditorTimePayload[]|KeystrokesPayload[]) {
  const file = getPayloadFile(type);
  await fse.writeJson(file, playload);
}

async function appendPayloadData(type: string, data: EditorTimePayload[]|KeystrokesPayload[]) {
  const playload = await getPayloadData(type);
  const nextData = playload.concat(data);
  await savePayloadData(type, nextData);
}

function getPayloadFile(type: string) {
  return path.join(getAppDataDirPath(), `${type}_records.json`);
}
/* eslint-disable dot-notation */
import * as vscode from 'vscode';
import { IMaterialData as IMaterialInfo, IMaterialComponent, IMaterialBase } from '@iceworks/material-utils';
import { getSourcesByProjectType, getData } from '@iceworks/material-service';
import { window } from 'vscode';
import { recordDAU } from '@iceworks/recorder';
import { IMaterialDocInfo } from './type';
import { openInBrowser } from './openInBowser';
import i18n from '../i18n';

let loading = true;
let docInfoCache: IMaterialDocInfo[] = [];
export function getDocInfos(): IMaterialDocInfo[] {
  if (!loading) {
    return docInfoCache;
  } else {
    window.showInformationMessage(i18n.format('extension.iceworksMaterialHelper.getAllDocsInfo.sourceLoading'));
    return [];
  }
}

export async function initDocInfos() {
  docInfoCache = await originGetDocInfos();
  loading = false;
}

async function originGetDocInfos() {
  const getDocInfoFromMaterial = (sourceJson: IMaterialInfo) => {
    return [...sourceJson.components, ...(sourceJson.bases || [])].map((e: IMaterialComponent | IMaterialBase) => {
      return {
        label: e.name,
        detail: e.title,
        description: e['description'] || '',
        url: e.homepage,
        command: getDocInfoCommand(e.homepage),
      };
    });
  };

  const projectSource = await getSourcesByProjectType();
  const materialInfos = Promise.all(projectSource.map(({ source }) => getData(source)));
  return (await materialInfos).reduce((materialDocInfos, materialInfo) => {
    return materialDocInfos.concat(getDocInfoFromMaterial(materialInfo));
  }, [] as IMaterialDocInfo[]);
}

function getDocInfoCommand(url: string) {
  const command = `iceworks:material-helper.openDocUrl:${url}`;
  vscode.commands.registerCommand(command, () => {
    console.log(command);
    openInBrowser(url);
    recordDAU();
  });
  return command;
}
import * as path from 'path';
import * as fse from 'fs-extra';
import { TextDocument } from 'vscode';
import { getAppDataDayDirPath } from '../utils/storage';
import { getNowTimes } from '../utils/time';
import { Project } from './project';
import { KeystrokeStats } from '../managers/keystrokeStats';
import forIn = require('lodash.forin');

interface FileTextInfo {
  /**
   * 文件字符长度
   */
  length: number;
  /**
   * 文件行数
   */
  lineCount: number;
  /**
   * 文件使用的语法
   */
  syntax: string;
}

let textInfoCache: {[name: string]: FileTextInfo} = {};
function getTextInfo(textDocument: TextDocument, fileName: string): FileTextInfo {
  if (textInfoCache[fileName]) {
    return textInfoCache[fileName];
  }

  textInfoCache[fileName] = {
    syntax: textDocument.languageId || textDocument.fileName.split('.').slice(-1)[0],
    length: textDocument.getText().length,
    lineCount: textDocument.lineCount || 0,
  };
  return textInfoCache[fileName];
}

export function cleanTextInfoCache() {
  textInfoCache = {};
}

export interface FileChangeSummary {
  /**
   * 文件名
   */
  name: string;
  /**
   * 文件路径
   */
  fsPath: string;
  /**
   * 文件所属的项目文件夹
   */
  projectDir: string;
  /**
   * 文件的文本长度
   */
  length: number;
  /**
   * 文件的行数
   */
  lineCount: number;
  /**
   * 文件使用的语法
   */
  syntax: string;

  /**
   * kpm
   */
  kpm: number;
  /**
   * 按键数
   */
  keystrokes: number;
  /**
   * 文件停留时间
   */
  editorSeconds?: number;
  /**
   * 文件编辑时间
   */
  sessionSeconds: number;

  /**
   * 添加了多少个字符
   */
  charsAdded?: number;
  /**
   * 删除了多少个字符
   */
  charsDeleted?: number;
  /**
   * 粘贴的字符数
   */
  charsPasted?: number;

  /**
   * 文件打开次数
   */
  open: number;
  /**
   * 文件关闭次数
   */
  close: number;
  /**
   * 粘贴次数
   */
  paste: number;
  /**
   * 添加次数
   */
  add: number;
  /**
   * 删除次数
   */
  delete: number;
  /**
   * 更新次数
   */
  update: number;

  /**
   * 添加了多少行
   */
  linesAdded: number;
  /**
   * 删除了多少行
   */
  linesRemoved: number;

  /**
   * 开始更新文件的时间
   */
  start: number;
  /**
   * 结束更新文件的时间
   */
  end: number;
}

export class FileChange {
  public name: string;

  public fsPath: string;

  public projectDir: string;

  public length: number;

  public lineCount: number;

  public syntax: string;

  public kpm = 0;

  public keystrokes = 0;

  public charsAdded = 0;

  public charsDeleted = 0;

  public charsPasted = 0;

  public open = 0;

  public close = 0;

  public paste = 0;

  public add = 0;

  public delete = 0;

  public update = 0;

  public linesAdded = 0;

  public linesRemoved = 0;

  public start = 0;

  public end = 0;

  /**
   * 更新结束距离更新开始的时间间隔
   */
  public durationSeconds = 0;

  constructor(values?: any) {
    if (values) {
      Object.assign(this, values);
    }
  }

  updateTextInfo(textDocument: TextDocument) {
    const { syntax, length, lineCount } = getTextInfo(textDocument, this.name);
    this.syntax = syntax;
    this.length = length;
    this.lineCount = lineCount;
  }

  activate() {
    // placeholder
  }

  deactivate() {
    this.update = 1;
    this.kpm = this.keystrokes;
    this.durationSeconds = this.end - this.start;
  }

  setStart(time?: number) {
    this.start = time || getNowTimes().nowInSec;
  }

  setEnd(time?: number) {
    this.end = time || getNowTimes().nowInSec;
  }

  static createInstance(fsPath: string, project: Project) {
    const baseName = path.basename(fsPath);
    const name = baseName;
    const projectDir = project.directory;
    const fileChange = new FileChange({ name, projectDir, fsPath });
    return fileChange;
  }
}

export interface FilesChangeSummary {
  [name: string]: FileChangeSummary;
}

export function getFilesChangeFile() {
  return path.join(getAppDataDayDirPath(), 'filesChange.json');
}

export async function getFilesChangeSummary(): Promise<FilesChangeSummary> {
  const file = getFilesChangeFile();
  let filesChangeSummary = {};
  try {
    filesChangeSummary = await fse.readJson(file);
  } catch (e) {
    // ignore error
  }
  return filesChangeSummary;
}

export async function saveFilesChangeSummary(filesChangeSummary: FilesChangeSummary) {
  const file = getFilesChangeFile();
  await fse.writeJson(file, filesChangeSummary, { spaces: 4 });
}

export async function cleanFilesChangeSummary() {
  await saveFilesChangeSummary({});
}

export async function updateFilesChangeSummary(keystrokeStats: KeystrokeStats) {
  const { files } = keystrokeStats;
  let linesAdded = 0;
  let linesRemoved = 0;
  let keystrokes = 0;
  let sessionSeconds = 0;
  const filesChangeSummary = await getFilesChangeSummary();
  forIn(files, (fileChange: FileChange, fsPath: string) => {
    let fileChangeSummary = filesChangeSummary[fsPath];
    if (!fileChangeSummary) {
      fileChangeSummary = { ...fileChange, sessionSeconds: fileChange.durationSeconds };
    } else {
      // aggregate
      fileChangeSummary.update += 1;
      fileChangeSummary.keystrokes += fileChange.keystrokes;
      fileChangeSummary.kpm = fileChangeSummary.keystrokes / fileChangeSummary.update;
      fileChangeSummary.add += fileChange.add;
      fileChangeSummary.close += fileChange.close;
      fileChangeSummary.delete += fileChange.delete;
      fileChangeSummary.keystrokes += fileChange.keystrokes;
      fileChangeSummary.linesAdded += fileChange.linesAdded;
      fileChangeSummary.linesRemoved += fileChange.linesRemoved;
      fileChangeSummary.open += fileChange.open;
      fileChangeSummary.paste += fileChange.paste;
      fileChangeSummary.sessionSeconds += fileChange.durationSeconds;
      // non aggregates, just set
      fileChangeSummary.lineCount = fileChange.lineCount;
      fileChangeSummary.length = fileChange.length;
      fileChangeSummary.end = fileChange.end;
    }
    keystrokes += fileChange.keystrokes;
    linesAdded += fileChange.linesAdded;
    linesRemoved += fileChange.linesRemoved;
    sessionSeconds += fileChange.durationSeconds;
    filesChangeSummary[fsPath] = fileChangeSummary;
  });
  await saveFilesChangeSummary(filesChangeSummary);
  return {
    linesAdded,
    linesRemoved,
    keystrokes,
    sessionSeconds,
  };
}
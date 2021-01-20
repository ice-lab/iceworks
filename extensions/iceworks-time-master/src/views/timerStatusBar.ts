import { window, StatusBarAlignment, StatusBarItem, workspace, ConfigurationChangeEvent } from 'vscode';
import { getUserSummary } from '../storages/user';
import { humanizeMinutes, seconds2minutes } from '../utils/time';
import { getAverageSummary } from '../storages/average';
import { CONFIG_KEY_ICEWORKS_ENABLE_VIEWS, CONFIG_KEY_SECTION } from '../constants';
import { getDataFromSettingJson } from '@iceworks/common-service';

interface TimerStatusBar extends StatusBarItem {
  refresh(): Promise<void>;
  activate(): void;
}

export async function createTimerStatusBar() {
  const statusBar = window.createStatusBarItem(
    StatusBarAlignment.Right,
    10,
  ) as TimerStatusBar;
  statusBar.tooltip = 'Active code time today. Click to see more from Iceworks';
  statusBar.text = await getStatusBarText();
  statusBar.command = 'iceworks-time-master.displayTimerTree';
  statusBar.refresh = async function () {
    statusBar.text = await getStatusBarText();
  };
  statusBar.activate = function () {
    const enableViews = getDataFromSettingJson(CONFIG_KEY_SECTION);
    if (enableViews) {
      statusBar.show();
    }
    workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
      const isChanged = event.affectsConfiguration(CONFIG_KEY_ICEWORKS_ENABLE_VIEWS);
      if (isChanged) {
        const newEnableViews = getDataFromSettingJson(CONFIG_KEY_SECTION);
        if (newEnableViews) {
          statusBar.show();
        } else {
          statusBar.hide();
        }
      }
    });
  };
  return statusBar;
}

async function getStatusBarText() {
  const { editorSeconds } = await getUserSummary();
  const { dailyEditorSeconds } = await getAverageSummary();
  const inFlowIcon = dailyEditorSeconds && editorSeconds > dailyEditorSeconds ? '$(rocket)' : '$(clock)';
  const sessionMinutes = seconds2minutes(editorSeconds);
  const text = `${inFlowIcon} ${humanizeMinutes(sessionMinutes)}`;
  return text;
}

import { emit } from '@tauri-apps/api/event';
import {
  getAllWebviewWindows,
  WebviewWindow,
} from '@tauri-apps/api/webviewWindow';
import { IS_APPLE } from '../constants/os';
import { MAIN_WINDOW } from '../constants/window';
import { BackendEvent } from '../types/event';

/**
 * 页面布局是否是从右到左
 */
export function isRTL() {
  return document.documentElement.dir === 'rtl';
}

/**
 * 销毁所有窗口，退出应用
 */
export async function destroyAll() {
  console.info('Destroy all windows.');
  if (!IS_APPLE) await MAIN_WINDOW.setFullscreen(false);
  const windows = await getAllWebviewWindows();
  windows.forEach((win) => win.destroy());
}

/**
 * 展示主窗口
 */
export async function showMainWindow() {
  console.info('Show main window.');
  await MAIN_WINDOW.show();
  await MAIN_WINDOW.unminimize();
  await MAIN_WINDOW.setFocus();
  setTimeout(() => emit(BackendEvent.ShowMainWindow));
}

/**
 * 展示程序当前窗口
 */
export async function raise() {
  console.info('Raise window.');
  const miniWindow = await WebviewWindow.getByLabel('mini');
  if (await miniWindow?.isVisible()) {
    await miniWindow!.setFocus();
    return;
  }
  await showMainWindow();
}

/**
 * 若打开了Dialog、Drawer、播放页面，需要屏蔽快捷键
 */
export function shouldPreventKey() {
  return (
    !!document.querySelector(
      "div:not(.MuiPopover-root):has(.MuiBackdrop-root:not([style*='visibility: hidden']))",
    ) || !!document.querySelector('.playpage')
  );
}

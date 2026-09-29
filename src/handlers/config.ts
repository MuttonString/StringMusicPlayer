import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Effect } from '@tauri-apps/api/window';
import { exists, readDir, stat } from '@tauri-apps/plugin-fs';
import bg from '../assets/bg.webp';
import { IS_APPLE } from '../constants/os';
import { WINDOW_LABEL } from '../constants/window';
import type { AppConfig } from '../types/config';
import { BackgroundType, ColorMode } from '../types/config';
import { setLang } from './lang';

const appWindow = getCurrentWebviewWindow();

const listenDevKey = (e: KeyboardEvent) => {
  const primaryKey = IS_APPLE ? e.metaKey : e.ctrlKey;
  if (
    (primaryKey && e.shiftKey && e.key.toLowerCase() === 'i') ||
    e.key === 'F12'
  ) {
    invoke('open_devtools');
  } else if ((primaryKey && e.key.toLowerCase() === 'r') || e.key === 'F5') {
    location.reload();
  }
};

/**
 * 映射为应用某设置项的对应函数
 */
export const applyConfigFnMap: {
  [key in keyof AppConfig]?: (
    value: AppConfig[key],
    prev: AppConfig[key],
  ) => void;
} = {
  language(value) {
    setTimeout(async () => {
      await setLang(value);
      if (document.body.style.display) {
        document.body.style.display = '';
        console.info('Language loaded.');
      }
    });
  },

  colorMode(value) {
    switch (value) {
      case ColorMode.Light:
        appWindow.setTheme('light');
        break;
      case ColorMode.Dark:
        appWindow.setTheme('dark');
        break;
      default:
        appWindow.setTheme(null);
        break;
    }
  },
  async backgroundMainWindow(
    { type, opacity, path },
    { type: prevType, path: prevPath },
  ) {
    if (WINDOW_LABEL !== 'main') return;
    const style = document.body.style;

    const setBgColor = () => {
      style.setProperty(
        '--bg-overlay',
        `rgb(var(--mui-palette-AppBar-defaultBgChannel) / ${opacity}%)`,
      );
      style.setProperty('--bg-color', 'transparent');
      setTimeout(() => appWindow.clearEffects());
    };

    const setEffects = (effects: Effect[]) => {
      style.setProperty('--bg-image', 'transparent');
      style.setProperty('--bg-overlay', 'transparent');
      style.removeProperty('--bg-color');
      appWindow.setEffects({
        effects,
      });
    };

    switch (type) {
      case BackgroundType.Standard:
        style.removeProperty('--bg-image');
        style.removeProperty('--bg-overlay');
        style.removeProperty('--bg-color');
        setTimeout(() => appWindow.clearEffects());
        break;
      case BackgroundType.Blur:
        setEffects([Effect.Blur, Effect.Sidebar]);
        break;
      case BackgroundType.Acrylic:
        setEffects([Effect.Acrylic, Effect.Blur]);
        break;
      case BackgroundType.Mica:
        setEffects([Effect.Mica, Effect.Acrylic, Effect.Blur]);
        break;
      case BackgroundType.RandomPictures:
        if (!path) {
          style.setProperty('--bg-image', `url(${bg})`);
          setBgColor();
          break;
        }

        if (type === prevType && path === prevPath) {
          setBgColor();
          break;
        }

        try {
          if (!((await exists(path)) && (await stat(path)).isDirectory)) {
            style.setProperty('--bg-image', `url(${bg})`);
            setBgColor();
            break;
          }

          const entries = await readDir(path);
          const files = entries
            .filter((entry) => entry.isFile)
            .map((file) => file.name);
          if (files.length === 0) {
            style.setProperty('--bg-image', `url(${bg})`);
            break;
          }
          const img = files[Math.floor(Math.random() * files.length)];
          const fullPath = await join(path, img);
          style.setProperty('--bg-image', `url(${convertFileSrc(fullPath)})`);
        } catch (err) {
          console.error('Failed to get random picture from folder: ' + err);
          style.setProperty('--bg-image', `url(${bg})`);
        }
        setBgColor();
        break;

      default:
        if (!path) {
          style.setProperty('--bg-image', `url(${bg})`);
          setBgColor();
          break;
        }

        if (type === prevType && path === prevPath) {
          setBgColor();
          break;
        }

        try {
          if ((await exists(path)) && (await stat(path)).isFile) {
            style.setProperty(
              '--bg-image',
              `url(${path ? convertFileSrc(path) : bg})`,
            );
          } else {
            style.setProperty('--bg-image', `url(${bg})`);
          }
        } catch (err) {
          console.error('Failed to get picture: ' + err);
          style.setProperty('--bg-image', `url(${bg})`);
        }
        setBgColor();
        break;
    }
  },
  async backgroundMiniWindow() {
    // [Effect.Blur, Effect.ContentBackground, Effect.Popover]
  },
  advancedMaterial({ enabled, opacity }) {
    if (enabled) {
      document.body.classList.add('advanced-material');
      document.body.style.setProperty(
        '--advanced-material-opacity',
        String(opacity / 100),
      );
    } else {
      document.body.classList.remove('advanced-material');
      document.body.style.removeProperty('--advanced-material-opacity');
    }
  },
  sharpStyle(val) {
    if (val) document.body.classList.add('sharp-style');
    else document.body.classList.remove('sharp-style');
  },
  animationDuration(val) {
    document.body.style.setProperty('--duration', String(val));
  },
  globalFont(value) {
    document.body.style.setProperty('--font', value);
  },

  enableDevOptions(value) {
    if (value) {
      window.addEventListener('keydown', listenDevKey, true);
    } else {
      window.removeEventListener('keydown', listenDevKey, true);
    }
  },
} as const;

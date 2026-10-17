import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Effect } from '@tauri-apps/api/window';
import { exists, readDir, stat } from '@tauri-apps/plugin-fs';
import { locale } from '@tauri-apps/plugin-os';
import i18n from '../app/i18n';
import bg from '../assets/bg.webp';
import { IS_APPLE } from '../constants/os';
import { WINDOW_LABEL } from '../constants/window';
import type { AppConfig } from '../types/config';
import { BackgroundType, ColorMode } from '../types/config';

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

const setEffects = (effects: Effect[]) => {
  const style = document.body.style;
  style.setProperty('--bg-image', 'transparent');
  style.setProperty('--bg-overlay', 'transparent');
  style.removeProperty('--bg-color');
  appWindow.setEffects({
    effects,
  });
};

const setBgColor = (opacity: number) => {
  const style = document.body.style;
  style.setProperty(
    '--bg-overlay',
    `rgb(var(--mui-palette-AppBar-defaultBgChannel) / ${opacity}%)`,
  );
  style.setProperty('--bg-color', 'transparent');
  setTimeout(() => appWindow.clearEffects());
};

const setSinglePicture = async (path: string, opacity: number) => {
  const style = document.body.style;
  if (!path) {
    style.setProperty('--bg-image', `url(${bg})`);
    setBgColor(opacity);
    return;
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
  setBgColor(opacity);
};

const setRandomPicture = async (path: string, opacity: number) => {
  const style = document.body.style;
  if (!path) {
    style.setProperty('--bg-image', `url(${bg})`);
    setBgColor(opacity);
    return;
  }

  try {
    if (!((await exists(path)) && (await stat(path)).isDirectory)) {
      style.setProperty('--bg-image', `url(${bg})`);
      setBgColor(opacity);
      return;
    }

    const entries = await readDir(path);
    const files = entries
      .filter((entry) => entry.isFile)
      .map((file) => file.name);
    if (files.length === 0) {
      style.setProperty('--bg-image', `url(${bg})`);
      return;
    }
    const img = files[Math.floor(Math.random() * files.length)];
    const fullPath = await join(path, img);
    style.setProperty('--bg-image', `url(${convertFileSrc(fullPath)})`);
  } catch (err) {
    console.error('Failed to get random picture from folder: ' + err);
    style.setProperty('--bg-image', `url(${bg})`);
  }
  setBgColor(opacity);
  return;
};

/**
 * 映射为应用某设置项的对应函数
 */
export const applyConfigFnMap: {
  [key in keyof AppConfig]?: (value: AppConfig[key]) => void;
} = {
  language(value) {
    setTimeout(async () => {
      const loc = value || (await locale()) || 'en';
      await i18n.changeLanguage(loc);
      document.documentElement.lang = loc;
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
  backgroundMainWindowType(value) {
    if (WINDOW_LABEL !== 'main') return;
    const style = document.body.style;

    switch (value) {
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
        setRandomPicture(
          window.__CONFIG__.backgroundMainWindowPath,
          window.__CONFIG__.backgroundMainWindowOpacity,
        );
        break;
      default:
        setSinglePicture(
          window.__CONFIG__.backgroundMainWindowPath,
          window.__CONFIG__.backgroundMainWindowOpacity,
        );
        break;
    }
  },
  backgroundMainWindowOpacity(value) {
    if (
      [BackgroundType.SinglePicture, BackgroundType.RandomPictures].includes(
        window.__CONFIG__.backgroundMainWindowType,
      )
    ) {
      setBgColor(value);
    }
  },
  backgroundMainWindowPath(value) {
    switch (window.__CONFIG__.backgroundMainWindowType) {
      case BackgroundType.RandomPictures:
        setRandomPicture(value, window.__CONFIG__.backgroundMainWindowOpacity);
        break;
      case BackgroundType.SinglePicture:
        setSinglePicture(value, window.__CONFIG__.backgroundMainWindowOpacity);
        break;
    }
  },
  backgroundMiniWindowType() {
    // [Effect.Blur, Effect.ContentBackground, Effect.Popover]
  },
  advancedMaterialEnabled(value) {
    if (value) {
      document.body.classList.add('advanced-material');
    } else {
      document.body.classList.remove('advanced-material');
    }
  },
  advancedMaterialOpacity(value) {
    document.body.style.setProperty(
      '--advanced-material-opacity',
      String(value / 100),
    );
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

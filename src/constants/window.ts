import { defaultWindowIcon } from '@tauri-apps/api/app';
import {
  getCurrentWebviewWindow,
  WebviewWindow,
} from '@tauri-apps/api/webviewWindow';
import { type, version } from '@tauri-apps/plugin-os';
import type { WindowLabel } from '../types/event';
import { compareVersion } from '../utils/version';

export const DEFAULT_WINDOW_ICON = (await defaultWindowIcon())!;

export const MAIN_WINDOW = (await WebviewWindow.getByLabel('main'))!;

export const WINDOW_LABEL = getCurrentWebviewWindow().label as WindowLabel;

export const MD_WIDTH = '50rem';

export const SM_WIDTH = '30rem';

export const SIDE_BAR_WIDTH = '15rem';

export const MEDIA_BAR_HEIGHT = '5rem';

const ver = version();
const os = type();

export const SUPPORT_BLUR =
  (os === 'windows' &&
    ((compareVersion('6.0.5219', ver) <= 0 &&
      compareVersion(ver, '6.2.8427') <= 0) ||
      (compareVersion('10.0.10074', ver) <= 0 &&
        compareVersion(ver, '10.0.22621') < 0))) ||
  (os === 'macos' && compareVersion('10.11', ver) <= 0);

export const SUPPORT_ACRYLIC =
  os === 'windows' && compareVersion('10.0.16215', ver) <= 0;

export const SUPPORT_MICA =
  os === 'windows' && compareVersion('10.0.22000', ver) <= 0;

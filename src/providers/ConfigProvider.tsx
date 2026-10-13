import { emit, listen } from '@tauri-apps/api/event';
import { load } from '@tauri-apps/plugin-store';
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react';
import { WINDOW_LABEL } from '../constants/window';
import { applyConfigFnMap } from '../handlers/config';
import type { ChildrenProp } from '../types/component';
import type { AppConfig, ConfigContext } from '../types/config';
import {
  BackgroundType,
  CloseWindowAction,
  ColorMode,
  Colors,
  CyrillicToLatinMode,
  LyricAlign,
  PlaybackMode,
  RomajiMode,
  ShowAudioWave,
} from '../types/config';
import type { EventPayload } from '../types/event';
import { BackendEvent } from '../types/event';
import { decompress } from '../utils/data';

const emitChanging = (obj: Partial<AppConfig>) => {
  emit<EventPayload<typeof obj>>(BackendEvent.ConfigChanged, [
    WINDOW_LABEL,
    obj,
  ]);

  // 只在主窗口执行写入文件操作
  if (WINDOW_LABEL === 'main') {
    const save = async () => {
      try {
        const store = await load('config.json');
        const entries = Object.entries(obj);
        for (const [key, value] of entries) {
          console.info(`Update config "${key}" to ${JSON.stringify(value)}`);
          await store.set(key, value);
        }
      } catch (err: any) {
        console.error('Failed to save config: ' + err);
      }
    };
    save();
  }
};

const initVal: AppConfig = {
  language: '',
  closeWindowAction: CloseWindowAction.Ask,
  autoCheckUpdate: true,

  colorMode: ColorMode.FollowSystem,
  primaryColor: Colors.Cyan,
  backgroundMainWindowType: BackgroundType.SinglePicture,
  backgroundMainWindowOpacity: 80,
  backgroundMainWindowPath: '',
  backgroundMiniWindowType: BackgroundType.SinglePicture,
  backgroundMiniWindowOpacity: 80,
  globalFont: '',
  advancedMaterialEnabled: true,
  advancedMaterialOpacity: 60,
  sharpStyle: false,
  animationDuration: 1,

  enableDesktopLyric: false,
  lockDesktopLyric: false,
  lyricFont: '',
  multiline: false,
  lyricAlign: LyricAlign.InlineStart,
  longitudinal: false,
  textStroke: false,
  textShadow: true,

  pronFromApiFirst: false,
  jpRomaji: RomajiMode.ByWord,
  yahooAppId: '0',
  furigana: false,
  kanjiFix: true,
  removeParenthesisPron: true,
  hangulPron: false,
  cyrillicPron: CyrillicToLatinMode.Disable,
  otherPron: false,

  outputDevice: '',
  showAudioWave: ShowAudioWave.Hovering,
  coverRotation: true,
  useCoverAsIcon: true,
  useMusicTitleAsWindowTitle: true,
  seekBySentence: true,
  replaceWholeList: false,
  replayDelay: 2,
  volumeValue: 100,
  volumeOver100Allowed: false,
  dynamicVolume: false,
  speed: 1,
  detune: 0,
  enableEqualizer: false,
  equalizerSliderMoveTogether: true,
  equalizer: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  playbackMode: PlaybackMode.RepeatQueue,

  recommendation: true,
  recentPlayed: true,
  searchHistory: true,
  savePlaybackStatus: true,
  keepDownloadHistory: true,
  readClipboard: true,

  enableDevOptions: false,
  forceRTL: false,
  showFooter: false,
  script: '',
};

const reducer = (prev: AppConfig, action: Partial<AppConfig>) => {
  const newVal = { ...prev, ...action };
  window.__CONFIG__ = newVal;
  Object.entries(action).forEach(([key, value]) => {
    applyConfigFnMap[key as keyof AppConfig]?.(value as never);
  });
  return newVal;
};

const Context = createContext<ConfigContext>([initVal, emitChanging]);

export const useConfig = () => useContext(Context);

export function ConfigProvider({ children }: ChildrenProp) {
  const [config, dispatch] = useReducer(reducer, initVal);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const unlisten = listen<EventPayload<Partial<AppConfig>>>(
      BackendEvent.ConfigChanged,
      (e) => dispatch(e.payload[1]),
    );

    const loadConfig = async () => {
      const store = await load('config.json');
      const entries = await store.entries<AppConfig[keyof AppConfig]>();
      const loaded = Object.fromEntries(entries) as Partial<AppConfig>;
      dispatch({ ...initVal, ...loaded });

      // 执行启动脚本
      if (WINDOW_LABEL === 'main' && loaded.enableDevOptions && loaded.script) {
        setTimeout(() => {
          try {
            Function('"use strict";' + decompress(loaded.script!))();
          } catch (err) {
            console.error('Error while running JS script: ' + err);
          }
        });
      }
    };
    loadConfig().then(() => {
      console.info('Config loaded.');
      setFinished(true);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <Context.Provider value={[config, emitChanging]}>
      {finished && children}
    </Context.Provider>
  );
}

import { IS_APPLE, IS_DESKTOP, SUPPORT_SET_SINK_ID } from './os';

export const CONFIG_GROUP_ID_LIST = [
  'common',
  'windowAppearance',
  'playbackPageAppearance',
  'desktopLyric',
  'pronunciationAnnotation',
  'playback',
  'privacy',
  'quickOperation',
  'about',
] as const;

export const DEV_CONFIG_GROUP_ID_LIST = 'devOptions';

export const CONFIG_ID_LIST = [
  'language',
  IS_DESKTOP && !IS_APPLE && 'closeWindowAction',
  'autoCheckUpdate',

  'colorMode',
  'primaryColor',
  'backgroundMainWindow',
  'backgroundMiniWindow',
  'globalFont',
  'advancedMaterial',
  'sharpStyle',
  'animationDuration',

  // playbackPageBackground
  // dynamicWaveType
  // coverBounce
  // showPronounciation
  // showTranslation
  // showPlayQueue

  'enableDesktopLyric',
  'lockDesktopLyric',
  'lyricFont',
  'multiline',
  'lyricAlign',
  'longitudinal',
  'textStroke',
  'textShadow',

  'pronFromApiFirst',
  'jpRomaji',
  'yahooAppId',
  'furigana',
  'kanjiFix',
  'removeParenthesisPron',
  'hangulPron',
  'cyrillicPron',
  'otherPron',

  SUPPORT_SET_SINK_ID && 'outputDevice',
  'showAudioWave',
  'coverRotation',
  IS_DESKTOP && 'useCoverAsIcon',
  IS_DESKTOP && 'useMusicTitleAsWindowTitle',
  'seekBySentence',
  'replaceWholeList',
  'replayDelay',
  'volume',
  'dynamicVolume',
  'speed',
  'detune',
  'enableEqualizer',
  'equalizerSliderMoveTogether',
  'equalizer',
  'playbackMode',

  'recommendation',
  'recentPlayed',
  'searchHistory',
  'savePlaybackStatus',
  'keepDownloadHistory',
  'readClipboard',
].filter(Boolean) as string[];

export const DEV_CONFIG_ID_LIST = [
  'enableDevOptions',
  'forceRTL',
  'showFooter',
  'script',
  IS_DESKTOP && 'openAppdata',
  IS_DESKTOP && 'openLog',
].filter(Boolean) as string[];

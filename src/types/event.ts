import type { Song } from './audio';

export const enum BackendEvent {
  ConfigChanged = 'config-changed',
  Reopen = 'reopen', // 仅在macOS有效
  ShowMainWindow = 'show-main-window',
  IsLoading = 'is-loading',
  Play = 'play',
  Pause = 'pause',
  Toggle = 'toggle',
  TimeUpdate = 'time-update',
  Next = 'next',
  Previous = 'previous',
  Stop = 'stop',
  SeekForward = 'seek-forward',
  SeekBackward = 'seek-backward',
  SetPosition = 'set-position',
  SetVolume = 'set-volume',
  OpenUri = 'open-uri',
  Raise = 'raise',
  Quit = 'quit',
  UpdateQueue = 'update-queue',
}

export type WindowLabel = 'main' | 'mini' | 'lyric';

export type EventPayload<T> = [label: WindowLabel, data: T];

export interface UpdateQueuePayload {
  newQueue?: Song[];
  newIndex?: number;
}

export interface FontName {
  original: string;
  localized: string;
}

import type { ReactNode } from 'react';
import type * as Tone from 'tone';

export interface AudioProviderContext {
  currIdx: number; // 无正在播放的歌曲时为-1
  prevIdx: number;
  nextIdx: number;
  playQueue: Song[];
  paused: boolean;
  pending: boolean;
  currentTime: number;
  lyric: LyricSentence[];
  setLyric: (lyric: LyricSentence[]) => void;
  currBuffer?: ArrayBuffer;
}

export interface ToneInstances {
  volume: Tone.Volume;
  replayGain: Tone.Volume;
  filters: Tone.Filter[];
  player: Tone.Player;
  grainPlayer: Tone.GrainPlayer;
  activePlayer: Tone.Player | Tone.GrainPlayer;
}

export const enum TaskbarButtons {
  Prev = 1001,
  Toggle = 1002,
  Next = 1003,
}

export interface DetailMetadata {
  id?: string;
  api?: string;
  translation?: string;
  label: string;
}

export interface SongDetail {
  cover?: { format: string; data: Uint8Array; url: string } | null;
  title: string;
  src: string;
  year?: number;
  trackNo: number | null;
  trackTotal: number | null;
  artists?: string[];
  album?: string;
  albumArtists?: string[];
  container?: string;
  codec?: string;
  codecProfile?: string;
  duration: number;
  bitrate?: number;
  sampleRate?: number;
  bitsPerSample?: number;
  lossless?: boolean;
  numberOfChannels?: number;
}

export type Cover = [original: string, thumbnail: string];

export interface Song {
  id?: string; // 仅在线歌曲
  api?: string; // 仅在线歌曲
  src: string;
  title: string;
  translation?: string;
  artists?: DetailMetadata[];
  album?: DetailMetadata;
  cover?: Cover; // 缩略图边长88
  duration?: number;
  marks?: number[];
  favorite?: boolean;
  favoriteCount?: number;
  metadataLoaded: boolean;
}

export interface LyricSentence {
  start: number;
  text: string;
  furigana?: ReactNode;
  pronounciation?: string;
  translation?: string;
  words?: { start: number; text: string }[];
}

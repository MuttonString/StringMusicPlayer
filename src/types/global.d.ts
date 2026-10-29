import 'react';
import type { AppConfig } from './config';

declare global {
  interface Window {
    [key: `__TAURI_${string}`]: any;
    __CONFIG__: AppConfig;
    appdata: () => void;
    applog: () => void;
  }

  interface AudioContext {
    setSinkId: HTMLAudioElement['setSinkId'];
  }
}

declare module 'react' {
  export interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

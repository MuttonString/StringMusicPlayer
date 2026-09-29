import { KeyCode } from '../types/keyCode';

export const KEY_ABBR: Record<string, string> = {
  [KeyCode.Up]: '↑',
  [KeyCode.Down]: '↓',
  [KeyCode.Left]: '←',
  [KeyCode.Right]: '→',
  [KeyCode.Ctrl]: 'Ctrl',
  [KeyCode.Del]: 'Del',
  [KeyCode.Esc]: 'Esc',
} as const;

export const KEY_MAC: Record<string, string> = {
  [KeyCode.Alt]: '⌥',
  [KeyCode.Shift]: '⇧',
  [KeyCode.Ctrl]: '⌘', // 映射为Command
  [KeyCode.Backspace]: '⌫', // 与Del合并
  [KeyCode.Esc]: '⎋',
  [KeyCode.Enter]: '⏎',
  [KeyCode.Up]: '▲',
  [KeyCode.Down]: '▼',
  [KeyCode.Left]: '◀',
  [KeyCode.Right]: '▶',
} as const;

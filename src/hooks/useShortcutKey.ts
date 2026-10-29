import { useCallback, useEffect, useMemo, useRef } from 'react';
import { KEY_ABBR, KEY_MAC } from '../constants/keys';
import { IS_APPLE } from '../constants/os';
import { KeyCode } from '../types/keyCode';
import { shouldPreventKey } from '../utils/window';

/**
 * 为传入的操作配置快捷键，Ctrl键在macOS映射为Cmd键，Del键映射为Backspace键。快捷键数组需按顺序，勿使用Win或Super键。
 * @returns 快捷键描述（在macOS使用专有格式）和传入的操作
 */
export default function useShortcutKey(
  action: () => void,
  keys: string[],
  global?: boolean,
) {
  const actionRef = useRef(action);
  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  const keysRef = useRef(keys);
  useEffect(() => {
    if (IS_APPLE && keys[keys.length - 1] === KeyCode.Del) {
      keys[keys.length - 1] = KeyCode.Backspace;
    }
    keysRef.current = keys;
  }, [keys]);

  const keyDesc = useMemo(() => {
    if (IS_APPLE) {
      return keysRef.current.map((key) => KEY_MAC[key] || key).join('');
    }

    return `(${keysRef.current.map((key) => KEY_ABBR[key] || key).join('+')})`;
  }, []);

  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (!global && shouldPreventKey()) return;

      const action = actionRef.current;
      const keys = keysRef.current;
      const alt = keys.includes(KeyCode.Alt) === e.altKey;
      const shift = keys.includes(KeyCode.Shift) === e.shiftKey;
      const ctrl =
        keys.includes(KeyCode.Ctrl) === (IS_APPLE ? e.metaKey : e.ctrlKey);

      if (
        alt &&
        shift &&
        ctrl &&
        e.key.toLowerCase() === keys[keys.length - 1].toLowerCase()
      ) {
        console.info(`Shortcut key ${keyDesc} pressed.`);
        action();
      }
    },
    [global, keyDesc],
  );

  useEffect(() => {
    window.addEventListener('keydown', handler, true);

    return () => window.removeEventListener('keydown', handler, true);
  }, [handler]);

  return [keyDesc, action] as const;
}

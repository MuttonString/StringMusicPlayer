import type {
  MouseEvent,
  MouseEventHandler,
  PointerEvent,
  PointerEventHandler,
} from 'react';
import { useCallback, useEffect, useRef } from 'react';

/**
 * 处理长按事件，通常将该hook返回值直接传递给对应组件即可
 */
export default function useLongPress(
  onLongPress: PointerEventHandler,
  onClick?: MouseEventHandler,
  threshold = 500,
) {
  const longPressRef = useRef(onLongPress);
  const clickRef = useRef(onClick);
  const timerRef = useRef(0);

  useEffect(() => {
    longPressRef.current = onLongPress;
  }, [onLongPress]);

  useEffect(() => {
    clickRef.current = onClick;
  }, [onClick]);

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.button !== 0) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = 0;
        longPressRef.current(e);
      }, threshold);
    },
    [threshold],
  );

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (e.button !== 0 || !timerRef.current) return;
    clearTimeout(timerRef.current);
    clickRef.current?.(e);
  }, []);

  const onPointerLeave = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const onContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    if (e.button !== 2) return;
    clearTimeout(timerRef.current);
    longPressRef.current(e as PointerEvent);
  }, []);

  return {
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onContextMenu,
  } as const;
}

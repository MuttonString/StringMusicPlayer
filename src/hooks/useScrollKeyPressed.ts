import type { ReactVirtualizer } from '@tanstack/react-virtual';
import type { KeyboardEvent } from 'react';
import { useCallback } from 'react';
import { useConfig } from '../providers/ConfigProvider';
import { KeyCode } from '../types/keyCode';

/**
 * 处理列表的到顶、到底、上页、下页按键行为
 */
export function useScrollKeyPressed<T extends HTMLElement>(
  list?: T | null,
  virtualizer?: ReactVirtualizer<T, Element>,
) {
  const [config] = useConfig();
  const hasAnimation = config.animationDuration ? 'smooth' : 'instant';

  return useCallback(
    (e: KeyboardEvent<Element>) => {
      if (
        !list ||
        ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        return;
      }

      const behavior = e.repeat ? 'instant' : hasAnimation;

      switch (e.key) {
        case KeyCode.Home:
          if (virtualizer) {
            virtualizer.scrollToIndex(0, { align: 'start', behavior });
          } else {
            list.scrollTo({ top: 0, behavior });
          }
          break;

        case KeyCode.End:
          if (virtualizer) {
            virtualizer.scrollToEnd({ behavior });
          } else {
            list.scrollTo({ top: list.scrollHeight, behavior });
          }
          break;

        case KeyCode.PgUp:
          list.scrollBy({ top: -list.clientHeight, behavior });
          break;

        case KeyCode.PgDown:
          list.scrollBy({ top: list.clientHeight, behavior });
          break;
      }
    },
    [hasAnimation, list, virtualizer],
  );
}

import { useCallback, useEffect, useRef } from 'react';

/**
 * 将传入的函数封装为防抖函数，通常函数需要useCallback包裹
 */
export default function useDebounce(
  fn: (...args: any[]) => any,
  delay: number,
) {
  const fnRef = useRef(fn);
  const timerRef = useRef(0);

  useEffect(() => {
    fnRef.current = fn;

    () => clearTimeout(timerRef.current);
  }, [fn]);

  return useCallback(
    (...args: any[]) => {
      clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delay);
    },
    [delay],
  );
}

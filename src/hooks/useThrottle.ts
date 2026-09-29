import { useCallback, useEffect, useRef } from 'react';

/**
 * 将传入的函数封装为节流函数，通常函数需要useCallback包裹
 */
export default function useThrottle(
  fn: (...args: any[]) => any,
  delay: number,
) {
  const fnRef = useRef(fn);
  const timerRef = useRef(0);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  return useCallback(
    (...args: any[]) => {
      if (timerRef.current) return;
      fnRef.current(...args);

      timerRef.current = setTimeout(() => {
        timerRef.current = 0;
      }, delay);
    },
    [delay],
  );
}

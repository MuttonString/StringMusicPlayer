import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router';
import { onBackpressed } from 'tauri-plugin-backpressed';
import { IS_DESKTOP } from '../constants/os';
import type { ChildrenProp } from '../types/component';
import type { NavigatorContext } from '../types/navigator';
import { PageOperation } from '../types/navigator';
import { shouldPreventKey } from '../utils/window';

const Context = createContext<NavigatorContext>({
  goBack: () => false,
  goForward: () => false,
  goTo: () => {},
  canGoBack: false,
  canGoForward: false,
  lastOperation: PageOperation.New,
});

export const useNavigator = () => useContext(Context);

export function NavigatorProvider({ children }: ChildrenProp) {
  const navigate = useNavigate();
  const [op, setOp] = useState<PageOperation>(PageOperation.New);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const countRef = useRef(1);
  const idxRef = useRef(1); // 从1开始

  const goBack = useCallback(() => {
    if (idxRef.current === 1) return false;
    setOp(PageOperation.Back);
    idxRef.current--;
    setCanGoBack(idxRef.current !== 1);
    setCanGoForward(true);
    navigate(-1);
    console.info('Navigate back.');
    return true;
  }, [navigate]);

  const goForward = useCallback(() => {
    if (idxRef.current === countRef.current) return false;
    setOp(PageOperation.Forward);
    idxRef.current++;
    setCanGoForward(idxRef.current !== countRef.current);
    setCanGoBack(true);
    navigate(1);
    console.info('Navigate forward.');
    return true;
  }, [navigate]);

  const goTo = useCallback(
    (path: string) => {
      setOp(PageOperation.New);
      idxRef.current++;
      countRef.current = idxRef.current;
      setCanGoBack(true);
      setCanGoForward(false);
      navigate(path);
      console.info(`Navigate to ${path}.`);
    },
    [navigate],
  );

  // 拦截原生鼠标前进、后退按钮的事件
  useEffect(() => {
    const mouseHandler = (e: MouseEvent) => {
      e.preventDefault();
      if (shouldPreventKey()) return;

      switch (e.button) {
        case 3:
          console.info('Mouse back button pressed.');
          goBack();
          break;
        case 4:
          console.info('Mouse forward button pressed.');
          goForward();
          break;
      }
    };
    window.addEventListener('mouseup', mouseHandler, true);

    return () => window.removeEventListener('mouseup', mouseHandler, true);
  }, [goBack, goForward]);

  // 拦截移动端后退事件
  useEffect(() => {
    if (IS_DESKTOP || shouldPreventKey()) return;

    const unlisten = onBackpressed((e) => {
      console.info(`Action ${e.source} (${e.requestId}) performed.`);
      return goBack();
    });

    return () => {
      unlisten.then((fn) => {
        if (fn) fn.unregister();
      });
    };
  }, [goBack, goForward]);

  return (
    <Context.Provider
      value={{
        goBack,
        goForward,
        goTo,
        canGoBack,
        canGoForward,
        lastOperation: op,
      }}
    >
      {children}
    </Context.Provider>
  );
}

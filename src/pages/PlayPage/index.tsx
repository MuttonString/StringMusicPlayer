import { Fade, IconButton, Modal } from '@mui/material';
import classNames from 'classnames';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MaterialIcon from '../../components/ui/MaterialIcon';
import Tip from '../../components/ui/Tip';
import { FADE_DURATION } from '../../constants/animation';
import { IS_APPLE, IS_DESKTOP } from '../../constants/os';
import { MAIN_WINDOW } from '../../constants/window';
import useDebounce from '../../hooks/useDebounce';
import useShortcutKey from '../../hooks/useShortcutKey';
import { useConfig } from '../../providers/ConfigProvider';
import { KeyCode } from '../../types/keyCode';
import { isRTL } from '../../utils/window';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PlayPage({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBtn, setShowBtn] = useState(false);
  const isMaxRef = useRef(false);
  const [config] = useConfig();

  const hideBtn = useDebounce(
    useCallback(() => setShowBtn(false), []),
    3000,
  );

  const showBtnFn = useCallback(() => {
    if (!isFullscreen) return;
    setShowBtn(true);
    hideBtn();
  }, [hideBtn, isFullscreen]);

  const [closeKey, close] = useShortcutKey(
    () => {
      if (isFullscreen) {
        setIsFullscreen(false);
      } else {
        onClose();
      }
    },
    [KeyCode.Esc],
    true,
  );

  const [fullscreenKey, fullscreen] = useShortcutKey(
    !IS_DESKTOP || IS_APPLE || !open
      ? () => {}
      : () => setIsFullscreen(!isFullscreen),
    ['F11'],
    true,
  );

  useEffect(() => {
    if (!IS_DESKTOP || IS_APPLE) return;

    const setFullscreen = async () => {
      if (isFullscreen) {
        // 修复最大化时直接全屏可能不生效的bug
        isMaxRef.current = await MAIN_WINDOW.isMaximized();
        if (isMaxRef.current) await MAIN_WINDOW.unmaximize();
        await MAIN_WINDOW.setFullscreen(true);
        document.body.classList.add('fullscreen');
      } else {
        await MAIN_WINDOW.setFullscreen(false);
        if (isMaxRef.current) await MAIN_WINDOW.maximize();
        document.body.classList.remove('fullscreen');
      }
    };
    setFullscreen();
  }, [isFullscreen]);

  return (
    <Modal
      open={open}
      hideBackdrop
      className={classNames(!isFullscreen && 'playpage')}
    >
      <Fade in={open}>
        <div
          className='w-full h-full flex bg-background-default overlay-1'
          onPointerMove={showBtnFn}
          onPointerDown={showBtnFn}
          onKeyDown={showBtnFn}
        >
          {isFullscreen ? (
            <AnimatePresence>
              {showBtn && (
                <motion.div
                  className='p-2'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: config.animationDuration * FADE_DURATION,
                  }}
                >
                  <Tip
                    title={t('playPage.exitFullscreen') + ' ' + fullscreenKey}
                  >
                    <IconButton
                      aria-label={t('playPage.exitFullScreen')}
                      className='border! border-primary'
                      color='primary'
                      onClick={fullscreen}
                    >
                      <MaterialIcon name='fullscreenExit' />
                    </IconButton>
                  </Tip>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <header
              data-tauri-drag-region
              className={classNames(
                'w-full h-(--title-bar-height) flex items-center',
                IS_APPLE && 'flex-row-reverse',
              )}
            >
              <Tip title={t('playPage.exit' + ' ' + closeKey)}>
                <IconButton
                  aria-label={t('playPage.exit')}
                  color='inherit'
                  onClick={close}
                >
                  <MaterialIcon
                    name={isRTL() ? 'chevronRight' : 'chevronLeft'}
                  />
                </IconButton>
              </Tip>
              {IS_DESKTOP && !IS_APPLE && (
                <Tip title={t('playPage.fullscreen') + ' ' + fullscreenKey}>
                  <IconButton
                    aria-label={t('playPage.fullScreen')}
                    color='inherit'
                    onClick={fullscreen}
                  >
                    <MaterialIcon name='fullscreen' />
                  </IconButton>
                </Tip>
              )}
            </header>
          )}
        </div>
      </Fade>
    </Modal>
  );
}

import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Input from '@mui/material/Input';
import InputAdornment from '@mui/material/InputAdornment';
import Popover from '@mui/material/Popover';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import { type, version } from '@tauri-apps/plugin-os';
import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppIcon from '../../../assets/icon.svg?react';
import { BASE_COMPONENT } from '../../../constants/animation';
import { IS_APPLE, IS_DESKTOP } from '../../../constants/os';
import {
  MAIN_WINDOW,
  MD_WIDTH,
  SIDE_BAR_WIDTH,
} from '../../../constants/window';
import useShortcutKey from '../../../hooks/useShortcutKey';
import useWidthQuery from '../../../hooks/useWidthQuery';
import { useConfig } from '../../../providers/ConfigProvider';
import { useNavigator } from '../../../providers/NavigatorProvider';
import { KeyCode } from '../../../types/keyCode';
import { compareVersion } from '../../../utils/version';
import { isRTL } from '../../../utils/window';
import MaterialIcon from '../../ui/MaterialIcon';
import Tip from '../../ui/Tip';
import NavigatorList from '../NavigatorList';

const isNewSegoeSupported =
  type() === 'windows' && compareVersion(version(), '10.0.21327') >= 0;

export default function TitleBar() {
  const [config] = useConfig();
  const wide = useWidthQuery(MD_WIDTH);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { goBack, goForward, canGoBack, canGoForward } = useNavigator();
  const { t } = useTranslation();
  const sharp = config.sharpStyle;

  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [searchAnchor, setSearchAnchor] = useState<null | HTMLElement>(null);
  const popoverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const close = () => {
      setNavigatorOpen(false);
      setSearchAnchor(null);
    };

    if (wide) {
      close();
    } else {
      const draggableBar = document.querySelector('div[data-tauri-decorum-tb]');
      if (!draggableBar) return;
      // 在通过点击标题栏内的按钮打开弹出式组件时，再次点击标题栏应当关掉它们
      draggableBar.addEventListener('pointerdown', close);
      return () => draggableBar.removeEventListener('pointerdown', close);
    }
  }, [wide]);

  useEffect(() => {
    if (!IS_APPLE) return;

    const isFullscreen = async () => {
      const fullscreen = await MAIN_WINDOW.isFullscreen();
      setIsFullscreen(fullscreen);
      if (fullscreen) {
        document.body.classList.add('fullscreen');
      } else {
        document.body.classList.remove('fullscreen');
      }
    };

    isFullscreen();
    const unlisten = MAIN_WINDOW.onResized(isFullscreen);

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const [backKey, back] = useShortcutKey(goBack, [
    KeyCode.Alt,
    isRTL() ? KeyCode.Right : KeyCode.Left,
  ]);

  const [forwardKey, forward] = useShortcutKey(goForward, [
    KeyCode.Alt,
    isRTL() ? KeyCode.Left : KeyCode.Right,
  ]);

  return (
    <header
      data-tauri-drag-region
      className='w-full h-(--title-bar-height) flex items-center justify-between **:z-101'
    >
      <AnimatePresence>
        {wide && (
          <motion.div
            layout
            variants={BASE_COMPONENT}
            custom={{ w: SIDE_BAR_WIDTH, ps: '12px' }}
            initial='hidden'
            whileInView='visible'
            exit='hidden'
            className='overflow-clip flex items-center gap-2 pointer-events-none whitespace-nowrap'
            style={
              !IS_APPLE || isFullscreen ? undefined : { visibility: 'hidden' }
            }
          >
            <AppIcon className='min-w-6 h-6' />
            <span>{t('common.stringMusic')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        data-tauri-drag-region
        className='w-full h-(--title-bar-height) flex items-center'
      >
        <SwipeableDrawer
          open={navigatorOpen}
          onOpen={() => setNavigatorOpen(true)}
          onClose={() => setNavigatorOpen(false)}
        >
          <NavigatorList
            className='w-(--side-bar-width)!'
            onButtonClicked={() => setNavigatorOpen(false)}
            inDrawer
          />
        </SwipeableDrawer>
        {!wide && (
          <Tip title={t('titleBar.navigator')}>
            <IconButton
              size='small'
              className={IS_APPLE ? 'ms-18!' : 'ms-1!'}
              onClick={() => setNavigatorOpen(true)}
            >
              <MaterialIcon name='menu' />
            </IconButton>
          </Tip>
        )}

        <Tip disabled={!canGoBack} title={t('titleBar.back') + ' ' + backKey}>
          <IconButton
            aria-label={t('titleBar.back')}
            size='small'
            disabled={!canGoBack}
            onClick={back}
          >
            <MaterialIcon name={isRTL() ? 'arrowForward' : 'arrowBack'} />
          </IconButton>
        </Tip>
        <Tip
          disabled={!canGoForward}
          title={t('titleBar.forward') + ' ' + forwardKey}
        >
          <IconButton
            aria-label={t('titleBar.forward')}
            size='small'
            disabled={!canGoForward}
            onClick={forward}
          >
            <MaterialIcon name={isRTL() ? 'arrowBack' : 'arrowForward'} />
          </IconButton>
        </Tip>

        {wide && (
          <Tip
            title={
              ''
              //TODO
            }
          >
            <Input
              aria-label={t('titleBar.search')}
              placeholder={t('titleBar.search')}
              size='small'
              fullWidth
              className='max-w-50 ms-8'
              startAdornment={
                <IconButton
                  aria-label={t('titleBar.search')}
                  tabIndex={-1}
                  size='small'
                >
                  <MaterialIcon name='search' fontSize='small' />
                </IconButton>
              }
            />
          </Tip>
        )}

        {!wide && (
          <Tip
            title={
              t('titleBar.search') + ' '
              //TODO
            }
          >
            <IconButton
              size='small'
              onClick={(e) => {
                setSearchAnchor(e.currentTarget);
                setTimeout(() => popoverInputRef.current!.focus());
              }}
            >
              <MaterialIcon name='search' />
            </IconButton>
          </Tip>
        )}
        <Popover
          open={!!searchAnchor}
          anchorEl={searchAnchor}
          onClose={() => setSearchAnchor(null)}
          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        >
          <div className='p-2 w-50'>
            <Input
              aria-label={t('titleBar.search')}
              placeholder={t('titleBar.search')}
              fullWidth
              inputRef={popoverInputRef}
              endAdornment={
                <InputAdornment position='end'>
                  <IconButton
                    aria-label={t('titleBar.search')}
                    tabIndex={-1}
                    size='small'
                  >
                    <MaterialIcon name='keyboardReturn' fontSize='small' />
                  </IconButton>
                </InputAdornment>
              }
            />
          </div>
        </Popover>

        <Tip
          title={
            t('titleBar.songRecognition') + ' '
            //TODO
          }
        >
          <IconButton aria-label={t('titleBar.songRecognition')} size='small'>
            <MaterialIcon name='mic' />
          </IconButton>
        </Tip>
      </div>
      <div
        data-tauri-drag-region
        className={classNames(
          'flex',
          IS_DESKTOP && !IS_APPLE && 'me-[calc(3*var(--title-bar-btn-width))]',
        )}
      >
        <div className='w-(--title-bar-btn-width) text-center'>
          <Tip title={t('titleBar.accounts')}>
            <IconButton size='small'>
              <Avatar
                src={''}
                sx={{
                  width: '2rem',
                  height: '2rem',
                }}
              >
                <MaterialIcon name='accountCircle' color='action' />
              </Avatar>
            </IconButton>
          </Tip>
        </div>
        {IS_DESKTOP && (
          <Tip
            title={
              t('titleBar.miniWindow') + ' '
              //TODO
            }
          >
            <button
              aria-label={t('titleBar.miniWindow')}
              className={classNames(
                'decorum-tb-btn [&_svg]:align-middle',
                isNewSegoeSupported && sharp
                  ? 'font-["Segoe_MDL2_Assets"]! text-base!'
                  : 'text-base!',
              )}
              onClick={() => {
                // todo
              }}
            >
              {isNewSegoeSupported ? (
                '\uee49'
              ) : (
                <MaterialIcon name='pictureInPicture' />
              )}
            </button>
          </Tip>
        )}
      </div>
    </header>
  );
}

import { emit } from '@tauri-apps/api/event';
import { Menu } from '@tauri-apps/api/menu';
import type { TrayIconEvent } from '@tauri-apps/api/tray';
import { TrayIcon } from '@tauri-apps/api/tray';
import { createRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IS_APPLE, IS_DESKTOP } from '../constants/os';
import { DEFAULT_WINDOW_ICON } from '../constants/window';
import { useAudio } from '../providers/AudioProvider';
import { BackendEvent } from '../types/event';
import { destroyAll, raise } from '../utils/window';

const menuRef = createRef<Menu>();
const actionRef = createRef<(event: TrayIconEvent) => void>();

try {
  await TrayIcon.removeById('StringMusic');
} catch {}
const tray =
  !IS_DESKTOP || IS_APPLE
    ? null
    : await TrayIcon.new({
        id: 'StringMusic',
        icon: DEFAULT_WINDOW_ICON,
        showMenuOnLeftClick: false,
        action: (e) => actionRef.current?.(e),
      });

if (tray) console.info('Tray icon created.');

/**
 * 创建托盘图标
 */
export default function useTrayMenu() {
  const { t } = useTranslation();
  const { playQueue, paused, pending } = useAudio();

  useEffect(() => {
    if (!tray) return;

    tray.setTitle(t('common.stringMusic'));
    tray.setTooltip(t('common.stringMusic'));
    tray.setMenu(menuRef.current || null);
  }, [t]);
  useEffect(() => {
    if (!tray) return;

    Menu.new({
      items: [
        {
          text: t('media.prev'),
          enabled: playQueue.length > 1,
          action() {
            emit(BackendEvent.Previous);
          },
        },
        {
          text: t(paused ? 'media.play' : 'media.pause'),
          enabled: !pending && playQueue.length > 0,
          action() {
            emit(BackendEvent.Toggle);
          },
        },
        {
          text: t('media.next'),
          enabled: playQueue.length > 1,
          action() {
            emit(BackendEvent.Next);
          },
        },
        { item: 'Separator' },
        {
          text: t('menu.desktopLyric'),
        },
        {
          text: t('menu.lockLyric'),
        },
        { item: 'Separator' },
        {
          text: t('menu.show'),
          action: raise,
        },
        {
          text: t('menu.exit'),
          action: destroyAll,
        },
      ],
    }).then((val) => {
      menuRef.current = val;
      tray.setMenu(val);
    });

    actionRef.current = (e) => {
      if (e.type !== 'Click') return;
      if (e.button === 'Left') {
        raise();
      } else if (e.button === 'Right') {
        menuRef.current?.popup();
      }
    };

    return () => {
      menuRef.current?.close();
    };
  }, [paused, pending, playQueue.length, t]);
}

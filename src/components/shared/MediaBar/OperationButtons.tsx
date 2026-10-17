import {
  Divider,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BASE_COMPONENT } from '../../../constants/animation';
import { MEDIA_BAR_HEIGHT } from '../../../constants/window';
import useShortcutKey from '../../../hooks/useShortcutKey';
import { useAudio } from '../../../providers/AudioProvider';
import { useConfigDrawer } from '../../../providers/ConfigDrawerProvider';
import { useConfig } from '../../../providers/ConfigProvider';
import type { Song } from '../../../types/audio';
import { KeyCode } from '../../../types/keyCode';
import MaterialIcon from '../../ui/MaterialIcon';
import Tip from '../../ui/Tip';
import VolumeSlider from '../../ui/VolumeSlider';
import PlaybackModeButton from '../PlaybackModeButton';
import InfoDialog from './InfoDialog';
import PlayQueue from './PlayQueue';

interface Props {
  show: boolean;
}

const deleteBrackets = (str: string) => {
  if (str.startsWith('(')) {
    return str.substring(1, str.length - 1);
  }
  return str;
};

export default function OperationButtons({ show }: Props) {
  const { t } = useTranslation();
  const [config, updateConfig] = useConfig();
  const openConfig = useConfigDrawer();
  const [queueOpen, setQueueOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLButtonElement | null>(null);
  const dialogRef = useRef<(src: string) => void>(() => {});
  const media = useAudio();
  const currSong = media.playQueue[media.currIdx] as Song | undefined;

  useEffect(() => {
    if (show) return;
    setMenuAnchor(null);
  }, [show]);

  const [openQueueKey, openQueue] = useShortcutKey(() => {
    setMenuAnchor(null);
    setQueueOpen(true);
  }, [KeyCode.Ctrl, 'L']);

  const [openInfoKey, openInfo] = useShortcutKey(
    () => {
      setMenuAnchor(null);
      if (currSong) dialogRef.current(currSong.src);
    },
    [KeyCode.Ctrl, 'I'],
    true,
  );

  const [openDrawerKey, openDrawer] = useShortcutKey(() => {
    setMenuAnchor(null);
    openConfig('playback');
  }, [KeyCode.Ctrl, KeyCode.Shift, 'G']);

  const [volumeUpKey] = useShortcutKey(
    () => {
      const max = config.volumeOver100Allowed ? 400 : 100;
      if (config.volumeValue < max) {
        updateConfig({
          volumeValue: Math.min(config.volumeValue + 10, max),
        });
      }
    },
    [KeyCode.Ctrl, KeyCode.Up],
    true,
  );

  const [volumeDownKey] = useShortcutKey(
    () => {
      if (config.volumeValue > 0) {
        updateConfig({
          volumeValue: Math.max(config.volumeValue - 10, 0),
        });
      }
    },
    [KeyCode.Ctrl, KeyCode.Down],
    true,
  );

  return (
    currSong && (
      <>
        <AnimatePresence>
          {show && (
            <motion.div
              variants={BASE_COMPONENT}
              custom={{ w: MEDIA_BAR_HEIGHT }}
              initial='hidden'
              whileInView='visible'
              exit='hidden'
              layout
              className='relative -me-1 h-(--media-bar-height)'
            >
              <PlaybackModeButton
                size='small'
                className='p-0.75! absolute! top-0.5 inset-s-6.25'
              />

              <Tip
                placement='top'
                title={t('media.playQueue') + ' ' + openQueueKey}
              >
                <IconButton
                  aria-label={t('media.playQueue')}
                  size='small'
                  className='p-0.75! absolute! top-6.25 inset-s-0.5'
                >
                  <MaterialIcon name='queueMusic' onClick={openQueue} />
                </IconButton>
              </Tip>

              <Tip placement='top' title={t('media.moreOpt')}>
                <IconButton
                  size='small'
                  className='p-0.75! absolute! top-6.25 inset-e-0.5'
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                >
                  <MaterialIcon name='moreHoriz' />
                </IconButton>
              </Tip>

              <Tip
                placement='top'
                title={
                  currSong.favoriteCount ? (
                    <>
                      <div className='font-bold'>{t('media.favorite')}</div>
                      <div>{currSong.favoriteCount}</div>
                    </>
                  ) : (
                    t('media.favorite')
                  )
                }
              >
                <IconButton
                  size='small'
                  className='p-0.75! absolute! bottom-0.5 inset-s-6.25'
                  onClick={() => {
                    // todo
                  }}
                >
                  <MaterialIcon
                    name={currSong.favorite ? 'favorite' : 'favoriteBorder'}
                  />
                </IconButton>
              </Tip>

              {/* 更多选项菜单 */}
              <Menu
                anchorEl={menuAnchor}
                anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
                transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                open={!!menuAnchor}
                onClose={() => setMenuAnchor(null)}
                slotProps={{
                  paper: { style: { minWidth: '20rem', overflow: 'visible' } },
                }}
              >
                <MenuItem onClick={openInfo}>
                  <ListItemIcon>
                    <MaterialIcon name='info' />
                  </ListItemIcon>
                  <ListItemText>{t('media.info')}</ListItemText>
                  <Typography
                    variant='body2'
                    color='textSecondary'
                    className='ms-2!'
                  >
                    {deleteBrackets(openInfoKey)}
                  </Typography>
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    setMenuAnchor(null);
                    // todo
                  }}
                >
                  <ListItemIcon>
                    <MaterialIcon name='download' />
                  </ListItemIcon>
                  <ListItemText>{t('media.download')}</ListItemText>
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    setMenuAnchor(null);
                    // todo
                  }}
                >
                  <ListItemIcon>
                    <MaterialIcon name='share' />
                  </ListItemIcon>
                  <ListItemText>{t('media.share')}</ListItemText>
                </MenuItem>

                <MenuItem onClick={openDrawer}>
                  <ListItemIcon>
                    <MaterialIcon name='settings' />
                  </ListItemIcon>
                  <ListItemText>{t('media.settings')}</ListItemText>
                  <Typography
                    variant='body2'
                    color='textSecondary'
                    className='ms-2!'
                  >
                    {deleteBrackets(openDrawerKey)}
                  </Typography>
                </MenuItem>

                <Divider />

                {/* 音量 */}
                <ListItem className='pt-0! pb-0!'>
                  <ListItemIcon>
                    <MaterialIcon
                      name={
                        config.volumeValue > 50
                          ? 'volumeUp'
                          : config.volumeValue > 0
                            ? 'volumeDown'
                            : 'volumeMute'
                      }
                    />
                  </ListItemIcon>
                  <ListItemText>{t('media.volume')}</ListItemText>
                  <Typography
                    variant='body2'
                    color='textSecondary'
                    className='ms-2!'
                  >
                    {deleteBrackets(volumeUpKey) +
                      deleteBrackets(volumeDownKey).replace(/Ctrl\+|⌘/, '/')}
                  </Typography>
                </ListItem>
                <ListItem className='pt-0! pb-0!'>
                  <VolumeSlider />
                </ListItem>
              </Menu>

              <InfoDialog ref={dialogRef} />

              <PlayQueue
                open={queueOpen}
                onOpen={() => setQueueOpen(true)}
                onClose={() => setQueueOpen(false)}
                infoDialogRef={dialogRef}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  );
}

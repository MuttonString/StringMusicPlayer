import {
  Divider,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material';
import { emit } from '@tauri-apps/api/event';
import classNames from 'classnames';
import type { MouseEventHandler, RefObject } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Fragment } from 'react/jsx-runtime';
import defaultCover from '../../../assets/thumbnail.png';
import { useAudio } from '../../../providers/AudioProvider';
import type { Song } from '../../../types/audio';
import type { UpdateQueuePayload } from '../../../types/event';
import { BackendEvent } from '../../../types/event';
import { formatTime } from '../../../utils/data';
import MaterialIcon from '../../ui/MaterialIcon';
import SwipeableListItem from '../../ui/SwipeableListItem';
import Tip from '../../ui/Tip';

interface Props {
  row: Song;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onClick: MouseEventHandler;
  onDoubleClick: MouseEventHandler;
  infoDialogRef: RefObject<(src: string) => void>;
}

export default function PlayQueueItem(props: Props) {
  const {
    row,
    selected,
    onSelect,
    onDelete,
    onClick,
    onDoubleClick,
    infoDialogRef,
  } = props;
  const { playQueue, currIdx, paused } = useAudio();
  const { t } = useTranslation();
  const [hovering, setHovering] = useState(false);
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const currSrc = playQueue[currIdx].src;
  const willPlay = paused || currSrc !== row.src;

  const move = useCallback(
    (up: boolean) => {
      const queue = [...playQueue];
      const idx = queue.findIndex((item) => item.src === row.src);
      [queue[idx], queue[idx + (up ? -1 : 1)]] = [
        queue[idx + (up ? -1 : 1)],
        queue[idx],
      ];
      emit<UpdateQueuePayload>(BackendEvent.UpdateQueue, {
        newQueue: queue,
        newIndex:
          idx === currIdx
            ? idx + (up ? -1 : 1)
            : idx === currIdx + (up ? 1 : -1)
              ? idx
              : undefined,
      });
    },
    [currIdx, playQueue, row.src],
  );

  return (
    <SwipeableListItem
      onSelect={onSelect}
      onDelete={onDelete}
      onHoverStart={() => setHovering(true)}
      onHoverEnd={() => setHovering(false)}
    >
      <ListItemButton
        selected={selected}
        className='ms-2! me-2! ps-2! pe-2! w-[calc(100%-1rem)]'
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onClick(e);
          setAnchor(e.currentTarget);
        }}
      >
        <div className='flex gap-2 w-full'>
          {/* 封面 */}
          <Tip
            placement='top'
            disabled={!row.album}
            title={
              <div className='flex flex-col'>
                <div>{row.album?.label}</div>
                {row.album?.translation && (
                  <div className='opacity-70'>({row.album.translation})</div>
                )}
              </div>
            }
          >
            <img
              alt=''
              className='h-11 w-11 object-cover object-center rounded-lg'
              src={row.cover?.[1] || defaultCover}
              onError={(e) => {
                e.currentTarget.src = defaultCover;
              }}
            />
          </Tip>

          <div className='flex flex-col w-full max-w-[calc(100%-3.25rem)]'>
            <div className='w-full flex items-center justify-between'>
              {/* 标题 */}
              <Tip
                placement='top'
                title={
                  <div className='flex flex-col'>
                    <div>
                      <bdi dir='auto'>{row.title}</bdi>
                    </div>
                    {row.translation && (
                      <div className='opacity-70'>
                        <bdi dir='auto'>
                          (<bdi dir='auto'>{row.translation}</bdi>)
                        </bdi>
                      </div>
                    )}
                  </div>
                }
              >
                <div
                  className={classNames(
                    'w-fit flex gap-1',
                    selected || hovering
                      ? 'max-w-[calc(100%-2.5rem)]'
                      : 'max-w-full',
                  )}
                >
                  <bdi
                    dir='auto'
                    className={classNames(
                      'truncate',
                      row.src === currSrc && 'text-primary font-bold',
                    )}
                  >
                    {row.title}
                  </bdi>
                  {row.translation && (
                    <bdi dir='auto' className='truncate text-text-secondary'>
                      (<bdi dir='auto'>{row.translation}</bdi>)
                    </bdi>
                  )}
                </div>
              </Tip>

              {/* 移位按钮 */}
              {(selected || hovering) && (
                <div className='flex'>
                  <Tip
                    title={t('media.moveUp')}
                    placement='top'
                    disabled={playQueue[0].src === row.src}
                  >
                    <IconButton
                      size='small'
                      disabled={playQueue[0].src === row.src}
                      sx={{ padding: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        move(true);
                      }}
                    >
                      <MaterialIcon fontSize='small' name='arrowUpward' />
                    </IconButton>
                  </Tip>

                  <Tip
                    title={t('media.moveDown')}
                    placement='top'
                    disabled={playQueue[playQueue.length - 1].src === row.src}
                  >
                    <IconButton
                      size='small'
                      disabled={playQueue[playQueue.length - 1].src === row.src}
                      sx={{ padding: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        move(false);
                      }}
                    >
                      <MaterialIcon fontSize='small' name='arrowDownward' />
                    </IconButton>
                  </Tip>
                </div>
              )}
            </div>

            <div
              className={classNames(
                'flex justify-between text-sm',
                row.src === currSrc ? 'text-primary' : 'text-text-secondary',
              )}
            >
              {/* 艺术家 */}
              <div className='flex max-w-[calc(100%-2.5rem)]'>
                {!!row.artists?.length &&
                  row.artists.map((item, idx, arr) => (
                    <Fragment key={idx}>
                      <Tip
                        title={
                          <div className='flex flex-col'>
                            <div>
                              <bdi dir='auto'>{item.label}</bdi>
                            </div>
                            {item.translation && (
                              <div className='opacity-70'>
                                <bdi dir='auto'>
                                  (<bdi dir='auto'>{item.translation}</bdi>)
                                </bdi>
                              </div>
                            )}
                          </div>
                        }
                      >
                        <bdi dir='auto' className='truncate'>
                          {item.label}
                        </bdi>
                      </Tip>
                      {idx !== arr.length - 1 && <div className='me-1'>;</div>}
                    </Fragment>
                  ))}
              </div>

              {/* 时长 */}
              {row.duration !== undefined && (
                <div className='w-10 text-end'>{formatTime(row.duration)}</div>
              )}
            </div>
          </div>
        </div>
      </ListItemButton>

      <Menu open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)}>
        <MenuItem
          onClick={async (e) => {
            setAnchor(null);
            onDoubleClick(e);
          }}
        >
          <ListItemIcon>
            <MaterialIcon name={willPlay ? 'playArrow' : 'pause'} />
          </ListItemIcon>
          <ListItemText>
            {t(willPlay ? 'media.play' : 'media.pause')}
          </ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            setAnchor(null);
            move(true);
          }}
        >
          <ListItemIcon>
            <MaterialIcon name='arrowUpward' />
          </ListItemIcon>
          <ListItemText>{t('media.moveUp')}</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            setAnchor(null);
            move(false);
          }}
        >
          <ListItemIcon>
            <MaterialIcon name='arrowDownward' />
          </ListItemIcon>
          <ListItemText>{t('media.moveDown')}</ListItemText>
        </MenuItem>
        <Divider />

        <MenuItem
          onClick={() => {
            setAnchor(null);
            infoDialogRef.current(row.src);
          }}
        >
          <ListItemIcon>
            <MaterialIcon name='info' />
          </ListItemIcon>
          <ListItemText>{t('media.info')}</ListItemText>
        </MenuItem>
      </Menu>
    </SwipeableListItem>
  );
}

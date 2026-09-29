import {
  Button,
  Divider,
  LinearProgress,
  ListItemButton,
  SwipeableDrawer,
} from '@mui/material';
import type { ReactVirtualizer } from '@tanstack/react-virtual';
import { emit } from '@tauri-apps/api/event';
import classNames from 'classnames';
import type { RefObject } from 'react';
import {
  Fragment,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import defaultCover from '../../../assets/thumbnail.png';
import { DIALOG_LEVAING_MS } from '../../../constants/animation';
import { IS_APPLE } from '../../../constants/os';
import { useScrollKeyPressed } from '../../../hooks/useScrollKeyPressed';
import { useAudio } from '../../../providers/AudioProvider';
import { useConfig } from '../../../providers/ConfigProvider';
import type { DialogBaseProps } from '../../../types/component';
import { PlaybackMode } from '../../../types/config';
import type { UpdateQueuePayload } from '../../../types/event';
import { BackendEvent } from '../../../types/event';
import { KeyCode } from '../../../types/keyCode';
import { formatTime } from '../../../utils/data';
import delay from '../../../utils/delay';
import { getLangs } from '../../../utils/lang';
import InputWithClear from '../../ui/InputWithClear';
import MaterialIcon from '../../ui/MaterialIcon';
import SwipeableListItem from '../../ui/SwipeableListItem';
import Tip from '../../ui/Tip';
import VirtualizedList from '../../ui/VirtualizedList';

interface Props extends DialogBaseProps {
  onOpen: () => void;
}

export default function PlayQueue({ open, onClose, onOpen }: Props) {
  const { t } = useTranslation();
  const langs = useMemo(getLangs, [t]);
  const [config] = useConfig();
  const { playQueue, currIdx } = useAudio();
  const [search, setSearch] = useState('');
  const delayedSearch = useDeferredValue(search);
  const [selected, setSelected] = useState<string[]>([]);
  const currSrc = playQueue[currIdx]?.src;
  const listRef =
    useRef<
      [ReactVirtualizer<HTMLUListElement, Element>, RefObject<HTMLUListElement>]
    >(null);

  const loadedCnt = useMemo(
    () => playQueue.filter((item) => item.metadataLoaded).length,
    [playQueue],
  );

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setSearch('');
  }, [open]);

  useEffect(() => {
    if (open) return;

    setTimeout(() => {
      if (!listRef.current) return;
      listRef.current[0].scrollToIndex(currIdx, {
        align: 'start',
        behavior: 'instant',
      });
    }, config.animationDuration * DIALOG_LEVAING_MS);
  }, [config.animationDuration, currIdx, open]);

  const filtered = useMemo(() => {
    const str = delayedSearch.trim().toLocaleLowerCase(langs);
    if (!str) return playQueue;

    return playQueue.filter(
      (item) =>
        item.title.toLocaleLowerCase(langs).includes(str) ||
        item.translation?.toLocaleLowerCase(langs).includes(str) ||
        item.artists?.some(
          (artist) =>
            artist.label.toLocaleLowerCase(langs).includes(str) ||
            artist.translation?.toLocaleLowerCase(langs).includes(str),
        ),
    );
  }, [delayedSearch, langs, playQueue]);

  useEffect(() => {
    const srcSet = new Set(filtered.map((item) => item.src));
    setSelected((prev) => prev.filter((item) => srcSet.has(item)));
  }, [filtered]);

  const removeAll = useCallback(async () => {
    onClose();
    await delay(config.animationDuration * DIALOG_LEVAING_MS);
    await emit<UpdateQueuePayload>(BackendEvent.UpdateQueue, {
      newQueue: [],
      newIndex: -1,
    });
  }, [config.animationDuration, onClose]);

  const removeSelected = useCallback(async () => {
    const selectedSet = new Set(selected);
    const newQueue = playQueue.filter((item) => !selectedSet.has(item.src));
    const newIndex = newQueue.findIndex((item) => item.src === currSrc);
    await emit<UpdateQueuePayload>(BackendEvent.UpdateQueue, {
      newQueue,
      newIndex:
        newIndex === -1
          ? config.playbackMode === PlaybackMode.Shuffle
            ? Math.floor(Math.random() * newQueue.length)
            : 0
          : newIndex,
    });
    setSelected([]);
  }, [config.playbackMode, currSrc, playQueue, selected]);

  const onKeyDown = useScrollKeyPressed(
    listRef.current?.[1].current,
    listRef.current?.[0],
  );

  return (
    <SwipeableDrawer
      open={open}
      onOpen={onOpen}
      onClose={onClose}
      disableSwipeToOpen
      anchor='right'
      onKeyDown={(e) => {
        onKeyDown(e);
        if (
          !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) &&
          e.key === (IS_APPLE ? KeyCode.Backspace : KeyCode.Del)
        ) {
          removeSelected();
        } else if (
          (IS_APPLE ? e.metaKey : e.ctrlKey) &&
          e.key.toLowerCase() === 'a'
        ) {
          setSelected(playQueue.map((item) => item.src));
        }
      }}
    >
      <div className='w-85 h-full overflow-clip flex flex-col'>
        <div className='p-4 pb-1'>
          <InputWithClear
            fullWidth
            aria-label={t('media.search')}
            placeholder={t('media.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
          <div className='flex items-center justify-between mt-1'>
            <div className='text-text-secondary text-sm'>
              {selected.length
                ? t('media.selected', {
                    selected: selected.length,
                    count: filtered.length,
                  })
                : t('media.total', { count: filtered.length })}
            </div>
            <Button
              size='small'
              className='[&>.MuiButton-startIcon]:me-0.5!'
              startIcon={<MaterialIcon name='delete' />}
              onClick={() => {
                if (selected.length && selected.length !== playQueue.length) {
                  removeSelected();
                } else {
                  removeAll();
                }
              }}
            >
              {t(selected.length ? 'media.removeSelected' : 'media.removeAll')}
            </Button>
          </div>
        </div>

        {loadedCnt === playQueue.length ? (
          <Divider />
        ) : (
          <LinearProgress
            variant='determinate'
            value={loadedCnt}
            max={playQueue.length}
            className='h-0.5! -mb-px'
          />
        )}

        <VirtualizedList
          ref={listRef}
          className='flex-1'
          onClick={() => setSelected([])}
          items={filtered}
          rowHeight={52}
          getItemKey={(item) => item.src}
          rowRender={(row) => {
            return (
              <SwipeableListItem
                onSelect={() => {
                  const exists = selected.includes(row.src);
                  setSelected(
                    exists
                      ? selected.filter((item) => item !== row.src)
                      : [row.src, ...selected],
                  );
                }}
                onDelete={async () => {
                  if (playQueue.length === 1) {
                    removeAll();
                  } else {
                    const newQueue = playQueue.filter(
                      (item) => item.src !== row.src,
                    );
                    const newIndex = newQueue.findIndex(
                      (item) => item.src === currSrc,
                    );
                    await emit<UpdateQueuePayload>(BackendEvent.UpdateQueue, {
                      newQueue,
                      newIndex:
                        newIndex === -1
                          ? config.playbackMode === PlaybackMode.Shuffle
                            ? Math.floor(Math.random() * newQueue.length)
                            : 0
                          : newIndex,
                    });
                    setSelected(selected.filter((item) => item !== row.src));
                  }
                }}
              >
                <ListItemButton
                  selected={selected.includes(row.src)}
                  className='ms-2! me-2! ps-2! pe-2! w-[calc(100%-1rem)]'
                  onClick={(e) => {
                    // 多选
                    e.stopPropagation();
                    if (e.shiftKey) {
                      const start = Math.max(
                        0,
                        filtered.findIndex((item) => item.src === selected[0]),
                      );
                      const end = filtered.findIndex(
                        (item) => item.src === row.src,
                      );
                      if (end >= start) {
                        setSelected(
                          filtered
                            .slice(start, end + 1)
                            .map((item) => item.src),
                        );
                      } else {
                        setSelected(
                          filtered
                            .slice(end, start + 1)
                            .reverse()
                            .map((item) => item.src),
                        );
                      }
                    } else if (IS_APPLE ? e.metaKey : e.ctrlKey) {
                      const exists = selected.includes(row.src);
                      setSelected(
                        exists
                          ? selected.filter((item) => item !== row.src)
                          : [row.src, ...selected],
                      );
                    } else {
                      setSelected([row.src]);
                    }
                  }}
                  onDoubleClick={() => {
                    emit<UpdateQueuePayload>(BackendEvent.UpdateQueue, {
                      newIndex: playQueue.findIndex(
                        (item) => item.src === row.src,
                      ),
                    });
                    setSelected([]);
                  }}
                >
                  <div className='flex gap-2 w-full'>
                    {/* 封面 */}
                    <img
                      alt=''
                      className='h-11 w-11 object-cover object-center rounded-lg'
                      src={row.cover?.[1] || defaultCover}
                      onError={(e) => {
                        e.currentTarget.src = defaultCover;
                      }}
                    />

                    <div className='flex flex-col w-full max-w-[calc(100%-3.25rem)]'>
                      {/* 标题 */}
                      <Tip
                        placement='top'
                        title={
                          <div className='flex flex-col'>
                            <div>{row.title}</div>
                            {row.translation && (
                              <div className='opacity-70'>
                                ({row.translation})
                              </div>
                            )}
                          </div>
                        }
                      >
                        <div className='w-fit max-w-full'>
                          <div
                            className={classNames(
                              'truncate',
                              row.src === currSrc && 'text-primary font-bold',
                            )}
                          >
                            {row.title}
                          </div>
                          {row.translation && (
                            <div className='ms-2 truncate font-bold text-text-secondary'>
                              ({row.translation})
                            </div>
                          )}
                        </div>
                      </Tip>

                      <div
                        className={classNames(
                          'flex justify-between text-sm',
                          row.src === currSrc
                            ? 'text-primary'
                            : 'text-text-secondary',
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
                                      <div>{item.label}</div>
                                      {item.translation && (
                                        <div className='opacity-70'>
                                          ({item.translation})
                                        </div>
                                      )}
                                    </div>
                                  }
                                >
                                  <div className='truncate'>{item.label}</div>
                                </Tip>
                                {idx !== arr.length - 1 && (
                                  <div className='me-1'>;</div>
                                )}
                              </Fragment>
                            ))}
                        </div>

                        {/* 时长 */}
                        {row.duration !== undefined && (
                          <div className='w-10 text-end'>
                            {formatTime(Math.floor(row.duration))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ListItemButton>
              </SwipeableListItem>
            );
          }}
        />
      </div>
    </SwipeableDrawer>
  );
}

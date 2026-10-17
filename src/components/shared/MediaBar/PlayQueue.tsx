import {
  Divider,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  SwipeableDrawer,
} from '@mui/material';
import type { ReactVirtualizer } from '@tanstack/react-virtual';
import { emit } from '@tauri-apps/api/event';
import type { RefObject } from 'react';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../../app/i18n';
import { DIALOG_LEVAING_MS } from '../../../constants/animation';
import { IS_APPLE } from '../../../constants/os';
import { useScrollKeyPressed } from '../../../hooks/useScrollKeyPressed';
import { useAudio } from '../../../providers/AudioProvider';
import { useConfig } from '../../../providers/ConfigProvider';
import type { Song } from '../../../types/audio';
import type { DialogBaseProps } from '../../../types/component';
import { PlaybackMode } from '../../../types/config';
import type { UpdateQueuePayload } from '../../../types/event';
import { BackendEvent } from '../../../types/event';
import { KeyCode } from '../../../types/keyCode';
import delay from '../../../utils/delay';
import InputWithClear from '../../ui/InputWithClear';
import MaterialIcon from '../../ui/MaterialIcon';
import Tip from '../../ui/Tip';
import VirtualizedList from '../../ui/VirtualizedList';
import PlayQueueItem from './PlayQueueItem';

interface Props extends DialogBaseProps {
  onOpen: () => void;
  infoDialogRef: RefObject<(src: string) => void>;
}

export default function PlayQueue(props: Props) {
  const { open, onClose, onOpen, infoDialogRef } = props;
  const { t } = useTranslation();
  const langs = i18n.languages;
  const [config] = useConfig();
  const { playQueue, currIdx, paused } = useAudio();
  const [search, setSearch] = useState('');
  const delayedSearch = useDeferredValue(search);
  const [selected, setSelected] = useState<string[]>([]);
  const currSrc = playQueue[currIdx]?.src;
  const listRef =
    useRef<
      [ReactVirtualizer<HTMLUListElement, Element>, RefObject<HTMLUListElement>]
    >(null);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

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
        align: 'center',
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
    if (filtered.length === playQueue.length) {
      onClose();
      await delay(config.animationDuration * DIALOG_LEVAING_MS);
      await emit<UpdateQueuePayload>(BackendEvent.UpdateQueue, {
        newQueue: [],
        newIndex: -1,
      });
      return;
    }

    const filteredSet = new Set(filtered.map((item) => item.src));
    const newQueue = playQueue.filter((item) => !filteredSet.has(item.src));
    const newIndex = newQueue.findIndex((item) => item.src === currSrc);
    setSearch('');
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
  }, [
    config.animationDuration,
    config.playbackMode,
    currSrc,
    filtered,
    onClose,
    playQueue,
  ]);

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

  const sortQueue = useCallback(
    (compareFn?: (a: Song, b: Song) => number) => {
      setAnchor(null);
      const queue = [...playQueue].sort(
        (a, b) =>
          compareFn?.(a, b) ||
          a.title.localeCompare(b.title, i18n.languages) ||
          a.src.localeCompare(b.src),
      );
      emit<UpdateQueuePayload>(BackendEvent.UpdateQueue, {
        newQueue: queue,
        newIndex: queue.findIndex((item) => item.src === currSrc),
      });
    },
    [currSrc, playQueue],
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
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
          return;
        }
        if (e.key === (IS_APPLE ? KeyCode.Backspace : KeyCode.Del)) {
          removeSelected();
        } else if (
          (IS_APPLE ? e.metaKey : e.ctrlKey) &&
          e.key.toLowerCase() === 'a'
        ) {
          if (e.shiftKey) {
            const selectedSet = new Set(selected);
            setSelected(
              filtered
                .map((item) => item.src)
                .filter((item) => !selectedSet.has(item)),
            );
          } else {
            setSelected(filtered.map((item) => item.src));
          }
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

          <div className='flex items-center justify-between mt-1 -ms-1.5'>
            <div className='flex items-center'>
              <Tip
                title={
                  t('media.reverseSelect') +
                  ' ' +
                  (IS_APPLE ? '⌘⇧A' : '(Ctrl+Shift+A)')
                }
              >
                <IconButton
                  size='small'
                  onClick={() => {
                    const selectedSet = new Set(selected);
                    setSelected(
                      filtered
                        .map((item) => item.src)
                        .filter((item) => !selectedSet.has(item)),
                    );
                  }}
                >
                  <MaterialIcon fontSize='small' name='selectAll' />
                </IconButton>
              </Tip>

              <Tip title={t('media.reorder')}>
                <IconButton
                  size='small'
                  onClick={(e) => setAnchor(e.currentTarget)}
                >
                  <MaterialIcon fontSize='small' name='reorder' />
                </IconButton>
              </Tip>

              <Menu
                anchorEl={anchor}
                open={!!anchor}
                onClose={() => setAnchor(null)}
              >
                <MenuItem onClick={() => sortQueue()}>
                  {t('media.byTitle')}
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    sortQueue((a, b) =>
                      (
                        a.artists?.map((item) => item.label).join() || ''
                      ).localeCompare(
                        b.artists?.map((item) => item.label).join() || '',
                        i18n.languages,
                      ),
                    )
                  }
                >
                  {t('media.byArtist')}
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    sortQueue((a, b) =>
                      (a.album?.label || '').localeCompare(
                        b.album?.label || '',
                        i18n.languages,
                      ),
                    )
                  }
                >
                  {t('media.byAlbum')}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setAnchor(null);
                    const queue = [...playQueue].reverse();
                    emit<UpdateQueuePayload>(BackendEvent.UpdateQueue, {
                      newQueue: queue,
                      newIndex: queue.findIndex((item) => item.src === currSrc),
                    });
                  }}
                >
                  {t('media.reverseOrder')}
                </MenuItem>
              </Menu>

              <div className='bg-divider w-px h-5' />

              <Tip
                title={t('media.addToPlaylist')}
                disabled={selected.length === 0}
              >
                <IconButton
                  size='small'
                  disabled={selected.length === 0}
                  onClick={() => {}}
                >
                  <MaterialIcon fontSize='small' name='playlistAdd' />
                </IconButton>
              </Tip>

              <Tip title={t('media.download')} disabled={selected.length === 0}>
                <IconButton
                  size='small'
                  disabled={selected.length === 0}
                  onClick={() => {}}
                >
                  <MaterialIcon fontSize='small' name='download' />
                </IconButton>
              </Tip>

              <Tip
                title={t('media.remove') + (IS_APPLE ? ' ⌫' : ' (Del)')}
                disabled={selected.length === 0}
              >
                <IconButton
                  size='small'
                  disabled={selected.length === 0}
                  onClick={() => {
                    if (
                      selected.length &&
                      selected.length !== playQueue.length
                    ) {
                      removeSelected();
                    } else {
                      removeAll();
                    }
                  }}
                >
                  <MaterialIcon fontSize='small' name='delete' />
                </IconButton>
              </Tip>
            </div>

            <div>
              {selected.length
                ? t('media.selected', {
                    count: filtered.length,
                    selected: selected.length,
                  })
                : t('media.total', { count: filtered.length })}
            </div>
          </div>
        </div>

        {loadedCnt === playQueue.length ? (
          <Divider />
        ) : (
          <LinearProgress
            variant='determinate'
            value={loadedCnt}
            max={playQueue.length}
            className='h-px!'
          />
        )}

        <VirtualizedList
          ref={listRef}
          className='flex-1'
          onClick={() => setSelected([])}
          items={filtered}
          rowHeight={52}
          getItemKey={(item) => item.src}
          rowRender={(row) => (
            <PlayQueueItem
              row={row}
              infoDialogRef={infoDialogRef}
              selected={selected.includes(row.src)}
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
                      filtered.slice(start, end + 1).map((item) => item.src),
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
              onDoubleClick={async () => {
                setSelected([]);
                if (currSrc === row.src) {
                  if (paused) emit(BackendEvent.Play);
                  else emit(BackendEvent.Pause);
                } else {
                  await emit<UpdateQueuePayload>(BackendEvent.UpdateQueue, {
                    newIndex: playQueue.findIndex(
                      (item) => item.src === row.src,
                    ),
                  });
                  if (paused) emit(BackendEvent.Play);
                }
              }}
            />
          )}
        />
      </div>
    </SwipeableDrawer>
  );
}

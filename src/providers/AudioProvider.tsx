import { CircularProgress } from '@mui/material';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { emit, listen } from '@tauri-apps/api/event';
import { basename, join } from '@tauri-apps/api/path';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { exists, readDir, stat } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { type } from '@tauri-apps/plugin-os';
import {
  parseBlob,
  parseWebStream,
  selectCover,
  type IAudioMetadata,
} from 'music-metadata';
import type { ComponentProps, SyntheticEvent } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_AUDIO_EXT_LIST } from '../constants/file';
import {
  IS_DESKTOP,
  SUPPORT_MEDIA_SESSION,
  SUPPORT_SET_SINK_ID,
} from '../constants/os';
import {
  DEFAULT_WINDOW_ICON,
  MAIN_WINDOW,
  WINDOW_LABEL,
} from '../constants/window';
import type { Cover, WebAudio } from '../types/audio';
import {
  TaskbarButtons,
  type AudioProviderContext,
  type LyricSentence,
  type Song,
} from '../types/audio';
import type { ChildrenProp } from '../types/component';
import { PlaybackMode } from '../types/config';
import type { UpdateQueuePayload } from '../types/event';
import { BackendEvent } from '../types/event';
import { getAudioDuration, getBasename, imgSrcToBlob } from '../utils/data';
import { fetchAlt } from '../utils/fetch';
import { destroyAll, raise } from '../utils/window';
import { useConfig } from './ConfigProvider';
import { useSnackbar } from './SnackbarProvider';

const isWindows = type() === 'windows';

if (WINDOW_LABEL === 'main') {
  if (SUPPORT_MEDIA_SESSION) {
    navigator.mediaSession.setActionHandler('play', () =>
      emit(BackendEvent.Play),
    );
    navigator.mediaSession.setActionHandler('pause', () =>
      emit(BackendEvent.Pause),
    );
    navigator.mediaSession.setActionHandler('seekbackward', (e) =>
      emit(BackendEvent.SeekBackward, e.seekOffset),
    );
    navigator.mediaSession.setActionHandler('seekforward', (e) =>
      emit(BackendEvent.SeekForward, e.seekOffset),
    );
  } else {
    console.warn('Do not support mediaSession.');
    invoke('detach_media_control')
      .catch(() => {})
      .finally(() => {
        console.info('Initialize media control.');
        invoke('init_media_control');
      });
  }
}

const removeExt = (name: string) => {
  const splited = name.split('.');
  if (splited.length === 1) return name;
  splited.pop();
  return splited.join('.');
};

const initVal: AudioProviderContext = {
  setLyric() {},
  currIdx: -1,
  prevIdx: -1,
  nextIdx: -1,
  playQueue: [],
  paused: true,
  pending: false,
  currentTime: 0,
  lyric: [],
  currBlobUrl: '',
};

const Context = createContext(initVal);

export const useAudio = () => useContext(Context);

export function AudioProvider({ children }: ChildrenProp) {
  const [config, updateConfig] = useConfig();
  const showSnackbar = useSnackbar();
  const { t } = useTranslation();
  const randomIdxListRef = useRef<number[]>([]);
  const errSetRef = useRef(new Set<string>());
  const objectUrlSetRef = useRef(new Set<string>());

  const [currIdx, setCurrIdx] = useState(-1);
  const [prevIdx, setPrevIdx] = useState(-1);
  const [nextIdx, setNextIdx] = useState(-1);
  const [playQueue, setPlayQueue] = useState<Song[]>([]);
  const [paused, setPaused] = useState(true);
  const [pending, setPending] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [lyric, setLyric] = useState<LyricSentence[]>([]);
  const [currBlobUrl, setCurrBlobUrl] = useState('');
  const [opening, setOpening] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fakeAudioRef = useRef<HTMLAudioElement>(null);
  const ctxRef = useRef<WebAudio>(null);

  // 初始化Context
  useEffect(() => {
    if (!audioRef.current || ctxRef.current) return;
    // @ts-ignore
    // eslint-disable-next-line compat/compat
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const source = context.createMediaElementSource(audioRef.current);
    const fakeSource = context.createMediaElementSource(fakeAudioRef.current!);
    const gain = context.createGain();
    source.connect(gain);
    fakeSource.connect(gain);
    gain.connect(context.destination);
    ctxRef.current = { context, gain };
  }, []);

  // 设置音频输出设备
  useEffect(() => {
    if (!SUPPORT_SET_SINK_ID || !ctxRef.current) return;
    ctxRef.current.context
      .setSinkId(config.outputDevice)
      .catch((err) => console.error('Failed to set audio device: ' + err));
  }, [config.outputDevice]);

  // 设置音量
  useEffect(() => {
    if (!audioRef.current) return;
    const volume = config.volume[0] / 100;
    if (volume > 1) {
      audioRef.current.volume = 1;
      fakeAudioRef.current!.volume = 1;
      ctxRef.current!.gain.gain.value = volume;
    } else {
      audioRef.current.volume = volume;
      fakeAudioRef.current!.volume = volume;
      ctxRef.current!.gain.gain.value = 1;
    }
  }, [config.volume]);

  // 设置速度
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = config.speed[0];
    audioRef.current.preservesPitch = config.speed[1];
    fakeAudioRef.current!.playbackRate = config.speed[0];
    fakeAudioRef.current!.preservesPitch = config.speed[1];
  }, [config.speed]);

  // 不依赖其他状态的状态更改
  useEffect(() => {
    const unlisten: Promise<UnlistenFn>[] = [];

    unlisten.push(
      listen<boolean>(BackendEvent.IsLoading, (e) => setPending(e.payload)),
    );

    unlisten.push(
      listen(BackendEvent.Pause, () => {
        setPaused(true);
        if (audioRef.current) {
          console.info('Pause audio.');
          audioRef.current.pause();
          fakeAudioRef.current!.pause();
          if (SUPPORT_MEDIA_SESSION) {
            navigator.mediaSession.playbackState = 'paused';
          }
        }
      }),
    );

    unlisten.push(
      listen(BackendEvent.Toggle, () =>
        setPaused((prev) => {
          emit(prev ? BackendEvent.Play : BackendEvent.Pause);
          return !prev;
        }),
      ),
    );

    unlisten.push(
      listen<number>(BackendEvent.TimeUpdate, (e) => setCurrentTime(e.payload)),
    );

    unlisten.push(
      listen(BackendEvent.Stop, () => {
        setPaused(true);
        setCurrentTime(0);
        if (audioRef.current) {
          console.info('Stop audio.');
          audioRef.current.pause();
          fakeAudioRef.current!.pause();
          audioRef.current.currentTime = 0;
          fakeAudioRef.current!.currentTime = 0;
        }
      }),
    );

    unlisten.push(
      listen<number>(BackendEvent.SetPosition, (e) => {
        setCurrentTime(Math.floor(e.payload));
        if (audioRef.current) {
          console.info(`Set audio position to ${e.payload}s.`);
          audioRef.current.currentTime = e.payload;
        }
      }),
    );

    unlisten.push(listen(BackendEvent.Raise, () => raise()));

    unlisten.push(listen(BackendEvent.Quit, () => destroyAll()));

    invoke<string[]>('opened_urls').then((val) => {
      if (val.length === 0) return;
      emit<string[]>(BackendEvent.OpenUri, val);
    });

    unlisten.push(
      getCurrentWebviewWindow().onDragDropEvent((e) => {
        if (e.payload.type === 'drop') {
          emit(BackendEvent.OpenUri, e.payload.paths);
        }
      }),
    );

    return () => unlisten.forEach((item) => item.then((fn) => fn()));
  }, []);

  const currSong = playQueue[currIdx] as Song | undefined;

  // 更新播放队列
  useEffect(() => {
    const unlisten = listen<UpdateQueuePayload>(
      BackendEvent.UpdateQueue,
      (e) => {
        const { newQueue, newIndex } = e.payload;
        console.info(
          `Update play queue, length: ${newQueue?.length}, index: ${newIndex}`,
        );

        if (newQueue) {
          setPlayQueue((prev) => {
            const prevObj = Object.fromEntries(
              prev.map((item) => [item.src, item]),
            );
            const newVal = newQueue.map((item) => ({
              ...prevObj[item.src],
              ...item,
              metadataLoaded:
                prevObj[item.src].metadataLoaded || item.metadataLoaded,
            }));

            // 清理不再使用的blob
            const currSet = new Set(prev.flatMap((item) => item.cover));
            objectUrlSetRef.current.forEach((item) => {
              if (currSet.has(item)) return;
              URL.revokeObjectURL(item);
              objectUrlSetRef.current.delete(item);
            });
            return newVal;
          });
        }

        if (newIndex !== undefined) {
          setCurrIdx(newIndex);
          if (currSong?.src === newQueue?.[newIndex].src) return;

          setCurrentTime(0);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
        }
      },
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [currSong?.src]);

  // 播放
  useEffect(() => {
    const unlisten = listen(BackendEvent.Play, async () => {
      if (audioRef.current && !pending) {
        console.info('Play audio.');
        setPaused(false);
        if (SUPPORT_MEDIA_SESSION) {
          navigator.mediaSession.playbackState = 'playing';
        }
        try {
          const ctx = ctxRef.current?.context;
          if (ctx?.state === 'suspended') {
            await ctx.resume();
          }
          await audioRef.current.play();
        } catch (err) {
          console.error('Failed to play audio: ' + err);
          showSnackbar(t('msg.playAudioFailed') + '\n' + err, 'error');
          emit(BackendEvent.Pause);
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [pending, showSnackbar, t]);

  // 生成随机数列表
  useEffect(() => {
    const len = playQueue.length;
    const array: number[] = [];

    if (len) {
      setCurrIdx((prev) => (prev >= len ? len - 1 : prev));
    } else {
      setCurrIdx(-1);
    }

    for (let i = 0; i < 2; i++) {
      const arr = Array.from({ length: len }, (_, i) => i);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      array.push(...arr);
    }

    if (len > 1) {
      if (array[len - 1] === array[len]) {
        [array[len], array[len + 1]] = [array[len + 1], array[len]];
      }
      if (array[0] === array[array.length - 1]) {
        [array[0], array[1]] = [array[1], array[0]];
      }
    }
    randomIdxListRef.current = array;
  }, [playQueue.length]);

  const shuffle = config.playbackMode === PlaybackMode.Shuffle;

  // 设置上一首、下一首的索引
  useEffect(() => {
    if (currIdx < 0) {
      setPrevIdx(-1);
      setNextIdx(-1);
      setPaused(true);
      audioRef.current?.pause();
      fakeAudioRef.current?.pause();
      return;
    }

    const randIdxMap = randomIdxListRef.current;

    if (shuffle) {
      const len = randIdxMap.length;
      const idxInRand = randIdxMap.indexOf(currIdx);
      setPrevIdx(randIdxMap[(idxInRand + len - 1) % len]);
      setNextIdx(randIdxMap[(idxInRand + 1) % len]);
    } else {
      const len = playQueue.length;
      setPrevIdx((currIdx - 1 + len) % len);
      setNextIdx((currIdx + 1) % len);
    }
  }, [currIdx, playQueue.length, shuffle]);

  const canChangeTrack = playQueue.length > 1;

  // 切换当前歌曲
  useEffect(() => {
    const unlisten: Promise<UnlistenFn>[] = [];

    unlisten.push(
      listen(BackendEvent.Next, () => {
        setCurrentTime(0);
        if (audioRef.current) {
          console.info('Next song.');
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        if (canChangeTrack) {
          setCurrIdx(nextIdx);
        }
      }),
    );

    unlisten.push(
      listen(BackendEvent.Previous, () => {
        setCurrentTime(0);
        if (audioRef.current) {
          console.info('Previous song.');
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        if (canChangeTrack) {
          setCurrIdx(prevIdx);
        }
      }),
    );

    return () => unlisten.forEach((item) => item.then((fn) => fn()));
  }, [canChangeTrack, nextIdx, prevIdx]);

  // 快进快退
  useEffect(() => {
    const unlisten: Promise<UnlistenFn>[] = [];

    unlisten.push(
      listen<number | undefined>(BackendEvent.SeekBackward, (e) => {
        const audio = audioRef.current;
        if (!audio) return;
        const duration =
          e.payload ??
          (!config.seekBySentence || lyric.length <= 1 ? 10 : undefined);
        let position: number;

        if (duration === undefined) {
          console.info(`Seek backward ${duration}s.`);
          position =
            lyric[
              lyric.findIndex((item) => item.start <= audio.currentTime) + 1
            ].start - config.replayDelay;
        } else {
          console.info('Seek backward one sentence.');
          position = audio.currentTime - duration;
        }

        emit(BackendEvent.SetPosition, Math.max(0, position));
      }),
    );

    unlisten.push(
      listen<number | undefined>(BackendEvent.SeekForward, (e) => {
        const audio = audioRef.current;
        if (!audio) return;
        const duration =
          e.payload ??
          (!config.seekBySentence || lyric.length <= 1 ? 10 : undefined);
        let position: number;

        if (duration === undefined) {
          console.info(`Seek forward ${duration}s.`);
          position =
            (lyric.find((item) => item.start > audio.currentTime)?.start ||
              Infinity) - config.replayDelay;
        } else {
          console.info('Seek forward one sentence.');
          position = audio.currentTime + duration;
        }

        emit(BackendEvent.SetPosition, Math.min(audio.duration, position));
      }),
    );
  }, [config.replayDelay, config.seekBySentence, lyric]);

  // 监听来自外部的音量改变
  const canOver100 = config.volume[1];
  useEffect(() => {
    const unlisten = listen<number>(BackendEvent.SetVolume, (e) => {
      if (!audioRef.current) return;
      const volume = e.payload;
      console.info(`Set volume to ${volume}.`);
      updateConfig({ volume: [volume * 100, canOver100] });
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [canOver100, updateConfig]);

  const updatePlayQueue = useCallback(
    async (
      data: (
        [string, IAudioMetadata | null] | [string, IAudioMetadata, Cover]
      )[],
    ) => {
      // 获取封面并生成缩略图
      for (const obj of data) {
        const pic = selectCover(obj[1]?.common.picture);
        if (!pic) continue;

        const original = URL.createObjectURL(
          new Blob([pic.data as BufferSource], {
            type: pic.format,
          }),
        );
        objectUrlSetRef.current.add(original);
        const thumbnail = URL.createObjectURL(await imgSrcToBlob(original, 88));
        (obj as [string, IAudioMetadata, Cover]).push([original, thumbnail]);
      }

      // 将元数据更新到播放队列
      setPlayQueue((oldVal) => {
        let cnt = 0;
        const newVal = [...oldVal];
        const noDurationSrc: string[] = [];
        const oldValObj = Object.fromEntries(
          oldVal.map((item, idx) => [item.src, idx]),
        );

        data.forEach(([src, meta, cover]) => {
          const idx = oldValObj[src] as number | undefined;
          if (idx === undefined || oldVal[idx].metadataLoaded) return;
          cnt++;

          const newObj = { ...newVal[idx], metadataLoaded: true };
          newVal[idx] = newObj;
          if (!meta) return;

          if (meta.common.title) {
            newObj.title = meta.common.title;
          }
          newObj.artists = meta.common.artists?.map((artist) => ({
            label: artist,
          }));
          if (meta.common.album) {
            newObj.album = { label: meta.common.album };
          }
          if (newObj.duration === undefined) {
            newObj.duration = meta.format.duration;
            if (newObj.duration === undefined) {
              noDurationSrc.push(src);
            }
          }
          newObj.cover = cover;
          newVal[idx] = newObj;
        });

        // 针对未获取到时长的歌曲，用audio API再次获取
        if (noDurationSrc.length) {
          setTimeout(async () => {
            const durations: number[] = [];
            for (const src of noDurationSrc) {
              try {
                durations.push(await getAudioDuration(src));
              } catch (err) {
                console.error(`Failed to get duration of "${src}": ${err}`);
                durations.push(0);
              }
            }

            setPlayQueue((oldVal) => {
              let cnt = 0;
              const newVal = [...oldVal];
              const oldValObj = Object.fromEntries(
                oldVal.map((item, idx) => [item.src, idx]),
              );

              noDurationSrc.forEach((src, i) => {
                const idx = oldValObj[src] as number | undefined;
                if (idx === undefined) return;
                cnt++;
                newVal[idx] = { ...newVal[idx], duration: durations[i] };
              });

              if (cnt) {
                return newVal;
              }
              return oldVal;
            });
          });
        }

        if (cnt) {
          console.info(`Metadata of ${cnt} song(s) has been loaded.`);
          return newVal;
        }
        return oldVal;
      });
    },
    [],
  );

  // 递归读取文件
  const parseUris = useCallback(async (uris: string[]) => {
    const songs: { title: string; src: string; metadataLoaded: false }[] = [];
    for (const uri of uris) {
      try {
        // 打开链接
        if (uri.includes('://')) {
          songs.push({
            title: removeExt(getBasename(uri)),
            src: uri,
            metadataLoaded: false,
          });
        } else if (await exists(uri)) {
          // 打开文件夹
          if ((await stat(uri)).isDirectory) {
            const paths: string[] = [];
            for (const entry of await readDir(uri)) {
              paths.push(await join(uri, entry.name));
            }
            songs.push(...(await parseUris(paths)));
          } else {
            // 打开文件
            if (
              SUPPORTED_AUDIO_EXT_LIST.includes(
                uri.split('.').pop()!.toLowerCase(),
              )
            ) {
              songs.push({
                title: removeExt(await basename(uri)),
                src: convertFileSrc(uri),
                metadataLoaded: false,
              });
            }
          }
        } else {
          console.warn(`Path ${uri} does not exist.`);
        }
      } catch (err) {
        console.error(`Failed to open URI "${uri}": ${err}`);
      }
    }
    return songs;
  }, []);

  const getMetadata = useCallback(
    (srcs: string[]) => {
      // 在子线程获取本地歌曲元数据
      const localSrcs = srcs.filter((item) =>
        /^https?:\/\/asset\.localhost/i.test(item),
      );

      const worker = new Worker(
        new URL('../handlers/readMetadata', import.meta.url),
        { type: 'module' },
      );
      worker.postMessage(localSrcs);
      worker.onmessage = (
        e: MessageEvent<[string, IAudioMetadata | null][]>,
      ) => {
        updatePlayQueue(e.data);
      };

      // 从在线歌曲url获取元数据
      setTimeout(async () => {
        const onlineSrcs = srcs.filter(
          (item) => !/^https?:\/\/asset\.localhost/i.test(item),
        );
        let part: [string, IAudioMetadata | null][] = [];
        for (const src of onlineSrcs) {
          try {
            const resp = await tauriFetch(src);
            const meta = await parseWebStream(resp.body);
            part.push([src, meta]);
          } catch (err) {
            console.error(`Failed to get metadata of "${src}": ${err}`);
            part.push([src, null]);
          }
          if (part.length === 3) {
            updatePlayQueue(part);
            part = [];
          }
        }
        if (part.length) {
          updatePlayQueue(part);
        }
      });
    },
    [updatePlayQueue],
  );

  // 处理插入歌曲
  useEffect(() => {
    const unlisten = listen<string[]>(BackendEvent.OpenUri, async (e) => {
      console.info('Open URIs: ' + JSON.stringify(e.payload));
      const timer = setTimeout(() => setOpening(true), 1000);
      const songs = await parseUris(e.payload);

      // 更新播放队列
      setPlayQueue((prev) => {
        const paths = new Set(prev.map((item) => item.src));
        const filteredSongs = songs.filter((item) => !paths.has(item.src));

        if (filteredSongs.length === 0) {
          if (songs.length === 0) return prev;
          const first = songs[0].src;
          setCurrIdx(prev.findIndex((item) => item.src === first));
          setCurrentTime(0);
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
          }
          return prev;
        }

        const newArr = [...prev];
        newArr.splice(currIdx + 1, 0, ...filteredSongs);

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }

        setCurrentTime(0);
        setCurrIdx(
          shuffle
            ? Math.floor(Math.random() * filteredSongs.length + currIdx + 1)
            : currIdx + 1,
        );
        setPaused(false);

        setTimeout(() => getMetadata(filteredSongs.map((item) => item.src)));
        return newArr;
      });
      clearTimeout(timer);
      setOpening(false);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [currIdx, getMetadata, parseUris, shuffle, updatePlayQueue]);

  const hasCurrSong = !!currSong;
  const prevSong = playQueue[prevIdx] as Song | undefined;
  const nextSong = playQueue[nextIdx] as Song | undefined;

  // 初始化Windows任务栏缩略图控件
  useEffect(() => {
    if (!isWindows || WINDOW_LABEL !== 'main') return;

    const updateThumbnailBtns = () => {
      invoke('update_buttons', {
        updates: [
          {
            id: TaskbarButtons.Prev,
            enabled: canChangeTrack,
            tooltip: t('media.prev') + (prevSong ? `\n${prevSong.title}` : ''),
          },
          {
            id: TaskbarButtons.Toggle,
            enabled: !pending && hasCurrSong,
            paused,
            tooltip: t(paused ? 'media.play' : 'media.pause'),
          },
          {
            id: TaskbarButtons.Next,
            enabled: canChangeTrack,
            tooltip: t('media.next') + (nextSong ? `\n${nextSong.title}` : ''),
          },
        ],
      });
    };
    updateThumbnailBtns();

    const unlisten = listen(BackendEvent.ShowMainWindow, async () => {
      console.info('Initialize thumbnail buttons.');
      await invoke('init_thumbnail_buttons');
      updateThumbnailBtns();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [canChangeTrack, hasCurrSong, nextSong, paused, pending, prevSong, t]);

  // 将元数据显示到系统控件
  useEffect(() => {
    if (WINDOW_LABEL !== 'main') return;

    if (SUPPORT_MEDIA_SESSION) {
      console.info('Update mediaSession.');
      navigator.mediaSession.metadata = currSong
        ? new MediaMetadata({
            title: currSong.title,
            artist: currSong.artists?.map((item) => item.label).join('; '),
            album: currSong.album?.label,
            artwork: currSong.cover ? [{ src: currSong.cover[0] }] : undefined,
          })
        : null;
    } else if (currSong) {
      console.info('Attach media control.');
      invoke('set_metadata', {
        metadata: {
          title: currSong.title,
          artist: currSong.artists?.map((item) => item.label).join('; ') || '',
          album: currSong.album?.label || '',
          cover: currSong.cover || '',
          duration: currSong.duration || 0,
        },
      }).then(() => invoke('attach_media_control'));
    } else {
      console.info('Detach media control.');
      invoke('detach_media_control');
    }

    if (!currSong) setPaused(true);
  }, [currSong]);

  // 同步react状态与系统控件
  useEffect(() => {
    if (WINDOW_LABEL !== 'main') return;

    if (SUPPORT_MEDIA_SESSION) {
      navigator.mediaSession.setActionHandler(
        'previoustrack',
        canChangeTrack ? () => emit(BackendEvent.Previous) : null,
      );
      navigator.mediaSession.setActionHandler(
        'nexttrack',
        canChangeTrack ? () => emit(BackendEvent.Next) : null,
      );
    }
    if (isWindows) {
      invoke('update_buttons', {
        updates: [
          { id: TaskbarButtons.Prev, enabled: canChangeTrack },
          { id: TaskbarButtons.Next, enabled: canChangeTrack },
        ],
      });
    }
  }, [canChangeTrack]);

  useEffect(() => {
    if (WINDOW_LABEL !== 'main' || SUPPORT_MEDIA_SESSION) return;
    invoke('set_playback', { paused, position: currentTime });
  }, [currentTime, paused]);

  useEffect(() => {
    if (!isWindows || WINDOW_LABEL !== 'main') return;
    invoke('update_buttons', {
      updates: [
        { id: TaskbarButtons.Prev, tooltip: t('media.prev') },
        { id: TaskbarButtons.Next, tooltip: t('media.next') },
      ],
    });
  }, [t]);

  useEffect(() => {
    if (!isWindows || WINDOW_LABEL !== 'main') return;
    invoke('update_buttons', {
      updates: [
        {
          id: TaskbarButtons.Toggle,
          tooltip: paused ? t('media.play') : t('media.pause'),
          enabled: playQueue.length > 0,
          paused,
        },
      ],
    });
  }, [paused, playQueue.length, t]);

  // 更改窗口标题
  useEffect(() => {
    if (!IS_DESKTOP) return;
    if (config.useMusicTitleAsWindowTitle && currSong?.title) {
      MAIN_WINDOW.setTitle(`${currSong.title} - ${t('common.stringMusic')}`);
    } else {
      MAIN_WINDOW.setTitle(t('common.stringMusic'));
    }
  }, [config.useMusicTitleAsWindowTitle, currSong?.title, t]);

  // 更改窗口图标
  useEffect(() => {
    if (!IS_DESKTOP) return;
    if (config.useCoverAsIcon && currSong?.cover) {
      imgSrcToBlob(currSong.cover[0], isWindows ? 64 : 256)
        .then(async (val) => {
          MAIN_WINDOW.setIcon(await val.arrayBuffer());
        })
        .catch((err) => {
          console.error('Failed to set cover as icon: ' + err);
          MAIN_WINDOW.setIcon(DEFAULT_WINDOW_ICON);
        });
    } else {
      MAIN_WINDOW.setIcon(DEFAULT_WINDOW_ICON);
    }
  }, [config.useCoverAsIcon, currSong?.cover]);

  const handleLoadError = useCallback(
    (err: unknown, src: string) => {
      showSnackbar(t('msg.loadAudioFailed') + '\n' + err, 'error');

      setTimeout(() => {
        if (canChangeTrack && !errSetRef.current.has(src)) {
          emit(BackendEvent.Next);
          errSetRef.current.add(src);
        } else {
          emit(BackendEvent.Stop);
        }
      }, 1000);
    },
    [canChangeTrack, showSnackbar, t],
  );
  const handleLoadErrorRef = useRef(handleLoadError);
  useEffect(() => {
    handleLoadErrorRef.current = handleLoadError;
  }, [handleLoadError]);

  // 设置当前歌曲，使用双audio元素避免src变化时系统媒体控件短暂消失
  useEffect(() => {
    setCurrBlobUrl('');
    if (audioRef.current) {
      if (currSong?.src) {
        emit(BackendEvent.IsLoading, true);
        console.info(`Start loading audio "${getBasename(currSong.src)}".`);
      } else {
        audioRef.current.removeAttribute('src');
        fakeAudioRef.current!.removeAttribute('src');
      }

      audioRef.current.pause();
      fakeAudioRef.current!.pause();
      [audioRef.current, fakeAudioRef.current] = [
        fakeAudioRef.current,
        audioRef.current,
      ];
    }

    if (!currSong?.src) return;
    const fetchSong = async () => {
      try {
        const resp = await fetchAlt(currSong.src);
        const blob = await resp.blob();
        const meta = await parseBlob(blob);
        updatePlayQueue([[currSong.src, meta]]);

        // 判断获取到blob后src是否发生了变化，不变更state
        setPlayQueue((queue) => {
          setCurrIdx((idx) => {
            if (queue[idx]?.src !== currSong.src) return idx;

            const url = URL.createObjectURL(blob);
            setCurrBlobUrl(url);
            const prevSrc = audioRef.current!.getAttribute('src');
            audioRef.current!.src = url;
            audioRef.current!.dataset.src = currSong.src;
            if (prevSrc) URL.revokeObjectURL(prevSrc);

            return idx;
          });
          return queue;
        });
      } catch (err) {
        console.error(`Failed to fetch song from "${currSong.src}": ${err}`);
        setPlayQueue((queue) => {
          setCurrIdx((idx) => {
            if (queue[idx]?.src !== currSong.src) return idx;
            handleLoadErrorRef.current(err, currSong.src);
            emit(BackendEvent.IsLoading, false);
            return idx;
          });
          return queue;
        });
      }
    };
    fetchSong();
  }, [currSong?.src, updatePlayQueue]);

  const onTimeUpdate = (e: SyntheticEvent<HTMLAudioElement, Event>) => {
    const int = Math.floor(e.currentTarget.currentTime);
    if (Math.floor(currentTime) !== int) {
      emit(BackendEvent.TimeUpdate, e.currentTarget.currentTime);
    }
  };

  const audioProps = useMemo<ComponentProps<'audio'> | undefined>(
    () =>
      WINDOW_LABEL === 'main'
        ? {
            preload: 'auto',
            onLoadStart: (e) => {
              // 避免暂停状态切换多首歌曲造成系统媒体控件消失
              e.currentTarget.muted = true;
              e.currentTarget.play();
            },
            onCanPlay: async (e) => {
              emit(BackendEvent.IsLoading, false);
              const audio = e.currentTarget;
              const src = audio.dataset.src;
              // src变化时速度会被重置，故在此设置速度
              audio.playbackRate = config.speed[0];
              audio.preservesPitch = config.speed[1];
              if (!src || src !== currSong?.src) return;
              console.info(`Audio "${getBasename(src)}" can be played.`);
              if (paused) {
                audio.pause();
                return;
              }
              if (ctxRef.current?.context.state === 'suspended') {
                await ctxRef.current.context.resume();
              }
              audio.muted = false;
              audio.play();
            },
            onError: (e) => {
              e.currentTarget.pause();
              const error = e.currentTarget.error;
              const src = e.currentTarget.dataset.src;
              emit(BackendEvent.IsLoading, false);
              if (!error || !src) return;

              const errStr = `${error.message || 'Unknown error'} (Code: ${error.code})`;
              console.error(
                `Failed to load audio "${
                  e.currentTarget.currentSrc
                }": ${errStr}`,
              );
              handleLoadErrorRef.current(errStr, src);
            },
            onEnded: async (e) => {
              switch (config.playbackMode) {
                case PlaybackMode.NoRepeat:
                  emit(BackendEvent.Stop);
                  break;
                case PlaybackMode.RepeatOne:
                  if (ctxRef.current?.context.state === 'suspended') {
                    await ctxRef.current.context.resume();
                  }
                  e.currentTarget.play();
                  emit(BackendEvent.SetPosition, { position: 0 });
                  break;
                default:
                  if (ctxRef.current?.context.state === 'suspended') {
                    await ctxRef.current.context.resume();
                  }
                  emit(BackendEvent.Next);
                  break;
              }
            },
            onLoadedMetadata: (e) => {
              const target = e.currentTarget;
              if (target.playbackRate < 0 && target.duration < Infinity) {
                target.currentTime = target.duration;
              }

              setPlayQueue((oldVal) => {
                const idx = oldVal.findIndex(
                  (val) => val.src === target.dataset.src,
                );
                if (idx === -1 || oldVal[idx].duration !== undefined) {
                  return oldVal;
                }

                const newVal = [...oldVal];
                newVal[idx] = { ...newVal[idx], duration: target.duration };
                return newVal;
              });
            },
          }
        : undefined,
    [config.playbackMode, config.speed, currSong?.src, paused],
  );

  return (
    <Context.Provider
      value={{
        ...initVal,
        currIdx,
        prevIdx,
        nextIdx,
        playQueue,
        paused,
        pending,
        currentTime,
        lyric,
        currBlobUrl,
        setLyric,
      }}
    >
      {children}
      {WINDOW_LABEL === 'main' && (
        <>
          <audio ref={audioRef} onTimeUpdate={onTimeUpdate} {...audioProps} />
          <audio
            ref={fakeAudioRef}
            onTimeUpdate={onTimeUpdate}
            {...audioProps}
          />
        </>
      )}
      {opening && (
        <div className='fixed flex items-center gap-2 inset-e-2 bottom-2 z-10000 pointer-events-none'>
          <CircularProgress size={24} />
          <div className='text-shadow-lg text-shadow-background-paper'>
            {t('media.loading')}
          </div>
        </div>
      )}
    </Context.Provider>
  );
}

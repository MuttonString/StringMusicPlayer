import replaygain from '@audio/loudness-replaygain';
import { CircularProgress } from '@mui/material';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { emit, listen } from '@tauri-apps/api/event';
import { basename, join } from '@tauri-apps/api/path';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { exists, readDir, stat } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { type } from '@tauri-apps/plugin-os';
import type { IAudioMetadata } from 'music-metadata';
import { parseBuffer, parseWebStream, selectCover } from 'music-metadata';
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
import * as Tone from 'tone';
import defaultCover from '../assets/cover.png';
import { EQUALIZER } from '../constants/equalizer';
import { SUPPORTED_AUDIO_EXT_LIST } from '../constants/file';
import { IS_APPLE, IS_DESKTOP, SUPPORT_SET_SINK_ID } from '../constants/os';
import {
  DEFAULT_WINDOW_ICON,
  MAIN_WINDOW,
  WINDOW_LABEL,
} from '../constants/window';
import type { ToneInstances } from '../types/audio';
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
import {
  generateRandomList,
  getAudioDuration,
  getBasename,
  imgSrcToBlob,
  removeExt,
  srcToPath,
} from '../utils/data';
import { fetchAlt } from '../utils/fetch';
import { destroyAll, raise } from '../utils/window';
import { useConfig } from './ConfigProvider';
import { useSnackbar } from './SnackbarProvider';

const isWindows = type() === 'windows';

const initVal: AudioProviderContext = {
  setLyric() {},
  currIdx: -1,
  prevIdx: -1,
  nextIdx: -1,
  playQueue: [],
  paused: true,
  pending: false,
  lyric: [],
};

const Context = createContext(initVal);
const AudioTimeContext = createContext(0);

export const useAudio = () => useContext(Context);
export const useAudioTime = () => useContext(AudioTimeContext);

export function AudioProvider({ children }: ChildrenProp) {
  const [config, updateConfig] = useConfig();
  const showSnackbar = useSnackbar();
  const { t } = useTranslation();
  const toneRef = useRef<ToneInstances>(null);
  const randomIdxListRef = useRef<number[]>([]);
  const errSetRef = useRef(new Set<string>());
  const objectUrlSetRef = useRef(new Set<string>());
  const [currIdx, setCurrIdx] = useState(-1);
  const [prevIdx, setPrevIdx] = useState(-1);
  const [nextIdx, setNextIdx] = useState(-1);
  const [playQueue, setPlayQueue] = useState<Song[]>([]);
  const [paused, setPaused] = useState(true);
  const pausedRef = useRef(paused);
  const [pending, setPending] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // 精确到秒
  const currTimeRef = useRef(0); // 更精确的时间
  const [lyric, setLyric] = useState<LyricSentence[]>([]);
  const [currBuffer, setCurrBuffer] = useState<[string, ArrayBuffer]>();
  const [opening, setOpening] = useState(false);
  const controllerRef = useRef<AbortController>(null);
  const currSrcRef = useRef('');

  const currSong = playQueue[currIdx] as Song | undefined;
  const shuffle = config.playbackMode === PlaybackMode.Shuffle;
  const canChangeTrack = playQueue.length > 1;
  const hasCurrSong = !!currSong;
  const prevSong = playQueue[prevIdx] as Song | undefined;
  const nextSong = playQueue[nextIdx] as Song | undefined;

  useEffect(() => {
    currSrcRef.current = currSong?.src || '';
  }, [currSong?.src]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // 初始化
  useEffect(() => {
    if (WINDOW_LABEL !== 'main') return;
    invoke('detach_media_control');

    const volume = new Tone.Volume(0).toDestination();
    const replayGain = new Tone.Volume(0);

    const filters = Array.from(
      { length: EQUALIZER.length },
      (_, i) => new Tone.Filter({ ...EQUALIZER[i], Q: Math.SQRT2 }),
    );
    for (let i = 1; i < EQUALIZER.length; i++) {
      filters[i].connect(filters[i - 1]);
    }

    const player = new Tone.Player().connect(filters[9]);
    const grainPlayer = new Tone.GrainPlayer({
      grainSize: 0.1,
      overlap: 0.05,
    }).connect(filters[9]);

    toneRef.current = {
      volume,
      replayGain,
      filters,
      player,
      grainPlayer,
      activePlayer: player,
    };

    return () => {
      player.dispose();
      grainPlayer.dispose();
      volume.dispose();
      replayGain.dispose();
    };
  }, []);

  useEffect(() => {
    if (!isWindows || !toneRef.current) return;

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
      console.info('Initializing thumbnail buttons.');
      await invoke('init_thumbnail_buttons');
      updateThumbnailBtns();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [canChangeTrack, hasCurrSong, nextSong, paused, pending, prevSong, t]);

  // 设置音频输出设备
  useEffect(() => {
    if (!SUPPORT_SET_SINK_ID || !toneRef.current) return;
    // @ts-ignore
    (Tone.getContext().rawContext._nativeAudioContext as AudioContext)
      .setSinkId(config.outputDevice)
      .catch((err) => console.error('Failed to set audio device: ' + err));
  }, [config.outputDevice]);

  // 倍速、变调
  useEffect(() => {
    const tone = toneRef.current;
    if (!tone) return;
    tone.activePlayer.stop();
    ``;
    if (config.speed === 1 && config.detune === 0) {
      tone.activePlayer = tone.player;
      if (!pausedRef.current) {
        tone.player.start(Tone.now(), currTimeRef.current);
      }
    } else {
      tone.activePlayer = tone.grainPlayer;
      tone.grainPlayer.playbackRate = config.speed;
      tone.grainPlayer.detune = config.detune;
      if (!pausedRef.current) {
        setTimeout(() =>
          tone.grainPlayer.start(
            Tone.now(),
            currTimeRef.current / config.speed,
          ),
        );
      }
    }
  }, [config.detune, config.speed]);

  // 音量平衡
  useEffect(() => {
    const tone = toneRef.current;
    if (!tone) return;
    if (config.balanceVolume) {
      tone.replayGain.connect(tone.volume);
      tone.filters[0].disconnect();
      tone.filters[0].connect(tone.replayGain);
    } else {
      tone.replayGain.disconnect();
      tone.filters[0].disconnect();
      tone.filters[0].connect(tone.volume);
    }
  }, [config.balanceVolume]);

  // 均衡器
  useEffect(() => {
    if (!toneRef.current) return;
    for (let i = 0; i < EQUALIZER.length; i++) {
      toneRef.current.filters[i].gain.value = config.equalizer[i];
    }
  }, [config.equalizer]);

  // 加载中
  useEffect(() => {
    const unlisten = listen<boolean>(BackendEvent.IsLoading, (e) => {
      console.info(e.payload ? 'Loading audio.' : 'Audio loaded.');
      setPending(e.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // 播放进度更新
  const dateRef = useRef(0);
  const timerRef = useRef(0);
  const timerFnRef = useRef(() => {});

  useEffect(() => {
    if (!toneRef.current) return;
    timerFnRef.current = () => {
      const int = Math.floor(currTimeRef.current);
      currTimeRef.current +=
        ((Date.now() - dateRef.current) * config.speed) / 1000;
      dateRef.current = Date.now();
      if (int !== Math.floor(currTimeRef.current)) {
        emit(BackendEvent.TimeUpdate, currTimeRef.current);
      }

      // 播放结束
      if (
        toneRef.current &&
        toneRef.current.activePlayer.loaded &&
        currTimeRef.current >=
          toneRef.current.activePlayer.buffer.duration - 0.0625
      ) {
        console.info('Audio ended.');
        switch (config.playbackMode) {
          case PlaybackMode.NoRepeat:
            emit(BackendEvent.Stop);
            break;
          case PlaybackMode.RepeatOne:
            emit(BackendEvent.SetPosition, 0);
            break;
          default:
            emit(BackendEvent.Next);
            break;
        }
      }
    };
  }, [config.playbackMode, config.speed]);

  const start = useCallback((offset?: number) => {
    console.info(`Audio start at offset ${offset}.`);
    clearInterval(timerRef.current);
    dateRef.current = Date.now();
    timerRef.current = setInterval(() => timerFnRef.current(), 125);
    toneRef.current!.activePlayer.start(Tone.now(), offset);
  }, []);

  const stop = useCallback(() => {
    console.info('Audio stop.');
    clearInterval(timerRef.current);
    toneRef.current!.activePlayer.stop();
  }, []);

  useEffect(() => {
    const unlisten = listen<number>(BackendEvent.TimeUpdate, (e) =>
      setCurrentTime(e.payload),
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // 播放
  useEffect(() => {
    const unlisten = listen(BackendEvent.Play, async () => {
      console.info('Received "play".');
      setPaused(false);
      if (!toneRef.current) return;
      await Tone.start();
      start(currTimeRef.current / config.speed);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [config.speed, start]);

  // 暂停
  useEffect(() => {
    const unlisten = listen(BackendEvent.Pause, async () => {
      console.info('Received "pause".');
      setPaused(true);
      if (!toneRef.current) return;
      stop();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [stop]);

  // 切换播放、暂停
  useEffect(() => {
    if (!toneRef.current) return;
    const unlisten = listen(BackendEvent.Toggle, () => {
      console.info('Received "toggle".');
      if (pausedRef.current) {
        emit(BackendEvent.Play);
      } else {
        emit(BackendEvent.Pause);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // 错误处理
  const handleLoadError = useCallback(
    (err: Error, src: string) => {
      if (err.name === 'AbortError') {
        console.warn(`Fetching "${src}" aborted.`);
        return;
      }
      console.error('Failed to load audio: ' + err);
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

  // 更新元数据至播放队列
  const updateMetadata = useCallback(
    async (src: string, data: IAudioMetadata) => {
      // 生成封面缩略图
      const pic = selectCover(data.common.picture);
      let original: string;
      let thumbnail: string;
      if (pic) {
        original = URL.createObjectURL(
          new Blob([pic.data as BufferSource], {
            type: pic.format,
          }),
        );
        thumbnail = URL.createObjectURL(await imgSrcToBlob(original, 88));
        objectUrlSetRef.current.add(original);
        objectUrlSetRef.current.add(thumbnail);
      }

      // 针对未获取到时长的歌曲，用audio API再次获取
      let duration = data.format.duration;
      if (duration === undefined) {
        duration = await getAudioDuration(src);
      }

      setPlayQueue((prev) => {
        const idx = prev.findIndex((item) => item.src === src);
        if (idx === -1 || prev[idx].metadataLoaded) return prev;

        const newVal = [...prev];
        const newObj = { ...newVal[idx], duration, metadataLoaded: true };

        if (data.common.title) {
          newObj.title = data.common.title;
        }
        if (data.common.artists) {
          newObj.artists = data.common.artists?.map((label) => ({
            label,
          }));
        }
        if (data.common.album) {
          newObj.album = { label: data.common.album };
        }
        if (pic) {
          newObj.cover = [original, thumbnail];
        }

        newVal[idx] = newObj;
        return newVal;
      });
    },
    [],
  );

  // 当前歌曲更新
  useEffect(() => {
    const tone = toneRef.current;
    if (!tone) return;

    controllerRef.current?.abort();
    setCurrBuffer(undefined);
    setCurrentTime(0);
    currTimeRef.current = 0;
    stop();
    tone.activePlayer.mute = true;
    if (!currSong?.src) return;
    emit(BackendEvent.IsLoading, true);

    const load = async () => {
      controllerRef.current = new AbortController();
      console.info(`Loading audio "${currSong.src}".`);
      const resp = await fetchAlt(currSong.src, {
        signal: controllerRef.current.signal,
      });
      const buffer = await resp.arrayBuffer();
      const audioBuffer = await Tone.getContext().decodeAudioData(
        buffer.slice(0),
      );
      if (currSrcRef.current !== currSong.src) return;

      setCurrBuffer([currSong.src, buffer]);
      emit(BackendEvent.IsLoading, false);
      const toneAudioBuffer = new Tone.ToneAudioBuffer(audioBuffer);
      tone.player.buffer = toneAudioBuffer;
      tone.grainPlayer.buffer = toneAudioBuffer;

      const channels = Array.from(
        { length: toneAudioBuffer.numberOfChannels },
        (_, i) => toneAudioBuffer.getChannelData(i),
      );
      const gainRes = replaygain(channels, { fs: toneAudioBuffer.sampleRate });
      if (gainRes) {
        if (gainRes.peak * Math.pow(10, gainRes.gain / 20) <= 1) {
          tone.replayGain.volume.value = gainRes.gain;
        } else {
          tone.replayGain.volume.value = Tone.gainToDb(1 / gainRes.peak);
        }
      } else {
        tone.replayGain.volume.value = 0;
      }
      console.info(
        `Replay gain: ${toneRef.current!.replayGain.volume.value.toFixed(2)} db.`,
      );

      if (!pausedRef.current) {
        await Tone.start();
        start(0);
        tone.activePlayer.mute = false;
      }
    };

    load().catch((err) => handleLoadErrorRef.current(err, currSong.src));
  }, [currSong?.src, start, stop]);

  useEffect(() => {
    if (
      !hasCurrSong ||
      currSong.metadataLoaded ||
      currBuffer?.[0] !== currSong.src
    )
      return;
    parseBuffer(new Uint8Array(currBuffer[1])).then((item) => {
      updateMetadata(currSong.src, item);
    });
  }, [
    currBuffer,
    currSong?.metadataLoaded,
    currSong?.src,
    hasCurrSong,
    updateMetadata,
  ]);

  useEffect(() => {
    if (!toneRef.current) return;

    if (hasCurrSong) {
      const updatePlaying = async () => {
        const url = currSong.cover?.[0];
        const cover =
          url === undefined || url.startsWith('blob:')
            ? await srcToPath(url || defaultCover, 'StringMusic_cover')
            : url;
        invoke('set_metadata', {
          metadata: {
            title: currSong.title,
            artist:
              currSong.artists?.map((item) => item.label).join('; ') || '',
            album: currSong.album?.label || '',
            cover,
            duration: currSong.duration || 0,
          },
        });
        invoke('attach_media_control');
      };
      updatePlaying();
    } else {
      invoke('detach_media_control');
    }
  }, [
    currSong?.album,
    currSong?.artists,
    currSong?.cover,
    currSong?.duration,
    currSong?.title,
    hasCurrSong,
  ]);

  // 处理播放队列数量变化
  useEffect(() => {
    const len = playQueue.length;

    if (len === 0) {
      setCurrIdx(-1);
      randomIdxListRef.current = [];
      return;
    }

    const seed = Math.floor(Math.random() * 1000);
    console.info(`Random queue seed: ${seed}, length: ${len}.`);
    setCurrIdx((prev) => (prev >= len ? len - 1 : prev));
    randomIdxListRef.current = generateRandomList(
      seed,
      len,
      Math.floor(100 / len) + 1,
    );
  }, [playQueue.length]);

  // 设置上一首、下一首的索引
  useEffect(() => {
    if (currIdx < 0) {
      setPrevIdx(-1);
      setNextIdx(-1);
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

  // 上一首
  useEffect(() => {
    const unlisten = listen(BackendEvent.Previous, () => {
      console.info('Received "previous".');
      if (canChangeTrack) {
        setCurrIdx(prevIdx);
      } else {
        setCurrentTime(0);
        currTimeRef.current = 0;
        if (!toneRef.current) return;
        stop();
        start(0);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [canChangeTrack, prevIdx, start, stop]);

  // 下一首
  useEffect(() => {
    const unlisten = listen(BackendEvent.Next, () => {
      console.info('Received "next".');
      if (canChangeTrack) {
        setCurrIdx(nextIdx);
      } else {
        setCurrentTime(0);
        currTimeRef.current = 0;
        if (!toneRef.current) return;
        stop();
        start(0);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [canChangeTrack, nextIdx, start, stop]);

  // 停止
  useEffect(() => {
    const unlisten = listen(BackendEvent.Stop, () => {
      console.info('Received "stop".');
      setCurrentTime(0);
      currTimeRef.current = 0;
      setPaused(true);
      if (!toneRef.current) return;
      stop();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [stop]);

  // 向前
  useEffect(() => {
    const unlisten = listen<number | undefined>(
      BackendEvent.SeekForward,
      (e) => {
        if (!toneRef.current) return;
        const duration =
          e.payload ??
          (!config.seekBySentence || lyric.length <= 1 ? 10 : undefined);
        let position: number;

        if (duration === undefined) {
          console.info(`Seek forward ${duration}s.`);
          position =
            lyric.find((item) => item.start > currTimeRef.current)?.start ||
            Infinity;
        } else {
          console.info('Seek forward one sentence.');
          position = currTimeRef.current + duration;
        }

        emit(BackendEvent.SetPosition, Math.max(0, position));
      },
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [config.seekBySentence, lyric]);

  // 向后
  useEffect(() => {
    const unlisten = listen<number | undefined>(
      BackendEvent.SeekBackward,
      (e) => {
        if (!toneRef.current) return;
        const duration =
          e.payload ??
          (!config.seekBySentence || lyric.length <= 1 ? 10 : undefined);
        let position: number;

        if (duration === undefined) {
          console.info(`Seek backward ${duration}s.`);
          position =
            lyric[
              lyric.findIndex((item) => item.start <= currTimeRef.current) + 1
            ].start;
        } else {
          console.info('Seek forward one sentence.');
          position = currTimeRef.current - duration;
        }

        emit(BackendEvent.SetPosition, position);
      },
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [config.seekBySentence, lyric]);

  // 跳转
  useEffect(() => {
    const unlisten = listen<number>(BackendEvent.SetPosition, (e) => {
      setCurrentTime(Math.floor(e.payload));
      currTimeRef.current = e.payload;
      if (toneRef.current) {
        console.info(`Set audio position to ${e.payload}s.`);
        stop();
        if (pausedRef.current) return;
        start(e.payload / config.speed);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [config.speed, start, stop]);

  // 更改音量
  useEffect(() => {
    if (!toneRef.current) return;

    toneRef.current.volume.volume.value =
      config.volumeValue <= 0
        ? -Infinity
        : 20 * Math.log10(config.volumeValue / 100);
  }, [config.volumeValue]);

  useEffect(() => {
    if (!toneRef.current) return;
    const unlisten = listen<number>(BackendEvent.SetVolume, (e) => {
      updateConfig({ volumeValue: e.payload * 100 });
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [updateConfig]);

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
          console.warn(`Path "${uri}" does not exist.`);
        }
      } catch (err) {
        console.error(`Failed to open URI "${uri}": ${err}`);
      }
    }
    return songs;
  }, []);

  // 批量获取元数据
  const getMetadata = useCallback(
    (srcs: string[]) => {
      const localSrcs: string[] = [];
      const onlineSrcs: string[] = [];

      srcs.forEach((item) => {
        if (
          /^https?:\/\/asset\.localhost/i.test(item) ||
          /^asset:\/\/localhost/i.test(item)
        ) {
          localSrcs.push(item);
        } else {
          onlineSrcs.push(item);
        }
      });

      // 在子线程获取本地歌曲元数据
      const worker = new Worker(
        new URL('../handlers/readMetadata', import.meta.url),
        { type: 'module' },
      );
      worker.postMessage(localSrcs);
      worker.onmessage = (e: MessageEvent<[string, IAudioMetadata]>) => {
        updateMetadata(e.data[0], e.data[1]);
      };

      // 从在线歌曲url获取元数据
      setTimeout(async () => {
        for (const src of onlineSrcs) {
          try {
            const resp = await tauriFetch(src);
            const meta = await parseWebStream(resp.body);
            await updateMetadata(src, meta);
          } catch (err) {
            console.error(`Failed to get metadata of "${src}": ${err}`);
          }
        }
      });
    },
    [updateMetadata],
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
          const src =
            songs[shuffle ? Math.floor(Math.random() * songs.length) : 0].src;
          setCurrIdx(prev.findIndex((item) => item.src === src));
          setCurrentTime(0);
          currTimeRef.current = 0;
          if (toneRef.current) {
            stop();
            start(0);
          }
          return prev;
        }

        if (toneRef.current) {
          stop();
        }

        setCurrentTime(0);
        currTimeRef.current = 0;
        setCurrIdx(
          (shuffle ? Math.floor(Math.random() * filteredSongs.length) : 0) +
            prev.length,
        );
        setPaused(false);

        setTimeout(() => getMetadata(filteredSongs.map((item) => item.src)));
        return [...prev, ...filteredSongs];
      });
      clearTimeout(timer);
      setOpening(false);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [getMetadata, parseUris, shuffle, start, stop]);

  useEffect(() => {
    const unlisten: Promise<UnlistenFn>[] = [];
    // 显示窗口
    unlisten.push(listen(BackendEvent.Raise, raise));

    // 退出应用
    unlisten.push(listen(BackendEvent.Quit, destroyAll));

    // 作为打开方式打开文件
    invoke<string[]>('opened_urls').then((val) => {
      if (val.length === 0) return;
      console.info('Opened urls exists.');
      emit<string[]>(BackendEvent.OpenUri, val);
    });

    // 拖入文件
    unlisten.push(
      getCurrentWebviewWindow().onDragDropEvent((e) => {
        if (e.payload.type === 'drop') {
          console.info('File dropped in.');
          emit(BackendEvent.OpenUri, e.payload.paths);
        }
      }),
    );

    return () => unlisten.forEach((item) => item.then((fn) => fn()));
  }, []);

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
        }
      },
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // 同步react状态与系统控件
  useEffect(() => {
    if (!toneRef.current) return;

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
    if (!isWindows || !toneRef.current) return;

    const prev = playQueue[prevIdx];
    const prevTitle = prev
      ? prev.translation
        ? `\n${prev.title}\n(prev.translation)`
        : '\n' + prev.title
      : '';

    const next = playQueue[nextIdx];
    const nextTitle = next
      ? next.translation
        ? `\n${next.title}\n(next.translation)`
        : '\n' + next.title
      : '';

    invoke('update_buttons', {
      updates: [
        {
          id: TaskbarButtons.Prev,
          tooltip: t('media.prev') + prevTitle,
        },
        {
          id: TaskbarButtons.Next,
          tooltip: t('media.next') + nextTitle,
        },
      ],
    });
  }, [nextIdx, playQueue, prevIdx, t]);

  useEffect(() => {
    if (!isWindows || !toneRef.current) return;
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

  useEffect(() => {
    invoke('set_playback', { paused, position: currentTime });
  }, [currentTime, paused]);

  // 更改窗口标题
  useEffect(() => {
    if (!IS_DESKTOP || IS_APPLE || !toneRef.current) return;
    if (config.useMusicTitleAsWindowTitle && currSong?.title) {
      MAIN_WINDOW.setTitle(
        `${currSong.title} - ${t('common.stringMusicPlayer')}`,
      );
    } else {
      MAIN_WINDOW.setTitle(t('common.stringMusicPlayer'));
    }
  }, [config.useMusicTitleAsWindowTitle, currSong?.title, t]);

  // 更改窗口图标
  useEffect(() => {
    if (!IS_DESKTOP || IS_APPLE || !toneRef.current) return;
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

  const ctxVal = useMemo(
    () => ({
      ...initVal,
      currIdx,
      prevIdx,
      nextIdx,
      playQueue,
      paused,
      pending,
      lyric,
      currBuffer: currBuffer?.[1],
      setLyric,
    }),
    [currBuffer, currIdx, lyric, nextIdx, paused, pending, playQueue, prevIdx],
  );

  return (
    <>
      <Context.Provider value={ctxVal}>
        <AudioTimeContext.Provider value={currentTime}>
          {children}
        </AudioTimeContext.Provider>
      </Context.Provider>
      {opening && (
        <div className='fixed flex items-center gap-2 inset-e-8 bottom-8 z-10000 pointer-events-none'>
          <CircularProgress size={24} />
          <div className='text-shadow-lg text-shadow-background-paper'>
            {t('media.loading')}
          </div>
        </div>
      )}
    </>
  );
}

import Divider from '@mui/material/Divider';
import { tooltipClasses } from '@mui/material/Tooltip';
import { emit } from '@tauri-apps/api/event';
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import type { PointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WaveformGenerator from 'waveform-generator-web';
import { FADE_DURATION } from '../../../constants/animation';
import { useAudio } from '../../../providers/AudioProvider';
import { useConfig } from '../../../providers/ConfigProvider';
import type { Song } from '../../../types/audio';
import { ShowAudioWave } from '../../../types/config';
import { BackendEvent } from '../../../types/event';
import { formatTime } from '../../../utils/data';
import { isRTL } from '../../../utils/window';
import SliderAlt from '../../ui/SliderAlt';
import Tip from '../../ui/Tip';

const MotionSlider = motion.create(SliderAlt);

export default function Progress() {
  const [config] = useConfig();
  const media = useAudio();
  const currSong = media.playQueue[media.currIdx] as Song | undefined;
  const duration = currSong?.duration || 0;

  const draggingRef = useRef(false);
  const [sliderVal, setSliderVal] = useState(media.currentTime);
  useEffect(() => {
    if (draggingRef.current) return;
    setSliderVal(media.currentTime);
  }, [media.currentTime]);

  // 前端运算精确的播放进度，并定期从后端同步
  const accurateTimePercent = useMotionValue(0);
  useEffect(() => {
    accurateTimePercent.set((media.currentTime / duration) * 100);
  }, [accurateTimePercent, duration, media.currentTime]);

  const oneMsPercent = useMemo(
    () => (duration ? (config.speed / (duration * 1000)) * 100 : 0),
    [config.speed, duration],
  );

  useAnimationFrame((_, delta) => {
    if (media.paused || media.pending) return;
    const increment = delta * oneMsPercent;
    accurateTimePercent.set(accurateTimePercent.get() + increment);
  });

  const clipPath = useTransform(
    accurateTimePercent,
    (val) => `inset(0 ${100 - val}% 0 0)`,
  );
  const playedWidth = useTransform(accurateTimePercent, (val) => val + '%');

  // 显示悬停处的时间
  const [sliderLabel, setSliderLabel] = useState('');
  const pointerX = useMotionValue(NaN);

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const slider = e.currentTarget;
      const rect = slider.getBoundingClientRect();
      const relativeX = isRTL()
        ? rect.right - e.clientX
        : e.clientX - rect.left;
      const value = Math.round((relativeX / rect.width) * duration);
      setSliderLabel(
        formatTime(Math.min(Math.floor(duration), Math.max(value, 0))),
      );
      pointerX.set(relativeX > rect.width || relativeX < 0 ? NaN : relativeX);
    },
    [duration, pointerX],
  );

  // 显示波形
  const showAudioWaveMode = config.showAudioWave;
  const [showWave, setShowWave] = useState(
    showAudioWaveMode === ShowAudioWave.Always,
  );
  useEffect(() => {
    setShowWave(showAudioWaveMode === ShowAudioWave.Always);
  }, [showAudioWaveMode]);

  const [waveSrc, setWaveSrc] = useState<string>();
  const primaryColor = getComputedStyle(
    document.documentElement,
  ).getPropertyValue('--mui-palette-primary-main');

  useEffect(() => {
    let cancelled = false;
    setWaveSrc(undefined);
    if (showAudioWaveMode === ShowAudioWave.Never || !media.currBuffer) {
      return;
    }

    const getWaveform = async () => {
      if (cancelled) return;
      const generator = new WaveformGenerator(media.currBuffer!);
      const wave = await generator.getWaveform({
        waveformColor: primaryColor,
        waveformWidth: 2000,
        waveformHeight: 56,
        barAlign: 'center',
        barWidth: 1,
        barGap: 0,
        drawMode: 'png',
      });
      if (cancelled) return;
      setWaveSrc(wave);
    };
    getWaveform();

    return () => {
      cancelled = true;
    };
  }, [media.currBuffer, primaryColor, showAudioWaveMode]);

  return (
    currSong && (
      <div className='flex gap-1 items-center'>
        <div className='w-10 text-sm'>{formatTime(sliderVal)}</div>
        <Tip
          disabled={media.pending}
          title={sliderLabel}
          placement='top'
          enterDelay={0}
          enterNextDelay={0}
          enterTouchDelay={0}
          arrow
          followCursor
          slotProps={{
            popper: {
              sx: {
                [`&.${tooltipClasses.popper}[data-popper-placement*="top"] .${tooltipClasses.tooltip}`]:
                  {
                    marginBottom: '20px',
                  },
              },
            },
            tooltip: isNaN(pointerX.get())
              ? { sx: { display: 'none' } }
              : undefined,
          }}
        >
          <motion.div
            className='w-full flex h-7 relative'
            onPointerMove={handlePointerMove}
            onPointerLeave={() => pointerX.set(NaN)}
            onHoverStart={
              showAudioWaveMode === ShowAudioWave.Hovering
                ? () => setShowWave(true)
                : undefined
            }
            onHoverEnd={
              showAudioWaveMode === ShowAudioWave.Hovering
                ? () => setShowWave(false)
                : undefined
            }
          >
            {/* 波形 */}
            <AnimatePresence initial={false}>
              {showWave && (
                <motion.div
                  className='absolute h-7 w-full'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: config.animationDuration * FADE_DURATION,
                  }}
                >
                  {/* 未播放波形 */}
                  {waveSrc && (
                    <img
                      className='absolute rtl:-scale-x-100 h-full w-full opacity-(--mui-palette-action-disabledOpacity)'
                      alt=''
                      src={waveSrc}
                    />
                  )}
                  {/* 未播放中线 */}
                  <Divider className='absolute w-full top-[calc(50%-0.5px)]' />
                  {/* 已播放波形 */}
                  {waveSrc && (
                    <motion.img
                      className='absolute rtl:-scale-x-100 h-full w-full'
                      style={{ clipPath }}
                      alt=''
                      src={waveSrc}
                    />
                  )}
                  {/* 已播放中线 */}
                  <motion.div
                    className='absolute h-px top-[calc(50%-0.5px)] bg-text-disabled'
                    initial={false}
                    style={{ width: playedWidth }}
                  />
                  {/* 播放位置指示 */}
                  <motion.div
                    className='absolute h-full w-px bg-text-disabled'
                    style={{ insetInlineStart: playedWidth }}
                  />
                  {/* 光标指示 */}
                  {!isNaN(pointerX.get()) && (
                    <div
                      className='absolute h-full w-px bg-text-primary'
                      style={{ insetInlineStart: pointerX.get() - 0.5 + 'px' }}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 进度条 */}
            <MotionSlider
              className='absolute inset-0'
              style={
                showAudioWaveMode === ShowAudioWave.Never
                  ? undefined
                  : { cursor: 'default' }
              }
              initial={false}
              animate={{ opacity: showWave ? 0 : 1 }}
              transition={{
                duration: config.animationDuration * FADE_DURATION,
              }}
              size='small'
              max={duration}
              marks={currSong.marks?.map((item) => ({ value: item }))}
              disabled={media.pending}
              value={sliderVal}
              onChange={(_, val) => {
                draggingRef.current = true;
                setSliderVal(val as number);
              }}
              onChangeCommitted={(_, val) => {
                draggingRef.current = false;
                emit(BackendEvent.SetPosition, val as number);
              }}
              tabIndex={-1}
            />
          </motion.div>
        </Tip>
        <div className='w-10 text-end text-sm'>
          {formatTime(Math.floor(currSong.duration || 0))}
        </div>
      </div>
    )
  );
}

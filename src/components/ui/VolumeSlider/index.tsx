import { useCallback, useEffect, useRef, useState } from 'react';
import sound from '../../../assets/sound.mp3';
import useThrottle from '../../../hooks/useThrottle';
import { useAudio } from '../../../providers/AudioProvider';
import { useConfig } from '../../../providers/ConfigProvider';
import SliderAlt from '../SliderAlt';

const playTestSound = async (volume: number) => {
  // @ts-ignore
  // eslint-disable-next-line compat/compat
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const res = await fetch(sound);
  const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  gain.gain.value = volume / 100;
  src.connect(gain).connect(ctx.destination);
  src.onended = () => {
    src.disconnect();
    gain.disconnect();
    ctx.close();
  };
  src.start();
};

interface Props {
  onChange?: (volume: number) => void;
}

export default function VolumeSlider({ onChange }: Props) {
  const [config, updateConfig] = useConfig();
  const { paused, pending } = useAudio();
  const [volume, setVolume] = useState(config.volume[0]);
  const draggingRef = useRef(false);

  const canOver100 = config.volume[1];
  const changeVolume = useCallback(
    (val: number) => {
      updateConfig({ volume: [val, canOver100] });
    },
    [canOver100, updateConfig],
  );

  const changeVolumeThrottle = useThrottle(changeVolume, 250);

  const vol = config.volume[0];
  useEffect(() => {
    if (draggingRef.current) return;
    setVolume(vol);
  }, [vol]);

  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onChangeRef.current?.(volume);
  }, [volume]);

  return (
    <SliderAlt
      value={volume}
      max={config.volume[1] ? 400 : 100}
      marks={
        config.volume[1] && [100, 200, 300].map((item) => ({ value: item }))
      }
      onChange={(_, val) => {
        draggingRef.current = true;
        setVolume(val as number);
        changeVolumeThrottle(val as number);
      }}
      onChangeCommitted={(_, val) => {
        draggingRef.current = false;
        changeVolume(val as number);
        if (paused || pending) {
          playTestSound(val as number);
        }
      }}
      valueLabelDisplay='auto'
    />
  );
}

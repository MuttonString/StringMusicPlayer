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

export default function VolumeSlider() {
  const [config, updateConfig] = useConfig();
  const { paused, pending } = useAudio();
  const [volume, setVolume] = useState(config.volumeValue);
  const draggingRef = useRef(false);

  const changeVolume = useCallback(
    (val: number) => {
      updateConfig({ volumeValue: val });
    },
    [updateConfig],
  );

  const changeVolumeThrottle = useThrottle(changeVolume, 250);

  useEffect(() => {
    if (draggingRef.current) return;
    setVolume(config.volumeValue);
  }, [config.volumeValue]);

  return (
    <SliderAlt
      value={volume}
      max={config.volumeOver100Allowed ? 400 : 100}
      marks={(config.volumeOver100Allowed
        ? [0, 50, 100, 200, 300, 400]
        : [0, 25, 50, 75, 100]
      ).map((item) => ({ value: item, label: item }))}
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

import {
  animate,
  motion,
  useAnimationFrame,
  useMotionValue,
} from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import defaultCover from '../../../assets/disc.png';
import { BASE_COMPONENT } from '../../../constants/animation';
import { MEDIA_BAR_HEIGHT } from '../../../constants/window';
import useLongPress from '../../../hooks/useLongPress';
import type useShortcutKey from '../../../hooks/useShortcutKey';
import { useAudio } from '../../../providers/AudioProvider';
import { useConfig } from '../../../providers/ConfigProvider';
import type { Song } from '../../../types/audio';
import Tip from '../../ui/Tip';

interface Props {
  useShortcutKeyReturnValue: ReturnType<typeof useShortcutKey>;
}

export default function Cover({ useShortcutKeyReturnValue }: Props) {
  const [config, updateConfig] = useConfig();
  const { t } = useTranslation();
  const media = useAudio();
  const rotation = useMotionValue(0);
  const resetAnimationRef = useRef<ReturnType<typeof animate> | null>(null);
  const currSong = media.playQueue[media.currIdx] as Song | undefined;
  const cover = currSong?.cover?.[0];

  const rotationSpeed = useMemo(
    () => (360 / 15 / 1000) * config.speed,
    [config.speed],
  );

  const coverLongPress = useLongPress(
    useCallback(() => {
      updateConfig({ coverRotation: !config.coverRotation });
    }, [config.coverRotation, updateConfig]),
    useShortcutKeyReturnValue[1],
  );

  // 封面旋转动画
  useEffect(() => {
    if (!config.coverRotation) {
      const target = rotation.get() > 180 ? 360 : 0;
      resetAnimationRef.current = animate(rotation, 0, {
        onComplete: () => {
          if (target === 360) rotation.set(0);
        },
      });
    }

    return () => {
      resetAnimationRef.current?.stop();
      resetAnimationRef.current = null;
    };
  }, [rotation, config.coverRotation]);

  useAnimationFrame((_, delta) => {
    if (!config.coverRotation || media.paused || media.pending) return;
    const increment = delta * rotationSpeed;
    rotation.set((rotation.get() + increment + 360) % 360);
  });

  useEffect(() => {
    rotation.set(0);
  }, [cover, rotation]);

  return (
    currSong && (
      <motion.div
        variants={BASE_COMPONENT}
        custom={{ w: MEDIA_BAR_HEIGHT }}
        initial='hidden'
        whileInView='visible'
        exit='hidden'
        layout
        className='p-1 h-(--media-bar-height)'
      >
        <Tip
          placement='top'
          title={`${t('media.playPage')} ${useShortcutKeyReturnValue[0]}\n${t(
            config.coverRotation
              ? 'media.disableCoverRotate'
              : 'media.enableCoverRotate',
          )}`}
        >
          <div>
            <motion.img
              alt={t('media.playPage')}
              className='bg-background-default object-cover object-center rounded-full! h-18 w-18 shadow-2 cursor-pointer'
              style={{ rotate: rotation }}
              src={cover || defaultCover}
              onError={(e) => {
                e.currentTarget.src = defaultCover;
              }}
              {...coverLongPress}
            />
          </div>
        </Tip>
      </motion.div>
    )
  );
}

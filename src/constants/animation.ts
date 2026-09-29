import type { Variants } from 'framer-motion';
import { isRTL } from '../utils/window';

export const DEFAULT_DURATION = 0.3;

export const FADE_DURATION = 0.15;

export const DIALOG_LEVAING_MS = 225;

export const BASE_COMPONENT: Variants = {
  visible: ({ w, ps }: { w: string; ps?: string }) => ({
    opacity: 1,
    minWidth: w,
    maxWidth: w,
    paddingInlineStart: ps,
    overflow: '',
  }),
  hidden: {
    opacity: 0,
    minWidth: 0,
    maxWidth: 0,
    paddingInlineStart: 0,
    overflow: 'clip',
  },
};

export const VERTICAL: Variants = {
  visible: (h: string) => ({
    opacity: 1,
    maxHeight: h,
    overflow: '',
  }),
  hidden: {
    opacity: 0,
    maxHeight: 0,
    padding: 0,
    overflow: 'clip',
  },
};

export const PAGE: Variants = {
  normal: (showMediaBar: boolean) => ({
    opacity: 1,
    x: 0,
    y: 0,
    paddingBottom: showMediaBar
      ? '6.5rem' // MEDIA_BAR_HEIGHT + 1.5rem
      : '0.5rem',
  }),
  goBack: (showMediaBar: boolean) => ({
    opacity: 0,
    x: isRTL() ? '-4rem' : '4rem',
    paddingBottom: showMediaBar ? '6.5rem' : '0.5rem',
  }),
  goForward: (showMediaBar: boolean) => ({
    opacity: 0,
    x: isRTL() ? '4rem' : '-4rem',
    paddingBottom: showMediaBar ? '6.5rem' : '0.5rem',
  }),
  new: (showMediaBar: boolean) => ({
    opacity: 0,
    y: '2rem',
    paddingBottom: showMediaBar ? '6.5rem' : '0.5rem',
  }),
};

export const LIST: Variants = {
  visible: (durationScale: number) => ({
    transition: {
      when: 'beforeChildren',
      staggerChildren: (durationScale * DEFAULT_DURATION) / 4,
    },
  }),
};

export const LIST_ITEM: Variants = {
  visible: {
    opacity: 1,
    x: 0,
  },
  hidden: () => ({
    opacity: 0,
    x: isRTL() ? '5rem' : '-5rem',
  }),
};

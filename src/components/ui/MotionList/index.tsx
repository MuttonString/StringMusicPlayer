import List from '@mui/material/List';
import { AnimatePresence, motion } from 'framer-motion';
import type { ComponentProps, ReactNode } from 'react';
import { LIST } from '../../../constants/animation';
import { useConfig } from '../../../providers/ConfigProvider';

const MotionLi = motion.create(List);

interface Props extends ComponentProps<typeof MotionLi> {
  animate?: boolean;
}

export default function MotionList({ children, animate, ...props }: Props) {
  const [config] = useConfig();

  return (
    <MotionLi
      variants={animate === false ? undefined : LIST}
      custom={config.animationDuration}
      initial='hidden'
      animate={animate === false ? false : 'visible'}
      exit='hidden'
      {...props}
    >
      <AnimatePresence mode='popLayout'>
        {children as ReactNode}
      </AnimatePresence>
    </MotionLi>
  );
}

import type { EventInfo } from 'framer-motion';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import { isRTL } from '../../../utils/window';
import MaterialIcon from '../MaterialIcon';

interface Props {
  onSelect?: () => void;
  onDelete?: () => void;
  onHoverStart?: (event: PointerEvent, info: EventInfo) => void;
  onHoverEnd?: (event: PointerEvent, info: EventInfo) => void;
  children: ReactNode;
}

const SCALE_START = 15;
const SCALE_RANGE = 35;
const THRESHOLD = 50;

const iconContainerClassName =
  'absolute flex items-center justify-center top-1/2 w-8.75 h-8.75 rounded-full!';

export default function SwipeableListItem({
  onSelect,
  onDelete,
  children,
  ...rest
}: Props) {
  const x = useMotionValue(0);
  const draggedRef = useRef(false);
  const rtl = isRTL();

  const selectScale = useTransform(x, (v) => {
    const dir = rtl ? -v : v;
    return Math.min(Math.max(dir - SCALE_START, 0) / SCALE_RANGE, 1);
  });

  const deleteScale = useTransform(x, (v) => {
    const dir = rtl ? v : -v;
    return Math.min(Math.max(dir - SCALE_START, 0) / SCALE_RANGE, 1);
  });

  return (
    <div
      className='relative overflow-clip'
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <motion.div
        className='flex items-center w-full will-change-transform'
        drag='x'
        dragSnapToOrigin
        dragConstraints={{ left: -THRESHOLD, right: THRESHOLD }}
        style={{ x }}
        onDragStart={() => (draggedRef.current = true)}
        onDragEnd={() => {
          const v = x.get();
          if (rtl ? v <= -THRESHOLD : v >= THRESHOLD) {
            onSelect?.();
          } else if (rtl ? v >= THRESHOLD : v <= -THRESHOLD) {
            onDelete?.();
          }
          draggedRef.current = false;
        }}
        onClickCapture={(e) => {
          if (draggedRef.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        {...rest}
      >
        {children}
      </motion.div>

      <motion.div
        className={
          'bg-primary text-primary-contrast inset-s-0 ' + iconContainerClassName
        }
        style={{
          scale: selectScale,
          y: '-50%',
        }}
      >
        <MaterialIcon name='checkCircle' color='inherit' />
      </motion.div>

      <motion.div
        className={
          'bg-error text-error-contrast inset-e-0 ' + iconContainerClassName
        }
        style={{
          scale: deleteScale,
          y: '-50%',
        }}
      >
        <MaterialIcon name='delete' color='inherit' />
      </motion.div>
    </div>
  );
}

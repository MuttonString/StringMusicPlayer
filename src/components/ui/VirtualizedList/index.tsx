import type { ListProps } from '@mui/material/List';
import List from '@mui/material/List';
import type { ReactVirtualizer } from '@tanstack/react-virtual';
import { useVirtualizer } from '@tanstack/react-virtual';
import classNames from 'classnames';
import { motion } from 'framer-motion';
import type { Key, Ref, RefObject } from 'react';
import { useImperativeHandle, useRef, type ReactNode } from 'react';

interface Props<T> extends Omit<ListProps, 'ref'> {
  ref?: Ref<
    readonly [
      ReactVirtualizer<HTMLUListElement, Element>,
      RefObject<HTMLUListElement>,
    ]
  >;
  items: T[];
  rowHeight: number;
  rowRender: (row: T) => ReactNode;
  getItemKey: (item: T) => Key;
}

export default function VirtualizedList<T>(props: Props<T>) {
  const { ref, items, rowHeight, rowRender, className, getItemKey, ...rest } =
    props;
  const listRef = useRef<HTMLUListElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => rowHeight,
    getItemKey: (idx) => getItemKey(items[idx]),
  });

  useImperativeHandle(
    ref,
    () => [virtualizer, listRef as RefObject<HTMLUListElement>] as const,
  );

  return (
    <List
      ref={listRef}
      dense
      className={classNames('overflow-auto', className)}
      {...rest}
    >
      <div
        className='relative w-full'
        style={{ height: virtualizer.getTotalSize() + 'px' }}
      >
        {virtualizer.getVirtualItems().map((row) => {
          return (
            <motion.div
              key={row.key}
              initial={false}
              animate={{ y: row.start }}
              style={{ height: row.size + 'px' }}
              className='absolute w-full'
            >
              {rowRender(items[row.index])}
            </motion.div>
          );
        })}
      </div>
    </List>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { MD_WIDTH, SM_WIDTH } from '../../../constants/window';
import useShortcutKey from '../../../hooks/useShortcutKey';
import useWidthQuery from '../../../hooks/useWidthQuery';
import PlayPage from '../../../pages/PlayPage';
import { useAudio } from '../../../providers/AudioProvider';
import { useConfig } from '../../../providers/ConfigProvider';
import type { Song } from '../../../types/audio';
import { KeyCode } from '../../../types/keyCode';
import Cover from './Cover';
import MediaButtons from './MediaButtons';
import Metadata from './Metadata';
import OperationButtons from './OperationButtons';
import Progress from './Progress';

export default function MediaBar() {
  const [config] = useConfig();
  const media = useAudio();
  const showFooter = config.enableDevOptions && config.showFooter;
  const wide = useWidthQuery(MD_WIDTH);
  const notNarrow = useWidthQuery(SM_WIDTH);
  const currSong = media.playQueue[media.currIdx] as Song | undefined;
  const [open, setOpen] = useState(false);

  const shortcutKey = useShortcutKey(() => {
    if (currSong) setOpen(true);
  }, [KeyCode.Ctrl, 'N']);

  return (
    <>
      <AnimatePresence>
        {currSong && (
          <motion.div
            initial={{
              opacity: 0,
              insetInlineStart: wide
                ? '16rem' // SIDE_BAR_WIDTH + 1rem
                : '1rem',
              bottom: '-5rem', // MEDIA_BAR_HEIGHT * -1
              borderRadius: notNarrow
                ? '2.5rem'
                : config.sharpStyle
                  ? 0
                  : '8px',
            }}
            animate={{
              opacity: 1,
              insetInlineStart: wide
                ? '16rem' // SIDE_BAR_WIDTH + 1rem
                : '1rem',
              bottom: showFooter ? '3rem' : '1rem',
              borderRadius: notNarrow
                ? '2.5rem'
                : config.sharpStyle
                  ? 0
                  : '8px',
            }}
            exit={{
              opacity: 0,
              bottom: '-5rem', // MEDIA_BAR_HEIGHT * -1
            }}
            className='z-10 ps-1 pe-1 flex overflow-clip bg-background-paper MuiPopover-paper h-(--media-bar-height) fixed overlay-16 inset-e-4 shadow-2 border border-divider'
          >
            <AnimatePresence>
              {notNarrow && <Cover useShortcutKeyReturnValue={shortcutKey} />}
            </AnimatePresence>

            <div className='flex flex-col gap-0.5 justify-center min-w-0 w-full'>
              <div className='flex justify-between items-center'>
                <Metadata useShortcutKeyReturnValue={shortcutKey} />
                <MediaButtons />
              </div>
              <Progress />
            </div>
            <OperationButtons show={notNarrow} />
          </motion.div>
        )}
      </AnimatePresence>
      <PlayPage open={!!currSong && open} onClose={() => setOpen(false)} />
    </>
  );
}

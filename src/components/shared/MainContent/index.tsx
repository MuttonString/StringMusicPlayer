import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router';
import { PAGE } from '../../../constants/animation';
import { useAudio } from '../../../providers/AudioProvider';
import { useNavigator } from '../../../providers/NavigatorProvider';
import { PageOperation } from '../../../types/navigator';

export default function MainContent() {
  const { lastOperation } = useNavigator();
  const location = useLocation();
  const media = useAudio();

  const enterAnimation = useMemo(() => {
    switch (lastOperation) {
      case PageOperation.Back:
        return 'goBack';
      case PageOperation.Forward:
        return 'goForward';
      case PageOperation.New:
        return 'new';
    }
  }, [lastOperation]);

  return (
    // MD_WIDTH
    <main
      className={`bg-(--bg-color) overlay-1 flex-1 min-h-0 min-w-0 flex overflow-clip border-s border-t border-divider rounded-ss-lg max-[50rem]:border-s-0 max-[50rem]:rounded-ss-none`}
    >
      <AnimatePresence>
        <motion.div
          key={location.pathname}
          variants={PAGE}
          initial={enterAnimation}
          whileInView='normal'
          className='flex-1 min-h-0 overflow-auto p-2'
          custom={!!media.playQueue[media.currIdx]}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { BASE_COMPONENT } from '../../../constants/animation';
import { MD_WIDTH, SIDE_BAR_WIDTH } from '../../../constants/window';
import useWidthQuery from '../../../hooks/useWidthQuery';
import NavigatorList from '../NavigatorList';

export default function SideBar() {
  const wide = useWidthQuery(MD_WIDTH);

  return (
    <AnimatePresence>
      {wide && (
        <motion.aside
          layout
          variants={BASE_COMPONENT}
          custom={{ w: SIDE_BAR_WIDTH }}
          initial='hidden'
          whileInView='visible'
          exit='hidden'
          className='overflow-x-clip overflow-y-auto whitespace-nowrap'
        >
          <NavigatorList className='[&_ul]:first:pt-0! [&_ul]:last:pb-0!' />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

import { type } from '@tauri-apps/plugin-os';
import { useEffect, useState } from 'react';
import { MAIN_WINDOW } from '../../../constants/window';

const isWindows = type() === 'windows';

const icons = isWindows
  ? ['\u0030', '\u0031', '\u0032', '\u0072']
  : ['🗕', '🗖', '🗗', '🗙'];

const commonProps = {
  tabIndex: -1,
  className: 'decorum-tb-btn',
  style: {
    fontSize: '1rem',
    fontFamily: isWindows ? 'Webdings' : undefined,
  },
};

export default function PlainControlButtons() {
  const [isMax, setIsMax] = useState(false);

  useEffect(() => {
    const unlisten = MAIN_WINDOW.onResized(() =>
      MAIN_WINDOW.isMaximized().then(setIsMax),
    );

    return () => {
      unlisten.then((fn) => fn?.());
    };
  }, []);

  return (
    <>
      <div
        data-tauri-drag-region
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
      />
      <button
        id='decorum-tb-minimize'
        onClick={() => MAIN_WINDOW.minimize()}
        {...commonProps}
      >
        {icons[0]}
      </button>
      <button
        id='decorum-tb-maximize'
        onClick={() => MAIN_WINDOW.toggleMaximize()}
        {...commonProps}
      >
        {isMax ? icons[2] : icons[1]}
      </button>
      <button
        id='decorum-tb-close'
        onClick={() => MAIN_WINDOW.close()}
        {...commonProps}
      >
        {icons[3]}
      </button>
    </>
  );
}

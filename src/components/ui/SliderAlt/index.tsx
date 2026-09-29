import type { SliderProps } from '@mui/material';
import { Slider } from '@mui/material';
import { KeyCode } from '../../../types/keyCode';

export default function SliderAlt(props: SliderProps) {
  return (
    <div
      className='w-full leading-none'
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onKeyDownCapture={(e) => {
        if ([KeyCode.Up, KeyCode.Down].includes(e.key as KeyCode)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <Slider sx={{ touchAction: 'pan-y' }} {...props} />
    </div>
  );
}

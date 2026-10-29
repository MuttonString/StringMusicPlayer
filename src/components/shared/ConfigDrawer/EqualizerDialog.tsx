import { MenuItem, Select, Slider } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EQUALIZER, EQUALIZER_PRESETS } from '../../../constants/equalizer';
import useThrottle from '../../../hooks/useThrottle';
import { useConfig } from '../../../providers/ConfigProvider';
import type { DialogBaseProps } from '../../../types/component';
import DialogTemplate from '../../ui/DialogTemplate';

const presetEntries = Object.entries(EQUALIZER_PRESETS);

const marks = [30, 24, 18, 12, 6, 0, -6, -12, -18, -24, -30];

export default function EqualizerDialog({ open, onClose }: DialogBaseProps) {
  const [{ equalizer }, updateConfig] = useConfig();
  const { t } = useTranslation();
  const [selected, setSelected] = useState('');

  useEffect(() => {
    for (const [label, value] of presetEntries) {
      if (value.every((item, i) => item === equalizer[i])) {
        setSelected(label);
        return;
      }
    }
    setSelected('-');
  }, [equalizer]);

  const [eq, setEq] = useState(equalizer);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (draggingRef.current) return;
    setEq(equalizer);
  }, [equalizer]);

  const changeEq = useCallback(
    (val: typeof eq) => {
      updateConfig({ equalizer: val });
    },
    [updateConfig],
  );

  const changeEqThrottle = useThrottle(changeEq, 250);

  return (
    <DialogTemplate
      open={open}
      onClose={onClose}
      maxWidth='sm'
      title={t('equalizerDialog.title')}
    >
      <div className='flex flex-col'>
        <div className='flex gap-3 items-center min-w-1/2 w-fit'>
          <div className='text-nowrap'>{t('equalizerDialog.presets')}</div>
          <Select
            fullWidth
            value={selected}
            onChange={(e) => {
              const val = e.target.value;
              setSelected(val);
              if (val in EQUALIZER_PRESETS) {
                changeEq(
                  EQUALIZER_PRESETS[val as keyof typeof EQUALIZER_PRESETS],
                );
              }
            }}
          >
            {presetEntries.map(([item]) => (
              <MenuItem key={item} value={item}>
                {t('equalizerDialog.' + item)}
              </MenuItem>
            ))}
            <MenuItem key='-' value='-'>
              {t('equalizerDialog.custom')}
            </MenuItem>
          </Select>
        </div>

        <div className='flex w-full justify-center'>
          <div className='flex flex-col justify-between items-end text-sm text-text-secondary h-64 mt-3.5 text-nowrap'>
            {marks.map((item) => (
              <bdi dir='ltr' key={item}>
                {item > 0 ? `+${item} db` : `${item} db`}
              </bdi>
            ))}
          </div>

          {EQUALIZER.map((item, idx) => (
            <div
              className='w-12 flex flex-col items-center'
              key={item.frequency}
            >
              <div className='h-60 mt-6 mb-2'>
                <Slider
                  dir='ltr'
                  orientation='vertical'
                  valueLabelDisplay='auto'
                  marks={marks.map((value) => ({
                    value,
                  }))}
                  min={-30}
                  max={30}
                  value={eq[idx]}
                  track={false}
                  onChange={(_, val) => {
                    draggingRef.current = true;
                    const newVal = [...equalizer];
                    newVal[idx] = val;
                    setEq(newVal as unknown as typeof eq);
                    changeEqThrottle(newVal as unknown as typeof eq);
                  }}
                  onChangeCommitted={(_, val) => {
                    draggingRef.current = false;
                    const newVal = [...equalizer];
                    newVal[idx] = val;
                    changeEq(newVal as unknown as typeof eq);
                  }}
                />
              </div>
              <bdi
                dir='ltr'
                className='text-sm text-text-secondary tracking-tighter text-center'
              >
                {item.frequency >= 1000
                  ? `${item.frequency / 1000} kHz`
                  : `${item.frequency} Hz`}
              </bdi>
            </div>
          ))}
        </div>
      </div>
    </DialogTemplate>
  );
}

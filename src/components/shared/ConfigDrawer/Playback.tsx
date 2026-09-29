import {
  Autocomplete,
  FormControlLabel,
  FormHelperText,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IS_APPLE,
  IS_DESKTOP,
  SUPPORT_PLAYBACK_RATE,
  SUPPORT_SET_SINK_ID,
} from '../../../constants/os';
import { useConfig } from '../../../providers/ConfigProvider';
import type { RefsProp } from '../../../types/component';
import { ShowAudioWave } from '../../../types/config';
import LabelControlPair from '../../ui/LabelControlPair';
import SliderAlt from '../../ui/SliderAlt';
import VolumeSlider from '../../ui/VolumeSlider';

const speedMarks = [
  { value: 0.25 },
  { value: 0.5, label: '0.5x' },
  { value: 0.75 },
  { value: 1, label: '1x' },
  { value: 1.25 },
  { value: 1.5, label: '1.5x' },
  { value: 1.75 },
  { value: 2, label: '2x' },
];

export default function Playback({ refs }: RefsProp) {
  const { t } = useTranslation();
  const [config, updateConfig] = useConfig();

  const addRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      refs.current[key] = el;
    },
    [refs],
  );

  const [devices, setDevices] = useState<MediaDeviceInfo[]>();
  const [deviceOpen, setDeviceOpen] = useState(false);

  const getDevices = useCallback(async () => {
    let mediaDevices: MediaDeviceInfo[] = [];
    try {
      mediaDevices = (await navigator.mediaDevices.enumerateDevices()).filter(
        (item) => item.kind === 'audiooutput' && item.deviceId,
      );

      // 若没有可用的设备，申请权限，再次尝试获取
      if (!mediaDevices.length) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaDevices = (
            await navigator.mediaDevices.enumerateDevices()
          ).filter((item) => item.kind === 'audiooutput' && item.deviceId);
        } catch (err) {
          console.warn('Failed to get user media: ' + err);
        }
      }
    } catch (err) {
      console.error('Failed to get media devices: ' + err);
    }
    setDevices(mediaDevices);
  }, []);

  useEffect(() => {
    if (SUPPORT_SET_SINK_ID) getDevices();
  }, [getDevices]);

  useEffect(() => {
    if (!devices || !config.outputDevice) return;
    if (devices.some((item) => item.deviceId === config.outputDevice)) return;
    updateConfig({ outputDevice: '' });
  }, [config.outputDevice, devices, updateConfig]);

  const defaultDevice = useMemo(
    () => ({
      deviceId: '',
      label: t('config.followSystem'),
    }),
    [t],
  );

  const selectedDevice = useMemo(
    () =>
      devices?.find((item) => item.deviceId === config.outputDevice) ||
      defaultDevice,
    [config.outputDevice, defaultDevice, devices],
  );

  const playbackRate = config.speed[0];
  const [rate, setRate] = useState(playbackRate);
  useEffect(() => setRate(playbackRate), [playbackRate]);

  return (
    <div>
      <Typography variant='h6' color='primary' ref={addRef('playback')}>
        {t('config.playback')}
      </Typography>

      {SUPPORT_SET_SINK_ID && (
        <LabelControlPair
          ref={addRef('outputDevice')}
          label={t('config.outputDevice')}
          control={
            <Autocomplete
              openOnFocus
              size='small'
              loading={!devices}
              open={deviceOpen}
              onOpen={() => {
                setDeviceOpen(true);
                setDevices(undefined);
                getDevices();
              }}
              onClose={() => setDeviceOpen(false)}
              options={[defaultDevice, ...(devices || [])]}
              getOptionKey={(option) => option.deviceId}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) =>
                option.deviceId === value.deviceId
              }
              value={selectedDevice}
              onChange={(_, val) => {
                updateConfig({ outputDevice: val.deviceId });
              }}
              renderInput={(params) => <TextField {...params} />}
              disableClearable
            />
          }
        />
      )}

      <LabelControlPair
        ref={addRef('showAudioWave')}
        label={t('config.showAudioWave')}
        control={
          <Select
            value={config.showAudioWave}
            onChange={(e) => updateConfig({ showAudioWave: e.target.value })}
          >
            <MenuItem value={ShowAudioWave.Never}>{t('config.never')}</MenuItem>
            <MenuItem value={ShowAudioWave.Hovering}>
              {t('config.hovering')}
            </MenuItem>
            <MenuItem value={ShowAudioWave.Always}>
              {t('config.always')}
            </MenuItem>
          </Select>
        }
      />

      <div>
        <FormControlLabel
          ref={addRef('coverRotation')}
          label={t('config.coverRotation')}
          control={
            <Switch
              checked={config.coverRotation}
              onChange={(_, val) => {
                updateConfig({ coverRotation: val });
              }}
            />
          }
        />
        <FormHelperText>{t('config.coverRotationTip')}</FormHelperText>
      </div>

      {IS_DESKTOP && !IS_APPLE && (
        <>
          <div>
            <FormControlLabel
              ref={addRef('useCoverAsIcon')}
              label={t('config.useCoverAsIcon')}
              control={
                <Switch
                  checked={config.useCoverAsIcon}
                  onChange={(_, val) => {
                    updateConfig({ useCoverAsIcon: val });
                  }}
                />
              }
            />
          </div>

          <div>
            <FormControlLabel
              ref={addRef('useMusicTitleAsWindowTitle')}
              label={t('config.useMusicTitleAsWindowTitle')}
              control={
                <Switch
                  checked={config.useMusicTitleAsWindowTitle}
                  onChange={(_, val) => {
                    updateConfig({ useMusicTitleAsWindowTitle: val });
                  }}
                />
              }
            />
          </div>
        </>
      )}

      <div>
        <LabelControlPair
          ref={addRef('volume')}
          label={t('config.volume')}
          control={
            <div className='ms-2 me-2'>
              <VolumeSlider />
            </div>
          }
        />

        <FormControlLabel
          className='pt-2'
          label={t('config.canOver100')}
          control={
            <Switch
              checked={config.volume[1]}
              onChange={(_, val) => {
                updateConfig({
                  volume: [Math.min(val ? 400 : 100, config.volume[0]), val],
                });
              }}
            />
          }
        />
        <FormHelperText>{t('config.canOver100Tip')}</FormHelperText>
      </div>

      {SUPPORT_PLAYBACK_RATE && (
        <div>
          <LabelControlPair
            ref={addRef('speed')}
            label={t('config.speed')}
            control={
              <div className='ms-2 me-2'>
                <SliderAlt
                  value={rate}
                  onChange={(_, val) => {
                    setRate(val as number);
                  }}
                  onChangeCommitted={(_, val) =>
                    updateConfig({
                      speed: [val as number, config.speed[1]],
                    })
                  }
                  step={null}
                  min={0.25}
                  max={2}
                  marks={speedMarks}
                  valueLabelDisplay='auto'
                  valueLabelFormat={(val) => val + 'x'}
                  track={false}
                />
              </div>
            }
          />

          <FormControlLabel
            label={t('config.preservePitch')}
            control={
              <Switch
                checked={config.speed[1]}
                onChange={(_, val) => {
                  updateConfig({
                    speed: [config.speed[0], val],
                  });
                }}
              />
            }
          />
        </div>
      )}
    </div>
  );
}

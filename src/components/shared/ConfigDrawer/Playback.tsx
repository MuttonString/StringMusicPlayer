import {
  Autocomplete,
  Button,
  FormControlLabel,
  FormHelperText,
  MenuItem,
  Select,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IS_APPLE,
  IS_DESKTOP,
  SUPPORT_SET_SINK_ID,
} from '../../../constants/os';
import { useConfig } from '../../../providers/ConfigProvider';
import type { RefsProp } from '../../../types/component';
import { PlaybackMode, ShowAudioWave } from '../../../types/config';
import LabelControlPair from '../../ui/LabelControlPair';
import MaterialIcon from '../../ui/MaterialIcon';
import SliderAlt from '../../ui/SliderAlt';
import Tip from '../../ui/Tip';
import VolumeSlider from '../../ui/VolumeSlider';
import EqualizerDialog from './EqualizerDialog';

const speedMarks = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75 },
  { value: 1, label: '1x' },
  { value: 1.25 },
  { value: 1.5, label: '1.5x' },
  { value: 1.75 },
  { value: 2, label: '2x' },
];

const detuneMarks = [
  {
    value: -1200,
    label: (
      <>
        8<i>vb</i>
      </>
    ),
  },
  { value: 0, label: '♮' },
  {
    value: 1200,
    label: (
      <>
        8<i>va</i>
      </>
    ),
  },
];

export default function Playback({ refs }: RefsProp) {
  const { t } = useTranslation();
  const [config, updateConfig] = useConfig();
  const [eqOpen, setEqOpen] = useState(false);

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
      if (mediaDevices.length === 0) {
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

  const [speed, setSpeed] = useState(config.speed);
  useEffect(() => setSpeed(config.speed), [config.speed]);

  const [detune, setDetune] = useState(config.detune);
  useEffect(() => setDetune(config.detune), [config.detune]);

  return (
    <div>
      <Typography variant='h6' color='primary' ref={addRef('playback')}>
        {t('config.playback')}
      </Typography>

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
          label={t('config.over100Allowed')}
          control={
            <Switch
              checked={config.volumeOver100Allowed}
              onChange={(_, val) => {
                updateConfig({
                  volumeValue: Math.min(val ? 400 : 100, config.volumeValue),
                  volumeOver100Allowed: val,
                });
              }}
            />
          }
        />
        <FormHelperText>{t('config.over100AllowedTip')}</FormHelperText>
      </div>

      <div>
        <FormControlLabel
          ref={addRef('balanceVolume')}
          label={t('config.balanceVolume')}
          control={
            <Switch
              checked={config.balanceVolume}
              onChange={(_, val) => {
                updateConfig({ balanceVolume: val });
              }}
            />
          }
        />
      </div>

      <div>
        <LabelControlPair
          ref={addRef('speed')}
          label={t('config.speed')}
          control={
            <div className='ms-2 me-2'>
              <SliderAlt
                value={speed}
                onChange={(_, val) => {
                  setSpeed(val as number);
                }}
                onChangeCommitted={(_, val) =>
                  updateConfig({
                    speed: val as number,
                  })
                }
                step={null}
                min={0.5}
                max={2}
                marks={speedMarks}
                valueLabelDisplay='auto'
                valueLabelFormat={(val) => val + 'x'}
                track={false}
              />
            </div>
          }
        />
        <FormHelperText>{t('config.speedTip')}</FormHelperText>
      </div>

      <LabelControlPair
        ref={addRef('detune')}
        label={t('config.detune')}
        control={
          <div className='ms-2 me-2'>
            <SliderAlt
              value={detune}
              onChange={(_, val) => {
                setDetune(val as number);
              }}
              onChangeCommitted={(_, val) =>
                updateConfig({
                  detune: val as number,
                })
              }
              step={100}
              min={-1200}
              max={1200}
              marks={detuneMarks}
              valueLabelDisplay='auto'
              valueLabelFormat={(val) => {
                if (val === 0) return 0;
                if (val === 100) return '♯';
                if (val === -100) return '♭';
                if (val > 0) return <bdi dir='ltr'>{val / 100}♯</bdi>;
                if (val < 0) return <bdi dir='ltr'>{val / -100}♭</bdi>;
              }}
              track={false}
            />
          </div>
        }
      />

      <div>
        <Button
          ref={addRef('equalizer')}
          variant='outlined'
          fullWidth
          startIcon={<MaterialIcon name='equalizer' />}
          onClick={() => setEqOpen(true)}
        >
          {t('config.equalizer')}
        </Button>
        <EqualizerDialog open={eqOpen} onClose={() => setEqOpen(false)} />
      </div>

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
        <FormControlLabel
          ref={addRef('seekBySentence')}
          label={t('config.seekBySentence')}
          control={
            <Switch
              checked={config.seekBySentence}
              onChange={(_, val) => {
                updateConfig({ seekBySentence: val });
              }}
            />
          }
        />
        <FormHelperText>{t('config.seekBySentenceTip')}</FormHelperText>
      </div>

      <div>
        <FormControlLabel
          ref={addRef('replaceWholeQueue')}
          label={t('config.replaceWholeQueue')}
          control={
            <Switch
              checked={config.replaceWholeQueue}
              onChange={(_, val) => {
                updateConfig({ replaceWholeQueue: val });
              }}
            />
          }
        />
      </div>

      <LabelControlPair
        label={t('config.playbackMode')}
        ref={addRef('playbackMode')}
        control={
          <ToggleButtonGroup
            fullWidth
            color='primary'
            size='small'
            exclusive
            value={config.playbackMode}
            onChange={(_, val) => updateConfig({ playbackMode: val })}
          >
            <Tip title={t('config.noRepeat')}>
              <ToggleButton value={PlaybackMode.NoRepeat}>
                <MaterialIcon name='stop' />
              </ToggleButton>
            </Tip>
            <Tip title={t('config.repeatOne')}>
              <ToggleButton value={PlaybackMode.RepeatOne}>
                <MaterialIcon name='repeatOne' />
              </ToggleButton>
            </Tip>
            <Tip title={t('config.repeatQueue')}>
              <ToggleButton value={PlaybackMode.RepeatQueue}>
                <MaterialIcon name='repeat' />
              </ToggleButton>
            </Tip>
            <Tip title={t('config.shuffle')}>
              <ToggleButton value={PlaybackMode.Shuffle}>
                <MaterialIcon name='shuffle' />
              </ToggleButton>
            </Tip>
          </ToggleButtonGroup>
        }
      />
    </div>
  );
}

import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { basename, pictureDir } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VERTICAL } from '../../../constants/animation';
import { COLOR_LABEL_MAP, COLOR_VALUE_MAP } from '../../../constants/colors';
import { IMAGE_FILE_FILTER } from '../../../constants/file';
import { IS_DESKTOP } from '../../../constants/os';
import {
  SUPPORT_ACRYLIC,
  SUPPORT_BLUR,
  SUPPORT_MICA,
} from '../../../constants/window';
import { useConfig } from '../../../providers/ConfigProvider';
import type { RefsProp } from '../../../types/component';
import { BackgroundType, ColorMode, Colors } from '../../../types/config';
import FontSelect from '../../ui/FontSelect';
import LabelControlPair from '../../ui/LabelControlPair';
import MaterialIcon from '../../ui/MaterialIcon';
import SliderAlt from '../../ui/SliderAlt';
import Tip from '../../ui/Tip';

const animationDurationMarks = [
  { value: 0, label: '0' },
  { value: 1, label: '0.5x' },
  { value: 2, label: '1x' },
  { value: 3, label: '1.5x' },
  { value: 4, label: '2x' },
  { value: 5, label: '5x' },
  { value: 6, label: '10x' },
] as const;

const opacityMarks = Array.from({ length: 4 }, (_, i) => ({
  value: (i + 1) * 20,
}));

export default function WindowAppeance({ refs }: RefsProp) {
  const { t } = useTranslation();
  const [config, updateConfig] = useConfig();

  const addRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      refs.current[key] = el;
    },
    [refs],
  );

  const globalFont = config.globalFont;
  const [font, setFont] = useState(globalFont);
  useEffect(() => setFont(globalFont), [globalFont]);

  const bgMainOpacity = config.backgroundMainWindowOpacity;
  const [opacityMain, setOpacityMain] = useState(bgMainOpacity);
  useEffect(() => setOpacityMain(bgMainOpacity), [bgMainOpacity]);

  const bgMiniOpacity = config.backgroundMiniWindowOpacity;
  const [opacityMini, setOpacityMini] = useState(bgMiniOpacity);
  useEffect(() => setOpacityMini(bgMiniOpacity), [bgMiniOpacity]);

  const materialOpacity = config.advancedMaterialOpacity;
  const [opacityMaterial, setOpacityMaterial] = useState(materialOpacity);
  useEffect(() => setOpacityMaterial(materialOpacity), [materialOpacity]);

  const bgPath = config.backgroundMainWindowPath;
  const [path, setPath] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    setPath(bgPath);
    if (bgPath) {
      basename(bgPath)
        .then((val) => setName(val))
        .catch((err) => console.error('Failed to get basename: ' + err));
    } else {
      setName('');
    }
  }, [bgPath]);

  const duration = config.animationDuration;
  const [animationDuration, setAnimationDuration] = useState(duration);
  useEffect(
    () =>
      setAnimationDuration(
        animationDurationMarks.find(
          (item) => parseFloat(item.label) === duration,
        )?.value ?? 2,
      ),
    [duration],
  );

  const selectPicture = useCallback(
    async (directory?: boolean) => {
      let defaultPath: string | undefined = undefined;
      try {
        defaultPath = path || (await pictureDir());
      } catch (err) {
        console.error('Failed to get picture directory: ' + err);
      }

      const newPath = await open({
        title: t(directory ? 'config.selectFolder' : 'config.selectPicture'),
        defaultPath,
        filters: [
          {
            name: t('common.imageFiles'),
            extensions: [
              'png',
              'jpg',
              'jpeg',
              'jfif',
              'pjpeg',
              'pjp',
              'webp',
              'bmp',
              'gif',
              'apng',
              'avif',
            ],
          },
          ...IMAGE_FILE_FILTER,
          { name: t('common.allFiles'), extensions: ['*'] },
        ],
        directory,
      });

      if (!newPath) return;
      updateConfig({
        backgroundMainWindowPath: newPath,
      });
    },
    [path, t, updateConfig],
  );

  const colors = useMemo(() => {
    const entries = Object.entries(COLOR_LABEL_MAP);
    entries.splice(Colors.Slate, 0, ['', 'slate']); // 空白占位
    return entries;
  }, []);

  return (
    <div>
      <Typography variant='h6' color='primary' ref={addRef('windowAppearance')}>
        {t('config.windowAppearance')}
      </Typography>

      <LabelControlPair
        label={t('config.colorMode')}
        ref={addRef('colorMode')}
        control={
          <ToggleButtonGroup
            fullWidth
            color='primary'
            size='small'
            exclusive
            value={config.colorMode}
            onChange={(_, val) => updateConfig({ colorMode: val })}
          >
            <Tip title={t('config.light')}>
              <ToggleButton value={ColorMode.Light}>
                <MaterialIcon name='lightMode' />
              </ToggleButton>
            </Tip>
            <Tip title={t('config.followSystem')}>
              <ToggleButton value={ColorMode.FollowSystem}>
                <MaterialIcon name='settingsBrightness' />
              </ToggleButton>
            </Tip>
            <Tip title={t('config.dark')}>
              <ToggleButton value={ColorMode.Dark}>
                <MaterialIcon name='darkMode' />
              </ToggleButton>
            </Tip>
          </ToggleButtonGroup>
        }
      />

      <LabelControlPair
        ref={addRef('primaryColor')}
        label={t('config.primaryColor')}
        control={
          <div className='grid grid-cols-9 grid-rows-3 aspect-9/3 gap-0.5'>
            {colors.map(([key, value]) => {
              if (!key) return <div key={key} />;

              const colorId: Colors = Number(key);
              return (
                <Tip key={key} title={t('color.' + value)}>
                  <Button
                    color='inherit'
                    variant='outlined'
                    className='min-w-0! p-0! border-2! border-divider! hover:border-text-primary! forced-color-adjust-none'
                    style={{
                      background: COLOR_VALUE_MAP[colorId],
                    }}
                    onClick={() => {
                      if (config.primaryColor === colorId) return;
                      updateConfig({ primaryColor: colorId });
                    }}
                  >
                    {config.primaryColor === colorId && (
                      <MaterialIcon name='checkCircle' />
                    )}
                  </Button>
                </Tip>
              );
            })}
          </div>
        }
      />

      <div className='flex flex-col'>
        <LabelControlPair
          ref={addRef('backgroundMainWindow')}
          label={t('config.backgroundMainWindow')}
          control={
            <Select
              fullWidth
              value={config.backgroundMainWindowType}
              onChange={(e) =>
                updateConfig({
                  backgroundMainWindowType: e.target.value,
                })
              }
            >
              <MenuItem value={BackgroundType.Standard}>
                {t('config.standard')}
              </MenuItem>
              {SUPPORT_BLUR && (
                <MenuItem value={BackgroundType.Blur}>
                  {t('config.blur')}
                </MenuItem>
              )}
              {SUPPORT_ACRYLIC && (
                <MenuItem value={BackgroundType.Acrylic}>
                  {t('config.acrylic')}
                </MenuItem>
              )}
              {SUPPORT_MICA && (
                <MenuItem value={BackgroundType.Mica}>
                  {t('config.mica')}
                </MenuItem>
              )}
              <MenuItem value={BackgroundType.SinglePicture}>
                {t('config.singlePicture')}
              </MenuItem>
              {IS_DESKTOP && (
                <MenuItem value={BackgroundType.RandomPictures}>
                  {t('config.randomPictures')}
                </MenuItem>
              )}
            </Select>
          }
        />

        <AnimatePresence initial={false}>
          {[
            BackgroundType.SinglePicture,
            BackgroundType.RandomPictures,
          ].includes(config.backgroundMainWindowType) && (
            <motion.div
              variants={VERTICAL}
              custom='102.5px'
              initial='hidden'
              animate='visible'
              exit='hidden'
              className='pt-2!'
            >
              <ButtonGroup fullWidth>
                <Button
                  startIcon={
                    <MaterialIcon
                      name={
                        config.backgroundMainWindowType ===
                        BackgroundType.SinglePicture
                          ? 'fileOpen'
                          : 'folderOpen'
                      }
                    />
                  }
                  variant='outlined'
                  onClick={() =>
                    selectPicture(
                      config.backgroundMainWindowType ===
                        BackgroundType.RandomPictures,
                    )
                  }
                >
                  {t(
                    config.backgroundMainWindowType ===
                      BackgroundType.SinglePicture
                      ? 'config.selectPicture'
                      : 'config.selectFolder',
                  )}
                </Button>
                <Tip title={t('common.clear')}>
                  <Button
                    sx={{ width: '2rem' }}
                    variant='outlined'
                    onClick={() =>
                      updateConfig({
                        backgroundMainWindowPath: '',
                      })
                    }
                  >
                    <MaterialIcon name='clear' />
                  </Button>
                </Tip>
              </ButtonGroup>
              <Tip title={<bdi dir='ltr'>{path}</bdi>} disabled={!path}>
                <FormHelperText dir='ltr' className='truncate'>
                  {name || t('config.defaultPicture')}
                </FormHelperText>
              </Tip>

              <div className='flex gap-4 me-2 items-center pt-2'>
                <span>{t('config.opacity')}</span>
                <SliderAlt
                  value={opacityMain}
                  onChange={(_, val) => {
                    const style = document.body.style;
                    style.setProperty(
                      '--bg-overlay',
                      `rgb(var(--mui-palette-AppBar-defaultBgChannel) / ${val}%)`,
                    );
                    setOpacityMain(val as number);
                  }}
                  onChangeCommitted={(_, val) =>
                    updateConfig({
                      backgroundMainWindowOpacity: val as number,
                    })
                  }
                  marks={opacityMarks}
                  valueLabelDisplay='auto'
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <LabelControlPair
          label={t('config.backgroundMiniWindow')}
          ref={addRef('backgroundMiniWindow')}
          control={
            <Select
              fullWidth
              value={config.backgroundMiniWindowType}
              onChange={(e) =>
                updateConfig({
                  backgroundMiniWindowType: e.target.value,
                })
              }
            >
              <MenuItem value={BackgroundType.Standard}>
                {t('config.standard')}
              </MenuItem>
              {SUPPORT_BLUR && (
                <MenuItem value={BackgroundType.Blur}>
                  {t('config.blur')}
                </MenuItem>
              )}
              {SUPPORT_ACRYLIC && (
                <MenuItem value={BackgroundType.Acrylic}>
                  {t('config.acrylic')}
                </MenuItem>
              )}
              {SUPPORT_MICA && (
                <MenuItem value={BackgroundType.Mica}>
                  {t('config.mica')}
                </MenuItem>
              )}
            </Select>
          }
        />

        <AnimatePresence initial={false}>
          {config.backgroundMiniWindowType === BackgroundType.Standard && (
            <motion.div
              className='flex gap-4 me-2 items-center pt-2'
              variants={VERTICAL}
              custom='38px'
              initial='hidden'
              animate='visible'
              exit='hidden'
            >
              <span>{t('config.opacity')}</span>
              <SliderAlt
                value={opacityMini}
                onChange={(_, val) => {
                  setOpacityMini(val as number);
                }}
                onChangeCommitted={(_, val) =>
                  updateConfig({
                    backgroundMiniWindowOpacity: val as number,
                  })
                }
                marks={opacityMarks}
                valueLabelDisplay='auto'
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <LabelControlPair
        label={t('config.globalFont')}
        ref={addRef('globalFont')}
        control={
          <FontSelect
            value={font}
            onChange={(val) => setFont(val)}
            onBlur={() => updateConfig({ globalFont: font })}
          />
        }
      />

      <div>
        <FormControlLabel
          ref={addRef('advancedMaterial')}
          label={t('config.advancedMaterial')}
          control={
            <Switch
              checked={config.advancedMaterialEnabled}
              onChange={(_, val) =>
                updateConfig({
                  advancedMaterialEnabled: val,
                })
              }
            />
          }
        />

        <AnimatePresence initial={false}>
          {config.advancedMaterialEnabled && (
            <motion.div
              className='flex gap-4 me-2 items-center pt-2'
              variants={VERTICAL}
              custom='38px'
              initial='hidden'
              animate='visible'
              exit='hidden'
            >
              <span>{t('config.opacity')}</span>
              <SliderAlt
                value={opacityMaterial}
                onChange={(_, val) => {
                  document.body.style.setProperty(
                    '--advanced-material-opacity',
                    String((val as number) / 100),
                  );
                  setOpacityMaterial(val as number);
                }}
                onChangeCommitted={(_, val) =>
                  updateConfig({
                    advancedMaterialOpacity: val as number,
                  })
                }
                marks={opacityMarks}
                valueLabelDisplay='auto'
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <FormControlLabel
          ref={addRef('sharpStyle')}
          label={t('config.sharpStyle')}
          control={
            <Switch
              checked={config.sharpStyle}
              onChange={(_, val) => updateConfig({ sharpStyle: val })}
            />
          }
        />
      </div>

      <LabelControlPair
        ref={addRef('animationDuration')}
        label={t('config.animationDuration')}
        control={
          <div className='ms-2 me-2'>
            <SliderAlt
              step={null}
              marks={animationDurationMarks}
              value={animationDuration}
              onChange={(_, val) => setAnimationDuration(val as number)}
              onChangeCommitted={(_, val) =>
                updateConfig({
                  animationDuration: parseFloat(
                    animationDurationMarks[val as number].label,
                  ),
                })
              }
              max={6}
              track={false}
              valueLabelFormat={(val) => animationDurationMarks[val].label}
            />
          </div>
        }
      />
    </div>
  );
}

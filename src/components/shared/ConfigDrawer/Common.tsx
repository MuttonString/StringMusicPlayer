import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IS_APPLE, IS_DESKTOP } from '../../../constants/os';
import { useConfig } from '../../../providers/ConfigProvider';
import type { RefsProp } from '../../../types/component';
import { CloseWindowAction } from '../../../types/config';
import LabelControlPair from '../../ui/LabelControlPair';
import MaterialIcon from '../../ui/MaterialIcon';
import LangDialog from './LangDialog';

export default function Common({ refs }: RefsProp) {
  const { t } = useTranslation();
  const [config, updateConfig] = useConfig();
  const [langOpen, setLangOpen] = useState(false);

  const addRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      refs.current[key] = el;
    },
    [refs],
  );

  const [autoStart, setAutoStart] = useState(false);
  useEffect(() => {
    isEnabled().then(setAutoStart);
  }, []);

  return (
    <div>
      <Typography variant='h6' color='primary' ref={addRef('common')}>
        {t('config.common')}
      </Typography>

      {/* 该项不受程序配置文件控制 */}
      <div>
        <FormControlLabel
          ref={addRef('autoStart')}
          label={t('config.autoStart')}
          control={
            <Switch
              checked={autoStart}
              onChange={(_, val) => {
                if (val) enable();
                else disable();
                setAutoStart(val);
              }}
            />
          }
        />
      </div>

      <LabelControlPair
        ref={addRef('language')}
        label={t('config.language')}
        control={
          <Button
            variant='outlined'
            onClick={() => setLangOpen(true)}
            startIcon={<MaterialIcon name='openInNew' />}
          >
            {t('langDialog.title')}
          </Button>
        }
      />
      <LangDialog open={langOpen} onClose={() => setLangOpen(false)} />

      {IS_DESKTOP && !IS_APPLE && (
        <LabelControlPair
          ref={addRef('closeWindowAction')}
          label={t('config.closeWindowAction')}
          control={
            <Select
              value={config.closeWindowAction}
              onChange={(e) =>
                updateConfig({ closeWindowAction: e.target.value })
              }
            >
              <MenuItem value={CloseWindowAction.Ask}>
                {t('config.ask')}
              </MenuItem>
              <MenuItem value={CloseWindowAction.Minimize}>
                {t('config.minimize')}
              </MenuItem>
              <MenuItem value={CloseWindowAction.Exit}>
                {t('config.exit')}
              </MenuItem>
            </Select>
          }
        />
      )}

      <div className='flex flex-col gap-2'>
        <FormControlLabel
          ref={addRef('autoCheckUpdate')}
          label={t('config.autoCheckUpdate')}
          control={
            <Switch
              checked={config.autoCheckUpdate}
              onChange={(_, val) => updateConfig({ autoCheckUpdate: val })}
            />
          }
        />
        <Button
          ref={addRef('checkUpdate')}
          fullWidth
          variant='outlined'
          onClick={() => {
            //todo
          }}
        >
          {t('config.checkUpdate')}
        </Button>
      </div>
    </div>
  );
}

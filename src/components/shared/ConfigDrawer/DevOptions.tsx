import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { appDataDir, appLogDir } from '@tauri-apps/api/path';
import { openPath } from '@tauri-apps/plugin-opener';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IS_DESKTOP } from '../../../constants/os';
import { useConfig } from '../../../providers/ConfigProvider';
import type { RefsProp } from '../../../types/component';
import { compress, decompress } from '../../../utils/data';
import LabelControlPair from '../../ui/LabelControlPair';
import MaterialIcon from '../../ui/MaterialIcon';

export default function DevOptions({ refs }: RefsProp) {
  const { t } = useTranslation();
  const [config, updateConfig] = useConfig();

  const scr = config.script;
  const [script, setScript] = useState('');
  useEffect(() => {
    if (scr) setScript(decompress(scr));
  }, [scr]);

  const addRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      refs.current[key] = el;
    },
    [refs],
  );

  return (
    <div>
      <Typography variant='h6' color='primary' ref={addRef('devOptions')}>
        {t('config.devOptions')}
      </Typography>

      <div>
        <FormControlLabel
          ref={addRef('enableDevOptions')}
          label={t('config.enableDevOptions')}
          control={
            <Switch
              checked={config.enableDevOptions}
              onChange={(_, val) => updateConfig({ enableDevOptions: val })}
            />
          }
        />
      </div>

      <div>
        <FormControlLabel
          ref={addRef('forceRTL')}
          label={t('config.forceRTL')}
          control={
            <Switch
              checked={config.forceRTL}
              onChange={(_, val) => updateConfig({ forceRTL: val })}
            />
          }
        />
      </div>

      <div>
        <FormControlLabel
          ref={addRef('showFooter')}
          label={t('config.showFooter')}
          control={
            <Switch
              checked={config.showFooter}
              onChange={(_, val) => updateConfig({ showFooter: val })}
            />
          }
        />
      </div>

      <LabelControlPair
        ref={addRef('script')}
        label={t('config.script')}
        control={
          <>
            <TextField
              multiline
              fullWidth
              size='small'
              rows={5}
              className='[&_textarea]:font-mono!'
              value={script}
              onChange={(e) => setScript(e.target.value)}
              onBlur={() =>
                updateConfig({
                  script: script.trim() ? compress(script) : '',
                })
              }
            />
            <FormHelperText className='text-warning!'>
              {t('config.scriptWarning')}
            </FormHelperText>
          </>
        }
      />

      <div className='flex flex-col gap-2'>
        {IS_DESKTOP && (
          <>
            <Button
              variant='outlined'
              fullWidth
              startIcon={<MaterialIcon name='openInNew' />}
              onClick={async () => openPath(await appDataDir())}
              ref={addRef('openAppdata')}
            >
              {t('config.openAppdata')}
            </Button>

            <Button
              variant='outlined'
              fullWidth
              startIcon={<MaterialIcon name='openInNew' />}
              onClick={async () => openPath(await appLogDir())}
              ref={addRef('openLog')}
            >
              {t('config.openLog')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

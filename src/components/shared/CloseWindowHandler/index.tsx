import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IS_APPLE, IS_DESKTOP } from '../../../constants/os';
import { WINDOW_LABEL } from '../../../constants/window';
import { useConfig } from '../../../providers/ConfigProvider';
import { CloseWindowAction } from '../../../types/config';
import { BackendEvent } from '../../../types/event';
import { destroyAll } from '../../../utils/window';
import DialogTemplate from '../../ui/DialogTemplate';

const appWindow = getCurrentWebviewWindow();

export default function CloseWindowHandler() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [config, updateConfig] = useConfig();
  const { t } = useTranslation();

  useEffect(() => {
    if (!IS_DESKTOP) return;

    if (IS_APPLE) {
      const unlistenClose = appWindow.onCloseRequested((e) => {
        e.preventDefault();
        appWindow.hide();
      });
      const unlistenReopen = listen(BackendEvent.Reopen, () =>
        appWindow.show(),
      );

      return () => {
        unlistenClose.then((fn) => fn());
        unlistenReopen.then((fn) => fn());
      };
    }

    const unlisten = appWindow.onCloseRequested(async (e) => {
      e.preventDefault();
      switch (config.closeWindowAction) {
        case CloseWindowAction.Minimize:
          if (WINDOW_LABEL === 'main') {
            appWindow.hide();
            break;
          }
          appWindow.destroy();
          break;
        case CloseWindowAction.Exit:
          destroyAll();
          break;
        default:
          setOpen(true);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [config.closeWindowAction]);

  return (
    <DialogTemplate
      title={t('closeWindowDialog.title')}
      maxWidth='xs'
      open={open}
      onClose={() => setOpen(false)}
    >
      <div className='flex flex-col items-start'>
        <Button
          className='justify-start!'
          fullWidth
          size='large'
          onClick={() => {
            setOpen(false);
            if (checked) {
              updateConfig({ closeWindowAction: CloseWindowAction.Minimize });
            }
            appWindow.hide();
          }}
        >
          {t('closeWindowDialog.minimize')}
        </Button>
        <Button
          className='justify-start!'
          fullWidth
          size='large'
          onClick={() => {
            setOpen(false);
            if (checked) {
              updateConfig({ closeWindowAction: CloseWindowAction.Exit });
            }
            setTimeout(destroyAll);
          }}
        >
          {t('closeWindowDialog.exit')}
        </Button>
        <FormControlLabel
          control={
            <Checkbox value={checked} onChange={(_, val) => setChecked(val)} />
          }
          label={t('closeWindowDialog.neverAsk')}
        />
      </div>
    </DialogTemplate>
  );
}

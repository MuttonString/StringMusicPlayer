import { TextField } from '@mui/material';
import { emit } from '@tauri-apps/api/event';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DialogTemplate from '../../components/ui/DialogTemplate';
import { DIALOG_LEVAING_MS } from '../../constants/animation';
import { useConfig } from '../../providers/ConfigProvider';
import type { DialogBaseProps } from '../../types/component';
import { BackendEvent } from '../../types/event';
import delay from '../../utils/delay';

export default function OpenUrlsDialog({ open, onClose }: DialogBaseProps) {
  const { t } = useTranslation();
  const [urls, setUrls] = useState('');
  const [config] = useConfig();

  const handleClose = async () => {
    onClose();
    await delay(config.animationDuration * DIALOG_LEVAING_MS);
    setUrls('');
  };

  return (
    <DialogTemplate
      title={t('home.openUrls')}
      open={open}
      onClose={handleClose}
      maxWidth='xs'
      onConfirm={async () => {
        handleClose();
        const urlList = urls
          .split('\n')
          .filter((item) => item.includes('://'))
          .map((item) => item.trim());
        if (urlList.length) {
          emit(BackendEvent.OpenUri, urlList);
        }
      }}
    >
      <TextField
        autoFocus
        multiline
        fullWidth
        maxRows={5}
        placeholder={t('home.openUrlsTip')}
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
        size='small'
      />
    </DialogTemplate>
  );
}

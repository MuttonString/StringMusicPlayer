import { Button, Typography } from '@mui/material';
import { emit } from '@tauri-apps/api/event';
import { audioDir } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MaterialIcon from '../../components/ui/MaterialIcon';
import {
  SUPPORTED_AUDIO_EXT_LIST,
  SUPPORTED_AUDIO_FILTER_MAP,
} from '../../constants/file';
import { IS_DESKTOP } from '../../constants/os';
import { BackendEvent } from '../../types/event';
import OpenUrlsDialog from './OpenUrlsDialog';

export default function Home() {
  const { t } = useTranslation();
  const defaultPathRef = useRef('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectAudios = useCallback(
    async (directory?: boolean) => {
      let defaultPath: string | undefined = undefined;
      try {
        defaultPath = defaultPathRef.current || (await audioDir());
      } catch (err) {
        console.error('Failed to get audio directory: ' + err);
      }

      const newPaths = await open({
        title: t(directory ? 'home.openFolders' : 'home.openFiles'),
        defaultPath,
        filters: [
          {
            name: t('common.supportedAudioFiles'),
            extensions: SUPPORTED_AUDIO_EXT_LIST,
          },
          ...SUPPORTED_AUDIO_FILTER_MAP,
        ],
        directory,
        multiple: true,
      });

      if (!newPaths) return;
      defaultPathRef.current = newPaths[0];
      emit(BackendEvent.OpenUri, newPaths);
    },
    [t],
  );

  return (
    <div className='flex h-full items-center justify-center'>
      <div className='flex flex-col min-w-50 gap-2'>
        <Typography color='textPrimary' variant='h4' className='ps-2.75'>
          {t('home.welcome')}
        </Typography>
        <Typography
          variant='inherit'
          color='textSecondary'
          className='ps-2.75 pb-4 min-w-0 max-w-[80dvw]'
        >
          {t('home.desc')}
        </Typography>
        <Button
          fullWidth
          size='large'
          className='justify-start!'
          startIcon={<MaterialIcon name='fileOpen' />}
          onClick={() => selectAudios()}
        >
          {t('home.openFiles')}
        </Button>
        {IS_DESKTOP && (
          <Button
            fullWidth
            size='large'
            className='justify-start!'
            startIcon={<MaterialIcon name='folderOpen' />}
            onClick={() => selectAudios(true)}
          >
            {t('home.openFolders')}
          </Button>
        )}
        <Button
          fullWidth
          size='large'
          className='justify-start!'
          startIcon={<MaterialIcon name='link' />}
          onClick={() => setDialogOpen(true)}
        >
          {t('home.openUrls')}
        </Button>
        <OpenUrlsDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      </div>
    </div>
  );
}

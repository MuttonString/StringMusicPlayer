import type { ButtonProps } from '@mui/material';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ICON_MAP } from '../../../constants/icons';
import { useConfig } from '../../../providers/ConfigProvider';
import { PlaybackMode } from '../../../types/config';
import MaterialIcon from '../../ui/MaterialIcon';
import Tip from '../../ui/Tip';

const items: {
  icon: keyof typeof ICON_MAP;
  value: PlaybackMode;
  label: string;
}[] = [
  { icon: 'stop', value: PlaybackMode.NoRepeat, label: 'noRepeat' },
  { icon: 'repeatOne', value: PlaybackMode.RepeatOne, label: 'repeatOne' },
  { icon: 'repeat', value: PlaybackMode.RepeatQueue, label: 'repeatQueue' },
  { icon: 'shuffle', value: PlaybackMode.Shuffle, label: 'shuffle' },
];

export default function PlaybackModeButton(props: ButtonProps) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [config, updateConfig] = useConfig();

  return (
    <>
      <Menu
        open={!!anchor}
        anchorEl={anchor}
        anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
        transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        onClose={() => setAnchor(null)}
      >
        {items.map((item) => (
          <MenuItem
            key={item.value}
            onClick={() => {
              setAnchor(null);
              updateConfig({ playbackMode: item.value });
            }}
            selected={item.value === config.playbackMode}
          >
            <ListItemIcon>
              <MaterialIcon name={item.icon} />
            </ListItemIcon>
            <ListItemText>{t('media.' + item.label)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
      <Tip
        placement='top'
        title={
          <>
            <div className='font-bold'>{t('media.playbackMode')}</div>
            <div>
              {t(
                'media.' +
                  (items.find((item) => item.value === config.playbackMode)
                    ?.label || 'repeatQueue'),
              )}
            </div>
          </>
        }
      >
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} {...props}>
          <MaterialIcon
            name={
              items.find((item) => item.value === config.playbackMode)?.icon ||
              'repeat'
            }
          />
        </IconButton>
      </Tip>
    </>
  );
}

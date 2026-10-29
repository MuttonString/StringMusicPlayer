import AndroidIcon from '@mui/icons-material/Android';
import AppleIcon from '@mui/icons-material/Apple';
import GitHubIcon from '@mui/icons-material/GitHub';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { getTauriVersion, getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { arch, locale, type, version } from '@tauri-apps/plugin-os';
import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OPEN_SOURCE_LIBRARY } from '../../../constants/lib';
import { ARCH_MAP, OS_TYPE_MAP } from '../../../constants/os';
import { useConfig } from '../../../providers/ConfigProvider';
import { useSnackbar } from '../../../providers/SnackbarProvider';
import type { RefsProp } from '../../../types/component';
import { parseLangTag } from '../../../utils/lang';
import DialogTemplate from '../../ui/DialogTemplate';

interface Info {
  ver: string;
  tauri: string;
  react: string;
  webview: string;
  type: [text: string, icon: ReactNode];
  osVer: string;
  arch: string;
  locale: string | null;
}

const iconMap = {
  windows: <MicrosoftIcon fontSize='small' />,
  macos: <AppleIcon fontSize='small' />,
  linux: null,
  android: <AndroidIcon fontSize='small' />,
  ios: <AppleIcon fontSize='small' />,
};

export default function About({ refs }: RefsProp) {
  const [info, setInfo] = useState<Info>();
  const [_, updateConfig] = useConfig();
  const { t } = useTranslation();
  const showSnackbar = useSnackbar();
  const [libOpen, setLibOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      let osVer = version();
      let ar: string = arch();
      const tp: Info['type'] = [OS_TYPE_MAP[type()], iconMap[type()]];

      switch (tp[0]) {
        case 'Windows':
          // 把Windows内核版本号转换为系统版本
          const splited = osVer.split('.');
          if (splited[0] === '6') {
            switch (splited[1]) {
              case '0':
                osVer = 'Vista Build ' + splited[2];
                break;
              case '1':
                osVer = '7 Build ' + splited[2];
                break;
              case '2':
                osVer = '8 Build ' + splited[2];
                break;
              case '3':
                osVer = '8.1 Build ' + splited[2];
                break;
              case '4':
                osVer = '10 Build ' + splited[2];
                break;
            }
          } else if (splited[0] === '10') {
            if (Number(splited[2]) >= 22000) {
              osVer = '11 Build ' + splited[2];
            } else {
              osVer = '10 Build ' + splited[2];
            }
          }
          ar = ` (${ARCH_MAP[ar as ReturnType<typeof arch>]})`;
          break;

        case 'macOS':
          if (ar === 'x86_64') {
            ar = ' (Intel)';
          } else if (ar === 'aarch64') {
            ar = ' (Apple Silicon)';
          }
          break;

        case 'iOS':
          ar = '';
          break;

        default:
          ar = ` (${ARCH_MAP[ar as ReturnType<typeof arch>]})`;
          break;
      }

      try {
        let lc = await locale();
        if (lc) {
          lc = parseLangTag(lc);
        } else {
          lc = t('config.unknown');
        }

        setInfo({
          type: tp,
          arch: ar,
          osVer,
          ver: await getVersion(),
          tauri: await getTauriVersion(),
          react: React.version,
          locale: lc,
          webview: await invoke('webview_ver'),
        });
      } catch (err) {
        console.error('Failed to get system info: ' + err);
      }
    };
    init();
  }, [t]);

  const addRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      refs.current[key] = el;
    },
    [refs],
  );

  return (
    <div>
      <Typography variant='h6' color='primary' ref={addRef('about')}>
        {t('config.about')}
      </Typography>

      <div>
        <List dense disablePadding>
          <ListItem disablePadding>
            <ListItemButton
              onDoubleClick={() => {
                openUrl('https://github.com/MuttonString/StringMusicPlayer');
              }}
            >
              <ListItemIcon sx={{ marginRight: '8px' }}>
                <Avatar src='https://avatars.githubusercontent.com/u/97750941'>
                  <GitHubIcon color='action' />
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={t('config.author')}
                secondary='Mutton String'
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton onClick={() => setLibOpen(true)}>
              <ListItemText
                primary={t('config.openSourceLib')}
                secondary={t('config.clickToView')}
              />
            </ListItemButton>
          </ListItem>

          <DialogTemplate
            title={t('config.openSourceLib')}
            maxWidth='xs'
            open={libOpen}
            onClose={() => setLibOpen(false)}
          >
            {OPEN_SOURCE_LIBRARY.map((item, idx) => (
              <Button size='small' key={idx} onClick={() => openUrl(item[1])}>
                {item[0]}
              </Button>
            ))}
          </DialogTemplate>

          <ListItem disablePadding>
            <ListItemButton
              onDoubleClick={() => {
                updateConfig({ enableDevOptions: true });
                showSnackbar(t('msg.devOptionEnabled'));
              }}
            >
              <ListItemText
                primary={t('config.appVer')}
                secondary={info?.ver}
              />
            </ListItemButton>
          </ListItem>

          <ListItem>
            <ListItemText
              primary={t('config.frameworkVer')}
              secondary={info && `Tauri ${info.tauri}, React ${info.react}`}
            />
          </ListItem>

          <ListItem>
            <ListItemText
              primary={t('config.webviewVer')}
              secondary={info?.webview}
            />
          </ListItem>

          <ListItem>
            <ListItemText
              primary={t('config.osInfo')}
              secondary={
                info && (
                  <span className='flex gap-1 items-center'>
                    {info.type[1]}
                    <span>{`${info.type[0]} ${info.osVer}${info.arch}`}</span>
                  </span>
                )
              }
            />
          </ListItem>

          <ListItem>
            <ListItemText
              primary={t('config.locale')}
              secondary={info?.locale}
            />
          </ListItem>
        </List>
      </div>
    </div>
  );
}

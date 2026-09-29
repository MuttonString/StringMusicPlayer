import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { appDataDir, BaseDirectory, join } from '@tauri-apps/api/path';
import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  watchImmediate,
} from '@tauri-apps/plugin-fs';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DIALOG_LEVAING_MS } from '../../../constants/animation';
import { useScrollKeyPressed } from '../../../hooks/useScrollKeyPressed';
import { useConfig } from '../../../providers/ConfigProvider';
import type { DialogBaseProps } from '../../../types/component';
import { BuiltInLang } from '../../../types/lang';
import type { ResInfo } from '../../../types/resource';
import delay from '../../../utils/delay';
import { getLangs, isBuiltInLang } from '../../../utils/lang';
import { isRTL } from '../../../utils/window';
import DialogTemplate from '../../ui/DialogTemplate';
import InputWithClear from '../../ui/InputWithClear';
import MaterialIcon from '../../ui/MaterialIcon';
import Tip from '../../ui/Tip';

interface ListItem extends ResInfo {
  folder: string;
  local: boolean;
  newVer?: number;
}

const MotionLiBtn = motion.create(ListItemButton);

export default function LangDialog({ open, onClose }: DialogBaseProps) {
  const [config, updateConfig] = useConfig();
  const [list, setList] = useState<ListItem[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<ListItem | null>(null);
  const { t } = useTranslation();
  const langs = useMemo(getLangs, [t]);

  const sortList = useCallback(
    (oldList: ListItem[]) => {
      const folderMap: Record<string, [ListItem | null, ListItem | null]> = {};
      oldList.forEach((item) => {
        if (!folderMap[item.folder]) {
          folderMap[item.folder] = [null, null];
        }
        folderMap[item.folder][Number(item.local)] = item;
      });

      return oldList
        .sort((a, b) => {
          if (a.local !== b.local) return Number(b.local) - Number(a.local);
          if (a.name !== b.name) return a.name.localeCompare(b.name, langs);
          return a.folder.localeCompare(b.folder, langs);
        })
        .filter((item) => {
          // 同种资源，列表中只显示本地的
          if (item.local) {
            if (!folderMap[item.folder][0]) return true;
            const onlineVer = folderMap[item.folder][0]!.version;
            const localVer = folderMap[item.folder][1]!.version;
            if (onlineVer > localVer) item.newVer = onlineVer;
            return true;
          }
          if (folderMap[item.folder][1]) return false;
          return true;
        });
    },
    [langs],
  );

  const getLocalList = useCallback(
    async (selected = '') => {
      try {
        const langFolder = await join(await appDataDir(), 'lang');
        if (!(await exists(langFolder))) {
          await mkdir('lang', { baseDir: BaseDirectory.AppData });
        }
        const entries = await readDir(langFolder);
        const localList: ListItem[] = [
          {
            lang: BuiltInLang.zhHans,
            name: '简体中文',
            author: 'Mutton String',
            version: 1,
            folder: BuiltInLang.zhHans,
            local: true,
          },
          {
            lang: BuiltInLang.zhHant,
            name: '繁體中文',
            author: 'Mutton String',
            version: 1,
            folder: BuiltInLang.zhHant,
            local: true,
          },
          {
            lang: BuiltInLang.en,
            name: 'English',
            author: 'Mutton String',
            version: 1,
            folder: BuiltInLang.en,
            local: true,
          },
        ];

        for (const entry of entries) {
          if (!entry.isDirectory) break;
          const folder = await join(langFolder, entry.name);
          const infoPath = await join(folder, 'info.json');
          if (
            (await exists(infoPath)) &&
            (await exists(await join(folder, 'index.json')))
          ) {
            localList.push({
              ...JSON.parse(await readTextFile(infoPath)),
              folder: entry.name,
              local: true,
            });
          }
        }

        setList((oldList) => {
          const newList = [
            ...sortList(localList),
            ...oldList.filter((item) => !item.local),
          ];
          if (selected) {
            setDetail(newList.find((item) => item.folder === selected)!);
          } else {
            setDetail(null);
          }
          return newList;
        });
      } catch (err) {
        console.error('Failed to get lang directory: ' + err);
      }
    },
    [sortList],
  );

  // 打开时载入列表、监听目录等
  useEffect(() => {
    if (!open) return;
    setSelected(config.language);

    const init = async () => {
      setSearch('');
      getLocalList(config.language);
      // todo fetch online res

      const langFolder = await join(await appDataDir(), 'lang');
      if (!(await exists(langFolder))) {
        await mkdir('lang', { baseDir: BaseDirectory.AppData });
      }
      return await watchImmediate(langFolder, () => getLocalList());
    };
    const unwatch = init();

    return () => {
      unwatch.then((fn) => fn());
    };
  }, [config.language, getLocalList, open]);

  // 过滤搜索项
  const filtered = useMemo(() => {
    const s = search.trim();
    return s
      ? list.filter((item) =>
          item.name
            .toLocaleLowerCase(langs)
            .includes(s.toLocaleLowerCase(langs)),
        )
      : list;
  }, [langs, list, search]);

  const scrollRef = useRef<HTMLUListElement>(null);
  const onKeyDown = useScrollKeyPressed(scrollRef.current);

  return (
    <DialogTemplate
      onKeyDown={onKeyDown}
      maxWidth='xs'
      title={t('langDialog.title')}
      open={open}
      onClose={async () => {
        onClose();
        await delay(config.animationDuration * DIALOG_LEVAING_MS);
      }}
      onConfirm={async () => {
        onClose();
        if (config.language === selected) return;
        await delay(config.animationDuration * DIALOG_LEVAING_MS);
        updateConfig({ language: selected });
      }}
    >
      <div className='flex gap-4 h-80'>
        <div className='flex flex-col gap-2 flex-1'>
          <InputWithClear
            aria-label={t('langDialog.search')}
            placeholder={t('langDialog.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
          <List
            ref={scrollRef}
            className='overflow-auto h-full'
            dense
            disablePadding
          >
            <MotionLiBtn
              key=''
              initial={false}
              layout
              selected={selected === ''}
              onClick={() => {
                setSelected('');
                setDetail(null);
              }}
            >
              <ListItem disablePadding>
                <ListItemText primary={t('langDialog.followSystem')} />
              </ListItem>
            </MotionLiBtn>
            {filtered.map((item) => (
              <MotionLiBtn
                key={item.folder + item.local}
                initial={false}
                layout
                selected={item.folder === selected}
                onClick={() => {
                  if (item.local) setSelected(item.folder);
                  setDetail(item);
                }}
              >
                <ListItem
                  disablePadding
                  secondaryAction={
                    item.local ? (
                      item.newVer !== undefined && (
                        <Tip title={t('langDialog.update')}>
                          <IconButton>
                            <MaterialIcon name='update' />
                          </IconButton>
                        </Tip>
                      )
                    ) : (
                      <Tip title={t('langDialog.download')}>
                        <IconButton>
                          <MaterialIcon name='download' />
                        </IconButton>
                      </Tip>
                    )
                  }
                >
                  <ListItemText
                    primary={
                      <div
                        style={
                          item.local
                            ? undefined
                            : { color: 'var(--mui-palette-text-secondary)' }
                        }
                        lang={item.lang}
                      >
                        {item.name}
                      </div>
                    }
                    secondary={
                      isBuiltInLang(item.folder)
                        ? t('langDialog.builtIn')
                        : item.folder
                    }
                  />
                </ListItem>
              </MotionLiBtn>
            ))}
          </List>
        </div>

        <Divider orientation='vertical' variant='fullWidth' />

        <List className='flex-1' dense disablePadding>
          {detail && (
            <>
              <ListItem disablePadding>
                <div className='leading-8 font-bold' lang={detail.lang}>
                  {detail.name}
                </div>
              </ListItem>
              <ListItem disablePadding>
                <ListItemText
                  primary={t('langDialog.code')}
                  secondary={
                    isBuiltInLang(detail.lang)
                      ? detail.lang.substring(3)
                      : detail.lang
                  }
                />
              </ListItem>
              <ListItem disablePadding>
                <ListItemText
                  primary={t('langDialog.version')}
                  secondary={
                    detail.newVer === undefined ? (
                      detail.version
                    ) : isRTL() ? (
                      <>
                        <div className='text-success'>{detail.newVer}</div> ←{' '}
                        {detail.version}
                      </>
                    ) : (
                      <>
                        {detail.version} →{' '}
                        <div className='text-success'>{detail.newVer}</div>
                      </>
                    )
                  }
                />
              </ListItem>
              <ListItem disablePadding>
                <ListItemText
                  primary={t('langDialog.author')}
                  secondary={detail.author}
                />
              </ListItem>
              <ListItem disablePadding>
                <ListItemText
                  primary={t('langDialog.desc')}
                  secondary={
                    <span
                      lang={detail.lang}
                      className='whitespace-pre-wrap select-text cursor-text max-w-45 max-h-24 overflow-auto inline-block'
                    >
                      {detail.desc || '-'}
                    </span>
                  }
                />
              </ListItem>
            </>
          )}
        </List>
      </div>
    </DialogTemplate>
  );
}

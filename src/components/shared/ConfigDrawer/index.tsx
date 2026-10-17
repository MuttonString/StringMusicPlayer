import Autocomplete from '@mui/material/Autocomplete';
import Divider from '@mui/material/Divider';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import TextField from '@mui/material/TextField';
import type { RefObject } from 'react';
import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../../app/i18n';
import {
  CONFIG_GROUP_ID_LIST,
  CONFIG_ID_LIST,
  DEV_CONFIG_GROUP_ID_LIST,
  DEV_CONFIG_ID_LIST,
} from '../../../constants/config';
import { useScrollKeyPressed } from '../../../hooks/useScrollKeyPressed';
import { useConfig } from '../../../providers/ConfigProvider';
import type { OpenConfigDrawerFn } from '../../../types/component';
import About from './About';
import Common from './Common';
import DevOptions from './DevOptions';
import Playback from './Playback';
import WindowAppeance from './WindowAppeearance';

interface Props {
  ref: RefObject<OpenConfigDrawerFn>;
}

export default function ConfigDrawer({ ref }: Props) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const { t } = useTranslation();
  const [config] = useConfig();

  const hasAnimation = !!config.animationDuration;

  const handleJump = useCallback(
    (str: string, smooth = false) => {
      const el = refs.current[str];
      if (el) {
        el.scrollIntoView({
          behavior: smooth && hasAnimation ? 'smooth' : 'instant',
        });
      }
    },
    [hasAnimation],
  );

  useImperativeHandle(
    ref,
    () =>
      function (jumpTo) {
        if (jumpTo) handleJump(jumpTo);
        setOpen(true);
      },
  );

  const devEnabled = config.enableDevOptions;

  const defaultOptions: { id: string; label: string }[] = useMemo(
    () =>
      [...CONFIG_GROUP_ID_LIST, devEnabled && DEV_CONFIG_GROUP_ID_LIST]
        .filter(Boolean)
        .map((item) => ({ id: item as string, label: t('config.' + item) })),
    [devEnabled, t],
  );

  const options: typeof defaultOptions = useMemo(
    () => [
      ...defaultOptions,
      ...[...CONFIG_ID_LIST, ...(devEnabled ? DEV_CONFIG_ID_LIST : [])].map(
        (item) => ({
          id: item,
          label: t('config.' + item),
        }),
      ),
    ],
    [defaultOptions, devEnabled, t],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useScrollKeyPressed(scrollRef.current);

  return (
    <SwipeableDrawer
      onKeyDown={onKeyDown}
      disableSwipeToOpen
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      anchor='right'
    >
      <div className='w-85 h-full overflow-clip flex flex-col'>
        <div className='p-4'>
          <Autocomplete
            openOnFocus
            forcePopupIcon={false}
            size='small'
            popupIcon={null}
            value={null}
            onChange={(_, val) => {
              if (val) {
                handleJump(val.id, true);
              }
              setSearchInput('');
            }}
            options={options}
            filterOptions={(opt, { inputValue }) => {
              const val = inputValue.trim();
              if (!val.trim()) {
                return defaultOptions;
              }
              const lang = i18n.languages;
              return opt.filter((item) =>
                item.label
                  .toLocaleLowerCase(lang)
                  .includes(val.toLocaleLowerCase(lang)),
              );
            }}
            inputValue={searchInput}
            onInputChange={(_, val) => setSearchInput(val)}
            fullWidth
            renderInput={(params) => (
              <TextField
                aria-label={t('config.search')}
                placeholder={t('config.search')}
                variant='standard'
                {...params}
              />
            )}
          />
        </div>
        <Divider />

        <div
          ref={scrollRef}
          className='overflow-y-auto flex-1 p-3 flex flex-col gap-16 text-nowrap [&_label]:text-wrap [&>div]:flex [&>div]:flex-col [&>div]:gap-2 [&>div]:items-start [&>div>div]:bg-action-hover [&>div>div]:hover:bg-action-focus [&>div>div]:transition-colors [&>div>div]:duration-[calc(var(--duration)*150ms)] [&>div>div]:rounded-lg [&>div>div]:p-2 [&>div>div]:w-full [&_.MuiFormHelperText-root]:[text-wrap:auto]'
        >
          <Common refs={refs} />
          <WindowAppeance refs={refs} />
          <Playback refs={refs} />
          <About refs={refs} />
          {devEnabled && <DevOptions refs={refs} />}
        </div>
      </div>
    </SwipeableDrawer>
  );
}

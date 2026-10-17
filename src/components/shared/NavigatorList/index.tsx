import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import classNames from 'classnames';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { LIST_ITEM } from '../../../constants/animation';
import { useConfigDrawer } from '../../../providers/ConfigDrawerProvider';
import { useConfig } from '../../../providers/ConfigProvider';
import { useNavigator } from '../../../providers/NavigatorProvider';
import MaterialIcon from '../../ui/MaterialIcon';
import MotionList from '../../ui/MotionList';

interface Props {
  onButtonClicked?: () => void;
  inDrawer?: boolean;
  className?: string;
}

const MotionLiBtn = motion.create(ListItemButton);

export default function NavigatorList({
  onButtonClicked,
  className,
  inDrawer,
}: Props) {
  const [config] = useConfig();
  const openDrawer = useConfigDrawer();
  const [selected, setSelected] = useState('');
  const location = useLocation();
  const path = location.pathname.split('/')[1];
  const { t } = useTranslation();
  const { goTo } = useNavigator();
  const [disabled, setDisabled] = useState<string[]>([]);

  const items = useMemo(
    () => [
      {
        id: 'home',
        icon: <MaterialIcon name='home' />,
        label: t('page.home'),
      },
      {
        id: 'recommendation',
        icon: <MaterialIcon name='assistant' />,
        label: t('page.recommendation'),
      },
      {
        id: 'recent',
        icon: <MaterialIcon name='history' />,
        label: t('page.recent'),
      },
      {
        id: 'artistCollection',
        icon: <MaterialIcon name='peopleAlt' />,
        label: t('page.artistCollection'),
      },
      {
        id: 'albumCollection',
        icon: <MaterialIcon name='album' />,
        label: t('page.albumCollection'),
      },
      {
        id: 'mvCollection',
        icon: <MaterialIcon name='musicVideo' />,
        label: t('page.mvCollection'),
      },
      {
        id: 'favoriteSongs',
        icon: <MaterialIcon name='favorite' />,
        label: t('page.favoriteSongs'),
      },
      {
        id: 'playlist',
        icon: <MaterialIcon name='viewList' />,
        label: t('page.playlist'),
      },
    ],
    [t],
  );

  useEffect(() => {
    setSelected(path);
  }, [path]);

  useEffect(() => {
    const newDisabled = [];
    if (!config.recommendation) {
      newDisabled.push('recommendation');
    }
    if (!config.recentPlayed) {
      newDisabled.push('recent');
    }
    setDisabled(newDisabled);
  }, [config.recentPlayed, config.recommendation]);

  return (
    <div
      className={classNames(
        'text-text-primary flex flex-col justify-between w-full h-full [&_ul>div]:ps-2! [&_ul>div]:pe-1! [body.sharp-style_&_ul>div]:ps-3! [body.sharp-style_&_ul>div]:pe-3! [body:not(.sharp-style)_&_ul>div]:ms-1! [body:not(.sharp-style)_&_ul>div]:me-2!',
        className,
      )}
    >
      <MotionList animate={!inDrawer}>
        {items
          .filter((item) => !disabled.includes(item.id))
          .map((item) => (
            <MotionLiBtn
              layout={!inDrawer}
              variants={inDrawer ? undefined : LIST_ITEM}
              key={item.id}
              selected={selected === item.id}
              onClick={() => {
                if (selected === item.id) return;
                setSelected(item.id);
                goTo('/' + item.id);
                onButtonClicked?.();
              }}
            >
              <ListItemIcon
                className={classNames(selected === item.id && 'text-primary!')}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                className={classNames(selected === item.id && '**:font-bold!')}
                primary={item.label}
              />
            </MotionLiBtn>
          ))}
      </MotionList>

      <MotionList animate={!inDrawer}>
        <MotionLiBtn
          key='download'
          layout={!inDrawer}
          variants={inDrawer ? undefined : LIST_ITEM}
          onClick={() => {
            onButtonClicked?.();
          }}
        >
          <ListItemIcon>
            <MaterialIcon name='download' />
          </ListItemIcon>
          <ListItemText primary={t('drawer.download')} />
        </MotionLiBtn>

        <MotionLiBtn
          key='settings'
          layout={!inDrawer}
          variants={inDrawer ? undefined : LIST_ITEM}
          onClick={() => {
            openDrawer();
            onButtonClicked?.();
          }}
        >
          <ListItemIcon>
            <MaterialIcon name='settings' />
          </ListItemIcon>
          <ListItemText primary={t('drawer.settings')} />
        </MotionLiBtn>
      </MotionList>
    </div>
  );
}

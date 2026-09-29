import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import FiltersSvg from '../../../assets/filters.svg?react';
import { VERTICAL } from '../../../constants/animation';
import { IS_APPLE, IS_DESKTOP } from '../../../constants/os';
import { useNavigator } from '../../../providers/NavigatorProvider';
import { KeyCode } from '../../../types/keyCode';
import MaterialIcon from '../../ui/MaterialIcon';
import Tip from '../../ui/Tip';

const enum VisionFilters {
  None = '',
  Blurred = 'blur(2px)',
  Protanopia = 'url("#protanopia")',
  Deuteranopia = 'url("#deuteranopia")',
  Tritanopia = 'url("#tritanopia")',
  Achromatopsia = 'url("#achromatopsia")',
}

export default function Footer() {
  const location = useLocation();
  const [input, setInput] = useState('');
  const { goTo } = useNavigator();
  const { t } = useTranslation();
  const [visionSimAnchor, setVisionSimAnchor] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    setInput(location.pathname + location.search + location.hash);
  }, [location]);

  const visionSimItems = useMemo(
    () => [
      { id: VisionFilters.None, label: t('footer.none') },
      { id: VisionFilters.Blurred, label: t('footer.blurred') },
      { id: VisionFilters.Protanopia, label: t('footer.protanopia') },
      { id: VisionFilters.Deuteranopia, label: t('footer.deuteranopia') },
      { id: VisionFilters.Tritanopia, label: t('footer.tritanopia') },
      { id: VisionFilters.Achromatopsia, label: t('footer.achromatopsia') },
    ],
    [t],
  );

  return (
    <motion.footer
      className='w-full bg-(--bg-color) overlay-1 border-t border-divider flex ps-2! pe-2!'
      variants={VERTICAL}
      custom='2rem'
      initial='hidden'
      whileInView='visible'
      exit='hidden'
    >
      <InputBase
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === KeyCode.Enter) {
            goTo(input);
          }
        }}
      />

      <Tip title={t('footer.refresh') + ' ' + (IS_APPLE ? '⌘R' : '(Ctrl+R)')}>
        <IconButton
          aria-label={t('footer.refresh')}
          size='small'
          onClick={() => window.location.reload()}
        >
          <MaterialIcon name='refresh' fontSize='small' />
        </IconButton>
      </Tip>

      <Tip title={t('footer.visionSim')}>
        <IconButton
          size='small'
          onClick={(e) => setVisionSimAnchor(e.currentTarget)}
        >
          <MaterialIcon name='visibility' fontSize='small' />
        </IconButton>
      </Tip>
      <FiltersSvg style={{ display: 'none' }} />
      <Menu
        open={!!visionSimAnchor}
        onClose={() => setVisionSimAnchor(null)}
        anchorEl={visionSimAnchor}
      >
        {visionSimItems.map((item) => (
          <MenuItem
            key={item.id}
            selected={item.id === document.documentElement.style.filter}
            onClick={() => {
              setVisionSimAnchor(null);
              if (item.id) document.documentElement.style.filter = item.id;
              else document.documentElement.style = '';
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>

      {IS_DESKTOP && (
        <Tip
          title={
            t('footer.devtools') + ' ' + (IS_APPLE ? '⌘⇧I' : '(Ctrl+Shift+I)')
          }
        >
          <IconButton
            aria-label={t('footer.devtools')}
            size='small'
            onClick={() => invoke('open_devtools')}
          >
            <MaterialIcon name='code' fontSize='small' />
          </IconButton>
        </Tip>
      )}
    </motion.footer>
  );
}

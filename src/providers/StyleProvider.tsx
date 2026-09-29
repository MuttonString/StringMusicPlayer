import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { Fade } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import GlobalStyles from '@mui/material/GlobalStyles';
import {
  createTheme,
  StyledEngineProvider,
  ThemeProvider,
} from '@mui/material/styles';
import rtlPlugin from '@mui/stylis-plugin-rtl';
import { MotionConfig } from 'motion/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { prefixer } from 'stylis';
import '../app/global.less';
import i18n from '../app/i18n';
import MaterialIcon from '../components/ui/MaterialIcon';
import { DEFAULT_DURATION } from '../constants/animation';
import { COLOR_VALUE_MAP } from '../constants/colors';
import useDarkModeQuery from '../hooks/useDarkModeQuery';
import type { ChildrenProp } from '../types/component';
import { ColorMode, Colors } from '../types/config';
import { useConfig } from './ConfigProvider';

export default function StyleProvider({ children }: ChildrenProp) {
  const [config] = useConfig();
  const { t } = useTranslation();

  const direction =
    config.enableDevOptions && config.forceRTL ? 'rtl' : i18n.dir();
  const primaryColor = config.primaryColor;
  const duration = config.animationDuration;
  const fontFamily = config.globalFont || 'var(--font)';
  const sharpStyle = config.sharpStyle;

  const colorMode = config.colorMode;
  const isDarkMode = useDarkModeQuery(
    ![ColorMode.Light, ColorMode.Dark].includes(colorMode),
  );

  const theme = useMemo(() => {
    let defaultColorScheme: 'light' | 'dark';
    switch (colorMode) {
      case ColorMode.Light:
        defaultColorScheme = 'light';
        break;
      case ColorMode.Dark:
        defaultColorScheme = 'dark';
        break;
      default:
        defaultColorScheme = isDarkMode ? 'dark' : 'light';
    }

    const color = COLOR_VALUE_MAP[primaryColor] || COLOR_VALUE_MAP[Colors.Cyan];

    return createTheme({
      cssVariables: true,
      direction,
      defaultColorScheme,
      palette: {
        primary: { main: color },
        secondary: { main: color },
      },
      shape: {
        borderRadius: sharpStyle ? 0 : 8,
      },
      transitions: {
        duration: {
          shortest: 150 * duration,
          shorter: 200 * duration,
          short: 250 * duration,
          standard: 300 * duration,
          complex: 375 * duration,
          enteringScreen: 225 * duration,
          leavingScreen: 195 * duration,
        },
      },
      motion: { reducedMotion: duration ? 'system' : 'always' },
      typography: {
        fontFamily,
      },
      components: {
        MuiPopover: {
          defaultProps: {
            slots: { transition: Fade },
          },
        },
        MuiMenu: {
          defaultProps: {
            slots: { transition: Fade },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: { textTransform: 'unset' },
          },
        },
        MuiDrawer: {
          defaultProps: {
            sx: {
              '& .MuiBackdrop-root': { backgroundColor: 'transparent' },
            },
          },
          styleOverrides: {
            paper: {
              border: '1px solid var(--mui-palette-divider)',
              borderRadius: sharpStyle ? 0 : '8px',
              height: 'calc(100% - 16px)',
              margin: '8px',
            },
          },
        },
        MuiSlider: {
          styleOverrides: {
            valueLabel: {
              borderRadius: sharpStyle ? 0 : '8px',
            },
          },
        },
        MuiAutocomplete: {
          defaultProps: {
            clearIcon: <MaterialIcon name='clear' fontSize='small' />,
            popupIcon: <MaterialIcon name='arrowDropDown' />,
            noOptionsText: t('common.noOptions'),
            loadingText: <CircularProgress size={24} />,
            clearText: t('common.clear'),
            forcePopupIcon: false,
          },
          styleOverrides: {
            option: sharpStyle
              ? undefined
              : {
                  borderRadius: '8px',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                  marginLeft: '8px',
                  marginRight: '8px',
                  width: 'calc(100% - 16px)',
                },
          },
        },
        MuiSelect: {
          defaultProps: {
            IconComponent: () => <MaterialIcon name='arrowDropDown' />,
            size: 'small',
          },
          styleOverrides: { root: { cursor: 'default' } },
        },
        MuiListItemButton: {
          styleOverrides: {
            root: sharpStyle
              ? undefined
              : {
                  borderRadius: '8px',
                },
          },
        },
        MuiMenuItem: {
          styleOverrides: {
            root: sharpStyle
              ? undefined
              : {
                  borderRadius: '8px',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                  marginLeft: '8px',
                  marginRight: '8px',
                },
          },
        },
      },
    });
  }, [
    colorMode,
    direction,
    duration,
    fontFamily,
    isDarkMode,
    primaryColor,
    sharpStyle,
    t,
  ]);

  const cache = useMemo(() => {
    document.documentElement.dir = direction;
    return createCache({
      key: direction,
      stylisPlugins: direction === 'rtl' ? [prefixer, rtlPlugin] : [prefixer],
    });
  }, [direction]);

  return (
    <StyledEngineProvider enableCssLayer>
      <GlobalStyles styles='@layer theme, base, mui, components, utilities;' />
      <CacheProvider value={cache}>
        <ThemeProvider theme={theme}>
          <MotionConfig
            transition={{ duration: DEFAULT_DURATION * duration }}
            reducedMotion={duration ? 'user' : 'always'}
            isStatic={!duration}
          >
            {children}
          </MotionConfig>
        </ThemeProvider>
      </CacheProvider>
    </StyledEngineProvider>
  );
}

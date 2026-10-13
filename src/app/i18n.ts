import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../lang/en.json';
import ja from '../lang/ja.json';
import lzh from '../lang/lzh.json';
import zhHans from '../lang/zh-Hans.json';
import zhHant from '../lang/zh-Hant.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-Hans': { translation: zhHans },
    'zh-Hant': { translation: zhHant },
    ja: { translation: ja },
    lzh: { translation: lzh },
  },
  fallbackLng: {
    'zh-TW': ['zh-Hant', 'en'],
    'zh-HK': ['zh-Hant', 'en'],
    'zh-MO': ['zh-Hant', 'en'],
    zh: ['zh-Hans', 'en'],
    default: ['en'],
  },
});

export default i18n;

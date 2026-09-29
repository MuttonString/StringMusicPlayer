import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../assets/lang/en.json';
import zhHans from '../assets/lang/zh-Hans.json';
import zhHant from '../assets/lang/zh-Hant.json';
import { BuiltInLang } from '../types/lang';

i18n.use(initReactI18next).init({
  resources: {
    [BuiltInLang.zhHans]: { translation: zhHans },
    [BuiltInLang.zhHant]: { translation: zhHant },
    [BuiltInLang.en]: { translation: en },
  },
  fallbackLng: { zh: [BuiltInLang.zhHans], default: [BuiltInLang.en] },
});

export default i18n;

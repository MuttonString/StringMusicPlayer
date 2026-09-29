import i18n from '../app/i18n';
import { BuiltInLang } from '../types/lang';

/**
 * 检测字符串语言，未知则返回空字符串
 */
export function detectLang(text: string) {
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    return 'ja';
  }
  if (/[\uAC00-\uD7AF]/.test(text)) {
    return 'ko';
  }
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return 'zh';
  }
  if (/[\u0400-\u04FF]/.test(text)) {
    return 'ru';
  }
  return '';
}

/**
 * 判断语言是否是内置的
 */
export function isBuiltInLang(langBaseDirPath: string) {
  return [BuiltInLang.zhHans, BuiltInLang.zhHant, BuiltInLang.en].includes(
    langBaseDirPath as BuiltInLang,
  );
}

/**
 * 获取正在使用的语言，语言标签会被规范化
 */
export function getLangs() {
  return Intl.getCanonicalLocales(
    i18n.languages.map((lang) =>
      lang.startsWith('://') ? lang.substring(3) : lang,
    ),
  );
}

import i18n from '../app/i18n';

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
 * 将语言标签转换为指定语言的显示名称
 */
export function parseLangTag(tag: string) {
  if ('DisplayNames' in Intl) {
    try {
      const displayNames = new Intl.DisplayNames(i18n.languages, {
        type: 'language',
      });
      const name = displayNames.of(tag);
      return name || tag;
    } catch (err) {
      console.error(
        `Failed to convert locale "${tag}" into display name: ${err}`,
      );
    }
  }
  return tag;
}

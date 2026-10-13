import i18n from '../app/i18n';

export const OPEN_SOURCE_LIBRARY = [['TEST', 'https://cn.bing.com']].sort(
  (a, b) => a[0].localeCompare(b[0], i18n.languages),
) as [name: string, url: string][];

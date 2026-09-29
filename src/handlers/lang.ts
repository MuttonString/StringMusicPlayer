import { join } from '@tauri-apps/api/path';
import { BaseDirectory, exists, readTextFile } from '@tauri-apps/plugin-fs';
import { locale } from '@tauri-apps/plugin-os';
import i18n from '../app/i18n';
import { BuiltInLang } from '../types/lang';
import type { ResInfo } from '../types/resource';
import { isBuiltInLang } from '../utils/lang';

/**
 * 载入并更改语言，然后释放不使用的语言资源，返回boolean表示是否成功更改
 */
export async function setLang(langBaseDirPath: string) {
  try {
    if (!langBaseDirPath) {
      const loc = (await locale()) || 'en';
      await i18n.changeLanguage(loc);
      document.documentElement.lang = loc;
      return true;
    }

    if (isBuiltInLang(langBaseDirPath)) {
      await i18n.changeLanguage(langBaseDirPath);
      Object.keys(i18n.services.resourceStore.data).forEach((lng) => {
        if (isBuiltInLang(lng as BuiltInLang)) return;
        i18n.removeResourceBundle(lng, 'translation');
      });
      document.documentElement.lang = langBaseDirPath.substring(3);
      return true;
    }

    const infoPath = await join('lang', langBaseDirPath, 'info.json');
    const indexPath = await join('lang', langBaseDirPath, 'index.json');

    if (
      !(await exists(infoPath, { baseDir: BaseDirectory.AppData })) ||
      !(await exists(indexPath, { baseDir: BaseDirectory.AppData }))
    ) {
      return false;
    }
    const info = JSON.parse(
      await readTextFile(infoPath, { baseDir: BaseDirectory.AppData }),
    ) as ResInfo;
    const res = JSON.parse(
      await readTextFile(indexPath, { baseDir: BaseDirectory.AppData }),
    );

    i18n.addResourceBundle(info.lang, 'translation', res);
    await i18n.changeLanguage(info.lang);
    document.documentElement.lang = info.lang;

    Object.keys(i18n.services.resourceStore.data).forEach((lng) => {
      if (
        [
          BuiltInLang.zhHans,
          BuiltInLang.zhHant,
          BuiltInLang.en,
          info.lang,
        ].includes(lng)
      )
        return;
      i18n.removeResourceBundle(lng, 'translation');
    });
  } catch (err) {
    console.error(
      `Failed to apply language resource in ${langBaseDirPath}: ${err}`,
    );
    return false;
  }
  return true;
}

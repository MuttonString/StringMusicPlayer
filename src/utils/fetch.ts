import type { ClientOptions } from '@tauri-apps/plugin-http';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

/**
 * 必要情况下调用Tauri后端进行fetch
 */
export async function fetchAlt(
  input: string | URL | Request,
  init?: (RequestInit & ClientOptions) | undefined,
) {
  let url: string;
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.href;
  } else {
    url = input.url;
  }

  if (/^https?:\/\//i.test(url) && !/^https?:\/\/asset\.localhost/i.test(url)) {
    console.info(`Fetching "${url}".`);
    try {
      return await tauriFetch(input, init);
    } catch (err) {
      console.warn(`Failed to Fetching "${url}": ${err}`);
      return await Promise.reject(err);
    }
  }

  return await fetch(input, init);
}

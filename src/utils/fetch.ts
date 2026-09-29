import type { ClientOptions } from '@tauri-apps/plugin-http';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

/**
 * 必要情况下调用Tauri后端进行fetch
 */
export function fetchAlt(
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
    return tauriFetch(input, init);
  }

  return fetch(input, init);
}

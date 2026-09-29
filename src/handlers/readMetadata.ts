import type { IAudioMetadata } from 'music-metadata';
import { parseWebStream } from 'music-metadata';

self.onmessage = async (e: MessageEvent<string[]>) => {
  let part: [string, IAudioMetadata | null][] = [];
  for (const src of e.data) {
    try {
      const resp = await fetch(src);
      const meta = await parseWebStream(resp.body);
      part.push([src, meta]);
    } catch (err) {
      console.error(`Failed to get metadata of "${src}": ${err}`);
      part.push([src, null]);
    }
    if (part.length === 5) {
      self.postMessage(part);
      part = [];
    }
  }
  if (part.length) {
    self.postMessage(part);
  }
  self.close();
};

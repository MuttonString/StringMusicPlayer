import { parseWebStream } from 'music-metadata';

self.onmessage = async (e: MessageEvent<string[]>) => {
  for (const src of e.data) {
    try {
      const resp = await fetch(src);
      const meta = await parseWebStream(resp.body);
      self.postMessage([src, meta]);
    } catch (err) {
      console.error(`Failed to get metadata of "${src}": ${err}`);
    }
  }
  self.close();
};

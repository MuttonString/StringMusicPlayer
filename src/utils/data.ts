import { join, tempDir } from '@tauri-apps/api/path';
import { BaseDirectory, writeFile } from '@tauri-apps/plugin-fs';
import { decompressSync, deflateSync, strFromU8, strToU8 } from 'fflate';

/**
 * 将秒数格式化为mm:ss
 */
export function formatTime(seconds: number) {
  if (isNaN(seconds)) {
    return '0:00';
  }
  if (seconds === Infinity) {
    return '∞';
  }

  seconds = Math.floor(seconds);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * 从URL中获取文件名
 */
export function getBasename(src: string) {
  return decodeURIComponent(new URL(src).pathname)
    .split(/[\/\\]/)
    .pop()!;
}

/**
 * 移除文件扩展名
 */
export function removeExt(name: string) {
  const splited = name.split('.');
  if (splited.length === 1) return name;
  splited.pop();
  return splited.join('.');
}

/**
 * 获取长度20的只由数字和英文字母组成的随机key
 */
export function getRandomKey() {
  Array.from(
    { length: 20 },
    () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[
        crypto.getRandomValues(new Uint8Array(1))[0] % 62
      ],
  ).join('');
}

/**
 * 为传入的数据生成传输安全的SHA-256哈希字符串
 */
export async function getHash(data: string) {
  const buffer = await crypto.subtle.digest('SHA-256', strToU8(data));
  return btoa(strFromU8(new Uint8Array(buffer), true))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * 将数据压缩为Base64字符串
 */
export function compress(data: {}) {
  const compressed = deflateSync(strToU8(JSON.stringify(data)), { level: 9 });
  return btoa(strFromU8(compressed, true));
}

/**
 * 将Base64字符串解压为原始数据
 */
export function decompress(base64: string) {
  const decompressed = decompressSync(strToU8(atob(base64), true));
  return JSON.parse(strFromU8(decompressed));
}

/**
 * 获取音频时长
 */
export function getAudioDuration(src: string) {
  const audio = new Audio();
  audio.preload = 'metadata';

  return new Promise<number>((resolve, reject) => {
    audio.onloadedmetadata = (e) => {
      const target = e.currentTarget as HTMLAudioElement;
      const duration = target.duration;
      target.onloadedmetadata = null;
      target.removeAttribute('src');
      target.load();
      resolve(duration);
    };

    audio.onerror = reject;
    audio.src = src;
  });
}

/**
 * 将图片src转换为正方形的PNG格式的Blob
 */
export function imgSrcToBlob(src: string, size: number) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  return new Promise<Blob>((resolve, reject) => {
    img.onload = () => {
      if (!ctx) return reject();

      const imgSize = Math.max(img.naturalWidth, img.naturalHeight);
      size = Math.min(size, imgSize);
      canvas.width = size;
      canvas.height = size;
      const scale = Math.min(size / imgSize, 1);

      ctx.drawImage(
        img,
        (size - img.naturalWidth * scale) / 2,
        (size - img.naturalHeight * scale) / 2,
        size,
        size,
      );
      canvas.toBlob(async (blob) => {
        if (!blob) return reject();
        resolve(blob);
      }, 'image/png');
    };

    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 将图片src保存到临时文件并返回file协议的url，失败会返回空字符串
 */
export async function srcToPath(src: string, fileName: string) {
  try {
    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    await writeFile(fileName, data, {
      baseDir: BaseDirectory.Temp,
    });
    const path = await join(await tempDir(), fileName);
    return 'file://' + path;
  } catch (err) {
    console.error('Failed to save image to temperary path: ' + err);
    return '';
  }
}

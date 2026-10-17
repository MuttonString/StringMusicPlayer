export const IMAGE_FILE_FILTER = [
  { name: 'PNG', extensions: ['png'] },
  {
    name: 'JPEG',
    extensions: ['jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp'],
  },
  { name: 'WebP', extensions: ['webp'] },
  { name: 'BMP', extensions: ['bmp'] },
  { name: 'GIF', extensions: ['gif'] },
  { name: 'APNG', extensions: ['apng'] },
  { name: 'AVIF', extensions: ['avif'] },
];

export const IMAGE_FILE_MIME_MAP = {
  'image/apng': '.apng',
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
} as const;

export const SUPPORTED_AUDIO_FORMAT = (() => {
  const audio = new Audio();
  return [
    'audio/mp3',
    'audio/flac',
    'audio/aac',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/webm',
    'audio/mpeg',
    'audio/3gpp',
  ].filter((type) => audio.canPlayType(type));
})();

export const SUPPORTED_AUDIO_FILTER_MAP = (() => {
  const filterMap: Record<string, { name: string; extensions: string[] }> = {
    'audio/3gpp': { name: '3GP', extensions: ['3gp'] },
    'audio/aac': { name: 'ADTS', extensions: ['aac'] },
    'audio/flac': { name: 'FLAC', extensions: ['flac'] },
    'audio/mpeg': { name: 'MPEG', extensions: ['mpg', 'mpeg'] },
    'audio/mp3': { name: 'MP3', extensions: ['mp3'] },
    'audio/mp4': { name: 'MPEG-4', extensions: ['mp4', 'm4a'] },
    'audio/ogg': { name: 'Ogg', extensions: ['oga', 'ogg'] },
    'audio/wav': { name: 'WAV', extensions: ['wav'] },
    'audio/webm': { name: 'WebM', extensions: ['webm'] },
  };
  return SUPPORTED_AUDIO_FORMAT.map((item) => filterMap[item]);
})();

export const SUPPORTED_AUDIO_EXT_LIST = (() =>
  SUPPORTED_AUDIO_FILTER_MAP.reduce((acc, curr) => {
    acc.push(...curr.extensions);
    return acc;
  }, [] as string[]))();

export const EQUALIZER_PRESETS = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  rock: [4, 3, 2, 0, -1, -2, 0, 2, 3, 3],
  pop: [-1, 0, 1, 2, 3, 3, 2, 1, 0, -1],
  jazz: [2, 2, 1, 1, 0, 0, 1, 1, 2, 2],
  classical: [0, 0, 0, 0, 0, 0, -1, -1, 0, 0],
  electronic: [5, 4, 3, 1, -1, -2, 0, 2, 3, 4],
  vocalBoost: [-2, -1, 0, 1, 2, 3, 3, 2, 1, 0],
  bassBoost: [8, 6, 4, 2, 0, -1, -1, 0, 0, 0],
  speech: [-3, -2, -1, 1, 2, 3, 3, 2, -1, -3],
  telephone: [-30, -30, -20, -5, 2, 3, 2, -10, -30, -30],
} as const;

export const EQUALIZER = [
  { frequency: 31, type: 'lowshelf' },
  { frequency: 62, type: 'peaking' },
  { frequency: 125, type: 'peaking' },
  { frequency: 250, type: 'peaking' },
  { frequency: 500, type: 'peaking' },
  { frequency: 1000, type: 'peaking' },
  { frequency: 2000, type: 'peaking' },
  { frequency: 4000, type: 'peaking' },
  { frequency: 8000, type: 'peaking' },
  { frequency: 16000, type: 'highshelf' },
] as const;

import { type } from '@tauri-apps/plugin-os';

const os = type();

export const IS_DESKTOP = ['windows', 'linux', 'macos'].includes(os);

export const IS_APPLE = ['macos', 'ios'].includes(os);

export const OS_TYPE_MAP = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS',
} as const;

export const ARCH_MAP = {
  x86: 'x86',
  x86_64: 'x64',
  arm: 'ARM',
  aarch64: 'ARM64',
  mips: 'MIPS',
  mips64: 'MIPS64',
  powerpc: 'PowerPC',
  powerpc64: 'PowerPC64',
  riscv64: 'RISC-V 64',
  s390x: 's390x',
  sparc64: 'SPARC64',
} as const;

export const SUPPORT_SET_SINK_ID =
  // eslint-disable-next-line compat/compat
  'setSinkId' in window.AudioContext?.prototype;

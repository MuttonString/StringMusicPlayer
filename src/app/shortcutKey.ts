import { KeyCode } from '../types/keyCode';

// 禁用部分原生快捷键
window.addEventListener(
  'keydown',
  (e) => {
    // DevTools
    if (
      ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'i') ||
      e.key === 'F12'
    ) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 刷新
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 页面后退
    if (
      (e.metaKey && (e.key === '[' || e.key === KeyCode.Left)) ||
      (e.altKey && e.key === KeyCode.Left) ||
      (e.ctrlKey && e.key === KeyCode.Left)
    ) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 页面前进
    if (
      (e.metaKey && (e.key === ']' || e.key === KeyCode.Right)) ||
      (e.altKey && e.key === KeyCode.Right) ||
      (e.ctrlKey && e.key === KeyCode.Right)
    ) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  },
  true,
);

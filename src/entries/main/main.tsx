import { invoke } from '@tauri-apps/api/core';
import { confirm } from '@tauri-apps/plugin-dialog';
import { exit } from '@tauri-apps/plugin-process';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import router from '../../app/router';
import '../../app/titleBar';
import MainProvider from '../../providers';
import './index.less';

console.info('Creating React DOM...');

ReactDOM.createRoot(document.getElementById('root')!, {
  onUncaughtError: async (error, errorInfo) => {
    const str =
      error + (errorInfo.componentStack ? '\n' + errorInfo.componentStack : '');
    console.error(str);
    const ok = await confirm(
      str + '\n\nClick "Ok" to open DevTools, "Cancel" to exit application.',
      { title: 'Error', kind: 'error' },
    );
    if (ok) {
      invoke('open_devtools');
    } else {
      exit();
    }
  },
}).render(
  <MainProvider>
    <RouterProvider router={router} />
  </MainProvider>,
);

import { invoke } from '@tauri-apps/api/core';
import { appDataDir, appLogDir } from '@tauri-apps/api/path';
import { confirm } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
import { exit } from '@tauri-apps/plugin-process';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import router from '../../app/router';
import '../../app/titleBar';
import { IS_DESKTOP } from '../../constants/os';
import MainProvider from '../../providers';
import './index.less';

console.info('Creating React DOM...');

if (IS_DESKTOP) {
  window.appdata = () => {
    appDataDir().then((val) => openPath(val));
  };
  window.applog = () => {
    appLogDir().then((val) => openPath(val));
  };
}

ReactDOM.createRoot(document.getElementById('root')!, {
  onUncaughtError: async (error, errorInfo) => {
    const str =
      error + (errorInfo.componentStack ? '\n' + errorInfo.componentStack : '');
    console.error(str);
    const ok = await confirm(
      str + '\n\nClick "Ok" to open DevTools, "Cancel" to exit application.',
      { title: 'Error', kind: 'error' },
    );
    if (IS_DESKTOP) {
      const textStyle = 'color: white; background: darkblue';
      const fnStyle = 'color: orange; background: darkblue; font-weight: bold';
      console.log(
        '%cUse %cappdata()%c or %capplog()%c to open the corresponding directory.',
        textStyle,
        fnStyle,
        textStyle,
        fnStyle,
        textStyle,
      );
    }
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

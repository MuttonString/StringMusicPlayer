import { debug, error, info, trace, warn } from '@tauri-apps/plugin-log';

function forwardConsole(
  fnName: 'log' | 'debug' | 'info' | 'warn' | 'error',
  logger: (message: string) => Promise<void>,
) {
  const original = console[fnName];

  console[fnName] = (...args) => {
    if (typeof args[0] === 'string' && /^DECORUM/.test(args[0])) {
      return;
    }

    original(...args);

    if (typeof args[0] === 'string') {
      if (
        /The resource id [0-9]+ is invalid\./.test(args[0]) ||
        /\[TAURI\] Couldn't find callback id [0-9]+\./.test(args[0])
      ) {
        return;
      }
    } else {
      args[0] = JSON.stringify(args[0]);
    }

    logger(args[0]);
  };
}

forwardConsole('log', trace);
forwardConsole('debug', debug);
forwardConsole('info', info);
forwardConsole('warn', warn);
forwardConsole('error', error);

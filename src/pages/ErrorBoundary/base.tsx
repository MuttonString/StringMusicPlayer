import { invoke } from '@tauri-apps/api/core';
import { exit } from '@tauri-apps/plugin-process';
import { useEffect } from 'react';

interface Props {
  error?: string;
  errorInfo?: string | null;
}

const btnClassName =
  'text-base w-40 h-10 border border-white text-white bg-black mt-4 ms-4 cursor-pointer rounded-lg hover:text-black active:text-black hover:bg-white active:bg-white focus-visible:outline-4!';

export default function ErrorBoundaryBase({ error, errorInfo }: Props) {
  useEffect(() => {
    console.error(error + (errorInfo ? '\n' + errorInfo : ''));
  }, [error, errorInfo]);

  return (
    <div
      lang='en'
      className='p-8 max-w-dvw h-dvh bg-[gray] text-white [&_div]:select-text [&_div]:cursor-text'
    >
      <header className='h-(--title-bar-height) w-full fixed border-white border-b top-0 left-0 right-0' />
      <div className='text-[red] text-3xl mb-4 mt-4'>
        Unexpected Application Error
      </div>
      {error && <div className='text-base mb-4'>{error}</div>}
      {errorInfo && (
        <div className='text-sm mb-4 font-mono! whitespace-pre-wrap overflow-auto max-h-[calc(100%-20rem)] focus-visible:outline-4!'>
          {errorInfo}
        </div>
      )}
      <button className={btnClassName} onClick={() => location.reload()}>
        Refresh Page
      </button>
      <br />
      <button className={btnClassName} onClick={() => invoke('open_devtools')}>
        Open DevTools
      </button>
      <br />
      <button className={btnClassName} onClick={() => exit()}>
        Exit Application
      </button>
    </div>
  );
}

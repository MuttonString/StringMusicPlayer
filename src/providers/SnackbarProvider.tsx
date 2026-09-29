import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import type { ReactNode } from 'react';
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import MaterialIcon from '../components/ui/MaterialIcon';
import { WINDOW_LABEL } from '../constants/window';
import type {
  ChildrenProp,
  OpenSnackbarFn,
  SnackbarType,
} from '../types/component';

const Context = createContext<OpenSnackbarFn>(() => {});

export const useSnackbar = () => useContext(Context);

export function SnackbarProvider({ children }: ChildrenProp) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<ReactNode>();
  const [type, setType] = useState<SnackbarType>(null);
  const timerRef = useRef<number>(0);

  const showSnackbar = useCallback<OpenSnackbarFn>(
    (message, type = null, autoHideDuration = 5000) => {
      clearTimeout(timerRef.current);
      timerRef.current = 0;

      setMessage(
        message.split('\n').map((row, idx) => (
          <Fragment key={idx}>
            {idx !== 0 && <br />}
            {row}
          </Fragment>
        )),
      );
      setType(type);
      setOpen(true);

      // Snackbar的autoHideDuration无法动态调整，用此方法代替
      timerRef.current = setTimeout(() => {
        setOpen(false);
      }, autoHideDuration);
    },
    [],
  );

  return (
    <Context.Provider value={showSnackbar}>
      {children}
      {WINDOW_LABEL === 'main' && (
        <Snackbar
          className='max-w-[calc(100%-5rem)]'
          open={open}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          action={
            type ? undefined : (
              <IconButton
                size='small'
                color='inherit'
                onClick={() => setOpen(false)}
              >
                <MaterialIcon name='close' />
              </IconButton>
            )
          }
          message={message}
        >
          {type ? (
            <Alert onClose={() => setOpen(false)} severity={type}>
              {message}
            </Alert>
          ) : undefined}
        </Snackbar>
      )}
    </Context.Provider>
  );
}

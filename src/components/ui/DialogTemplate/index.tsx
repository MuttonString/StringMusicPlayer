import type { DialogProps } from '@mui/material/Dialog';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import type { KeyboardEventHandler } from 'react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IS_APPLE } from '../../../constants/os';
import type { DialogBaseProps } from '../../../types/component';
import { KeyCode } from '../../../types/keyCode';
import MaterialIcon from '../MaterialIcon';
import Tip from '../Tip';

interface IProps extends DialogBaseProps {
  onConfirm?: () => void;
  extraAction?: ReactNode;
  confirmDisabled?: boolean;
  title?: string;
  children?: ReactNode;
  maxWidth: DialogProps['maxWidth'];
  fullWidth?: boolean;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
}

export default function DialogTemplate(props: IProps) {
  const {
    open,
    onClose,
    onConfirm,
    extraAction,
    confirmDisabled,
    title,
    children,
    maxWidth,
    fullWidth = true,
    onKeyDown,
  } = props;
  const { t } = useTranslation();

  return (
    <Dialog
      disableRestoreFocus
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      open={open}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        switch (e.code) {
          case KeyCode.Esc:
            onClose();
            break;
          case KeyCode.Enter:
            if (
              (e.target as HTMLElement).tagName === 'TEXTAREA' &&
              !(IS_APPLE ? e.metaKey : e.ctrlKey)
            ) {
              break;
            }
            e.preventDefault();
            onConfirm?.();
            break;
        }
      }}
    >
      <DialogTitle
        sx={{ padding: '8px 24px' }}
        className='flex justify-between items-center gap-2'
      >
        <div>{title}</div>
        <div className='flex -me-4'>
          <Tip title={t(onConfirm ? 'dialog.cancel' : 'dialog.close')}>
            <IconButton onClick={onClose}>
              <MaterialIcon name='close' />
            </IconButton>
          </Tip>
          {onConfirm && (
            <Tip title={t('dialog.confirm')} disabled={confirmDisabled}>
              <IconButton
                color='primary'
                onClick={onConfirm}
                disabled={confirmDisabled}
              >
                <MaterialIcon name='check' />
              </IconButton>
            </Tip>
          )}
          {extraAction}
        </div>
      </DialogTitle>
      <Divider />
      <DialogContent className='max-h-[calc(100vh-10rem)]'>
        {children}
      </DialogContent>
    </Dialog>
  );
}

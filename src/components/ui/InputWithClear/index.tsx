import type { InputProps } from '@mui/material';
import { IconButton, Input } from '@mui/material';
import { useTranslation } from 'react-i18next';
import MaterialIcon from '../MaterialIcon';
import Tip from '../Tip';

interface Props extends InputProps {
  onClear: () => void;
}

export default function InputWithClear({ onClear, ...rest }: Props) {
  const { t } = useTranslation();

  return (
    <Input
      autoFocus
      {...rest}
      endAdornment={
        !!rest.value && (
          <Tip title={t('common.clear')}>
            <IconButton size='small' onClick={onClear}>
              <MaterialIcon fontSize='small' name='clear' />
            </IconButton>
          </Tip>
        )
      }
    />
  );
}

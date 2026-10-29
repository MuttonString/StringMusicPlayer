import Autocomplete from '@mui/material/Autocomplete';
import FormHelperText from '@mui/material/FormHelperText';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../../app/i18n';
import type { FontName } from '../../../types/event';
import { KeyCode } from '../../../types/keyCode';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export default function FontSelect({ value, onChange, onBlur }: Props) {
  const [fonts, setFonts] = useState<FontName[]>();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const langs = i18n.languages;

  return (
    <>
      <Autocomplete
        openOnFocus
        size='small'
        loading={!fonts}
        open={open}
        onOpen={() => {
          setOpen(true);
          if (fonts) return;
          invoke<FontName[]>('get_system_fonts').then((val) => {
            setFonts(val);
          });
        }}
        onClose={() => setOpen(false)}
        freeSolo
        options={fonts || []}
        getOptionLabel={(option) =>
          typeof option === 'string' ? option : option.original
        }
        isOptionEqualToValue={(option, value) =>
          (typeof value === 'string' ? value : value.original) ===
          option.original
        }
        filterOptions={(options, { inputValue }) => {
          const value = inputValue.trim();
          if (!value) return options;

          return options.filter((item) => {
            const val = value.toLocaleLowerCase(langs);
            return (
              item.localized.toLocaleLowerCase(langs).includes(val) ||
              item.original.toLocaleLowerCase(langs).includes(val)
            );
          });
        }}
        renderOption={({ key, ...props }, option) => {
          return (
            <ListItem key={key} {...props}>
              <ListItemText
                primary={
                  <bdi dir='auto' style={{ fontFamily: option.original }}>
                    {option.localized}
                  </bdi>
                }
                secondary={
                  <bdi lang='en' dir='ltr'>
                    {option.original}
                  </bdi>
                }
              />
            </ListItem>
          );
        }}
        renderInput={(params) => (
          <TextField
            aria-label={t('config.searchFont')}
            placeholder={t('config.searchFont')}
            {...params}
          />
        )}
        inputValue={value}
        onInputChange={(_, val) => onChange(val)}
        onKeyDown={(e) => {
          if (e.key === KeyCode.Enter) {
            (e.target as HTMLDivElement).blur();
          }
        }}
        onBlur={onBlur}
      />
      <FormHelperText>{t('config.searchFontDesc')}</FormHelperText>
    </>
  );
}

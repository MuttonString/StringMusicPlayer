import type { TooltipProps } from '@mui/material/Tooltip';
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import { Fragment } from 'react/jsx-runtime';

interface Props extends TooltipProps {
  disabled?: boolean;
}

export default function Tip({ disabled, children, title, ...props }: Props) {
  return disabled ? (
    children
  ) : (
    <Tooltip
      enterDelay={300}
      enterNextDelay={300}
      title={
        typeof title === 'string'
          ? title.split('\n').map((row, idx) => (
              <Fragment key={idx}>
                {idx > 0 && <br />}
                {row}
              </Fragment>
            ))
          : title
      }
      slotProps={{
        tooltip: {
          sx: { maxWidth: '100%' },
        },
        popper: {
          sx: {
            [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]:
              {
                marginTop: 0,
              },
            [`&.${tooltipClasses.popper}[data-popper-placement*="top"] .${tooltipClasses.tooltip}`]:
              {
                marginBottom: 0,
              },
            [`&.${tooltipClasses.popper}[data-popper-placement*="right"] .${tooltipClasses.tooltip}`]:
              {
                marginLeft: 0,
              },
            [`&.${tooltipClasses.popper}[data-popper-placement*="left"] .${tooltipClasses.tooltip}`]:
              {
                marginRight: 0,
              },
          },
        },
      }}
      {...props}
    >
      {children}
    </Tooltip>
  );
}

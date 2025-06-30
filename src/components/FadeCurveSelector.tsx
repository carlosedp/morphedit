// Fade curve selector dropdown button component
import React from 'react';
import { Button, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { getFadeCurveOptions } from '../utils/fadeCurves';
import { TOOLTIP_DELAYS } from '../constants';

interface FadeCurveSelectorProps {
  selectedCurve: string;
  onCurveChange: (curveType: string) => void;
  fadeType: 'in' | 'out' | 'crossfade';
  disabled?: boolean;
  anchorEl: HTMLElement | null;
  onSetAnchorEl: (element: HTMLElement | null) => void;
}

export const FadeCurveSelector: React.FC<FadeCurveSelectorProps> = ({
  selectedCurve,
  onCurveChange,
  fadeType,
  disabled = false,
  anchorEl,
  onSetAnchorEl,
}) => {
  const curveOptions = getFadeCurveOptions();
  const selectedOption = curveOptions.find(
    (option) => option.value === selectedCurve
  );
  const menuOpen = Boolean(anchorEl);

  const handleCurveSelect = (curveType: string) => {
    onCurveChange(curveType);
    onSetAnchorEl(null);
  };

  return (
    <>
      <Tooltip
        title={`Select fade ${fadeType} curve type (current: ${selectedOption?.label || 'Linear'})`}
        enterDelay={TOOLTIP_DELAYS.ENTER}
        leaveDelay={TOOLTIP_DELAYS.LEAVE}
      >
        <Button
          size="small"
          onClick={(event) => onSetAnchorEl(event.currentTarget)}
          disabled={disabled}
          sx={{
            px: 1,
            minWidth: 'auto',
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            // Ensure adequate touch target on mobile
            minHeight: { xs: 36, sm: 'auto' },
            // display: 'flex',
            // flexDirection: 'column',
            // alignItems: 'center'
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.6rem',
              lineHeight: 1,
              textAlign: 'center',
            }}
          >
            {selectedOption ? selectedOption.label.slice(0, 3) : 'Lin'}
          </Typography>
          <ArrowDropDownIcon />
        </Button>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={() => onSetAnchorEl(null)}
        MenuListProps={{
          'aria-labelledby': `fade-${fadeType}-curve-button`,
        }}
        slotProps={{
          paper: {
            sx: {
              maxHeight: '60vh', // Limit height on mobile
              minWidth: 200,
              // Ensure proper z-index for mobile
              zIndex: 1300,
            },
          },
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {curveOptions.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === selectedCurve}
            onClick={() => handleCurveSelect(option.value)}
            sx={{ minWidth: 200 }}
          >
            <Typography variant="body2">
              <strong>{option.label}</strong> - {option.description}
              {option.value === selectedCurve && (
                <Typography component="span" color="primary" sx={{ ml: 1 }}>
                  ✓
                </Typography>
              )}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

import React from 'react';
import MuiButton from '@mui/material/Button';

/**
 * Custom POS Button wrapping Material UI Button.
 * 
 * @param {string} variant - 'primary', 'accent', 'secondary'
 * @param {boolean} fullWidth - Takes up full width of container
 * @param {React.ReactNode} children - Button label/content
 * @param {object} props - Other standard MuiButton props
 */
const Button = ({ variant = 'primary', fullWidth = false, children, sx = {}, ...props }) => {
  let btnVariant = 'contained';
  let color = 'primary';
  let customSx = { ...sx };

  if (variant === 'accent') {
    btnVariant = 'contained';
    customSx = {
      ...customSx,
      backgroundColor: '#D4A373',
      color: '#2B1D1A',
      '&:hover': {
        backgroundColor: '#C89562',
      },
    };
  } else if (variant === 'secondary') {
    btnVariant = 'outlined';
    color = 'secondary'; // Uses theme secondary overrides
  } else {
    btnVariant = 'contained';
    color = 'primary';
  }

  return (
    <MuiButton
      variant={btnVariant}
      color={color}
      fullWidth={fullWidth}
      sx={customSx}
      disableElevation
      {...props}
    >
      {children}
    </MuiButton>
  );
};

export default Button;

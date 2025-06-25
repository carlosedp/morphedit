import { Box, styled } from '@mui/material';

// Styled waveform container component
export const WaveformContainer = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius,
  width: '100%',
  minHeight: '150px',
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.secondary,
  fontSize: '14px',
  transition: 'background-color 0.2s ease-in-out',
  overflowX: 'auto',
  boxSizing: 'border-box',
  position: 'relative',

  // Mobile responsiveness
  [theme.breakpoints.down('md')]: {
    minHeight: '120px',
    marginBottom: theme.spacing(1.5),
    fontSize: '14px',
    padding: theme.spacing(1),
  },

  [theme.breakpoints.down('sm')]: {
    minHeight: '100px',
    marginBottom: theme.spacing(1),
    fontSize: '13px',
    padding: theme.spacing(0.5),
  },

  // Waveform-specific styles
  '& ::part(cursor):after': {
    content: '"▼"',
    fontSize: '1.5em',
    color: '#ff990a',
    position: 'absolute',
    top: '-13px',
    left: '-4px',
    zIndex: 4,
  },

  '& ::part(region-content)': {
    position: 'relative',
    width: '0px',
    height: '0px',
    left: '-13px',
    top: '-6px',
  },
}));

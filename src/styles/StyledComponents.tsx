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
    content: '"▶"',
    fontSize: '1.3em',
    color: '#ff990a',
    position: 'absolute',
    top: '-5px',
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

// Styled transport controls component
export const TransportControls = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  border: `1px solid ${theme.palette.primary.main}`,
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
}));

// Styled info container component (replacement for .info-container)
export const InfoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  border: `1px solid ${theme.palette.primary.main}`, // Use theme color instead of hardcoded
  padding: theme.spacing(1),
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper, // Use theme color instead of hardcoded
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: theme.spacing(1),

  [theme.breakpoints.down('md')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: theme.spacing(0.75),
    gap: theme.spacing(0.75),
  },
}));

// Styled info item component
export const InfoItem = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 0,

  [theme.breakpoints.down('md')]: {
    flex: 'none',
    width: '100%',
  },
}));

// Styled info item for zoom controls
export const InfoItemZoom = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  minWidth: 0,

  [theme.breakpoints.down('md')]: {
    flex: 'none',
    width: '100%',
    gap: theme.spacing(0.5),
  },
}));

// Styled zoom controls component
export const ZoomControls = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}));

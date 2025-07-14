import { Box, Typography } from '@mui/material';

import packageJson from '../../package.json';

export function Footer() {
  return (
    <Box mt={4} sx={{ mx: { xs: 1, sm: 2 } }}>
      {' '}
      {/* Add horizontal margin to footer */}
      <Typography
        variant="caption"
        color="text.primary"
        sx={{
          textAlign: 'center',
          fontSize: { xs: '0.75rem', sm: '0.75rem' }, // Ensure readability on mobile
        }}
      >
        Morphedit Audio Editor - All audio is processed in the browser,
        client-side so <b>your files never leave your computer</b>.
      </Typography>{' '}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          textAlign: 'center',
          opacity: 0.7,
          fontSize: { xs: '0.7rem', sm: '0.75rem' }, // Slightly smaller on mobile
          '& a': {
            color: 'text.secondary',
            textDecoration: 'underline',
          },
        }}
      >
        <br />
        Version {packageJson.version} - Built with React and MUI
        <br />© 2025 - Carlos Eduardo de Paula -{' '}
        <a
          href="https://github.com/carlosedp/morphedit"
          target="_blank"
          rel="noopener noreferrer"
        >
          Fork me on GitHub
        </a>
      </Typography>
    </Box>
  );
}

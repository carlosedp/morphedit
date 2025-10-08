import MenuBook from '@mui/icons-material/MenuBook';
import Settings from '@mui/icons-material/Settings';
import { Box, Button, Stack, Typography } from '@mui/material';

import { KeyboardShortcutsHelp } from '../KeyboardShortcutsHelp';

interface AppHeaderProps {
  onManualClick: () => void;
  onSettingsClick: () => void;
}

export function AppHeader({ onManualClick, onSettingsClick }: AppHeaderProps) {
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      mb={3}
      sx={{
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, md: 0 },
        textAlign: { xs: 'center', md: 'left' },
        mx: { xs: 1, sm: 2 }, // Add horizontal margin
        mt: { xs: 1, sm: 0 }, // Add top margin on mobile
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        gap={2}
        sx={{
          flexDirection: { xs: 'column', sm: 'row' },
          textAlign: { xs: 'center', sm: 'left' },
        }}
      >
        <img
          src="MorphEdit-Logo-Small.png"
          alt="MorphEdit Logo"
          style={{
            height: '96px',
            width: 'auto',
            borderRadius: '20px',
          }}
        />
        <Typography
          variant="h4"
          sx={{
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
          }}
        >
          MorphEdit Audio Editor
        </Typography>
      </Box>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{
          flexDirection: 'row', // Keep on same line for all breakpoints
          gap: { xs: 1, sm: 2 },
          alignItems: 'center',
          justifyContent: { xs: 'center', sm: 'flex-end' },
        }}
      >
        <Button
          variant="outlined"
          color="primary"
          startIcon={<Settings />}
          onClick={onSettingsClick}
          sx={{
            fontSize: { xs: '0.85rem', sm: '0.875rem' },
            padding: { xs: '0.5em 1em', sm: '6px 16px' },
            minHeight: { xs: '40px', sm: '36px' },
            width: 'auto',
            minWidth: { xs: '100px', sm: '120px' },
          }}
        >
          Settings
        </Button>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<MenuBook />}
          onClick={onManualClick}
          sx={{
            fontSize: { xs: '0.85rem', sm: '0.875rem' },
            padding: { xs: '0.5em 1em', sm: '6px 16px' },
            minHeight: { xs: '40px', sm: '36px' },
            width: 'auto',
            minWidth: { xs: '100px', sm: '120px' },
          }}
        >
          Manual
        </Button>
        <KeyboardShortcutsHelp />
      </Stack>
    </Box>
  );
}

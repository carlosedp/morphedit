import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Chip,
  Stack,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { keyboardShortcuts } from "./keyboardShortcuts";

export const KeyboardShortcutsHelp = () => {
  const [open, setOpen] = useState(false);

  // Group shortcuts for better display
  const groupedShortcuts = () => {
    const splicePlaybackKeys = [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "0",
      "q",
      "w",
      "e",
      "r",
      "t",
      "y",
      "u",
      "i",
      "o",
      "p",
    ];
    const otherShortcuts = Object.entries(keyboardShortcuts).filter(
      ([key]) => !splicePlaybackKeys.includes(key),
    );

    return [
      // Add consolidated splice playback shortcuts
      {
        key: "splice-numbers",
        shortcut: {
          key: "1-0",
          description: "Play splice markers 1-10",
          action: "playSpliceNumbers",
        },
      },
      {
        key: "splice-letters",
        shortcut: {
          key: "Q-P",
          description: "Play splice markers 11-20",
          action: "playSpliceLetters",
        },
      },
      // Add all other shortcuts
      ...otherShortcuts.map(([key, shortcut]) => ({ key, shortcut })),
    ];
  };

  return (
    <Box>
      <Button
        variant="text"
        size="small"
        startIcon={<HelpOutlineIcon />}
        onClick={() => setOpen(true)}
        sx={{ textTransform: "none" }}
      >
        Shortcuts
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Keyboard Shortcuts</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {groupedShortcuts().map(({ key, shortcut }) => (
              <Box
                key={key}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: 1,
                }}
              >
                <Typography variant="body2">{shortcut.description}</Typography>
                <Chip
                  label={shortcut.key === " " ? "Space" : shortcut.key}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontFamily: "monospace",
                    minWidth: "60px",
                  }}
                />
              </Box>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

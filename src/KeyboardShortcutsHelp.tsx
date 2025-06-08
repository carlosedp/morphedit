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
            {Object.entries(keyboardShortcuts).map(([key, shortcut]) => (
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

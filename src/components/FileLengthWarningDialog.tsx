import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Alert,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { formatDuration, MORPHAGENE_MAX_DURATION } from '../utils/fileLengthUtils';

interface FileLengthWarningDialogProps {
  open: boolean;
  duration: number;
  onTruncate: () => void;
  onImportFull: () => void;
  onCancel: () => void;
}

export const FileLengthWarningDialog: React.FC<FileLengthWarningDialogProps> = ({
  open,
  duration,
  onTruncate,
  onImportFull,
  onCancel,
}) => {
  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        File Length Warning
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This audio file is longer than the Morphagene maximum length
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            <strong>File duration:</strong> {formatDuration(duration)}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Morphagene maximum:</strong> {formatDuration(MORPHAGENE_MAX_DURATION)}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Excess time:</strong> {formatDuration(duration - MORPHAGENE_MAX_DURATION)}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary">
          The Make Noise Morphagene has a maximum file length of {formatDuration(MORPHAGENE_MAX_DURATION)} ({MORPHAGENE_MAX_DURATION} seconds).
          Files longer than this will not be compatible with the device.
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          You can either:
        </Typography>
        <Box component="ul" sx={{ mt: 1, mb: 0 }}>
          <Typography component="li" variant="body2" color="text.secondary">
            <strong>Truncate:</strong> Automatically trim the file to {formatDuration(MORPHAGENE_MAX_DURATION)} (recommended for Morphagene compatibility)
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            <strong>Import Full:</strong> Load the entire file (not compatible with Morphagene)
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="secondary">
          Cancel
        </Button>
        <Button onClick={onImportFull} color="primary" variant="outlined">
          Import Full File
        </Button>
        <Button onClick={onTruncate} color="primary" variant="contained">
          Truncate to {formatDuration(MORPHAGENE_MAX_DURATION)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

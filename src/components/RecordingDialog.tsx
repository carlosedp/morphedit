import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Alert,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { AudioRecorder } from './AudioRecorder';

interface RecordingDialogProps {
  open: boolean;
  onClose: () => void;
  onRecordingComplete: (blob: Blob) => void;
}

export const RecordingDialog: React.FC<RecordingDialogProps> = ({
  open,
  onClose,
  onRecordingComplete,
}) => {
  const [recordingError, setRecordingError] = useState<string>('');

  const handleRecordingError = (error: string) => {
    setRecordingError(error);
  };

  const handleRecordingCompleteInternal = (blob: Blob) => {
    setRecordingError('');
    onRecordingComplete(blob);
    onClose(); // Close dialog after successful recording
  };

  const handleClose = () => {
    setRecordingError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 400 },
      }}
    >
      <DialogTitle>Record Audio</DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          {recordingError && (
            <Alert severity="error" onClose={() => setRecordingError('')}>
              {recordingError}
            </Alert>
          )}

          <AudioRecorder
            onRecordingComplete={handleRecordingCompleteInternal}
            onError={handleRecordingError}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} startIcon={<Close />}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

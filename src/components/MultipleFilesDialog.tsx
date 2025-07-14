import InfoIcon from '@mui/icons-material/Info';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import React from 'react';

import {
  formatDuration,
  MORPHAGENE_MAX_DURATION,
} from '../utils/fileLengthUtils';

interface MultipleFilesDialogProps {
  open: boolean;
  files: File[];
  totalDuration: number;
  isAppendMode?: boolean;
  onConcatenate: () => void;
  onTruncateAndConcatenate: () => void;
  onCancel: () => void;
}

export const MultipleFilesDialog: React.FC<MultipleFilesDialogProps> = ({
  files,
  isAppendMode = false,
  onCancel,
  onConcatenate,
  onTruncateAndConcatenate,
  open,
  totalDuration,
}) => {
  const exceedsMaxLength = totalDuration > MORPHAGENE_MAX_DURATION;

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 1, sm: 3 },
          width: { xs: 'calc(100% - 16px)', sm: 'auto' },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <InfoIcon color="info" />
        Multiple Audio Files Detected
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          You've selected {files.length} audio files. They will be concatenated
          in alphabetical order with splice markers added between each file.
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            <strong>Files to concatenate:</strong>
          </Typography>
          <List
            dense
            sx={{
              maxHeight: 200,
              overflow: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            {files.map((file, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={file.name}
                  secondary={`File ${index + 1}`}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            <strong>Total duration:</strong> {formatDuration(totalDuration)}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Splice markers:</strong> {files.length - 1} (between each
            file)
          </Typography>
          {exceedsMaxLength && (
            <Typography variant="body1" gutterBottom color="warning.main">
              <strong>⚠️ Exceeds Morphagene maximum:</strong>{' '}
              {formatDuration(MORPHAGENE_MAX_DURATION)}
            </Typography>
          )}
        </Box>

        {exceedsMaxLength && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            The total duration exceeds the Morphagene maximum of{' '}
            {formatDuration(MORPHAGENE_MAX_DURATION)}. You can truncate the
            {isAppendMode ? ' appended' : ' concatenated'} audio to fit the
            maximum length.
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary">
          Files will be{' '}
          {isAppendMode ? 'appended to the existing audio' : 'concatenated'} in
          the order shown above (alphabetical). Splice markers will be
          automatically placed at the boundaries between files.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="secondary">
          Cancel
        </Button>
        {exceedsMaxLength && (
          <Button
            onClick={onTruncateAndConcatenate}
            color="primary"
            variant="outlined"
          >
            Truncate & {isAppendMode ? 'Append' : 'Concatenate'}
          </Button>
        )}
        <Button onClick={onConcatenate} color="primary" variant="contained">
          {exceedsMaxLength
            ? isAppendMode
              ? 'Append Full Length'
              : 'Concatenate Full Length'
            : isAppendMode
              ? 'Append Files'
              : 'Concatenate Files'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

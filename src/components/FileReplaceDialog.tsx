import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Alert,
} from "@mui/material";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";

interface FileReplaceDialogProps {
  open: boolean;
  fileName: string;
  isMultipleFiles: boolean;
  fileCount?: number;
  onReplace: () => void;
  onAppend: () => void;
  onCancel: () => void;
}

export const FileReplaceDialog: React.FC<FileReplaceDialogProps> = ({
  open,
  fileName,
  isMultipleFiles,
  fileCount = 1,
  onReplace,
  onAppend,
  onCancel,
}) => {
  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <QuestionMarkIcon color="info" />
        Audio Already Loaded
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          You have an audio file currently loaded. What would you like to do
          with the {isMultipleFiles ? `${fileCount} new files` : "new file"}?
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            <strong>
              {isMultipleFiles ? "Files to process:" : "File to process:"}
            </strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isMultipleFiles ? `${fileCount} audio files selected` : fileName}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose one of the following options:
        </Typography>

        <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
          <Typography component="li" variant="body2" color="text.secondary">
            <strong>Replace:</strong> Remove the current audio and load the new{" "}
            {isMultipleFiles ? "files" : "file"} (interface will be reset)
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            <strong>Append:</strong> Add the new{" "}
            {isMultipleFiles ? "files" : "file"} to the end of the current audio
            (existing splice markers will be preserved)
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            <strong>Cancel:</strong> Keep the current audio and ignore the new{" "}
            {isMultipleFiles ? "files" : "file"}
          </Typography>
        </Box>

        {!isMultipleFiles && (
          <Alert severity="info" sx={{ mt: 2 }}>
            When appending, a new locked splice marker will be automatically
            added at the beginning of the appended audio.
          </Alert>
        )}

        {isMultipleFiles && (
          <Alert severity="info" sx={{ mt: 2 }}>
            When appending multiple files, they will be concatenated together
            and added to the end of the current audio with splice markers at
            file boundaries.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="secondary">
          Cancel
        </Button>
        <Button onClick={onAppend} color="primary" variant="outlined">
          Append {isMultipleFiles ? "Files" : "File"}
        </Button>
        <Button onClick={onReplace} color="primary" variant="contained">
          Replace Current Audio
        </Button>
      </DialogActions>
    </Dialog>
  );
};

import React from "react";
import {
  Dialog,
  DialogContent,
  CircularProgress,
  Typography,
  Box,
} from "@mui/material";

interface LoadingDialogProps {
  open: boolean;
  message: string;
}

export const LoadingDialog: React.FC<LoadingDialogProps> = ({
  open,
  message,
}) => {
  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          minHeight: "150px",
          margin: { xs: 1, sm: 3 },
          width: { xs: "calc(100% - 16px)", sm: "auto" },
        },
      }}
    >
      <DialogContent>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          sx={{ py: 3 }}
        >
          <CircularProgress size={50} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.primary" textAlign="center">
            {message}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            sx={{ mt: 1 }}
          >
            Please wait...
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

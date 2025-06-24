import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress,
  Box,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UpdateIcon from '@mui/icons-material/Update';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseName?: string;
  releaseDate: string;
}

interface DownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export const AutoUpdater = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // Check if we're in Electron environment
    if (typeof window !== 'undefined' && window.electronAPI) {
      const electronAPI = window.electronAPI;

      // Listen for update events
      electronAPI.onUpdateAvailable((info: UpdateInfo) => {
        console.log('Update available:', info);
        setUpdateInfo(info);
        setShowDialog(true);
      });

      electronAPI.onDownloadProgress((progress: DownloadProgress) => {
        console.log('Download progress:', progress);
        setDownloadProgress(progress);
      });

      electronAPI.onUpdateDownloaded((info: UpdateInfo) => {
        console.log('Update downloaded:', info);
        setUpdateDownloaded(true);
        setDownloading(false);
        setDownloadProgress(null);
      });
    }
  }, []);

  const handleDownloadUpdate = () => {
    setDownloading(true);
    // The download starts automatically when update is available
    // We just need to show the progress
  };

  const handleInstallUpdate = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.installUpdate();
    }
  };

  const handleDismiss = () => {
    setShowDialog(false);
    setUpdateDownloaded(false);
    setDownloading(false);
    setDownloadProgress(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  if (!showDialog) return null;

  return (
    <Dialog
      open={showDialog}
      onClose={handleDismiss}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={updateDownloaded}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <UpdateIcon color="primary" />
        {updateDownloaded ? 'Update Ready to Install' : 'Update Available'}
      </DialogTitle>

      <DialogContent>
        {updateInfo && (
          <Box mb={2}>
            <Typography variant="h6" gutterBottom>
              MorphEdit {updateInfo.version}
            </Typography>
            {updateInfo.releaseName && (
              <Typography
                variant="subtitle1"
                color="text.secondary"
                gutterBottom
              >
                {updateInfo.releaseName}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              Released: {new Date(updateInfo.releaseDate).toLocaleDateString()}
            </Typography>
          </Box>
        )}

        {updateDownloaded ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography>
              The update has been downloaded and is ready to install. The
              application will restart to complete the installation.
            </Typography>
          </Alert>
        ) : downloading ? (
          <Box>
            <Typography variant="body2" gutterBottom>
              Downloading update...
            </Typography>
            {downloadProgress && (
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={downloadProgress.percent}
                  sx={{ mb: 1 }}
                />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption">
                    {downloadProgress.percent.toFixed(1)}% complete
                  </Typography>
                  <Typography variant="caption">
                    {formatSpeed(downloadProgress.bytesPerSecond)}
                  </Typography>
                </Box>
                <Typography variant="caption" display="block">
                  {formatBytes(downloadProgress.transferred)} /{' '}
                  {formatBytes(downloadProgress.total)}
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Typography>
            A new version of MorphEdit is available. Would you like to download
            and install it?
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        {updateDownloaded ? (
          <>
            <Button onClick={handleDismiss}>Later</Button>
            <Button
              variant="contained"
              onClick={handleInstallUpdate}
              startIcon={<UpdateIcon />}
            >
              Install & Restart
            </Button>
          </>
        ) : downloading ? (
          <Button onClick={handleDismiss} disabled>
            Downloading...
          </Button>
        ) : (
          <>
            <Button onClick={handleDismiss}>Skip</Button>
            <Button
              variant="contained"
              onClick={handleDownloadUpdate}
              startIcon={<DownloadIcon />}
            >
              Download Update
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

import Check from '@mui/icons-material/Check';
import FiberManualRecord from '@mui/icons-material/FiberManualRecord';
import Mic from '@mui/icons-material/Mic';
import Pause from '@mui/icons-material/Pause';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Refresh from '@mui/icons-material/Refresh';
import Stop from '@mui/icons-material/Stop';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';

import { AUDIO_RECORD_MAX_DURATION } from '../constants';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onError?: (error: string) => void;
}

interface AudioDevice {
  deviceId: string;
  label: string;
}

/**
 * AudioRecorder component that records audio directly in stereo format.
 *
 * This component is configured to record stereo audio from the start, which supports:
 * - Mono sources (like microphones): The browser will create a stereo track with
 *   identical channels from the mono source
 * - Stereo sources (like audio interfaces): True stereo recording is preserved
 *
 * This eliminates the need for post-recording mono-to-stereo conversion and
 * ensures consistent stereo output regardless of the input source type.
 */

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onError,
  onRecordingComplete,
}) => {
  const theme = useTheme();
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const recordPluginRef = useRef<RecordPlugin | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string>('');
  const [permissionState, setPermissionState] = useState<
    'unknown' | 'granted' | 'denied' | 'prompt'
  >('unknown');

  // New states for preview functionality
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Format time in mm:ss
  const formatTime = (timeMs: number) => {
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const initializeWaveSurfer = React.useCallback(
    (forPreview = false) => {
      if (!waveformRef.current) return null;

      // Destroy existing instance
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      if (forPreview) {
        // Create WaveSurfer instance for preview (without record plugin)
        const ws = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: theme.palette.primary.main,
          progressColor: theme.palette.primary.light,
          cursorColor: theme.palette.secondary.main,
          height: 80,
          normalize: true,
          interact: false,
        });

        // Set up preview event listeners
        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        ws.on('finish', () => setIsPlaying(false));

        wavesurferRef.current = ws;
        recordPluginRef.current = null;
        return ws;
      } else {
        // Create new WaveSurfer instance for recording
        const ws = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: theme.palette.primary.main,
          progressColor: theme.palette.primary.light,
          cursorColor: theme.palette.secondary.main,
          height: 80,
          normalize: true,
          interact: false,
        });

        // Initialize Record plugin
        const record = ws.registerPlugin(
          RecordPlugin.create({
            renderRecordedAudio: true,
            scrollingWaveform: true,
            continuousWaveform: false,
            continuousWaveformDuration: AUDIO_RECORD_MAX_DURATION,
          })
        );

        // Set up event listeners
        record.on('record-end', async (blob: Blob) => {
          setIsRecording(false);
          setIsPaused(false);
          setRecordingTime(0);
          setRecordedBlob(blob);

          // Load preview directly here
          setIsLoadingPreview(true);
          try {
            const previewWs = initializeWaveSurfer(true);
            if (previewWs) {
              const url = URL.createObjectURL(blob);
              await previewWs.load(url);
              setIsPreviewMode(true);
            }
          } catch (err) {
            console.error('Error loading preview:', err);
            setError('Failed to load preview. Please try recording again.');
          } finally {
            setIsLoadingPreview(false);
          }
        });

        record.on('record-progress', (time: number) => {
          setRecordingTime(time);
        });

        wavesurferRef.current = ws;
        recordPluginRef.current = record;
        return ws;
      }
    },
    [theme]
  );

  const initializeDevices = React.useCallback(async () => {
    try {
      // Get available audio devices (this will work after permission is granted)
      const devices = await RecordPlugin.getAvailableAudioDevices();
      const audioInputDevices = devices.filter(
        (device) => device.kind === 'audioinput'
      );

      setAudioDevices(
        audioInputDevices.map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}...`,
        }))
      );

      // Select default device
      if (audioInputDevices.length > 0) {
        setSelectedDevice(audioInputDevices[0].deviceId);
      }

      // Initialize WaveSurfer
      initializeWaveSurfer();

      setError('');
      setPermissionState('granted');
      return true;
    } catch (err) {
      console.error('Error enumerating devices:', err);
      return false;
    }
  }, [initializeWaveSurfer]);

  const requestMicrophonePermission = React.useCallback(async () => {
    try {
      setIsInitializing(true);
      setError('');

      // Request microphone access with stereo configuration
      // This configures the recording to be stereo from the start, supporting both mono sources
      // (like microphones) and stereo sources (like audio interfaces) without conversion
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 2, // Request stereo recording (works with both mono and stereo sources)
          sampleRate: 48000, // High quality sample rate
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach((track) => track.stop());

      // Now initialize devices
      const success = await initializeDevices();
      if (!success) {
        throw new Error('Failed to initialize audio devices');
      }
    } catch (permissionError) {
      console.error('Microphone permission denied:', permissionError);
      setPermissionState('denied');
      const errorMessage =
        'Microphone access was denied. Please allow microphone permissions and try again.';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  }, [initializeDevices, onError]);

  // Initialize audio devices and WaveSurfer
  useEffect(() => {
    const initializeRecorder = async () => {
      try {
        setIsInitializing(true);
        setPermissionState('prompt');

        // Try to request microphone permission
        await requestMicrophonePermission();
      } catch (err) {
        console.error('Error during initial setup:', err);
        setPermissionState('unknown');
      }
    };

    initializeRecorder();

    return () => {
      // Cleanup
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [requestMicrophonePermission]);

  const handleStartRecording = async () => {
    if (!recordPluginRef.current) return;

    try {
      setError('');
      await recordPluginRef.current.startRecording({
        deviceId: selectedDevice || undefined,
      });
      setIsRecording(true);
      setIsPaused(false);
    } catch (err) {
      const errorMessage =
        'Failed to start recording. Please check microphone permissions.';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('Error starting recording:', err);
    }
  };

  const handleStopRecording = () => {
    if (!recordPluginRef.current) return;
    recordPluginRef.current.stopRecording();
  };

  const handlePauseResume = () => {
    if (!recordPluginRef.current) return;

    if (isPaused) {
      recordPluginRef.current.resumeRecording();
      setIsPaused(false);
    } else {
      recordPluginRef.current.pauseRecording();
      setIsPaused(true);
    }
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId);
    // Reinitialize with new device if not recording
    if (!isRecording && !isPreviewMode) {
      initializeWaveSurfer();
    }
  };

  // New preview control handlers
  const handlePlayPause = () => {
    if (!wavesurferRef.current || !isPreviewMode) return;

    if (isPlaying) {
      wavesurferRef.current.pause();
    } else {
      wavesurferRef.current.play();
    }
  };

  const handleRecordAgain = () => {
    setIsPreviewMode(false);
    setRecordedBlob(null);
    setIsPlaying(false);
    initializeWaveSurfer(false);
  };

  const handleAcceptRecording = () => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob);
    }
  };

  if (isInitializing) {
    return (
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography>Initializing audio recorder...</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={1}>
          <Mic color="primary" />
          <Typography variant="h6">Audio Recorder</Typography>
        </Box>

        {/* Error Alert with retry option */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError('')}
            action={
              permissionState === 'denied' && (
                <Button
                  color="inherit"
                  size="small"
                  onClick={requestMicrophonePermission}
                >
                  Retry
                </Button>
              )
            }
          >
            {error}
          </Alert>
        )}

        {/* Microphone Selection or Permission Request - hide during preview */}
        {!isPreviewMode && audioDevices.length > 0 ? (
          <FormControl fullWidth disabled={isRecording}>
            <InputLabel>Devices</InputLabel>
            <Select
              value={selectedDevice}
              label="Microphone"
              onChange={(e) => handleDeviceChange(e.target.value)}
            >
              {audioDevices
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((device) => (
                  <MenuItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        ) : (
          !isInitializing &&
          !isPreviewMode && (
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Microphone access is required for recording
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={requestMicrophonePermission}
                startIcon={<Mic />}
                disabled={isInitializing}
              >
                Allow Microphone Access
              </Button>
            </Box>
          )
        )}

        {/* Recording/Preview Status */}
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            {isRecording && (
              <Chip
                icon={<FiberManualRecord />}
                label={isPaused ? 'Paused' : 'Recording'}
                color={isPaused ? 'warning' : 'error'}
                variant="filled"
              />
            )}
            {isPreviewMode && (
              <Chip label="Preview" color="success" variant="filled" />
            )}
            <Typography variant="h6" fontFamily="monospace">
              🕒 {formatTime(recordingTime)}
            </Typography>
          </Stack>
        </Box>

        {/* Waveform Display with Loading State */}
        <Box
          ref={waveformRef}
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            minHeight: 80,
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isLoadingPreview && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <Stack alignItems="center" spacing={1}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">
                  Loading Preview...
                </Typography>
              </Stack>
            </Box>
          )}
        </Box>

        {/* Control Buttons */}
        {audioDevices.length > 0 && (
          <Stack direction="row" spacing={2} justifyContent="center">
            {isPreviewMode ? (
              // Preview controls
              <>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={isPlaying ? <Pause /> : <PlayArrow />}
                  onClick={handlePlayPause}
                  disabled={isLoadingPreview}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Refresh />}
                  onClick={handleRecordAgain}
                  disabled={isLoadingPreview}
                >
                  Record Again
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Check />}
                  onClick={handleAcceptRecording}
                  disabled={isLoadingPreview}
                >
                  Use Recording
                </Button>
              </>
            ) : !isRecording ? (
              // Recording start control
              <Button
                variant="contained"
                color="primary"
                startIcon={<Mic />}
                onClick={handleStartRecording}
                disabled={!selectedDevice || !!error}
                size="large"
              >
                Start Recording
              </Button>
            ) : (
              // Recording controls
              <>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={isPaused ? <PlayArrow /> : <Pause />}
                  onClick={handlePauseResume}
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Stop />}
                  onClick={handleStopRecording}
                >
                  Stop Recording
                </Button>
              </>
            )}
          </Stack>
        )}

        {/* Instructions */}
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {isPreviewMode
            ? 'Preview your recording. Click "Use Recording" to load it into the editor or "Record Again" to start over.'
            : audioDevices.length === 0 && !isInitializing
              ? 'Click "Allow Microphone Access" to enable recording features'
              : !isRecording
                ? 'Select a microphone and click "Start Recording" to begin'
                : 'Click "Stop Recording" when finished to preview your audio'}
        </Typography>
        <Typography variant="caption" color="text.primary" textAlign="center">
          If encontering issues on mobile, try on Chrome browser for better
          compatibility.
        </Typography>
      </Stack>
    </Paper>
  );
};

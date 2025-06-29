import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Stack,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Mic,
  Stop,
  Pause,
  PlayArrow,
  FiberManualRecord,
  Refresh,
  Check,
} from '@mui/icons-material';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';
import { useTheme } from '@mui/material/styles';
import { AUDIO_RECORD_MAX_DURATION } from '../constants';

// Browser detection utilities
const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  const isFirefoxMobile = /Firefox.*Mobile/.test(userAgent);
  const isSafariMobile = /Safari/.test(userAgent) && /Mobile/.test(userAgent) && !/Chrome/.test(userAgent);
  const isIOSWebKit = /iPhone|iPad|iPod/.test(userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isChromeMobile = /Chrome.*Mobile/.test(userAgent);
  
  return {
    isFirefoxMobile,
    isSafariMobile,
    isIOSWebKit,
    isChromeMobile,
    isMobile: isFirefoxMobile || isSafariMobile || isIOSWebKit || isChromeMobile,
  };
};

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
  onRecordingComplete,
  onError,
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

      const browser = getBrowserInfo();

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

        // Initialize Record plugin with iOS-specific options
        const recordOptions: {
          renderRecordedAudio: boolean;
          scrollingWaveform: boolean;
          continuousWaveform: boolean;
          continuousWaveformDuration: number;
          mimeType?: string;
          audioBitsPerSecond?: number;
        } = {
          renderRecordedAudio: true,
          scrollingWaveform: true,
          continuousWaveform: false,
          continuousWaveformDuration: AUDIO_RECORD_MAX_DURATION,
        };

        // iOS Safari specific optimizations
        if (browser.isIOSWebKit) {
          console.log('Applying iOS-specific RecordPlugin configuration');
          // iOS works better with these settings
          recordOptions.mimeType = 'audio/wav'; // iOS Safari prefers WAV
          recordOptions.audioBitsPerSecond = 128000; // Lower bitrate for iOS compatibility
        }

        const record = ws.registerPlugin(RecordPlugin.create(recordOptions));

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
      // Browser detection
      const browser = getBrowserInfo();
      
      // Get available audio devices (this will work after permission is granted)
      const devices = await RecordPlugin.getAvailableAudioDevices();
      const audioInputDevices = devices.filter(
        (device) => device.kind === 'audioinput'
      );

      // Handle browser-specific device enumeration issues
      if (browser.isFirefoxMobile && audioInputDevices.length > 0) {
        console.log('Firefox mobile detected, using fallback device handling');
        
        // For Firefox mobile, we'll create a more generic device list
        // since device enumeration is limited
        const deviceList = audioInputDevices.map((device, index) => ({
          deviceId: device.deviceId || 'default',
          label: device.label || 
                 (device.deviceId === 'default' ? 'Default Microphone' : 
                  `Microphone ${index + 1}`),
        }));

        setAudioDevices(deviceList);
        
        // Always use the first device (usually the default) for Firefox mobile
        setSelectedDevice(deviceList[0].deviceId);
      } else if ((browser.isSafariMobile || browser.isIOSWebKit) && audioInputDevices.length > 0) {
        console.log('Safari iOS detected, using simplified device handling');
        
        // Safari iOS often has limited device enumeration
        // Create a simplified device list
        const deviceList = audioInputDevices.map((device, index) => ({
          deviceId: device.deviceId || 'default',
          label: device.label || 
                 (index === 0 ? 'Built-in Microphone' : `Microphone ${index + 1}`),
        }));

        setAudioDevices(deviceList);
        
        // Use the first available device for iOS
        setSelectedDevice(deviceList[0].deviceId);
      } else {
        // Standard handling for other browsers
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

      const browser = getBrowserInfo();
      
      let audioConstraints: MediaStreamConstraints['audio'];
      
      if (browser.isFirefoxMobile) {
        // Firefox mobile has issues with advanced constraints, use simpler ones
        console.log('Using Firefox mobile-optimized audio constraints');
        audioConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Don't specify channelCount and sampleRate for Firefox mobile
          // as it can cause issues with device enumeration and recording
        };
      } else if (browser.isSafariMobile || browser.isIOSWebKit) {
        // Safari iOS/iPadOS has specific requirements and limitations
        console.log('Using Safari iOS-optimized audio constraints');
        audioConstraints = {
          // Safari iOS works better with basic constraints
          echoCancellation: false, // Sometimes causes issues on iOS
          noiseSuppression: false, // Can interfere with recording quality
          autoGainControl: true,
          // iOS Safari prefers mono recording, stereo can cause issues
          channelCount: 1,
          sampleRate: 44100, // iOS preferred sample rate
        };
      } else {
        // Standard constraints for other browsers
        audioConstraints = {
          channelCount: 2, // Request stereo recording (works with both mono and stereo sources)
          sampleRate: 48000, // High quality sample rate
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };
      }

      // Request microphone access with appropriate configuration
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      console.log('Microphone permission granted, stream tracks:', stream.getTracks().length);

      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach((track) => track.stop());

      // Browser-specific delays for device enumeration
      if (browser.isFirefoxMobile) {
        console.log('Adding delay for Firefox mobile device enumeration');
        await new Promise(resolve => setTimeout(resolve, 500));
      } else if (browser.isSafariMobile || browser.isIOSWebKit) {
        console.log('Adding delay for Safari iOS device enumeration');
        // iOS Safari sometimes needs a longer delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Now initialize devices
      const success = await initializeDevices();
      if (!success) {
        throw new Error('Failed to initialize audio devices');
      }
    } catch (permissionError) {
      console.error('Microphone permission denied:', permissionError);
      setPermissionState('denied');
      
      const browser = getBrowserInfo();
      
      let errorMessage = 'Microphone access was denied. Please allow microphone permissions and try again.';
      
      if (browser.isIOSWebKit) {
        errorMessage = 'Microphone access was denied. On iOS/iPadOS, please go to Settings > Safari > Camera & Microphone, then refresh this page and try again.';
      }
      
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

        // Browser detection and special handling
        const browser = getBrowserInfo();
        
        if (browser.isFirefoxMobile) {
          console.log('Firefox mobile detected - using optimized initialization');
          
          // Check if MediaDevices API is available
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Media devices not supported in this browser');
          }
          
          // Check for additional permissions API support
          if ('permissions' in navigator) {
            try {
              const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
              console.log('Microphone permission status:', permissionStatus.state);
              setPermissionState(permissionStatus.state as typeof permissionState);
              
              if (permissionStatus.state === 'denied') {
                setError('Microphone access is blocked. Please enable it in your browser settings.');
                return;
              }
            } catch (permError) {
              console.log('Permission query not supported:', permError);
            }
          }
        } else if (browser.isSafariMobile || browser.isIOSWebKit) {
          console.log('Safari iOS detected - using iOS-optimized initialization');
          
          // iOS Safari specific checks
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Media recording not supported. Please update to a newer version of Safari.');
          }
          
          // iOS Safari requires secure context for media access
          if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            throw new Error('Audio recording requires a secure connection (HTTPS) on iOS devices.');
          }
          
          // Check if we're in a web app or standalone mode
          const isStandalone = ('standalone' in window.navigator) && 
            (window.navigator as { standalone?: boolean }).standalone;
          if (isStandalone) {
            console.log('Running in iOS standalone mode');
          }
        }

        // Try to request microphone permission
        await requestMicrophonePermission();
      } catch (err) {
        console.error('Error during initial setup:', err);
        setPermissionState('unknown');
        
        // Provide more specific error messages for different mobile browsers
        const browser = getBrowserInfo();
        
        if (browser.isFirefoxMobile) {
          setError('Unable to access microphone. Please check that microphone permissions are enabled for this site in Firefox settings.');
        } else if (browser.isIOSWebKit) {
          setError('Unable to access microphone. Please check Safari settings: Settings > Safari > Camera & Microphone, then refresh this page.');
        } else {
          setError('Failed to initialize audio recording. Please try refreshing the page.');
        }
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
      
      const browser = getBrowserInfo();
      
      // Browser-specific device selection handling
      const deviceOptions: { deviceId?: string } = {};
      
      if (selectedDevice && selectedDevice !== 'default') {
        deviceOptions.deviceId = selectedDevice;
      } else if (browser.isFirefoxMobile) {
        // For Firefox mobile, don't specify deviceId if it's default
        // as this can cause issues
        console.log('Firefox mobile: using default device without explicit deviceId');
      } else if (browser.isSafariMobile || browser.isIOSWebKit) {
        // For iOS Safari, use default device handling
        console.log('Safari iOS: using default device handling');
        // Don't specify deviceId for iOS unless specifically selected
        if (selectedDevice && selectedDevice !== 'default') {
          deviceOptions.deviceId = selectedDevice;
        }
      } else if (selectedDevice) {
        deviceOptions.deviceId = selectedDevice;
      }

      console.log('Starting recording with options:', deviceOptions);
      
      await recordPluginRef.current.startRecording(deviceOptions);
      setIsRecording(true);
      setIsPaused(false);
    } catch (err) {
      console.error('Error starting recording:', err);
      
      const browser = getBrowserInfo();
      
      let errorMessage = 'Failed to start recording. Please check microphone permissions.';
      
      if (browser.isIOSWebKit) {
        errorMessage = 'Failed to start recording. On iOS, make sure you tap the record button directly and that microphone access is enabled in Safari settings.';
      }
      
      setError(errorMessage);
      onError?.(errorMessage);
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
              (permissionState === 'denied' || 
               /Firefox.*Mobile/.test(navigator.userAgent) ||
               /iPhone|iPad|iPod/.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && (
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
            {/Firefox.*Mobile/.test(navigator.userAgent) && (
              <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8rem' }}>
                Firefox on Android: If you see "default device" only, try refreshing the page after granting permissions.
              </Typography>
            )}
            {(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && (
              <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8rem' }}>
                iOS/iPadOS: Recording requires a user gesture. Make sure to tap the record button directly. For permissions: Settings &gt; Safari &gt; Camera &amp; Microphone.
              </Typography>
            )}
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
      </Stack>
    </Paper>
  );
};

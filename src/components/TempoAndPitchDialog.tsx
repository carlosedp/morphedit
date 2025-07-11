// Tempo and Pitch Dialog for adjusting audio speed and pitch using RubberBand

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';

import { useAudioStore } from '../audioStore';
import { TEMPO_PITCH_PREVIEW_DURATION } from '../constants';
import {
  DEFAULT_TEMPO_PITCH_OPTIONS,
  percentToRatio,
  processAudioWithRubberBand,
  semitoneToRatio,
  type TempoAndPitchOptions,
} from '../utils/rubberbandProcessor';

interface TempoAndPitchDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (options: TempoAndPitchOptions) => Promise<void>;
  originalDuration: number;
  estimatedBpm?: number;
}

export const TempoAndPitchDialog: React.FC<TempoAndPitchDialogProps> = ({
  estimatedBpm,
  onApply,
  onClose,
  open,
  originalDuration,
}) => {
  const [options, setOptions] = useState<TempoAndPitchOptions>(
    DEFAULT_TEMPO_PITCH_OPTIONS
  );
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isPreviewProcessing, setIsPreviewProcessing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // UI state for different input modes
  const [tempoMode, setTempoMode] = useState<'percentage' | 'bpm' | 'ratio'>(
    'percentage'
  );
  const [pitchMode, setPitchMode] = useState<'semitones' | 'ratio'>(
    'semitones'
  );

  // Temporary values for different input modes
  const [tempoPercentage, setTempoPercentage] = useState(100);
  const [targetBpm, setTargetBpm] = useState(estimatedBpm || 120);
  const [pitchSemitones, setPitchSemitones] = useState(0);

  // Preview functionality
  const stopPreview = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    setIsPreviewPlaying(false);
  };

  // Reset values when dialog opens
  useEffect(() => {
    if (open) {
      setOptions(DEFAULT_TEMPO_PITCH_OPTIONS);
      setTempoPercentage(100);
      setTargetBpm(estimatedBpm || 120);
      setPitchSemitones(0);
      setError(null);
      setProcessing(false);
      setIsPreviewPlaying(false);
      setIsPreviewProcessing(false);
      stopPreview();
    }
  }, [open, estimatedBpm]);

  // Calculate estimated output duration
  // Since we inverted the ratio, multiply by ratio for correct duration
  const estimatedOutputDuration = originalDuration * options.tempoRatio;

  // Update options based on tempo mode
  const updateTempoRatio = (
    value: number,
    mode: 'percentage' | 'bpm' | 'ratio'
  ) => {
    let newRatio = 1.0;

    switch (mode) {
      case 'percentage':
        // Invert the ratio for tempo: 130% tempo = faster = shorter = 1/1.3 ratio
        newRatio = 1.0 / percentToRatio(value);
        setTempoPercentage(value);
        break;
      case 'bpm':
        if (estimatedBpm && estimatedBpm > 0) {
          // For BPM: higher target BPM = faster = shorter = lower ratio
          newRatio = estimatedBpm / value;
          setTargetBpm(value);
        }
        break;
      case 'ratio':
        newRatio = value;
        break;
    }

    setOptions((prev) => ({ ...prev, tempoRatio: newRatio }));
  };

  // Update options based on pitch mode
  const updatePitchScale = (value: number, mode: 'semitones' | 'ratio') => {
    let newScale = 1.0;

    switch (mode) {
      case 'semitones':
        newScale = semitoneToRatio(value);
        setPitchSemitones(value);
        break;
      case 'ratio':
        newScale = value;
        break;
    }

    setOptions((prev) => ({ ...prev, pitchScale: newScale }));
  };

  const handleApply = async () => {
    if (processing) return;

    setProcessing(true);
    setError(null);

    try {
      await onApply(options);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process audio');
    } finally {
      setProcessing(false);
    }
  };

  const handlePreview = async () => {
    if (isPreviewPlaying) {
      stopPreview();
      return;
    }

    if (isPreviewProcessing || processing) return;

    const audioBuffer = useAudioStore.getState().audioBuffer;
    if (!audioBuffer) {
      setError('No audio buffer available for preview');
      return;
    }

    setIsPreviewProcessing(true);
    setError(null);

    try {
      // Create a subset of the audio buffer for preview (first N seconds)
      const previewDuration = Math.min(
        TEMPO_PITCH_PREVIEW_DURATION,
        audioBuffer.duration
      );
      const sampleRate = audioBuffer.sampleRate;
      const previewSamples = Math.floor(previewDuration * sampleRate);

      // Create a new AudioBuffer with just the preview portion
      const previewBuffer = new AudioContext().createBuffer(
        audioBuffer.numberOfChannels,
        previewSamples,
        sampleRate
      );

      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const sourceData = audioBuffer.getChannelData(channel);
        const previewData = previewBuffer.getChannelData(channel);
        for (let i = 0; i < previewSamples; i++) {
          previewData[i] = sourceData[i];
        }
      }

      // Process the preview buffer with current settings
      const processedPreviewBuffer = await processAudioWithRubberBand(
        previewBuffer,
        options
      );

      // Play the processed preview
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createBufferSource();
      source.buffer = processedPreviewBuffer;
      source.connect(audioContext.destination);

      source.onended = () => {
        setIsPreviewPlaying(false);
        audioSourceRef.current = null;
      };

      audioSourceRef.current = source;
      setIsPreviewPlaying(true);
      source.start();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate preview'
      );
      setIsPreviewPlaying(false);
    } finally {
      setIsPreviewProcessing(false);
    }
  };

  // Cleanup on dialog close
  useEffect(() => {
    if (!open) {
      stopPreview();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  }, [open]);

  const handleReset = () => {
    setOptions(DEFAULT_TEMPO_PITCH_OPTIONS);
    setTempoPercentage(100);
    setTargetBpm(estimatedBpm || 120);
    setPitchSemitones(0);
    setError(null);
    stopPreview();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Tempo and Pitch Adjustment
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Powered by RubberBand audio processing library
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Original duration: {originalDuration.toFixed(2)}s | Estimated
            output: {estimatedOutputDuration.toFixed(2)}s
            {estimatedBpm && (
              <>
                {' | '}
                <span style={{ color: '#4caf50' }}>
                  Detected BPM: {estimatedBpm.toFixed(1)}
                </span>
              </>
            )}
          </Typography>
        </Box>

        {/* Main Controls */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            mb: 3,
          }}
        >
          {/* Tempo Control */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              Tempo
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Tempo Mode</InputLabel>
              <Select
                value={tempoMode}
                label="Tempo Mode"
                onChange={(e) =>
                  setTempoMode(e.target.value as typeof tempoMode)
                }
              >
                <MenuItem value="percentage">Percentage</MenuItem>
                {estimatedBpm && <MenuItem value="bpm">BPM</MenuItem>}
                <MenuItem value="ratio">Ratio</MenuItem>
              </Select>
            </FormControl>

            {!estimatedBpm && (
              <Alert severity="info" sx={{ mb: 2 }}>
                BPM mode is not available because BPM detection failed. You can
                use Percentage or Ratio mode instead.
              </Alert>
            )}

            {tempoMode === 'percentage' && (
              <Box>
                <Typography gutterBottom>Speed: {tempoPercentage}%</Typography>
                <Slider
                  value={tempoPercentage}
                  min={25}
                  max={250}
                  step={1}
                  onChange={(_, value) =>
                    updateTempoRatio(value as number, 'percentage')
                  }
                  marks={[
                    { value: 25, label: '25%' },
                    { value: 50, label: '50%' },
                    { value: 100, label: '100%' },
                    { value: 200, label: '200%' },
                    { value: 250, label: '250%' },
                  ]}
                />
              </Box>
            )}

            {tempoMode === 'bpm' && estimatedBpm && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Original BPM: {estimatedBpm.toFixed(1)} → Target BPM:{' '}
                  {targetBpm.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Tempo Ratio: {options.tempoRatio.toFixed(3)}x (
                  {((1 / options.tempoRatio) * 100).toFixed(1)}% speed)
                </Typography>

                <TextField
                  label="Target BPM"
                  type="number"
                  value={targetBpm}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value > 0) {
                      updateTempoRatio(value, 'bpm');
                    }
                  }}
                  inputProps={{
                    min: estimatedBpm * 0.25,
                    max: estimatedBpm * 2.5,
                    step: 0.1,
                  }}
                  helperText={`Range: ${(estimatedBpm * 0.25).toFixed(1)} - ${(estimatedBpm * 2.5).toFixed(1)} BPM`}
                  sx={{ mb: 2 }}
                />
                <Slider
                  value={targetBpm}
                  min={estimatedBpm * 0.25}
                  max={estimatedBpm * 2.5}
                  step={0.1}
                  onChange={(_, value) =>
                    updateTempoRatio(value as number, 'bpm')
                  }
                  marks={[
                    {
                      value: estimatedBpm * 0.5,
                      label: `${(estimatedBpm * 0.5).toFixed(0)}`,
                    },
                    {
                      value: estimatedBpm,
                      label: `${estimatedBpm.toFixed(0)}`,
                    },
                    {
                      value: estimatedBpm * 2,
                      label: `${(estimatedBpm * 2).toFixed(0)}`,
                    },
                  ]}
                />

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Quick BPM:
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  {[60, 80, 100, 120, 140, 160].map((bpm) => (
                    <Button
                      key={bpm}
                      size="small"
                      variant={
                        Math.abs(targetBpm - bpm) < 0.1
                          ? 'contained'
                          : 'outlined'
                      }
                      onClick={() => updateTempoRatio(bpm, 'bpm')}
                      sx={{ minWidth: 45, fontSize: '0.75rem' }}
                    >
                      {bpm}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}

            {tempoMode === 'ratio' && (
              <Box>
                <Typography gutterBottom>
                  Tempo Ratio: {options.tempoRatio.toFixed(3)}
                </Typography>
                <Slider
                  value={options.tempoRatio}
                  min={0.25}
                  max={4}
                  step={0.01}
                  onChange={(_, value) =>
                    updateTempoRatio(value as number, 'ratio')
                  }
                  marks={[
                    { value: 0.5, label: '0.5x' },
                    { value: 1, label: '1.0x' },
                    { value: 2, label: '2.0x' },
                  ]}
                />
              </Box>
            )}
          </Box>

          {/* Pitch Control */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              Pitch
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Pitch Mode</InputLabel>
              <Select
                value={pitchMode}
                label="Pitch Mode"
                onChange={(e) =>
                  setPitchMode(e.target.value as typeof pitchMode)
                }
              >
                <MenuItem value="semitones">Semitones</MenuItem>
                <MenuItem value="ratio">Ratio</MenuItem>
              </Select>
            </FormControl>

            {pitchMode === 'semitones' && (
              <Box>
                <Typography gutterBottom>
                  Pitch: {pitchSemitones > 0 ? '+' : ''}
                  {pitchSemitones} semitones
                </Typography>
                <Slider
                  value={pitchSemitones}
                  min={-24}
                  max={24}
                  step={1}
                  onChange={(_, value) =>
                    updatePitchScale(value as number, 'semitones')
                  }
                  marks={[
                    { value: -12, label: '-1 oct' },
                    { value: 0, label: '0' },
                    { value: 12, label: '+1 oct' },
                  ]}
                />
              </Box>
            )}

            {pitchMode === 'ratio' && (
              <Box>
                <Typography gutterBottom>
                  Pitch Ratio: {options.pitchScale.toFixed(3)}
                </Typography>
                <Slider
                  value={options.pitchScale}
                  min={0.25}
                  max={4}
                  step={0.01}
                  onChange={(_, value) =>
                    updatePitchScale(value as number, 'ratio')
                  }
                  marks={[
                    { value: 0.5, label: '0.5x' },
                    { value: 1, label: '1.0x' },
                    { value: 2, label: '2.0x' },
                  ]}
                />
              </Box>
            )}
          </Box>
        </Box>

        {/* Advanced Options */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Advanced Options
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={options.preserveFormants}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      preserveFormants: e.target.checked,
                    }))
                  }
                />
              }
              label="Preserve Formants (Better for vocals)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={options.pitchHQ}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      pitchHQ: e.target.checked,
                    }))
                  }
                />
              }
              label="High Quality Pitch"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={options.tempoHQ}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      tempoHQ: e.target.checked,
                    }))
                  }
                />
              }
              label="High Quality Tempo"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={options.smoothing}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      smoothing: e.target.checked,
                    }))
                  }
                />
              }
              label="Smoothing"
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Detector</InputLabel>
              <Select
                value={options.detector}
                label="Detector"
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    detector: e.target
                      .value as TempoAndPitchOptions['detector'],
                  }))
                }
              >
                <MenuItem value="compound">Compound</MenuItem>
                <MenuItem value="percussive">Percussive</MenuItem>
                <MenuItem value="soft">Soft</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={processing || isPreviewProcessing}>
          Cancel
        </Button>
        <Button
          onClick={handleReset}
          disabled={processing || isPreviewProcessing}
        >
          Reset
        </Button>
        <Button
          onClick={handlePreview}
          variant="outlined"
          disabled={processing || isPreviewProcessing}
          startIcon={
            isPreviewProcessing ? (
              <CircularProgress size={20} />
            ) : isPreviewPlaying ? (
              <StopIcon />
            ) : (
              <PlayArrowIcon />
            )
          }
        >
          {isPreviewProcessing
            ? 'Processing...'
            : isPreviewPlaying
              ? 'Stop Preview'
              : `Preview (${TEMPO_PITCH_PREVIEW_DURATION}s)`}
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          disabled={processing || isPreviewProcessing}
          startIcon={processing ? <CircularProgress size={20} /> : undefined}
        >
          {processing ? 'Processing...' : 'Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

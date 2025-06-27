// Tempo and Pitch Dialog for adjusting audio speed and pitch using RubberBand

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  DEFAULT_TEMPO_PITCH_OPTIONS,
  type TempoAndPitchOptions,
  semitoneToRatio,
  percentToRatio,
} from '../utils/rubberbandProcessor';

interface TempoAndPitchDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (options: TempoAndPitchOptions) => Promise<void>;
  originalDuration: number;
  estimatedBpm?: number;
}

export const TempoAndPitchDialog: React.FC<TempoAndPitchDialogProps> = ({
  open,
  onClose,
  onApply,
  originalDuration,
  estimatedBpm,
}) => {
  const [options, setOptions] = useState<TempoAndPitchOptions>(
    DEFAULT_TEMPO_PITCH_OPTIONS
  );
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Reset values when dialog opens
  useEffect(() => {
    if (open) {
      setOptions(DEFAULT_TEMPO_PITCH_OPTIONS);
      setTempoPercentage(100);
      setTargetBpm(estimatedBpm || 120);
      setPitchSemitones(0);
      setError(null);
      setProcessing(false);
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

  const handleReset = () => {
    setOptions(DEFAULT_TEMPO_PITCH_OPTIONS);
    setTempoPercentage(100);
    setTargetBpm(estimatedBpm || 120);
    setPitchSemitones(0);
    setError(null);
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
            {estimatedBpm && ` | Detected BPM: ${estimatedBpm.toFixed(1)}`}
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

            {tempoMode === 'percentage' && (
              <Box>
                <Typography gutterBottom>Speed: {tempoPercentage}%</Typography>
                <Slider
                  value={tempoPercentage}
                  min={25}
                  max={400}
                  step={1}
                  onChange={(_, value) =>
                    updateTempoRatio(value as number, 'percentage')
                  }
                  marks={[
                    { value: 50, label: '50%' },
                    { value: 100, label: '100%' },
                    { value: 200, label: '200%' },
                  ]}
                />
              </Box>
            )}

            {tempoMode === 'bpm' && estimatedBpm && (
              <Box>
                <Typography gutterBottom>
                  Target BPM: {targetBpm.toFixed(1)}
                </Typography>
                <Slider
                  value={targetBpm}
                  min={estimatedBpm * 0.25}
                  max={estimatedBpm * 4}
                  step={0.1}
                  onChange={(_, value) =>
                    updateTempoRatio(value as number, 'bpm')
                  }
                />
                <TextField
                  fullWidth
                  label="Target BPM"
                  type="number"
                  value={targetBpm}
                  onChange={(e) =>
                    updateTempoRatio(parseFloat(e.target.value) || 120, 'bpm')
                  }
                  sx={{ mt: 1 }}
                />
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
        <Button onClick={onClose} disabled={processing}>
          Cancel
        </Button>
        <Button onClick={handleReset} disabled={processing}>
          Reset
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          disabled={processing}
          startIcon={processing ? <CircularProgress size={20} /> : undefined}
        >
          {processing ? 'Processing...' : 'Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

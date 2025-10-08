import { RestartAlt, Settings as SettingsIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';

import {
  DEFAULT_SETTINGS,
  EXPORT_FORMATS,
  FADE_CURVE_TYPES,
} from '../constants';
import {
  type EssentiaOnsetMethod,
  type FadeCurveType,
  type OnsetDetectionLibrary,
  useAppSettings,
} from '../settingsStore';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  onClose,
  open,
}) => {
  const { actions, settings } = useAppSettings();

  // Local state for form values
  const [formValues, setFormValues] = useState(settings);

  // Reset form values when dialog opens - use a ref to track if we should update
  const prevOpenRef = React.useRef(open);
  React.useEffect(() => {
    // Only update when dialog transitions from closed to open
    if (open && !prevOpenRef.current) {
      setFormValues(settings);
    }
    prevOpenRef.current = open;
  }, [open, settings]);

  const handleSave = () => {
    actions.updateSettings(formValues);
    onClose();
  };

  const handleCancel = () => {
    setFormValues(settings); // Reset to current settings
    onClose();
  };

  const handleReset = () => {
    actions.resetToDefaults();
    setFormValues({
      fadeInCurveType: DEFAULT_SETTINGS.FADE_IN_CURVE_TYPE,
      fadeOutCurveType: DEFAULT_SETTINGS.FADE_OUT_CURVE_TYPE,
      crossfadeDuration: DEFAULT_SETTINGS.CROSSFADE_DURATION,
      crossfadeCurveType: DEFAULT_SETTINGS.CROSSFADE_CURVE_TYPE,
      truncateLength: DEFAULT_SETTINGS.TRUNCATE_LENGTH,
      maxRecordingDuration: DEFAULT_SETTINGS.MAX_RECORDING_DURATION,
      defaultAutoSliceAmount: DEFAULT_SETTINGS.DEFAULT_AUTO_SLICE_AMOUNT,
      transientThreshold: DEFAULT_SETTINGS.TRANSIENT_THRESHOLD,
      transientFrameSizeMs: DEFAULT_SETTINGS.TRANSIENT_FRAME_SIZE_MS,
      transientOverlapPercent: DEFAULT_SETTINGS.TRANSIENT_OVERLAP_PERCENT,
      onsetDetectionLibrary: DEFAULT_SETTINGS.ONSET_DETECTION_LIBRARY,
      essentiaOnsetMethod: DEFAULT_SETTINGS.ESSENTIA_ONSET_METHOD,
      essentiaFrameSize: DEFAULT_SETTINGS.ESSENTIA_FRAME_SIZE,
      essentiaHopSize: DEFAULT_SETTINGS.ESSENTIA_HOP_SIZE,
      essentiaSensitivity: DEFAULT_SETTINGS.ESSENTIA_SENSITIVITY,
      defaultExportFormat:
        EXPORT_FORMATS[DEFAULT_SETTINGS.DEFAULT_EXPORT_FORMAT_INDEX],
    });
  };

  const handleInputChange = (
    field: keyof typeof formValues,
    value: unknown
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  // Convert curve type to display label
  const getCurveDisplayName = (curveType: FadeCurveType) => {
    switch (curveType) {
      case FADE_CURVE_TYPES.LINEAR:
        return 'Linear';
      case FADE_CURVE_TYPES.EXPONENTIAL:
        return 'Exponential';
      case FADE_CURVE_TYPES.LOGARITHMIC:
        return 'Logarithmic';
      default:
        return 'Linear';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '500px',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsIcon />
          <Typography variant="h6">Settings</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {/* Fade Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Fade Settings
            </Typography>
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Fade In Curve Type</InputLabel>
                <Select
                  value={formValues.fadeInCurveType}
                  label="Fade In Curve Type"
                  onChange={(e) =>
                    handleInputChange(
                      'fadeInCurveType',
                      e.target.value as FadeCurveType
                    )
                  }
                >
                  {Object.values(FADE_CURVE_TYPES).map((type) => (
                    <MenuItem key={type} value={type}>
                      {getCurveDisplayName(type)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Fade Out Curve Type</InputLabel>
                <Select
                  value={formValues.fadeOutCurveType}
                  label="Fade Out Curve Type"
                  onChange={(e) =>
                    handleInputChange(
                      'fadeOutCurveType',
                      e.target.value as FadeCurveType
                    )
                  }
                >
                  {Object.values(FADE_CURVE_TYPES).map((type) => (
                    <MenuItem key={type} value={type}>
                      {getCurveDisplayName(type)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>

          <Divider />

          {/* Crossfade Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Crossfade Settings
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Crossfade Duration (seconds)"
                type="number"
                size="small"
                fullWidth
                value={formValues.crossfadeDuration}
                onChange={(e) =>
                  handleInputChange(
                    'crossfadeDuration',
                    parseFloat(e.target.value) || 1.0
                  )
                }
                inputProps={{
                  min: 0.1,
                  max: 10.0,
                  step: 0.1,
                }}
                helperText="Duration for crossfade between splice points"
              />

              <FormControl fullWidth size="small">
                <InputLabel>Crossfade Curve Type</InputLabel>
                <Select
                  value={formValues.crossfadeCurveType}
                  label="Crossfade Curve Type"
                  onChange={(e) =>
                    handleInputChange(
                      'crossfadeCurveType',
                      e.target.value as FadeCurveType
                    )
                  }
                >
                  {Object.values(FADE_CURVE_TYPES).map((type) => (
                    <MenuItem key={type} value={type}>
                      {getCurveDisplayName(type)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>

          <Divider />

          {/* Audio Processing Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Audio Processing
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <Tooltip title="Morphagene limit: 174 seconds">
                  <TextField
                    label="Default Truncate Length (seconds)"
                    type="number"
                    size="small"
                    fullWidth
                    value={formValues.truncateLength}
                    onChange={(e) =>
                      handleInputChange(
                        'truncateLength',
                        parseInt(e.target.value) || 174
                      )
                    }
                    inputProps={{
                      min: 60,
                      max: 600,
                      step: 1,
                    }}
                    helperText="Default length to truncate long audio files"
                  />
                </Tooltip>

                <TextField
                  label="Max Recording Duration (seconds)"
                  type="number"
                  size="small"
                  fullWidth
                  value={formValues.maxRecordingDuration}
                  onChange={(e) =>
                    handleInputChange(
                      'maxRecordingDuration',
                      parseInt(e.target.value) || 300
                    )
                  }
                  inputProps={{
                    min: 60,
                    max: 1800,
                    step: 1,
                  }}
                  helperText="Maximum duration for audio recordings"
                />
              </Stack>

              <TextField
                label="Default Auto Slice Amount"
                type="number"
                size="small"
                fullWidth
                value={formValues.defaultAutoSliceAmount}
                onChange={(e) =>
                  handleInputChange(
                    'defaultAutoSliceAmount',
                    parseInt(e.target.value) || 10
                  )
                }
                inputProps={{
                  min: 2,
                  max: 100,
                  step: 1,
                }}
                helperText="Default number of slices when using auto-slice feature"
              />
            </Stack>
          </Box>

          <Divider />

          {/* Onset Detection Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Onset Detection
            </Typography>
            <Stack spacing={2}>
              {/* Library Selector */}
              <FormControl fullWidth size="small">
                <InputLabel>Detection Library</InputLabel>
                <Select
                  value={formValues.onsetDetectionLibrary}
                  label="Detection Library"
                  onChange={(e) =>
                    handleInputChange(
                      'onsetDetectionLibrary',
                      e.target.value as OnsetDetectionLibrary
                    )
                  }
                >
                  <MenuItem value="webaudio">
                    <Box>
                      <Typography variant="body2">Web Audio (Fast)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Energy-based onset detection - fast and responsive
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="essentia">
                    <Box>
                      <Typography variant="body2">
                        Essentia.js (Accurate)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Advanced algorithms - slower but more accurate
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Web Audio specific controls */}
              {formValues.onsetDetectionLibrary === 'webaudio' && (
                <>
                  <TextField
                    label="Detection Threshold"
                    type="number"
                    size="small"
                    fullWidth
                    value={formValues.transientThreshold}
                    onChange={(e) =>
                      handleInputChange(
                        'transientThreshold',
                        parseFloat(e.target.value) || 50
                      )
                    }
                    inputProps={{
                      min: 0,
                      max: 100,
                      step: 1,
                    }}
                    helperText="Sensitivity for detecting transients (0 = low, 100 = high)"
                  />

                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Frame Size (ms)"
                      type="number"
                      size="small"
                      fullWidth
                      value={formValues.transientFrameSizeMs}
                      onChange={(e) =>
                        handleInputChange(
                          'transientFrameSizeMs',
                          parseInt(e.target.value) || 20
                        )
                      }
                      inputProps={{
                        min: 10,
                        max: 100,
                        step: 1,
                      }}
                      helperText="Analysis window size"
                    />

                    <TextField
                      label="Overlap (%)"
                      type="number"
                      size="small"
                      fullWidth
                      value={formValues.transientOverlapPercent}
                      onChange={(e) =>
                        handleInputChange(
                          'transientOverlapPercent',
                          parseInt(e.target.value) || 75
                        )
                      }
                      inputProps={{
                        min: 0,
                        max: 95,
                        step: 5,
                      }}
                      helperText="Frame overlap"
                    />
                  </Stack>
                </>
              )}

              {/* Essentia.js specific controls */}
              {formValues.onsetDetectionLibrary === 'essentia' && (
                <>
                  <TextField
                    label="Detection Sensitivity"
                    type="number"
                    size="small"
                    fullWidth
                    value={formValues.essentiaSensitivity}
                    onChange={(e) =>
                      handleInputChange(
                        'essentiaSensitivity',
                        parseFloat(e.target.value) || 50
                      )
                    }
                    inputProps={{
                      min: 0,
                      max: 100,
                      step: 1,
                    }}
                    helperText="Sensitivity for detecting onsets (0 = low, 100 = high)"
                  />

                  <FormControl fullWidth size="small">
                    <InputLabel>Detection Method</InputLabel>
                    <Select
                      value={formValues.essentiaOnsetMethod}
                      label="Detection Method"
                      onChange={(e) =>
                        handleInputChange(
                          'essentiaOnsetMethod',
                          e.target.value as EssentiaOnsetMethod
                        )
                      }
                    >
                      <MenuItem value="hfc">
                        <Box>
                          <Typography variant="body2">
                            HFC - High Frequency Content
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Best for percussive sounds
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="complex">
                        <Box>
                          <Typography variant="body2">
                            Complex - Magnitude & Phase
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Detects pitch and energy changes
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="complex_phase">
                        <Box>
                          <Typography variant="body2">
                            Complex Phase - Phase Changes
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Good for tonal sounds
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="flux">
                        <Box>
                          <Typography variant="body2">Spectral Flux</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Tracks magnitude spectrum changes
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="melflux">
                        <Box>
                          <Typography variant="body2">Mel Flux</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Mel-frequency band energy changes
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="rms">
                        <Box>
                          <Typography variant="body2">
                            RMS - Energy Flux
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Overall energy changes
                          </Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Frame Size (samples)"
                      type="number"
                      size="small"
                      fullWidth
                      value={formValues.essentiaFrameSize}
                      onChange={(e) =>
                        handleInputChange(
                          'essentiaFrameSize',
                          parseInt(e.target.value) || 1024
                        )
                      }
                      inputProps={{
                        min: 512,
                        max: 4096,
                        step: 512,
                      }}
                      helperText="FFT window size"
                    />

                    <TextField
                      label="Hop Size (samples)"
                      type="number"
                      size="small"
                      fullWidth
                      value={formValues.essentiaHopSize}
                      onChange={(e) =>
                        handleInputChange(
                          'essentiaHopSize',
                          parseInt(e.target.value) || 512
                        )
                      }
                      inputProps={{
                        min: 128,
                        max: 2048,
                        step: 128,
                      }}
                      helperText="Analysis hop size"
                    />
                  </Stack>
                </>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Export Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Export Settings
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Default Export Format</InputLabel>
              <Select
                value={EXPORT_FORMATS.findIndex(
                  (f) =>
                    f.sampleRate ===
                      formValues.defaultExportFormat.sampleRate &&
                    f.bitDepth === formValues.defaultExportFormat.bitDepth &&
                    f.channels === formValues.defaultExportFormat.channels &&
                    f.format === formValues.defaultExportFormat.format
                )}
                label="Default Export Format"
                onChange={(e) => {
                  const index = e.target.value as number;
                  handleInputChange(
                    'defaultExportFormat',
                    EXPORT_FORMATS[index]
                  );
                }}
              >
                {EXPORT_FORMATS.map((format, index) => (
                  <MenuItem key={index} value={index}>
                    <Box>
                      <Typography variant="body2">{format.label}</Typography>
                      <Box mt={0.5}>
                        <Chip
                          label={
                            format.channels === 'stereo' ? 'Stereo' : 'Mono'
                          }
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, fontSize: '0.7rem' }}
                        />
                        <Chip
                          label={format.format}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button
          startIcon={<RestartAlt />}
          onClick={handleReset}
          color="warning"
          variant="outlined"
        >
          Reset to Defaults
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={handleCancel} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

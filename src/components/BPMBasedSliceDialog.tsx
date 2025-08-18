// BPM-based slice dialog component
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import * as React from 'react';

import { TOOLTIP_DELAYS } from '../constants';
import {
  type BPMSliceOptions,
  estimateMarkerCount,
  getAvailableMusicalDivisions,
  getMusicalDivisionLabel,
  type MusicalDivision,
} from '../utils/bpmBasedSlicing';

const BPMIcon = styled(MusicNoteIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
  marginRight: theme.spacing(1),
}));

interface BPMBasedSliceDialogProps {
  open: boolean;
  currentBPM: number | null;
  duration: number;
  onClose: () => void;
  onApply: (options: BPMSliceOptions) => void;
}

export const BPMBasedSliceDialog: React.FC<BPMBasedSliceDialogProps> = ({
  currentBPM,
  duration,
  onApply,
  onClose,
  open,
}) => {
  const [bpm, setBpm] = React.useState<number>(currentBPM || 120);
  const [division, setDivision] = React.useState<MusicalDivision>('quarter');
  const [startOffset, setStartOffset] = React.useState<number>(0);

  // Update BPM when currentBPM changes
  React.useEffect(() => {
    if (currentBPM && currentBPM > 0) {
      setBpm(currentBPM);
    }
  }, [currentBPM]);

  const options: BPMSliceOptions = {
    bpm,
    division,
    startOffset,
    duration,
  };

  const estimatedMarkers = estimateMarkerCount(options);
  const availableDivisions = getAvailableMusicalDivisions();

  const handleApply = () => {
    onApply(options);
    onClose();
  };

  const handleBPMChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (value > 0 && value <= 999) {
      setBpm(value);
    }
  };

  const handleStartOffsetChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(event.target.value);
    if (value >= 0 && value < duration) {
      setStartOffset(value);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: 400,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <BPMIcon />
        BPM-Based Slice Markers
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} marginTop={1}>
          {/* BPM Input */}
          <Box>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              sx={{ mb: 1 }}
            >
              <TextField
                label="BPM"
                type="number"
                value={bpm}
                onChange={handleBPMChange}
                inputProps={{
                  min: 1,
                  max: 999,
                  step: 0.1,
                }}
                size="small"
                sx={{
                  width: { xs: '100%', sm: 140 },
                  minWidth: 120,
                  flexShrink: 0,
                }}
              />
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ flexWrap: 'wrap' }}
              >
                {currentBPM && (
                  <Tooltip
                    title={`Use detected BPM: ${currentBPM}`}
                    enterDelay={TOOLTIP_DELAYS.ENTER}
                    leaveDelay={TOOLTIP_DELAYS.LEAVE}
                  >
                    <IconButton
                      size="small"
                      onClick={() => setBpm(currentBPM)}
                      color={
                        Math.abs(bpm - currentBPM) < 0.1 ? 'primary' : 'default'
                      }
                    >
                      <MusicNoteIcon />
                    </IconButton>
                  </Tooltip>
                )}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentBPM
                    ? `(Detected: ${currentBPM} BPM)`
                    : '(No BPM detected)'}
                </Typography>
              </Stack>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                mt: 0.5,
                display: 'block',
                fontSize: { xs: '0.75rem', sm: '0.75rem' },
              }}
            >
              Override the detected BPM if needed. Use decimal values for
              precise timing. Click note button to reset to detected BPM.
            </Typography>
          </Box>

          {/* Musical Division */}
          <FormControl size="small" fullWidth>
            <InputLabel>Musical Division</InputLabel>
            <Select
              value={division}
              label="Musical Division"
              onChange={(e) => setDivision(e.target.value as MusicalDivision)}
            >
              {availableDivisions.map((div) => (
                <MenuItem key={div} value={div}>
                  {getMusicalDivisionLabel(div)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Start Offset */}
          <TextField
            label="Start Offset (seconds)"
            type="number"
            value={startOffset}
            onChange={handleStartOffsetChange}
            inputProps={{
              min: 0,
              max: duration - 0.1,
              step: 0.1,
            }}
            size="small"
            helperText="Delay before the first marker (useful for songs with intros)"
          />

          {/* Preview Information */}
          <Typography variant="subtitle2" gutterBottom>
            Preview:
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Musical Division:</strong>{' '}
                {getMusicalDivisionLabel(division)}
              </Typography>
              <Typography variant="body2">
                <strong>Interval:</strong>{' '}
                {(() => {
                  const interval =
                    (60 / bpm) *
                    (division === 'quarter'
                      ? 1
                      : division === 'eighth'
                        ? 0.5
                        : division === 'sixteenth'
                          ? 0.25
                          : division === 'half'
                            ? 2
                            : division === 'whole'
                              ? 4
                              : division === 'two-bars'
                                ? 8
                                : division === 'four-bars'
                                  ? 16
                                  : division === 'eighth-triplet'
                                    ? 1 / 3
                                    : division === 'quarter-triplet'
                                      ? 2 / 3
                                      : 1);
                  const formattedInterval = interval.toFixed(3);
                  const unit =
                    parseFloat(formattedInterval) === 1 ? 'second' : 'seconds';
                  return `${formattedInterval} ${unit}`;
                })()}
              </Typography>
              <Typography variant="body2">
                <strong>Estimated Markers:</strong> {estimatedMarkers}
                {estimatedMarkers > 174 && (
                  <Typography
                    component="span"
                    variant="body2"
                    color="warning.main"
                    sx={{ ml: 1 }}
                  >
                    ⚠️ May be limited for device compatibility
                  </Typography>
                )}
              </Typography>
            </Stack>
          </Box>

          {/* Usage Tips */}
          <Box
            sx={{
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              <strong>💡 Tips:</strong> Use quarter notes for basic beat
              slicing, eighth notes for detailed rhythmic work, or bars for
              structural divisions. Triplets work well for swing or compound
              meter music.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ padding: 2, paddingTop: 1 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          color="primary"
          disabled={bpm <= 0 || estimatedMarkers <= 0}
        >
          Apply BPM Slicing
        </Button>
      </DialogActions>
    </Dialog>
  );
};

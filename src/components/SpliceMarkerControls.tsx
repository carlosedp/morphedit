// Splice marker controls component
import * as React from 'react';
import {
  Button,
  Stack,
  TextField,
  Tooltip,
  Slider,
  Typography,
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { TOOLTIP_DELAYS, MAX_TOTAL_SPLICE_POINTS } from '../constants';

interface SpliceMarkerControlsProps {
  selectedSpliceMarker: boolean;
  selectedSpliceMarkerLocked: boolean;
  numberOfSlices: number;
  spliceMarkersCount: number;
  duration: number;
  transientSensitivity: number;
  transientFrameSize: number;
  transientOverlap: number;
  onAddSpliceMarker: () => void;
  onRemoveSpliceMarker: () => void;
  onToggleMarkerLock: () => void;
  onAutoSlice: () => void;
  onHalfMarkers: () => void;
  onClearAllMarkers: () => void;
  onSetNumberOfSlices: (slices: number) => void;
  onSetTransientSensitivity: (sensitivity: number) => void;
  onSetTransientFrameSize: (frameSize: number) => void;
  onSetTransientOverlap: (overlap: number) => void;
  onTransientDetection: () => void;
  onSnapToZeroCrossings: () => void;
}

export const SpliceMarkerControls: React.FC<SpliceMarkerControlsProps> = ({
  selectedSpliceMarker,
  selectedSpliceMarkerLocked,
  numberOfSlices,
  spliceMarkersCount,
  duration,
  transientSensitivity,
  transientFrameSize,
  transientOverlap,
  onAddSpliceMarker,
  onRemoveSpliceMarker,
  onToggleMarkerLock,
  onAutoSlice,
  onHalfMarkers,
  onClearAllMarkers,
  onSetNumberOfSlices,
  onSetTransientSensitivity,
  onSetTransientFrameSize,
  onSetTransientOverlap,
  onTransientDetection,
  onSnapToZeroCrossings,
}) => {
  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Box
        sx={{
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          Splice Marker Controls
        </Typography>

        {/* First row: Add/Remove/Lock buttons (Manual Controls) */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            flexWrap: 'wrap',
            gap: { xs: 0.5, sm: 1 },
            mb: 1.5,
            mt: 2,
            justifyContent: { xs: 'center', sm: 'flex-start' },
          }}
        >
          <Tooltip
            title={
              spliceMarkersCount >= MAX_TOTAL_SPLICE_POINTS
                ? `Maximum splice points limit reached (${MAX_TOTAL_SPLICE_POINTS} for device compatibility)`
                : 'Add splice marker at current time'
            }
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Box component="span">
              <Button
                variant="outlined"
                color="primary"
                onClick={onAddSpliceMarker}
                disabled={spliceMarkersCount >= MAX_TOTAL_SPLICE_POINTS}
                sx={{
                  minWidth: { xs: '48px', sm: 'auto' },
                  minHeight: { xs: '48px', sm: '36px' },
                  fontSize: { xs: '1.1rem', sm: '1rem' },
                }}
              >
                <AddIcon />
              </Button>
            </Box>
          </Tooltip>{' '}
          <Tooltip
            title="Remove selected splice marker"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Box component="span">
              <Button
                variant="outlined"
                color="primary"
                onClick={onRemoveSpliceMarker}
                disabled={!selectedSpliceMarker}
                sx={{
                  minWidth: { xs: '48px', sm: 'auto' },
                  minHeight: { xs: '48px', sm: '36px' },
                  fontSize: { xs: '1.1rem', sm: '1rem' },
                }}
              >
                <DeleteIcon />
              </Button>
            </Box>
          </Tooltip>
          <Tooltip
            title={
              selectedSpliceMarkerLocked
                ? 'Unlock selected splice marker'
                : 'Lock selected splice marker'
            }
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Box component="span">
              <Button
                variant="outlined"
                color={selectedSpliceMarkerLocked ? 'warning' : 'primary'}
                onClick={onToggleMarkerLock}
                disabled={!selectedSpliceMarker}
                sx={{
                  minWidth: { xs: '48px', sm: 'auto' },
                  minHeight: { xs: '48px', sm: '36px' },
                  fontSize: { xs: '1.1rem', sm: '1rem' },
                }}
              >
                {selectedSpliceMarkerLocked ? <LockIcon /> : <LockOpenIcon />}
              </Button>
            </Box>
          </Tooltip>
          <Tooltip
            title="Clear all splice markers (manual and detected) except locked"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Box component="span">
              <Button
                variant="outlined"
                color="error"
                onClick={onClearAllMarkers}
                startIcon={<ClearIcon />}
                disabled={spliceMarkersCount === 0}
                sx={{
                  fontSize: { xs: '0.9rem', sm: '0.875rem' },
                  padding: {
                    xs: '0.6em 1em',
                    sm: '6px 16px',
                  },
                  minHeight: { xs: '48px', sm: '36px' },
                }}
              >
                Clear All
              </Button>
            </Box>
          </Tooltip>
        </Stack>

        {/* Second row: Auto-slice controls */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            flexWrap: 'wrap',
            gap: { xs: 0.5, sm: 1 },
            mb: 1.5,
            justifyContent: { xs: 'center', sm: 'flex-start' },
          }}
        >
          <Tooltip
            title="Number of equal slices to create"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <TextField
              label="Slices"
              type="number"
              value={numberOfSlices}
              onChange={(e) =>
                onSetNumberOfSlices(Math.max(2, parseInt(e.target.value) || 2))
              }
              size="small"
              inputProps={{ min: 2, max: 100 }}
              sx={{
                width: { xs: 90, sm: 80 },
                '& .MuiInputBase-root': {
                  height: { xs: '48px', sm: '36px' },
                },
                '& .MuiInputBase-input': {
                  fontSize: { xs: '1rem', sm: '0.875rem' },
                  padding: {
                    xs: '10px 12px',
                    sm: '8.5px 14px',
                  },
                },
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '1rem', sm: '0.875rem' },
                },
              }}
            />
          </Tooltip>

          <Tooltip
            title="Create equally distributed splice markers"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Box component="span">
              <Button
                variant="outlined"
                color="primary"
                onClick={onAutoSlice}
                startIcon={<ContentCutIcon />}
                disabled={!duration || duration <= 0}
                sx={{
                  fontSize: { xs: '0.9rem', sm: '0.875rem' },
                  padding: {
                    xs: '0.6em 1em',
                    sm: '6px 16px',
                  },
                  minHeight: { xs: '48px', sm: '36px' },
                }}
              >
                Auto Slice
              </Button>
            </Box>
          </Tooltip>

          <Tooltip
            title="Remove every other splice marker (keep 1st, 3rd, 5th...)"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Box component="span">
              <Button
                variant="outlined"
                color="primary"
                onClick={onHalfMarkers}
                startIcon={<FilterListIcon />}
                disabled={spliceMarkersCount <= 1}
                sx={{
                  fontSize: { xs: '0.9rem', sm: '0.875rem' },
                  padding: {
                    xs: '0.6em 1em',
                    sm: '6px 16px',
                  },
                  minHeight: { xs: '48px', sm: '36px' },
                }}
              >
                Half Markers
              </Button>
            </Box>
          </Tooltip>
        </Stack>

        {/* Third row: Utility controls */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            flexWrap: 'wrap',
            gap: { xs: 0.5, sm: 1 },
            justifyContent: { xs: 'center', sm: 'flex-start' },
          }}
        >
          <Tooltip
            title="Snap all existing markers to zero crossings (reduces audio artifacts)"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Box component="span">
              <Button
                variant="outlined"
                color="primary"
                onClick={onSnapToZeroCrossings}
                disabled={spliceMarkersCount === 0}
                startIcon={<CenterFocusStrongIcon />}
                sx={{
                  minWidth: { xs: 130, sm: 140 },
                  fontSize: { xs: '0.9rem', sm: '0.875rem' },
                  padding: {
                    xs: '0.6em 1em',
                    sm: '6px 16px',
                  },
                  minHeight: { xs: '48px', sm: '36px' },
                }}
              >
                Snap All to Zero
              </Button>
            </Box>
          </Tooltip>
        </Stack>
        <Box sx={{ my: 2 }}>
          <hr
            style={{
              border: '1px solid',
              borderColor: 'divider',
              marginTop: '20px',
              marginBottom: '20px',
            }}
          />
        </Box>
        {/* Transient detection controls */}
        <Typography variant="subtitle2" gutterBottom>
          Splice Detection
        </Typography>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{
            mb: 2,
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              width: { xs: '100%', sm: 120 },
              textAlign: { xs: 'center', sm: 'left' },
              fontSize: { xs: '1rem', sm: '0.875rem' },
            }}
          >
            Sensitivity:
          </Typography>
          <Box
            sx={{
              width: { xs: '100%', sm: 200 },
              pr: { xs: 2, sm: 1 },
            }}
          >
            <Slider
              value={transientSensitivity}
              onChange={(_, value) =>
                onSetTransientSensitivity(value as number)
              }
              min={0}
              max={100}
              step={1}
              valueLabelDisplay="auto"
              marks={[
                { value: 0, label: 'Low' },
                { value: 50, label: 'Med' },
                { value: 100, label: 'High' },
              ]}
              sx={{
                '& .MuiSlider-thumb': {
                  width: { xs: 24, sm: 20 },
                  height: { xs: 24, sm: 20 },
                },
                '& .MuiSlider-markLabel': {
                  fontSize: { xs: '0.875rem', sm: '0.75rem' },
                },
              }}
            />
          </Box>
        </Stack>

        {/* Advanced controls - Frame Size and Overlap */}
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{
            mb: 2,
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              width: { xs: '100%', sm: 120 },
              textAlign: { xs: 'center', sm: 'left' },
              fontSize: { xs: '1rem', sm: '0.875rem' },
            }}
          >
            Frame Size:
          </Typography>
          <Box
            sx={{
              width: { xs: '100%', sm: 200 },
              pr: { xs: 2, sm: 1 },
            }}
          >
            <Slider
              value={transientFrameSize}
              onChange={(_, value) => onSetTransientFrameSize(value as number)}
              min={5}
              max={200}
              step={1}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}ms`}
              size="small"
              sx={{
                '& .MuiSlider-thumb': {
                  width: { xs: 20, sm: 16 },
                  height: { xs: 20, sm: 16 },
                },
              }}
            />
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{
            mb: 2,
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              width: { xs: '100%', sm: 120 },
              textAlign: { xs: 'center', sm: 'left' },
              fontSize: { xs: '1rem', sm: '0.875rem' },
            }}
          >
            Overlap:
          </Typography>
          <Box
            sx={{
              width: { xs: '100%', sm: 200 },
              pr: { xs: 2, sm: 1 },
            }}
          >
            <Slider
              value={transientOverlap}
              onChange={(_, value) => onSetTransientOverlap(value as number)}
              min={20}
              max={90}
              step={5}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}%`}
              size="small"
              sx={{
                '& .MuiSlider-thumb': {
                  width: { xs: 20, sm: 16 },
                  height: { xs: 20, sm: 16 },
                },
              }}
            />
          </Box>
        </Stack>
        <Stack
          direction="row"
          spacing={2}
          alignItems="flex-start"
          sx={{ mb: 2 }}
        >
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{
              minWidth: 60,
              textAlign: 'left',
              fontSize: { xs: '0.8rem', sm: '0.75rem' },
              lineHeight: { xs: 1.4, sm: 1.33 },
            }}
          >
            Sensitivity affects how many transients are detected. Higher values
            detect more transients but may include noise. Frame size determines
            the duration of each analysis window (5-200ms). Overlap controls how
            much each frame overlaps with the next (20-90%). In general, higher
            sensitivity and overlap values will detect more transients, but may
            also include more noise.
          </Typography>
        </Stack>

        {/* Detect button */}
        <Stack direction="row" spacing={1} justifyContent="center">
          <Tooltip
            title="Detect transients and create splice markers"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Box component="span">
              <Button
                variant="contained"
                color="primary"
                onClick={onTransientDetection}
                disabled={!duration || duration <= 0}
                startIcon={<AutoFixHighIcon />}
                sx={{
                  fontSize: { xs: '1rem', sm: '0.875rem' },
                  padding: {
                    xs: '0.7em 1.5em',
                    sm: '6px 16px',
                  },
                  minHeight: { xs: '48px', sm: '36px' },
                }}
              >
                Detect
              </Button>
            </Box>
          </Tooltip>
        </Stack>
      </Box>
    </Stack>
  );
};

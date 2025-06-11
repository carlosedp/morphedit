// Splice marker controls component
import React from "react";
import {
  Button,
  Stack,
  TextField,
  Tooltip,
  Slider,
  Typography,
  Box,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Create";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";

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
      <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Manual Splice Marker Controls
        </Typography>

        {/* Auto-slice controls */}
        {/* <Box sx={{ mt: 2, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}> */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip
            title="Add splice marker at current time"
            enterDelay={500}
            leaveDelay={200}
          >
            <Button
              variant="outlined"
              color="primary"
              onClick={onAddSpliceMarker}
            >
              <AddIcon />
            </Button>
          </Tooltip>

          <Tooltip
            title="Remove selected splice marker"
            enterDelay={500}
            leaveDelay={200}
          >
            <Button
              variant="outlined"
              color="primary"
              onClick={onRemoveSpliceMarker}
              disabled={!selectedSpliceMarker}
            >
              <DeleteIcon />
            </Button>
          </Tooltip>

          <Tooltip
            title={
              selectedSpliceMarkerLocked
                ? "Unlock selected splice marker"
                : "Lock selected splice marker"
            }
            enterDelay={500}
            leaveDelay={200}
          >
            <Button
              variant="outlined"
              color={selectedSpliceMarkerLocked ? "warning" : "primary"}
              onClick={onToggleMarkerLock}
              disabled={!selectedSpliceMarker}
            >
              {selectedSpliceMarkerLocked ? <LockIcon /> : <LockOpenIcon />}
            </Button>
          </Tooltip>

          <Tooltip
            title="Number of equal slices to create"
            enterDelay={500}
            leaveDelay={200}
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
              sx={{ width: 80 }}
            />
          </Tooltip>

          <Tooltip
            title="Create equally distributed splice markers"
            enterDelay={500}
            leaveDelay={200}
          >
            <Button
              variant="outlined"
              color="primary"
              onClick={onAutoSlice}
              startIcon={<ContentCutIcon />}
              disabled={!duration || duration <= 0}
            >
              Auto Slice
            </Button>
          </Tooltip>

          <Tooltip
            title="Remove every other splice marker (keep 1st, 3rd, 5th...)"
            enterDelay={500}
            leaveDelay={200}
          >
            <Button
              variant="outlined"
              color="primary"
              onClick={onHalfMarkers}
              startIcon={<FilterListIcon />}
              disabled={spliceMarkersCount <= 1}
            >
              Half Markers
            </Button>
          </Tooltip>

          <Tooltip
            title="Clear all splice markers"
            enterDelay={500}
            leaveDelay={200}
          >
            <Button
              variant="outlined"
              color="error"
              onClick={onClearAllMarkers}
              startIcon={<ClearIcon />}
              disabled={spliceMarkersCount === 0}
            >
              Clear All
            </Button>
          </Tooltip>

          <Tooltip
            title="Snap all existing markers to zero crossings (reduces audio artifacts)"
            enterDelay={500}
            leaveDelay={200}
          >
            <Button
              variant="outlined"
              color="primary"
              onClick={onSnapToZeroCrossings}
              disabled={spliceMarkersCount === 0}
              startIcon={<CenterFocusStrongIcon />}
              sx={{ minWidth: 140 }}
            >
              Snap All to Zero
            </Button>
          </Tooltip>
        </Stack>
      </Box>
      {/* Transient detection controls */}
      <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Splice Detection
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="body2" width={120} align="left">
            Sensitivity:
          </Typography>
          <Box sx={{ width: 200 }}>
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
                { value: 0, label: "Low" },
                { value: 50, label: "Med" },
                { value: 100, label: "High" },
              ]}
            />
          </Box>
        </Stack>

        {/* Advanced controls - Frame Size and Overlap */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="body2" width={120} align="left">
            Frame Size:
          </Typography>
          <Box sx={{ width: 200 }}>
            <Slider
              value={transientFrameSize}
              onChange={(_, value) => onSetTransientFrameSize(value as number)}
              min={5}
              max={50}
              step={1}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}ms`}
              size="small"
            />
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="body2" width={120} align="left">
            Overlap:
          </Typography>
          <Box sx={{ width: 200 }}>
            <Slider
              value={transientOverlap}
              onChange={(_, value) => onSetTransientOverlap(value as number)}
              min={50}
              max={90}
              step={5}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}%`}
              size="small"
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
            sx={{ minWidth: 60, textAlign: "left" }}
          >
            Sensitivity affects how many transients are detected. Higher values
            detect more transients but may include noise. Frame size determines
            the duration of each analysis window (5-50ms). Overlap controls how
            much each frame overlaps with the next (50-90%). In general, higher
            sensitivity and overlap values will detect more transients, but may
            also include more noise.
          </Typography>
        </Stack>

        {/* Detect button */}
        <Stack direction="row" spacing={1} justifyContent="center">
          <Tooltip
            title="Detect transients and create splice markers"
            enterDelay={500}
            leaveDelay={200}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={onTransientDetection}
              disabled={!duration || duration <= 0}
              startIcon={<AutoFixHighIcon />}
            >
              Detect
            </Button>
          </Tooltip>
        </Stack>
      </Box>
    </Stack>
  );
};

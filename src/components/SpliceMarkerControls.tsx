// Splice marker controls component
import React from "react";
import { Button, Stack, TextField, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Create";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";

interface SpliceMarkerControlsProps {
  selectedSpliceMarker: boolean;
  numberOfSlices: number;
  spliceMarkersCount: number;
  duration: number;
  onAddSpliceMarker: () => void;
  onRemoveSpliceMarker: () => void;
  onAutoSlice: () => void;
  onHalfMarkers: () => void;
  onSetNumberOfSlices: (slices: number) => void;
}

export const SpliceMarkerControls: React.FC<SpliceMarkerControlsProps> = ({
  selectedSpliceMarker,
  numberOfSlices,
  spliceMarkersCount,
  duration,
  onAddSpliceMarker,
  onRemoveSpliceMarker,
  onAutoSlice,
  onHalfMarkers,
  onSetNumberOfSlices,
}) => {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
      <Tooltip title="Add splice marker at current time" enterDelay={500} leaveDelay={200}>
        <Button
          variant="outlined"
          color="primary"
          onClick={onAddSpliceMarker}
        >
          <AddIcon />
        </Button>
      </Tooltip>

      <Tooltip title="Remove selected splice marker" enterDelay={500} leaveDelay={200}>
        <Button
          variant="outlined"
          color="primary"
          onClick={onRemoveSpliceMarker}
          disabled={!selectedSpliceMarker}
        >
          <DeleteIcon />
        </Button>
      </Tooltip>

      {/* Auto-slice controls */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 3 }}>
        <Tooltip title="Number of equal slices to create" enterDelay={500} leaveDelay={200}>
          <TextField
            label="Slices"
            type="number"
            value={numberOfSlices}
            onChange={(e) => onSetNumberOfSlices(Math.max(2, parseInt(e.target.value) || 2))}
            size="small"
            inputProps={{ min: 2, max: 100 }}
            sx={{ width: 80 }}
          />
        </Tooltip>

        <Tooltip title="Create equally distributed splice markers" enterDelay={500} leaveDelay={200}>
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
          title={
            spliceMarkersCount === 1
              ? "Clear the single splice marker"
              : "Remove every other splice marker (keep 1st, 3rd, 5th...)"
          }
          enterDelay={500}
          leaveDelay={200}
        >
          <Button
            variant="outlined"
            color="primary"
            onClick={onHalfMarkers}
            startIcon={spliceMarkersCount === 1 ? <ClearIcon /> : <FilterListIcon />}
            disabled={spliceMarkersCount === 0}
          >
            {spliceMarkersCount === 1 ? "Clear Markers" : "Half Markers"}
          </Button>
        </Tooltip>
      </Stack>
    </Stack>
  );
};

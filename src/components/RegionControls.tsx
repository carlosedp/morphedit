// Region controls component - crop, fade in/out, apply operations
import React from "react";
import { Box, Button, Stack, Tooltip } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import UndoIcon from "@mui/icons-material/Undo";

interface RegionControlsProps {
  cropMode: boolean;
  fadeInMode: boolean;
  fadeOutMode: boolean;
  canUndo: boolean;
  onCropRegion: () => void;
  onFadeInRegion: () => void;
  onFadeOutRegion: () => void;
  onApplyCrop: () => void;
  onApplyFades: () => void;
  onUndo: () => void;
}

export const RegionControls: React.FC<RegionControlsProps> = ({
  cropMode,
  fadeInMode,
  fadeOutMode,
  canUndo,
  onCropRegion,
  onFadeInRegion,
  onFadeOutRegion,
  onApplyCrop,
  onApplyFades,
  onUndo,
}) => {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Tooltip
        title="Create crop/loop region"
        enterDelay={500}
        leaveDelay={200}
      >
        <Button
          variant={cropMode ? "contained" : "outlined"}
          color="primary"
          onClick={onCropRegion}
          sx={{ ml: 2 }}
        >
          Crop/Loop Region
        </Button>
      </Tooltip>

      <Tooltip
        title="Create a fade-in region"
        enterDelay={500}
        leaveDelay={200}
      >
        <Button
          variant={fadeInMode ? "contained" : "outlined"}
          color="primary"
          onClick={onFadeInRegion}
          sx={{ ml: 2 }}
          startIcon={<TrendingUpIcon />}
        >
          Fade In
        </Button>
      </Tooltip>

      <Tooltip title="Create fade-out region" enterDelay={500} leaveDelay={200}>
        <Button
          variant={fadeOutMode ? "contained" : "outlined"}
          color="primary"
          onClick={onFadeOutRegion}
          sx={{ ml: 2 }}
          startIcon={<TrendingDownIcon />}
        >
          Fade Out
        </Button>
      </Tooltip>

      <Tooltip
        title="Apply crop to current audio"
        enterDelay={500}
        leaveDelay={200}
      >
        <Box component="span">
          <Button
            variant="contained"
            color="success"
            onClick={onApplyCrop}
            sx={{ ml: 2 }}
            disabled={!cropMode}
          >
            Apply Crop
          </Button>
        </Box>
      </Tooltip>

      <Tooltip
        title="Apply fade regions to current audio"
        enterDelay={500}
        leaveDelay={200}
      >
        <Box component="span">
          <Button
            variant="contained"
            color="success"
            onClick={onApplyFades}
            sx={{ ml: 2 }}
            disabled={!fadeInMode && !fadeOutMode}
          >
            Apply Fades
          </Button>
        </Box>
      </Tooltip>

      <Tooltip title="Undo last edit" enterDelay={500} leaveDelay={200}>
        <Box component="span">
          <Button
            variant="outlined"
            color="primary"
            onClick={onUndo}
            sx={{ ml: 2 }}
            disabled={!canUndo}
            startIcon={<UndoIcon />}
          >
            Undo
          </Button>
        </Box>
      </Tooltip>
    </Stack>
  );
};

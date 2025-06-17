// Region controls component - crop, fade in/out, apply operations
import React, { useState } from "react";
import { Box, Button, ButtonGroup, Stack, Tooltip } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import UndoIcon from "@mui/icons-material/Undo";
import { TOOLTIP_DELAYS } from "../constants";
import { FadeCurveSelector } from "./FadeCurveSelector";

interface RegionControlsProps {
  cropMode: boolean;
  fadeInMode: boolean;
  fadeOutMode: boolean;
  fadeInCurveType: string;
  fadeOutCurveType: string;
  canUndo: boolean;
  onCropRegion: () => void;
  onFadeInRegion: () => void;
  onFadeOutRegion: () => void;
  onApplyCrop: () => void;
  onApplyFades: () => void;
  onUndo: () => void;
  onSetFadeInCurveType: (curveType: string) => void;
  onSetFadeOutCurveType: (curveType: string) => void;
}

export const RegionControls: React.FC<RegionControlsProps> = ({
  cropMode,
  fadeInMode,
  fadeOutMode,
  fadeInCurveType,
  fadeOutCurveType,
  canUndo,
  onCropRegion,
  onFadeInRegion,
  onFadeOutRegion,
  onApplyCrop,
  onApplyFades,
  onUndo,
  onSetFadeInCurveType,
  onSetFadeOutCurveType,
}) => {
  const [fadeInAnchorEl, setFadeInAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [fadeOutAnchorEl, setFadeOutAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  return (
    <Stack
      direction="column"
      spacing={2}
      sx={{
        width: "100%",
      }}
    >
      {/* Region controls row */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          flexWrap: "wrap",
          gap: { xs: 0.5, sm: 1 },
        }}
      >
        <Tooltip
          title="Create crop/loop region"
          enterDelay={TOOLTIP_DELAYS.ENTER}
          leaveDelay={TOOLTIP_DELAYS.LEAVE}
        >
          <Button
            variant={cropMode ? "contained" : "outlined"}
            color="primary"
            onClick={onCropRegion}
          >
            Crop/Loop Region
          </Button>
        </Tooltip>
        <Tooltip
          title="Apply crop to current audio"
          enterDelay={TOOLTIP_DELAYS.ENTER}
          leaveDelay={TOOLTIP_DELAYS.LEAVE}
        >
          <Box component="span">
            <Button
              variant="contained"
              color="success"
              onClick={onApplyCrop}
              disabled={!cropMode}
            >
              Apply Crop
            </Button>
          </Box>
        </Tooltip>
      </Stack>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          flexWrap: "wrap",
          gap: { xs: 0.5, sm: 1 },
        }}
      >
        {/* Fade In button group */}
        {fadeInMode ? (
          <ButtonGroup variant="outlined">
            <Tooltip
              title="Create a fade-in region"
              enterDelay={TOOLTIP_DELAYS.ENTER}
              leaveDelay={TOOLTIP_DELAYS.LEAVE}
            >
              <Button
                variant={fadeInMode ? "contained" : "outlined"}
                color="primary"
                onClick={onFadeInRegion}
                startIcon={<TrendingUpIcon />}
              >
                Fade In
              </Button>
            </Tooltip>
            <FadeCurveSelector
              selectedCurve={fadeInCurveType}
              onCurveChange={onSetFadeInCurveType}
              fadeType="in"
              anchorEl={fadeInAnchorEl}
              onSetAnchorEl={setFadeInAnchorEl}
            />
          </ButtonGroup>
        ) : (
          <Tooltip
            title="Create a fade-in region"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Button
              variant="outlined"
              color="primary"
              onClick={onFadeInRegion}
              startIcon={<TrendingUpIcon />}
            >
              Fade In
            </Button>
          </Tooltip>
        )}

        {/* Fade Out button group */}
        {fadeOutMode ? (
          <ButtonGroup variant="outlined">
            <Tooltip
              title="Create fade-out region"
              enterDelay={TOOLTIP_DELAYS.ENTER}
              leaveDelay={TOOLTIP_DELAYS.LEAVE}
            >
              <Button
                variant={fadeOutMode ? "contained" : "outlined"}
                color="primary"
                onClick={onFadeOutRegion}
                startIcon={<TrendingDownIcon />}
              >
                Fade Out
              </Button>
            </Tooltip>
            <FadeCurveSelector
              selectedCurve={fadeOutCurveType}
              onCurveChange={onSetFadeOutCurveType}
              fadeType="out"
              anchorEl={fadeOutAnchorEl}
              onSetAnchorEl={setFadeOutAnchorEl}
            />
          </ButtonGroup>
        ) : (
          <Tooltip
            title="Create fade-out region"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Button
              variant="outlined"
              color="primary"
              onClick={onFadeOutRegion}
              startIcon={<TrendingDownIcon />}
            >
              Fade Out
            </Button>
          </Tooltip>
        )}

        <Tooltip
          title="Apply fade regions to current audio"
          enterDelay={TOOLTIP_DELAYS.ENTER}
          leaveDelay={TOOLTIP_DELAYS.LEAVE}
        >
          <Box component="span">
            <Button
              variant="contained"
              color="success"
              onClick={onApplyFades}
              disabled={!fadeInMode && !fadeOutMode}
            >
              Apply Fades
            </Button>
          </Box>
        </Tooltip>
      </Stack>
      {/* Action buttons row */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          flexWrap: "wrap",
          gap: { xs: 0.5, sm: 1 },
        }}
      >
        <Tooltip
          title="Undo last edit"
          enterDelay={TOOLTIP_DELAYS.ENTER}
          leaveDelay={TOOLTIP_DELAYS.LEAVE}
        >
          <Box component="span">
            <Button
              variant="outlined"
              color="primary"
              onClick={onUndo}
              disabled={!canUndo}
              startIcon={<UndoIcon />}
            >
              Undo
            </Button>
          </Box>
        </Tooltip>
      </Stack>
    </Stack>
  );
};

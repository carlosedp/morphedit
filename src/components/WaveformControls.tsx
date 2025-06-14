// Waveform controls component - playback, zoom, and navigation
import React from "react";
import { IconButton, Slider, Stack, Typography, Tooltip } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import ZoomResetIcon from "@mui/icons-material/ZoomOutMap";
import RepeatIcon from "@mui/icons-material/Repeat";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import { formatTime } from "../utils/audioProcessing";
import type { RegionInfo } from "../utils/regionUtils";

interface WaveformControlsProps {
  isPlaying: boolean;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  zoom: number;
  skipIncrement: number;
  spliceMarkersCount: number;
  regionInfo: RegionInfo;
  onPlayPause: () => void;
  onLoop: () => void;
  onRewind: () => void;
  onZoom: (value: number) => void;
  onZoomReset: () => void;
}

export const WaveformControls: React.FC<WaveformControlsProps> = ({
  isPlaying,
  isLooping,
  currentTime,
  duration,
  zoom,
  skipIncrement,
  spliceMarkersCount,
  regionInfo,
  onPlayPause,
  onLoop,
  onRewind,
  onZoom,
  onZoomReset,
}) => {
  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        mt: 2,
        width: "100%",
        flexDirection: { xs: "column", md: "row" },
        gap: { xs: 2, md: 0 },
      }}
    >
      {/* Left column - Controls */}
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{
          flex: 1,
          flexWrap: "wrap",
          gap: { xs: 1, sm: 2 },
          justifyContent: { xs: "center", md: "flex-start" },
        }}
      >
        <Tooltip title="Play/Pause" enterDelay={500} leaveDelay={200}>
          <IconButton
            onClick={onPlayPause}
            color="primary"
            size="large"
            sx={{
              fontSize: { xs: "1.5rem", sm: "1.5rem" },
              padding: { xs: "12px", sm: "12px" },
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Loop region" enterDelay={500} leaveDelay={200}>
          <IconButton
            onClick={onLoop}
            color={isLooping ? "primary" : "default"}
            sx={{
              padding: { xs: "10px", sm: "8px" },
            }}
          >
            <RepeatIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Rewind to start" enterDelay={500} leaveDelay={200}>
          <IconButton
            onClick={onRewind}
            color="default"
            sx={{
              padding: { xs: "10px", sm: "8px" },
            }}
          >
            <FirstPageIcon />
          </IconButton>
        </Tooltip>

        {/* Zoom controls */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            ml: { xs: 0, sm: 2 },
            minWidth: { xs: "100%", sm: "auto" },
            justifyContent: { xs: "center", sm: "flex-start" },
          }}
        >
          <ZoomOutIcon color="action" />
          <Slider
            value={zoom}
            onChange={(_, value) => onZoom(value as number)}
            min={1}
            max={3000}
            step={1}
            sx={{ width: { xs: 140, sm: 100 } }}
            size="small"
          />
          <ZoomInIcon color="action" />
          <IconButton onClick={onZoomReset} size="small">
            <Tooltip title="Zoom all" enterDelay={500} leaveDelay={200}>
              <ZoomResetIcon />
            </Tooltip>
          </IconButton>
        </Stack>
      </Stack>

      {/* Right column - Times and info */}
      <Stack
        direction="column"
        spacing={0}
        alignItems="flex-end"
        sx={{
          flex: 1,
          justifyContent: "flex-end",
          alignItems: { xs: "center", md: "flex-end" },
          textAlign: { xs: "center", md: "right" },
        }}
      >
        {/* Main audio time */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            flexWrap: "wrap",
            justifyContent: { xs: "center", md: "flex-end" },
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
          >
            🕒 {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
          >
            | Skip: {skipIncrement}s
          </Typography>
          {spliceMarkersCount > 0 && (
            <Typography
              variant="body2"
              color="primary"
              sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
            >
              | Splice markers: {spliceMarkersCount}
            </Typography>
          )}
        </Stack>

        {/* Region information */}
        {(regionInfo.cropRegion ||
          regionInfo.fadeInRegion ||
          regionInfo.fadeOutRegion) && (
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{
                mt: 0.5,
                flexWrap: "wrap",
                justifyContent: { xs: "center", md: "flex-end" },
              }}
            >
              {regionInfo.cropRegion && (
                <Typography variant="caption" color="warning.main">
                  Crop: {formatTime(regionInfo.cropRegion.start)} -{" "}
                  {formatTime(regionInfo.cropRegion.end)} (Δ
                  {formatTime(regionInfo.cropRegion.duration)})
                </Typography>
              )}
              {regionInfo.fadeInRegion && (
                <Typography variant="caption" color="success.main">
                  Fade In: {formatTime(regionInfo.fadeInRegion.start)} -{" "}
                  {formatTime(regionInfo.fadeInRegion.end)} (Δ
                  {formatTime(regionInfo.fadeInRegion.duration)})
                </Typography>
              )}
              {regionInfo.fadeOutRegion && (
                <Typography variant="caption" color="error.main">
                  Fade Out: {formatTime(regionInfo.fadeOutRegion.start)} -{" "}
                  {formatTime(regionInfo.fadeOutRegion.end)} (Δ
                  {formatTime(regionInfo.fadeOutRegion.duration)})
                </Typography>
              )}
            </Stack>
          )}
      </Stack>
    </Stack>
  );
};

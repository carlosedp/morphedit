// Waveform controls component - playback, zoom, and navigation
import React from "react";
import {
  IconButton,
  Slider,
  Stack,
  Typography,
  Tooltip,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import ZoomResetIcon from "@mui/icons-material/ZoomOutMap";
import RepeatIcon from "@mui/icons-material/Repeat";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import { formatTime } from "../utils/audioProcessing";

interface WaveformControlsProps {
  isPlaying: boolean;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  zoom: number;
  skipIncrement: number;
  spliceMarkersCount: number;
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
  onPlayPause,
  onLoop,
  onRewind,
  onZoom,
  onZoomReset,
}) => {
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
      <Tooltip title="Play/Pause" enterDelay={500} leaveDelay={200}>
        <IconButton
          onClick={onPlayPause}
          color="primary"
          size="large"
        >
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
      </Tooltip>

      <Tooltip title="Loop region" enterDelay={500} leaveDelay={200}>
        <IconButton
          onClick={onLoop}
          color={isLooping ? "primary" : "default"}
        >
          <RepeatIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Rewind to start" enterDelay={500} leaveDelay={200}>
        <IconButton onClick={onRewind} color="default">
          <FirstPageIcon />
        </IconButton>
      </Tooltip>

      {/* Zoom controls */}
      <Tooltip title="Zoom" enterDelay={500} leaveDelay={200}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 2 }}>
          <ZoomOutIcon color="action" />
          <Slider
            value={zoom}
            onChange={(_, value) => onZoom(value as number)}
            min={10}
            max={1000}
            step={10}
            sx={{ width: 100 }}
            size="small"
          />
          <ZoomInIcon color="action" />
          <IconButton onClick={onZoomReset} size="small">
            <ZoomResetIcon />
          </IconButton>
        </Stack>
      </Tooltip>

      {/* Times */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 2 }}>
        <Typography variant="body2">
          {formatTime(currentTime)} / {formatTime(duration)}
        </Typography>
        <Typography variant="body2">
          Skip: {skipIncrement}s
        </Typography>
        {spliceMarkersCount > 0 && (
          <Typography variant="body2" color="primary">
            Splice markers: {spliceMarkersCount}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
};

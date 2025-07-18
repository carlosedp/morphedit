// Waveform controls component - provides playback controls, zoom, and navigation

import FirstPageIcon from '@mui/icons-material/FirstPage';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RepeatIcon from '@mui/icons-material/Repeat';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import ZoomResetIcon from '@mui/icons-material/ZoomOutMap';
import {
  IconButton,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import * as React from 'react';

import { TOOLTIP_DELAYS, ZOOM_LEVELS } from '../constants';
import { formatSeconds, formatTime } from '../utils/audioProcessing';
import { formatBPM } from '../utils/bpmDetection';
import type { RegionInfo } from '../utils/regionUtils';

interface WaveformControlsProps {
  isPlaying: boolean;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  bpm: number | null;
  zoom: number;
  skipIncrement: number;
  spliceMarkersCount: number;
  regionInfo: RegionInfo;
  selectedSpliceMarkerTime: number | null;
  onPlayPause: () => void;
  onLoop: () => void;
  onRewind: () => void;
  onZoom: (value: number) => void;
  onZoomReset: () => void;
}

export const WaveformControls: React.FC<WaveformControlsProps> = ({
  bpm,
  currentTime,
  duration,
  isLooping,
  isPlaying,
  onLoop,
  onPlayPause,
  onRewind,
  onZoom,
  onZoomReset,
  regionInfo,
  selectedSpliceMarkerTime,
  skipIncrement,
  spliceMarkersCount,
  zoom,
}) => {
  return (
    <Stack>
      <Stack
        direction="row"
        sx={{
          width: '100%',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 0 },
          alignItems: { xs: 'stretch', md: 'flex-start' },
        }}
      >
        {/* Left column - Controls */}
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{
            flex: 1,
            flexWrap: 'wrap',
            gap: { xs: 1, sm: 2 },
            justifyContent: { xs: 'center', md: 'flex-start' },
          }}
        >
          <Tooltip
            title="Play/Pause"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <IconButton
              onClick={onPlayPause}
              color="primary"
              size="large"
              sx={{
                fontSize: { xs: '1.5rem', sm: '1.5rem' },
                padding: { xs: '12px', sm: '12px' },
              }}
            >
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip
            title="Loop region"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <IconButton
              onClick={onLoop}
              color={isLooping ? 'primary' : 'default'}
              sx={{
                padding: { xs: '10px', sm: '8px' },
              }}
            >
              <RepeatIcon />
            </IconButton>
          </Tooltip>

          <Tooltip
            title="Rewind to start"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <IconButton
              onClick={onRewind}
              color="default"
              sx={{
                padding: { xs: '10px', sm: '8px' },
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
              minWidth: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'center', sm: 'flex-start' },
            }}
          >
            <ZoomOutIcon color="action" />
            <Slider
              value={zoom}
              onChange={(_, value) => onZoom(value as number)}
              min={ZOOM_LEVELS.MIN}
              max={ZOOM_LEVELS.MAX}
              step={ZOOM_LEVELS.STEP}
              sx={{ width: { xs: 140, sm: 100 } }}
              size="small"
            />
            <ZoomInIcon color="action" />
            <IconButton onClick={onZoomReset} size="small">
              <Tooltip
                title="Zoom all"
                enterDelay={TOOLTIP_DELAYS.ENTER}
                leaveDelay={TOOLTIP_DELAYS.LEAVE}
              >
                <ZoomResetIcon />
              </Tooltip>
            </IconButton>
          </Stack>
        </Stack>

        {/* Info Bar - Right column */}
        <Stack
          direction="column"
          spacing={0.5}
          alignItems="flex-end"
          sx={{
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: { xs: 'center', md: 'flex-end' },
            textAlign: { xs: 'center', md: 'right' },
            minWidth: { xs: '100%', md: 'auto' },
          }}
        >
          {/* Permanent info line - Duration, Position, BPM, Splice Markers */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              flexWrap: 'nowrap', // Prevent wrapping to keep items on same line
              justifyContent: { xs: 'center', md: 'flex-end' },
              overflow: 'hidden', // Hide overflow instead of wrapping
              '& > *': {
                flexShrink: 1, // Allow items to shrink if needed
                minWidth: 'max-content', // Prevent text from breaking
              },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                whiteSpace: 'nowrap',
              }}
            >
              🕒 {formatTime(currentTime)} / {formatTime(duration)}
            </Typography>
            {bpm && (
              <Typography
                variant="body2"
                color="primary"
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  whiteSpace: 'nowrap',
                }}
              >
                | 🎵 {formatBPM(bpm)}
              </Typography>
            )}
            <Typography
              variant="body2"
              color="primary"
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' }, // Smaller on mobile
                whiteSpace: 'nowrap', // Prevent text wrapping
              }}
            >
              | ✂️ Splices: {spliceMarkersCount}
            </Typography>
          </Stack>
          {/* Arrow Skip info - Always shown at bottom */}
          <Tooltip
            title="Use arrow keys to skip forward/backward and up/down to adjust skip increment"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                fontStyle: 'italic',
              }}
            >
              ⌨️ Arrow Skip: {formatSeconds(skipIncrement)}s
            </Typography>
          </Tooltip>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              width: '100%',
            }}
          ></Stack>
        </Stack>
      </Stack>
      <Table sx={{ minHeight: '48px', tableLayout: 'fixed' }}>
        <TableBody>
          <TableRow>
            <TableCell sx={{ padding: '0px', width: '20%' }}>
              {/* Selected splice marker time - Second line */}
              {selectedSpliceMarkerTime !== null && (
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.8rem' },
                  }}
                >
                  Selected Marker: {formatTime(selectedSpliceMarkerTime)}
                </Typography>
              )}
            </TableCell>
            <TableCell sx={{ padding: '0px', width: '20%' }}>
              {/* Region information - One per line */}
              {regionInfo.cropRegion && (
                <Typography
                  variant="caption"
                  color="warning.main"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                >
                  Crop: {formatTime(regionInfo.cropRegion.start)} -{' '}
                  {formatTime(regionInfo.cropRegion.end)} (
                  {formatTime(
                    regionInfo.cropRegion.end - regionInfo.cropRegion.start
                  )}
                  )
                </Typography>
              )}
            </TableCell>
            <TableCell sx={{ padding: '0px', width: '20%' }}>
              {regionInfo.fadeInRegion && (
                <Typography
                  variant="caption"
                  color="success.main"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                >
                  Fade-In: {formatTime(regionInfo.fadeInRegion.start)} -{' '}
                  {formatTime(regionInfo.fadeInRegion.end)} (
                  {formatTime(
                    regionInfo.fadeInRegion.end - regionInfo.fadeInRegion.start
                  )}
                  )
                </Typography>
              )}
            </TableCell>
            <TableCell sx={{ padding: '0px', width: '20%' }}>
              {regionInfo.fadeOutRegion && (
                <Typography
                  variant="caption"
                  color="error.main"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                >
                  Fade-Out: {formatTime(regionInfo.fadeOutRegion.start)} -{' '}
                  {formatTime(regionInfo.fadeOutRegion.end)} (
                  {formatTime(
                    regionInfo.fadeOutRegion.end -
                      regionInfo.fadeOutRegion.start
                  )}
                  )
                </Typography>
              )}
            </TableCell>
            <TableCell sx={{ padding: '0px', width: '20%' }}>
              {regionInfo.crossfadeRegion && (
                <Typography
                  variant="caption"
                  color="info.main"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                >
                  Crossfade: {formatTime(regionInfo.crossfadeRegion.start)} -{' '}
                  {formatTime(regionInfo.crossfadeRegion.end)} (
                  {formatTime(
                    regionInfo.crossfadeRegion.end -
                      regionInfo.crossfadeRegion.start
                  )}
                  )
                </Typography>
              )}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Stack>
  );
};

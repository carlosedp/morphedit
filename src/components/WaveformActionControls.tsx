// Separated action controls for the Waveform component

import { useState } from 'react';
import {
  Stack,
  Button,
  ButtonGroup,
  Tooltip,
  Box,
  Menu,
  MenuItem,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CutIcon from '@mui/icons-material/ContentCut';
import UndoIcon from '@mui/icons-material/Undo';
import NormalizeIcon from '@mui/icons-material/TuneOutlined';
import SpeedIcon from '@mui/icons-material/Speed';
import BlurOnIcon from '@mui/icons-material/BlurOn';

import { TOOLTIP_DELAYS, EXPORT_FORMATS } from '../constants';
import type { ExportFormat } from '../utils/exportUtils';
import { FadeCurveSelector } from './FadeCurveSelector';

interface WaveformActionControlsProps {
  // State props
  selectedExportFormat: ExportFormat;
  exportAnchorEl: HTMLElement | null;
  fadeInAnchorEl: HTMLElement | null;
  fadeOutAnchorEl: HTMLElement | null;
  crossfadeAnchorEl: HTMLElement | null;
  cropMode: boolean;
  fadeInMode: boolean;
  fadeOutMode: boolean;
  fadeInCurveType: string;
  fadeOutCurveType: string;
  crossfadeMode: boolean;
  crossfadeCurveType: string;
  selectedSpliceMarker: boolean;
  canUndo: boolean;

  // Action props
  onExport: () => void;
  onExportSlices: () => Promise<'no-slices' | 'no-audio' | 'success' | 'error'>;
  onExportFormatChange: (format: ExportFormat) => void;
  onSetExportAnchorEl: (element: HTMLElement | null) => void;
  onSetFadeInAnchorEl: (element: HTMLElement | null) => void;
  onSetFadeOutAnchorEl: (element: HTMLElement | null) => void;
  onSetCrossfadeAnchorEl: (element: HTMLElement | null) => void;
  onNormalize: () => void;
  onCropRegion: () => void;
  onApplyCrop: () => void;
  onFadeInRegion: () => void;
  onFadeOutRegion: () => void;
  onApplyFades: () => void;
  onCrossfadeRegion: () => void;
  onApplyCrossfade: () => void;
  onSetCrossfadeCurveType: (curve: string) => void;
  onUndo: () => void;
  onSetFadeInCurveType: (curve: string) => void;
  onSetFadeOutCurveType: (curve: string) => void;
  onTempoAndPitch: () => void;
}

export const WaveformActionControls = ({
  // State props
  selectedExportFormat,
  exportAnchorEl,
  fadeInAnchorEl,
  fadeOutAnchorEl,
  crossfadeAnchorEl,
  cropMode,
  fadeInMode,
  fadeOutMode,
  fadeInCurveType,
  fadeOutCurveType,
  crossfadeMode,
  crossfadeCurveType,
  selectedSpliceMarker,
  canUndo,

  // Action props
  onExport,
  onExportSlices,
  onExportFormatChange,
  onSetExportAnchorEl,
  onSetFadeInAnchorEl,
  onSetFadeOutAnchorEl,
  onSetCrossfadeAnchorEl,
  onNormalize,
  onCropRegion,
  onApplyCrop,
  onFadeInRegion,
  onFadeOutRegion,
  onApplyFades,
  onCrossfadeRegion,
  onApplyCrossfade,
  onSetCrossfadeCurveType,
  onUndo,
  onSetFadeInCurveType,
  onSetFadeOutCurveType,
  onTempoAndPitch,
}: WaveformActionControlsProps) => {
  const [noSlicesSnackbarOpen, setNoSlicesSnackbarOpen] = useState(false);

  const handleExportFormatSelect = (format: ExportFormat) => {
    onExportFormatChange(format);
    onSetExportAnchorEl(null);
  };

  const handleExportSlicesClick = async () => {
    const result = await onExportSlices();
    if (result === 'no-slices') {
      setNoSlicesSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = () => {
    setNoSlicesSnackbarOpen(false);
  };

  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      sx={{
        mt: 1,
        width: '100%',
        flexDirection: { xs: 'column', lg: 'row' },
        gap: { xs: 2, lg: 2 },
      }}
    >
      {/* Left column - Export & Normalize (30% width) */}
      <Stack
        direction="column"
        spacing={1}
        sx={{
          width: { xs: '100%', lg: '50%' },
          alignItems: { xs: 'center', lg: 'flex-start' },
        }}
      >
        {/* Export button */}
        <ButtonGroup variant="outlined">
          <Tooltip
            title={`Export audio as ${selectedExportFormat.label}`}
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Button
              onClick={onExport}
              startIcon={<DownloadIcon />}
              sx={{ width: 160 }}
            >
              Save WAV
            </Button>
          </Tooltip>
          {/* Export Slices button */}
          <Tooltip
            title={`Export each slice as separate ${selectedExportFormat.label} file`}
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Button
              variant="outlined"
              onClick={handleExportSlicesClick}
              startIcon={<ContentCutIcon />}
              sx={{ width: 160 }}
            >
              Save Slices
            </Button>
          </Tooltip>
          {/* Export format selector */}
          <Tooltip
            title="Select export format"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Button
              size="small"
              onClick={(event) => onSetExportAnchorEl(event.currentTarget)}
              sx={{ fontSize: '0.6rem', px: 1 }}
            >
              {selectedExportFormat.shortLabel}
              <ArrowDropDownIcon />
            </Button>
          </Tooltip>
        </ButtonGroup>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            flexWrap: 'wrap',
            gap: { xs: 0.5, sm: 1 },
            justifyContent: { xs: 'center', lg: 'flex-end' },
          }}
        >
          {/* Normalize button */}
          <Tooltip
            title="Normalize audio to peak -1dB"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Button
              variant="outlined"
              onClick={onNormalize}
              startIcon={<NormalizeIcon />}
              sx={{ minWidth: 140 }}
            >
              Normalize
            </Button>
          </Tooltip>

          {/* Tempo and Pitch button */}
          <Tooltip
            title="Adjust tempo and pitch using RubberBand"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Button
              variant="outlined"
              onClick={onTempoAndPitch}
              startIcon={<SpeedIcon />}
              sx={{ minWidth: 140 }}
            >
              Tempo & Pitch
            </Button>
          </Tooltip>
        </Stack>
        {/* Export format menu */}
        <Menu
          anchorEl={exportAnchorEl}
          open={Boolean(exportAnchorEl)}
          onClose={() => onSetExportAnchorEl(null)}
          MenuListProps={{
            'aria-labelledby': 'export-split-button',
          }}
        >
          {EXPORT_FORMATS.map((format, index) => (
            <MenuItem
              key={index}
              selected={format === selectedExportFormat}
              onClick={() => handleExportFormatSelect(format)}
              sx={{ minWidth: 250 }}
            >
              <Typography variant="body2">
                <strong>{format.label}</strong>
                {format === selectedExportFormat && (
                  <Typography component="span" color="primary" sx={{ ml: 1 }}>
                    ✓
                  </Typography>
                )}
              </Typography>
            </MenuItem>
          ))}
        </Menu>
      </Stack>

      {/* Right column - Region controls (70% width) */}
      <Stack
        direction="column"
        spacing={1}
        sx={{
          width: { xs: '100%', lg: '70%' },
          alignItems: { xs: 'center', lg: 'flex-end' },
        }}
      >
        {/* Crop controls row */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            flexWrap: 'wrap',
            gap: { xs: 0.5, sm: 1 },
            justifyContent: { xs: 'center', lg: 'flex-end' },
          }}
        >
          <Tooltip
            title="Create crop/loop region"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Button
              variant={cropMode ? 'contained' : 'outlined'}
              color="primary"
              onClick={onCropRegion}
              startIcon={<CutIcon />}
            >
              Crop/Loop Region
            </Button>
          </Tooltip>
          {/* Crossfade button group - only show if splice marker is selected */}
          {/* {selectedSpliceMarker && ( */}
          <ButtonGroup variant="outlined" disabled={!selectedSpliceMarker}>
            <Tooltip
              title="Create a crossfade region centered on selected splice marker"
              enterDelay={TOOLTIP_DELAYS.ENTER}
              leaveDelay={TOOLTIP_DELAYS.LEAVE}
            >
              <Button
                variant={crossfadeMode ? 'contained' : 'outlined'}
                color="primary"
                onClick={onCrossfadeRegion}
                startIcon={<BlurOnIcon />}
              >
                Crossfade
              </Button>
            </Tooltip>
            <FadeCurveSelector
              selectedCurve={crossfadeCurveType}
              onCurveChange={onSetCrossfadeCurveType}
              fadeType="crossfade"
              anchorEl={crossfadeAnchorEl}
              onSetAnchorEl={onSetCrossfadeAnchorEl}
            />
          </ButtonGroup>
          {/* )} */}
        </Stack>

        {/* Fade controls row */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            flexWrap: 'wrap',
            gap: { xs: 0.5, sm: 1 },
            justifyContent: { xs: 'center', lg: 'flex-end' },
          }}
        >
          {/* Fade In button group */}
          <ButtonGroup variant="outlined">
            <Tooltip
              title="Create a fade-in region"
              enterDelay={TOOLTIP_DELAYS.ENTER}
              leaveDelay={TOOLTIP_DELAYS.LEAVE}
            >
              <Button
                variant={fadeInMode ? 'contained' : 'outlined'}
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
              onSetAnchorEl={onSetFadeInAnchorEl}
            />
          </ButtonGroup>
          {/* Fade Out button group */}
          <ButtonGroup variant="outlined">
            <Tooltip
              title="Create fade-out region"
              enterDelay={TOOLTIP_DELAYS.ENTER}
              leaveDelay={TOOLTIP_DELAYS.LEAVE}
            >
              <Button
                variant={fadeOutMode ? 'contained' : 'outlined'}
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
              onSetAnchorEl={onSetFadeOutAnchorEl}
            />
          </ButtonGroup>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            flexWrap: 'nowrap',
            gap: { xs: 0.5, sm: 1 },
            justifyContent: { xs: 'center', lg: 'flex-end' },
            overflowX: 'auto',
          }}
        >
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
                size="small"
              >
                Apply Crop
              </Button>
            </Box>
          </Tooltip>
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
                size="small"
              >
                Apply Fades
              </Button>
            </Box>
          </Tooltip>
          <Tooltip
            title="Apply crossfade region to current audio"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Box component="span">
              <Button
                variant="contained"
                color="success"
                onClick={onApplyCrossfade}
                disabled={!crossfadeMode}
                size="small"
              >
                Apply Crossfade
              </Button>
            </Box>
          </Tooltip>
          <Tooltip
            title="Undo last edit"
            enterDelay={TOOLTIP_DELAYS.ENTER}
            leaveDelay={TOOLTIP_DELAYS.LEAVE}
          >
            <Button
              variant="outlined"
              color="primary"
              onClick={onUndo}
              disabled={!canUndo}
              startIcon={<UndoIcon />}
              size="small"
            >
              Undo
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Snackbar for no slices notification */}
      <Snackbar
        open={noSlicesSnackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="info"
          sx={{ width: '100%' }}
        >
          No slices found in the audio. Add splice markers to create slices for
          export.
        </Alert>
      </Snackbar>
    </Stack>
  );
};

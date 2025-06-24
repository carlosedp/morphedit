// Separated action controls for the Waveform component

import {
  Stack,
  Button,
  ButtonGroup,
  Tooltip,
  Box,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CutIcon from '@mui/icons-material/ContentCut';
import UndoIcon from '@mui/icons-material/Undo';
import NormalizeIcon from '@mui/icons-material/TuneOutlined';

import { TOOLTIP_DELAYS, EXPORT_FORMATS } from '../constants';
import type { ExportFormat } from '../utils/exportUtils';
import { FadeCurveSelector } from './FadeCurveSelector';

interface WaveformActionControlsProps {
  // State props
  selectedExportFormat: ExportFormat;
  exportAnchorEl: HTMLElement | null;
  cropMode: boolean;
  fadeInMode: boolean;
  fadeOutMode: boolean;
  fadeInCurveType: string;
  fadeOutCurveType: string;
  canUndo: boolean;

  // Action props
  onExport: () => void;
  onExportFormatChange: (format: ExportFormat) => void;
  onSetExportAnchorEl: (element: HTMLElement | null) => void;
  onNormalize: () => void;
  onCropRegion: () => void;
  onApplyCrop: () => void;
  onFadeInRegion: () => void;
  onFadeOutRegion: () => void;
  onApplyFades: () => void;
  onUndo: () => void;
  onSetFadeInCurveType: (curve: string) => void;
  onSetFadeOutCurveType: (curve: string) => void;
}

export const WaveformActionControls = ({
  // State props
  selectedExportFormat,
  exportAnchorEl,
  cropMode,
  fadeInMode,
  fadeOutMode,
  fadeInCurveType,
  fadeOutCurveType,
  canUndo,

  // Action props
  onExport,
  onExportFormatChange,
  onSetExportAnchorEl,
  onNormalize,
  onCropRegion,
  onApplyCrop,
  onFadeInRegion,
  onFadeOutRegion,
  onApplyFades,
  onUndo,
  onSetFadeInCurveType,
  onSetFadeOutCurveType,
}: WaveformActionControlsProps) => {
  const handleExportFormatSelect = (format: ExportFormat) => {
    onExportFormatChange(format);
    onSetExportAnchorEl(null);
  };

  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      sx={{
        mt: 2,
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
          width: { xs: '100%', lg: '30%' },
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
              sx={{ minWidth: 140 }}
            >
              Export WAV
            </Button>
          </Tooltip>
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
          {fadeInMode ? (
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
                anchorEl={null}
                onSetAnchorEl={() => {}}
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
                anchorEl={null}
                onSetAnchorEl={() => {}}
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

        {/* Undo button row */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            justifyContent: { xs: 'center', lg: 'flex-end' },
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
    </Stack>
  );
};

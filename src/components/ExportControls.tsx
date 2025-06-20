// Export controls component
import React from "react";
import {
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  Stack,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import NormalizeIcon from "@mui/icons-material/TuneOutlined";
import { type ExportFormat } from "../utils/exportUtils";
import { EXPORT_FORMATS } from "../constants";
import { TOOLTIP_DELAYS } from "../constants";

interface ExportControlsProps {
  exportAnchorEl: HTMLElement | null;
  selectedExportFormat: ExportFormat;
  onExport: () => void;
  onExportFormatChange: (format: ExportFormat) => void;
  onSetExportAnchorEl: (element: HTMLElement | null) => void;
  onNormalize: () => void;
}

export const ExportControls: React.FC<ExportControlsProps> = ({
  exportAnchorEl,
  selectedExportFormat,
  onExport,
  onExportFormatChange,
  onSetExportAnchorEl,
  onNormalize,
}) => {
  const exportMenuOpen = Boolean(exportAnchorEl);

  const handleFormatSelect = (format: ExportFormat) => {
    onExportFormatChange(format);
    onSetExportAnchorEl(null);
  };

  return (
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
      <ButtonGroup variant="outlined" sx={{ ml: 2 }}>
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
            sx={{ fontSize: "0.6rem", px: 1 }}
          >
            {selectedExportFormat.shortLabel}
            <ArrowDropDownIcon />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <Menu
        anchorEl={exportAnchorEl}
        open={exportMenuOpen}
        onClose={() => onSetExportAnchorEl(null)}
        MenuListProps={{
          "aria-labelledby": "export-split-button",
        }}
      >
        {EXPORT_FORMATS.map((format, index) => (
          <MenuItem
            key={index}
            selected={format === selectedExportFormat}
            onClick={() => handleFormatSelect(format)}
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

      <Tooltip
        title="Normalize audio to peak -1dB"
        enterDelay={TOOLTIP_DELAYS.ENTER}
        leaveDelay={TOOLTIP_DELAYS.LEAVE}
      >
        <Button
          variant="outlined"
          onClick={onNormalize}
          startIcon={<NormalizeIcon />}
          sx={{ minWidth: 120 }}
        >
          Normalize
        </Button>
      </Tooltip>
    </Stack>
  );
};

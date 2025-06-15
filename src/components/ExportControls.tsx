// Export controls component
import React from "react";
import { Button, ButtonGroup, Menu, MenuItem, Tooltip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { exportFormats, type ExportFormat } from "../utils/exportUtils";
import { TOOLTIP_DELAYS } from "../constants";

interface ExportControlsProps {
  exportAnchorEl: HTMLElement | null;
  onExportWav: () => void;
  onExportWavFormat: (format: ExportFormat) => void;
  onSetExportAnchorEl: (element: HTMLElement | null) => void;
}

export const ExportControls: React.FC<ExportControlsProps> = ({
  exportAnchorEl,
  onExportWav,
  onExportWavFormat,
  onSetExportAnchorEl,
}) => {
  const exportMenuOpen = Boolean(exportAnchorEl);

  return (
    <>
      <ButtonGroup variant="outlined" sx={{ ml: 2 }}>
        <Tooltip
          title="Export audio for MakeNoise Morphagene (48Khz/32-bit Float Stereo)"
          enterDelay={TOOLTIP_DELAYS.ENTER}
          leaveDelay={TOOLTIP_DELAYS.LEAVE}
        >
          <Button onClick={onExportWav} startIcon={<DownloadIcon />}>
            Export WAV
          </Button>
        </Tooltip>
        <Tooltip
          title="Export audio for other formats"
          enterDelay={TOOLTIP_DELAYS.ENTER}
          leaveDelay={TOOLTIP_DELAYS.LEAVE}
        >
          <Button
            size="small"
            onClick={(event) => onSetExportAnchorEl(event.currentTarget)}
            sx={{ px: 1 }}
          >
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
        {exportFormats.map((format, index) => (
          <MenuItem
            key={index}
            onClick={() => onExportWavFormat(format)}
            sx={{ minWidth: 250 }}
          >
            {format.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

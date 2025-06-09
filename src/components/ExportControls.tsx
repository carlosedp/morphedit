// Export controls component
import React from "react";
import {
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { exportFormats, type ExportFormat } from "../utils/exportUtils";

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
      <Tooltip title="Export audio" enterDelay={500} leaveDelay={200}>
        <ButtonGroup variant="outlined" sx={{ ml: 2 }}>
          <Button
            onClick={onExportWav}
            startIcon={<DownloadIcon />}
          >
            Export WAV
          </Button>
          <Button
            size="small"
            onClick={(event) => onSetExportAnchorEl(event.currentTarget)}
            sx={{ px: 1 }}
          >
            <ArrowDropDownIcon />
          </Button>
        </ButtonGroup>
      </Tooltip>

      <Menu
        anchorEl={exportAnchorEl}
        open={exportMenuOpen}
        onClose={() => onSetExportAnchorEl(null)}
        MenuListProps={{
          'aria-labelledby': 'export-split-button',
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

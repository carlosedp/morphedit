import React, { useState, useRef } from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  CssBaseline,
  ThemeProvider,
  Stack,
  Tooltip,
} from "@mui/material";
import Waveform from "./Waveform";
import { useAudioStore } from "./audioStore";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import type { ShortcutAction } from "./keyboardShortcuts";
import "./App.css";
import { theme } from "./theme";

function App() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const reset = useAudioStore((state) => state.reset);
  const waveformRef = useRef<{
    handlePlayPause: () => void;
    handleCropRegion: () => void;
    handleLoop: () => void;
    handleZoom: (value: number) => void;
    getCurrentZoom: () => number;
    handleSkipForward: () => void;
    handleSkipBackward: () => void;
    handleIncreaseSkipIncrement: () => void;
    handleDecreaseSkipIncrement: () => void;
    handleFadeInRegion: () => void;
    handleFadeOutRegion: () => void;
    handleApplyCrop: () => void;
    handleApplyFades: () => void;
    handleUndo: () => void;
    handleExportWav: () => void;
    handleAddSpliceMarker: () => void;
    handleRemoveSpliceMarker: () => void;
    handleAutoSlice: () => void;
    handleHalfMarkers: () => void;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  const handleReset = () => {
    // Clear the audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    // Clear the audio store
    reset();
  };

  const handleShortcutAction = (action: ShortcutAction) => {
    switch (action) {
      case "playPause":
        waveformRef.current?.handlePlayPause();
        break;
      case "toggleCropRegion":
        waveformRef.current?.handleCropRegion();
        break;
      case "reset":
        handleReset();
        break;
      case "toggleLoop":
        waveformRef.current?.handleLoop();
        break;
      case "zoomIn":
        if (waveformRef.current) {
          const currentZoom = waveformRef.current.getCurrentZoom();
          waveformRef.current.handleZoom(Math.min(currentZoom + 20, 500));
        }
        break;
      case "zoomOut":
        if (waveformRef.current) {
          const currentZoom = waveformRef.current.getCurrentZoom();
          waveformRef.current.handleZoom(Math.max(currentZoom - 20, 0));
        }
        break;
      case "skipForward":
        waveformRef.current?.handleSkipForward();
        break;
      case "skipBackward":
        waveformRef.current?.handleSkipBackward();
        break;
      case "increaseSkipIncrement":
        waveformRef.current?.handleIncreaseSkipIncrement();
        break;
      case "decreaseSkipIncrement":
        waveformRef.current?.handleDecreaseSkipIncrement();
        break;
      case "toggleFadeInRegion":
        waveformRef.current?.handleFadeInRegion();
        break;
      case "toggleFadeOutRegion":
        waveformRef.current?.handleFadeOutRegion();
        break;
      case "undo":
        waveformRef.current?.handleUndo();
        break;
      case "addSpliceMarker":
        waveformRef.current?.handleAddSpliceMarker();
        break;
      case "removeSpliceMarker":
        waveformRef.current?.handleRemoveSpliceMarker();
        break;
      case "autoSlice":
        waveformRef.current?.handleAutoSlice();
        break;
      case "halfMarkers":
        waveformRef.current?.handleHalfMarkers();
        break;
    }
  };

  useKeyboardShortcuts({
    onAction: handleShortcutAction,
    enabled: true,
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h4">Morphedit Audio Editor</Typography>
          <KeyboardShortcutsHelp />
        </Box>
        <Box mb={2}>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" component="label">
              Open Audio File
              <input
                type="file"
                accept="audio/*"
                hidden
                onChange={handleFileChange}
              />
            </Button>
            <Tooltip title="Unload current audio and clear all data">
              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={!audioUrl}
              >
                Reset
              </Button>
            </Tooltip>
          </Stack>
        </Box>
        <Container
          id="waveform-container"
          sx={{ border: "1px solid #ccc", padding: 2, borderRadius: 1 }}
        ></Container>
        {audioUrl && <Waveform audioUrl={audioUrl} ref={waveformRef} />}
        <Box mt={4}>
          <Typography variant="body2" color="text.secondary">
            Beat detection and export features coming soon.
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;

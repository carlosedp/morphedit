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
import { FileLengthWarningDialog } from "./components/FileLengthWarningDialog";
import { LoadingDialog } from "./components/LoadingDialog";
import { getAudioFileDuration, isFileTooLong } from "./utils/fileLengthUtils";
import type { ShortcutAction } from "./keyboardShortcuts";
import "./App.css";
import { theme } from "./theme";

function App() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [lengthWarningOpen, setLengthWarningOpen] = useState(false);
  const [pendingDuration, setPendingDuration] = useState(0);
  const [shouldTruncateAudio, setShouldTruncateAudio] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const reset = useAudioStore((state) => state.reset);
  const waveformRef = useRef<{
    handlePlayPause: () => void;
    handleCropRegion: () => void;
    handleLoop: () => void;
    handleZoom: (value: number) => void;
    handleZoomReset: () => void;
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
    handleClearAllMarkers: () => void;
    handleTransientDetection: () => void;
    handleSnapToZeroCrossings: () => void;
    handleTruncateAudio: () => void;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadAudioFile(file);
    }
  };

  const loadAudioFile = async (file: File) => {
    if (file.type.startsWith("audio/")) {
      setIsLoading(true);
      setLoadingMessage("Analyzing audio file...");

      try {
        // First, check the file duration
        const duration = await getAudioFileDuration(file);

        if (isFileTooLong(duration)) {
          // File is too long, store it and show warning dialog
          setIsLoading(false);
          setPendingFile(file);
          handleLengthWarning(duration);
        } else {
          // File is acceptable length, load it directly
          setLoadingMessage("Loading audio file...");
          setShouldTruncateAudio(false);
          setAudioUrl(URL.createObjectURL(file));
          // Loading dialog will be closed when Waveform is ready
        }
      } catch (error) {
        console.error("Error getting audio file duration:", error);
        // If we can't get duration, just load the file anyway
        setLoadingMessage("Loading audio file...");
        setShouldTruncateAudio(false);
        setAudioUrl(URL.createObjectURL(file));
        // Loading dialog will be closed when Waveform is ready
      }
    }
  };

  const handleLengthWarning = (duration: number) => {
    setPendingDuration(duration);
    setLengthWarningOpen(true);
  };

  const handleTruncateFile = () => {
    setLengthWarningOpen(false);
    if (pendingFile) {
      // Show loading dialog for truncation
      setIsLoading(true);
      setLoadingMessage("Processing audio for truncation...");

      // Load the file with truncation enabled
      setShouldTruncateAudio(true);
      setAudioUrl(URL.createObjectURL(pendingFile));
      setPendingFile(null);
      // Loading dialog will be closed when Waveform is ready
    }
  };

  const handleImportFullFile = () => {
    setLengthWarningOpen(false);
    if (pendingFile) {
      // Show loading dialog for full file import
      setIsLoading(true);
      setLoadingMessage("Loading full audio file...");

      // Load the full file without truncation
      setShouldTruncateAudio(false);
      setAudioUrl(URL.createObjectURL(pendingFile));
      setPendingFile(null);
      // Loading dialog will be closed when Waveform is ready
    }
  };

  const handleCancelImport = () => {
    setLengthWarningOpen(false);
    // Clear the pending file
    setPendingFile(null);
    // If there was already an audio URL loaded, leave it as is
    // Otherwise just reset
    if (!audioUrl) {
      reset();
    }
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setLoadingMessage("");
  };

  const handleProcessingStart = (message: string) => {
    setIsLoading(true);
    setLoadingMessage(message);
  };

  const handleProcessingComplete = () => {
    setIsLoading(false);
    setLoadingMessage("");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!audioUrl && e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide overlay if we're leaving the main container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!audioUrl) {
      const files = Array.from(e.dataTransfer.files);
      const audioFile = files.find((file) => file.type.startsWith("audio/"));
      if (audioFile) {
        loadAudioFile(audioFile);
      }
    }
  };

  const handleWaveformClick = () => {
    if (!audioUrl) {
      // Trigger the file input when clicking on empty waveform
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      }
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
      case "clearAllMarkers":
        waveformRef.current?.handleClearAllMarkers();
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
      <Container
        maxWidth="lg"
        sx={{ py: 4, position: "relative" }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag and Drop Overlay */}
        {isDragOver && !audioUrl && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              borderRadius: 2,
              border: "2px dashed",
              borderColor: "primary.main",
            }}
          >
            <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold" }}>
              Drop Audio File Here
            </Typography>
            <Typography variant="body1" color="grey.300">
              Release to load the audio file
            </Typography>
          </Box>
        )}

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

        {/* Waveform container - always visible */}
        <Box
          id="waveform-container"
          onClick={handleWaveformClick}
          sx={{
            border: "1px solid",
            borderColor: "primary.main",
            borderRadius: 1,
            width: "100%",
            height: "200px",
            mb: 2,
            backgroundColor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.secondary",
            fontSize: "14px",
            cursor: !audioUrl ? "pointer" : "default",
            "&:hover": !audioUrl
              ? {
                  backgroundColor: "action.hover",
                  borderColor: "primary.light",
                }
              : {},
            transition: "background-color 0.2s, border-color 0.2s",
          }}
        >
          {!audioUrl &&
            "Click here, use the button above, or drag and drop an audio file to load it"}
        </Box>

        {audioUrl && (
          <Waveform
            audioUrl={audioUrl}
            shouldTruncate={shouldTruncateAudio}
            onLoadingComplete={handleLoadingComplete}
            onProcessingStart={handleProcessingStart}
            onProcessingComplete={handleProcessingComplete}
            ref={waveformRef}
          />
        )}
        <Box mt={4}>
          <Typography variant="body2" color="text.secondary">
            Beat detection features coming soon.
          </Typography>
        </Box>
      </Container>

      <FileLengthWarningDialog
        open={lengthWarningOpen}
        duration={pendingDuration}
        onTruncate={handleTruncateFile}
        onImportFull={handleImportFullFile}
        onCancel={handleCancelImport}
      />

      <LoadingDialog open={isLoading} message={loadingMessage} />
    </ThemeProvider>
  );
}

export default App;

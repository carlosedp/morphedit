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
import Waveform, { type WaveformRef } from "./Waveform";
import { useAudioStore } from "./audioStore";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import { FileLengthWarningDialog } from "./components/FileLengthWarningDialog";
import { LoadingDialog } from "./components/LoadingDialog";
import { MultipleFilesDialog } from "./components/MultipleFilesDialog";
import { FileReplaceDialog } from "./components/FileReplaceDialog";
import {
  getAudioFileDuration,
  isFileTooLong,
  MORPHAGENE_MAX_DURATION,
} from "./utils/fileLengthUtils";
import {
  concatenateAudioFiles,
  getMultipleAudioFilesDuration,
  filterAudioFiles,
  sortAudioFilesByName,
  audioBufferToWavBlob,
  appendAudioToExisting,
  type ConcatenationResult,
} from "./utils/audioConcatenation";
import type { ShortcutAction } from "./keyboardShortcuts";
import "./App.css";
import { version } from "./Version.ts";
import { theme } from "./theme";

function App() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [multipleFilesDialogOpen, setMultipleFilesDialogOpen] = useState(false);
  const [pendingMultipleFilesDuration, setPendingMultipleFilesDuration] =
    useState(0);
  const [lengthWarningOpen, setLengthWarningOpen] = useState(false);
  const [pendingDuration, setPendingDuration] = useState(0);
  const [shouldTruncateAudio, setShouldTruncateAudio] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [fileReplaceDialogOpen, setFileReplaceDialogOpen] = useState(false);
  const [pendingReplaceFiles, setPendingReplaceFiles] = useState<File[]>([]);
  const [shouldResetZoomAfterLoad, setShouldResetZoomAfterLoad] =
    useState(false);
  const [pendingAppendResult, setPendingAppendResult] =
    useState<ConcatenationResult | null>(null);

  // State for tracking append mode in length warning dialog
  const [isInAppendMode, setIsInAppendMode] = useState(false);
  const reset = useAudioStore((state) => state.reset);
  const waveformRef = useRef<WaveformRef>(null);

  // Function to open manual in a new window/tab
  const handleOpenManual = () => {
    window.open("./manual.html", "_blank");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleReset(); // Reset any existing audio before loading new files
      const audioFiles = filterAudioFiles(files);
      if (audioFiles.length > 1) {
        handleMultipleFiles(audioFiles);
      } else if (audioFiles.length === 1) {
        loadAudioFile(audioFiles[0]);
      }
    }
  };

  const handleAppendFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const audioFiles = filterAudioFiles(files);

      const audioBuffer = useAudioStore.getState().audioBuffer;
      const spliceMarkers = useAudioStore.getState().spliceMarkers;

      if (!audioBuffer) {
        console.error("No existing audio buffer to append to");
        return;
      }

      // Calculate the boundary position before concatenation

      setIsLoading(true);
      setLoadingMessage("Appending audio files...");

      try {
        const result = await appendAudioToExisting(
          audioBuffer,
          spliceMarkers,
          audioFiles,
          false, // Don't truncate by default
        );

        // Check if the concatenated audio exceeds 174 seconds
        const totalDuration =
          result.concatenatedBuffer.length /
          result.concatenatedBuffer.sampleRate;

        if (totalDuration > MORPHAGENE_MAX_DURATION) {
          // Store the result for potential truncation
          setPendingAppendResult(result);
          setIsInAppendMode(true);
          setIsLoading(false);
          setLengthWarningOpen(true);
        } else {
          // Proceed with the concatenated audio
          await finishAppendProcess(result);
        }
      } catch (error) {
        console.error("Error appending audio:", error);
        setIsLoading(false);
        setLoadingMessage("");
      }
    }
  };

  const handleMultipleFiles = async (files: File[]) => {
    setIsLoading(true);
    setLoadingMessage("Analyzing multiple audio files...");

    try {
      // Sort files alphabetically for consistent order
      const sortedFiles = sortAudioFilesByName(files);

      // Calculate total duration
      const totalDuration = await getMultipleAudioFilesDuration(sortedFiles);

      setIsLoading(false);
      setPendingFiles(sortedFiles);
      setPendingMultipleFilesDuration(totalDuration);
      setMultipleFilesDialogOpen(true);
    } catch (error) {
      console.error("Error analyzing multiple audio files:", error);
      setIsLoading(false);
      // Fallback: just load the first file
      loadAudioFile(files[0]);
    }
  };

  const handleConcatenateFiles = async (shouldTruncate: boolean = false) => {
    setMultipleFilesDialogOpen(false);

    if (pendingFiles.length === 0) return;

    setIsLoading(true);
    setLoadingMessage("Concatenating audio files...");

    try {
      const result = await concatenateAudioFiles(
        pendingFiles,
        shouldTruncate,
        shouldTruncate ? MORPHAGENE_MAX_DURATION : undefined,
      );

      // Convert AudioBuffer to WAV blob with cue points
      const wavBlob = await audioBufferToWavBlob(
        result.concatenatedBuffer,
        result.spliceMarkerPositions,
      );
      const url = URL.createObjectURL(wavBlob) + "#morphedit-concatenated";

      setShouldTruncateAudio(false);
      setAudioUrl(url);

      // Store splice marker positions in the audio store
      const { setSpliceMarkers, setLockedSpliceMarkers } = useAudioStore.getState();
      setSpliceMarkers(result.spliceMarkerPositions);

      // Lock the boundary markers (markers at the beginning of each file)
      setLockedSpliceMarkers(result.boundaryMarkerPositions);

      console.log(
        `Concatenated ${pendingFiles.length} files with ${result.spliceMarkerPositions.length} splice markers`,
      );
      console.log(`Locked ${result.boundaryMarkerPositions.length} boundary markers:`, result.boundaryMarkerPositions);

      setPendingFiles([]);
      setPendingMultipleFilesDuration(0);
      // Loading dialog will be closed when Waveform is ready
    } catch (error) {
      console.error("Error concatenating audio files:", error);
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleCancelMultipleFiles = () => {
    setMultipleFilesDialogOpen(false);
    setPendingFiles([]);
    setPendingMultipleFilesDuration(0);
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

    // Check if we're in append mode
    if (isInAppendMode) {
      handleAppendTruncation();
      return;
    }

    // Original truncate logic for regular file loading
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

    // Check if we're in append mode
    if (isInAppendMode) {
      handleAppendWithoutTruncation();
      return;
    }

    // Original import logic for regular file loading
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

  // Append-specific handlers for length warning dialog
  const handleAppendTruncation = async () => {
    if (!pendingAppendResult) return;

    setIsLoading(true);
    setLoadingMessage("Appending and truncating audio...");

    try {
      const audioBuffer = useAudioStore.getState().audioBuffer;
      const spliceMarkers = useAudioStore.getState().spliceMarkers;

      if (!audioBuffer) {
        throw new Error("No existing audio buffer to append to");
      }

      // Re-run append with truncation enabled
      const truncatedResult = await appendAudioToExisting(
        audioBuffer,
        spliceMarkers,
        pendingReplaceFiles,
        true, // Enable truncation
        MORPHAGENE_MAX_DURATION,
      );

      await finishAppendProcess(truncatedResult);
    } catch (error) {
      console.error("Error appending and truncating audio:", error);
      setIsLoading(false);
      setLoadingMessage("");
      setPendingReplaceFiles([]);
    } finally {
      // Reset append mode state
      setIsInAppendMode(false);
      setPendingAppendResult(null);
    }
  };

  const handleAppendWithoutTruncation = async () => {
    if (!pendingAppendResult) return;

    setIsLoading(true);
    setLoadingMessage("Finishing append process...");

    try {
      await finishAppendProcess(pendingAppendResult);
    } catch (error) {
      console.error("Error finishing append process:", error);
      setIsLoading(false);
      setLoadingMessage("");
      setPendingReplaceFiles([]);
    } finally {
      // Reset append mode state
      setIsInAppendMode(false);
      setPendingAppendResult(null);
    }
  };

  const handleCancelImport = () => {
    setLengthWarningOpen(false);

    // Check if we're in append mode
    if (isInAppendMode) {
      // Reset append mode state
      setIsInAppendMode(false);
      setPendingAppendResult(null);
      setPendingReplaceFiles([]);
      return;
    }

    // Original cancel logic for regular file loading
    // Clear the pending file
    setPendingFile(null);
    // If there was already an audio URL loaded, leave it as is
    // Otherwise just reset
    if (!audioUrl) {
      reset();
    }
  };

  const handleReplaceAudio = () => {
    setFileReplaceDialogOpen(false);
    if (pendingReplaceFiles.length > 0) {
      // Reset interface first
      handleReset();

      // Load new audio files
      if (pendingReplaceFiles.length > 1) {
        handleMultipleFiles(pendingReplaceFiles);
      } else {
        loadAudioFile(pendingReplaceFiles[0]);
      }

      setPendingReplaceFiles([]);
    }
  };

  const handleAppendAudio = async () => {
    setFileReplaceDialogOpen(false);

    if (pendingReplaceFiles.length === 0) return;

    const audioBuffer = useAudioStore.getState().audioBuffer;
    const spliceMarkers = useAudioStore.getState().spliceMarkers;

    if (!audioBuffer) {
      console.error("No existing audio buffer to append to");
      setPendingReplaceFiles([]);
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Appending audio files...");

    try {
      const result = await appendAudioToExisting(
        audioBuffer,
        spliceMarkers,
        pendingReplaceFiles,
        false, // Don't truncate by default
      );

      // Check if the concatenated audio exceeds 174 seconds
      const totalDuration = result.totalDuration;

      if (totalDuration > MORPHAGENE_MAX_DURATION) {
        console.log(
          `Concatenated audio duration (${totalDuration}s) exceeds Morphagene limit (${MORPHAGENE_MAX_DURATION}s)`,
        );

        // Stop loading and show truncate dialog in append mode
        setIsLoading(false);
        setLoadingMessage("");

        // Store the result and enter append mode
        setPendingAppendResult(result);
        setIsInAppendMode(true);
        setPendingDuration(totalDuration);
        setLengthWarningOpen(true);

        return; // Exit early to show dialog
      }

      // If duration is acceptable, proceed normally
      await finishAppendProcess(result);
    } catch (error) {
      console.error("Error appending audio files:", error);
      setIsLoading(false);
      setLoadingMessage("");
      setPendingReplaceFiles([]);
    }
  };

  // Helper function to finish the append process
  const finishAppendProcess = async (
    result: ConcatenationResult,
  ) => {
    // Convert AudioBuffer to WAV blob with all cue points
    const wavBlob = await audioBufferToWavBlob(
      result.concatenatedBuffer,
      result.spliceMarkerPositions,
    );
    const url = URL.createObjectURL(wavBlob) + "#morphedit-appended";

    // Save current state for undo
    const { setPreviousAudioUrl, setCanUndo } = useAudioStore.getState();
    if (audioUrl) {
      setPreviousAudioUrl(audioUrl);
      setCanUndo(true);
    }

    // Update audio URL and splice markers
    setAudioUrl(url);
    const { setSpliceMarkers, setLockedSpliceMarkers, setAudioBuffer } =
      useAudioStore.getState();
    setSpliceMarkers(result.spliceMarkerPositions);

    // CRITICAL: Update the audio buffer in the store with the concatenated buffer
    // This ensures exports include the appended audio
    setAudioBuffer(result.concatenatedBuffer);
    console.log("Updated audio buffer in store with concatenated buffer");

    // Add the boundary markers as locked (including the start of the appended audio)
    const currentLockedSpliceMarkers =
      useAudioStore.getState().lockedSpliceMarkers;

    // Combine existing locked markers with new boundary markers
    const allLockedMarkers = [...currentLockedSpliceMarkers, ...result.boundaryMarkerPositions];
    const uniqueLockedMarkers = Array.from(new Set(allLockedMarkers)).sort((a, b) => a - b);

    setLockedSpliceMarkers(uniqueLockedMarkers);
    console.log(
      `Added ${result.boundaryMarkerPositions.length} boundary markers as locked. Total locked markers: ${uniqueLockedMarkers.length}`,
    );
    console.log("New boundary markers:", result.boundaryMarkerPositions);

    console.log(
      `Appended ${pendingReplaceFiles.length} files with ${result.spliceMarkerPositions.length} splice markers`,
    );

    setPendingReplaceFiles([]);

    // Set flag to reset zoom after loading completes
    setShouldResetZoomAfterLoad(true);

    // Loading dialog will be closed when Waveform is ready
  };

  const handleCancelReplace = () => {
    setFileReplaceDialogOpen(false);
    setPendingReplaceFiles([]);
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setLoadingMessage("");

    // Reset zoom to show the entire waveform after append operations
    if (shouldResetZoomAfterLoad && waveformRef.current?.handleZoomReset) {
      console.log("Auto-resetting zoom after append operation");

      // Add a small delay to ensure the waveform is fully loaded
      setTimeout(() => {
        waveformRef.current?.handleZoomReset();
        setShouldResetZoomAfterLoad(false);
      }, 100);
    }
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
    if (e.dataTransfer.types.includes("Files")) {
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

    const files = Array.from(e.dataTransfer.files);
    const audioFiles = filterAudioFiles(files);

    if (audioFiles.length === 0) return;

    if (!audioUrl) {
      // No audio loaded, proceed with normal loading
      if (audioFiles.length > 1) {
        handleMultipleFiles(audioFiles);
      } else {
        loadAudioFile(audioFiles[0]);
      }
    } else {
      // Audio already loaded, show replace dialog
      setPendingReplaceFiles(audioFiles);
      setFileReplaceDialogOpen(true);
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
      case "toggleMarkerLock":
        waveformRef.current?.handleToggleMarkerLock();
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
      case "playSplice1":
        waveformRef.current?.handlePlaySplice1();
        break;
      case "playSplice2":
        waveformRef.current?.handlePlaySplice2();
        break;
      case "playSplice3":
        waveformRef.current?.handlePlaySplice3();
        break;
      case "playSplice4":
        waveformRef.current?.handlePlaySplice4();
        break;
      case "playSplice5":
        waveformRef.current?.handlePlaySplice5();
        break;
      case "playSplice6":
        waveformRef.current?.handlePlaySplice6();
        break;
      case "playSplice7":
        waveformRef.current?.handlePlaySplice7();
        break;
      case "playSplice8":
        waveformRef.current?.handlePlaySplice8();
        break;
      case "playSplice9":
        waveformRef.current?.handlePlaySplice9();
        break;
      case "playSplice10":
        waveformRef.current?.handlePlaySplice10();
        break;
      case "playSplice11":
        waveformRef.current?.handlePlaySplice11();
        break;
      case "playSplice12":
        waveformRef.current?.handlePlaySplice12();
        break;
      case "playSplice13":
        waveformRef.current?.handlePlaySplice13();
        break;
      case "playSplice14":
        waveformRef.current?.handlePlaySplice14();
        break;
      case "playSplice15":
        waveformRef.current?.handlePlaySplice15();
        break;
      case "playSplice16":
        waveformRef.current?.handlePlaySplice16();
        break;
      case "playSplice17":
        waveformRef.current?.handlePlaySplice17();
        break;
      case "playSplice18":
        waveformRef.current?.handlePlaySplice18();
        break;
      case "playSplice19":
        waveformRef.current?.handlePlaySplice19();
        break;
      case "playSplice20":
        waveformRef.current?.handlePlaySplice20();
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
        {isDragOver && (
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
              Drop Audio File(s) Here
            </Typography>
            <Typography variant="body1" color="grey.300">
              {!audioUrl
                ? "Drop single or multiple files to load/concatenate"
                : "Replace current audio or append to existing audio"}
            </Typography>
          </Box>
        )}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <img
              src="/MorphEdit-Logo-Small.png"
              alt="MorphEdit Logo"
              style={{ height: "96px", width: "auto", borderRadius: "20px" }}
            />
            <Typography variant="h4">Morphedit Audio Editor</Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              color="primary"
              onClick={handleOpenManual}
            >
              User Manual
            </Button>
            <KeyboardShortcutsHelp />
          </Stack>
        </Box>
        <Box mb={2}>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" component="label">
              Open Audio File(s)
              <input
                type="file"
                accept="audio/*"
                multiple
                hidden
                onChange={handleFileChange}
              />
            </Button>
            <Button
              variant="outlined"
              component="label"
              disabled={!audioUrl}
              sx={{ opacity: !audioUrl ? 0.5 : 1 }}
            >
              Append Audio
              <input
                type="file"
                accept="audio/*"
                multiple
                hidden
                onChange={handleAppendFileChange}
              />
            </Button>
            <Tooltip title="Unload current audio and clear all data">
              <Box component="span">
                <Button
                  variant="outlined"
                  onClick={handleReset}
                  disabled={!audioUrl}
                >
                  Reset
                </Button>
              </Box>
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
            "Click here, use the button above, or drag and drop audio file(s) to load/concatenate them"}
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
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              textAlign: "center",
              opacity: 0.7,
              "& a": {
                color: "text.secondary",
                textDecoration: "underline",
              },
            }}
          >
            Version {version} - Built with React and MUI
            <br />© 2025 - Carlos Eduardo de Paula -{" "}
            <a
              href="https://github.com/carlosedp/morphedit"
              target="_blank"
              rel="noopener noreferrer"
            >
              Fork me on GitHub
            </a>
          </Typography>
        </Box>{" "}
        <Box mt={4}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              textAlign: "center",
              opacity: 0.7,
              "& a": {
                color: "text.secondary",
                textDecoration: "underline",
              },
            }}
          ></Typography>
        </Box>
      </Container>

      <FileLengthWarningDialog
        open={lengthWarningOpen}
        duration={pendingDuration}
        onTruncate={handleTruncateFile}
        onImportFull={handleImportFullFile}
        onCancel={handleCancelImport}
      />

      <MultipleFilesDialog
        open={multipleFilesDialogOpen}
        files={pendingFiles}
        totalDuration={pendingMultipleFilesDuration}
        onConcatenate={() => handleConcatenateFiles(false)}
        onTruncateAndConcatenate={() => handleConcatenateFiles(true)}
        onCancel={handleCancelMultipleFiles}
      />

      <FileReplaceDialog
        open={fileReplaceDialogOpen}
        fileName={
          pendingReplaceFiles.length > 0 ? pendingReplaceFiles[0].name : ""
        }
        isMultipleFiles={pendingReplaceFiles.length > 1}
        fileCount={pendingReplaceFiles.length}
        onReplace={handleReplaceAudio}
        onAppend={handleAppendAudio}
        onCancel={handleCancelReplace}
      />

      <LoadingDialog open={isLoading} message={loadingMessage} />
    </ThemeProvider>
  );
}

export default App;

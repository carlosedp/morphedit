// filepath: /home/carlosedp/repos/morphedit/src/Waveform.tsx
// Refactored Waveform component with separated utilities

import {
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useState,
  useMemo,
} from "react";
import { useTheme } from "@mui/material/styles";

import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";
import Hover from "wavesurfer.js/dist/plugins/hover.esm.js";

import { useAudioStore } from "./audioStore";
import type { AudioState } from "./audioStore";
import "./App.css";
import { Container, Stack } from "@mui/material";

// Import separated utilities and components
import { parseWavCuePoints } from "./utils/audioProcessing";
import { truncateAudioBuffer, MORPHAGENE_MAX_DURATION } from "./utils/fileLengthUtils";
import { audioBufferToWavFormat, downloadWav, exportFormats, type ExportFormat } from "./utils/exportUtils";
import {
  addSpliceMarker,
  removeSpliceMarker,
  autoSlice,
  halfMarkers,
  updateSpliceMarkerColors,
  loadExistingCuePoints
} from "./utils/spliceMarkerUtils";
import {
  createCropRegion,
  createFadeInRegion,
  createFadeOutRegion,
  applyCrop,
  applyFades,
  getRegionInfo
} from "./utils/regionUtils";
import {
  playPause,
  rewind,
  zoom,
  skipForward,
  skipBackward,
  increaseSkipIncrement,
  decreaseSkipIncrement,
  undo
} from "./utils/playbackUtils";
import { useWaveformState, useWaveformRefs } from "./hooks/useWaveformState";
import { WaveformControls } from "./components/WaveformControls";
import { ExportControls } from "./components/ExportControls";
import { RegionControls } from "./components/RegionControls";
import { SpliceMarkerControls } from "./components/SpliceMarkerControls";

interface WaveformProps {
  audioUrl: string;
  shouldTruncate?: boolean;
}

export interface WaveformRef {
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
}

const Waveform = forwardRef<WaveformRef, WaveformProps>(({ audioUrl, shouldTruncate = false }, ref) => {
  const theme = useTheme();

  // Use custom hooks for state and refs management
  const [state, actions] = useWaveformState(audioUrl);
  const { wavesurferRef, regionsRef, isLoopingRef, cropRegionRef } = useWaveformRefs();

  // State to trigger region info updates when regions change
  const [regionUpdateTrigger, setRegionUpdateTrigger] = useState(0);

  // Extract stable action functions
  const { setCurrentTime } = actions;

  // Audio store hooks
  const setAudioBuffer = useAudioStore((s: AudioState) => s.setAudioBuffer);
  const setMarkers = useAudioStore((s: AudioState) => s.setMarkers);
  const setRegions = useAudioStore((s: AudioState) => s.setRegions);
  const setSpliceMarkersStore = useAudioStore((s: AudioState) => s.setSpliceMarkers);
  const spliceMarkersStore = useAudioStore((s: AudioState) => s.spliceMarkers);
  const setPreviousAudioUrl = useAudioStore((s: AudioState) => s.setPreviousAudioUrl);
  const setCanUndo = useAudioStore((s: AudioState) => s.setCanUndo);
  const previousAudioUrl = useAudioStore((s: AudioState) => s.previousAudioUrl);
  const canUndo = useAudioStore((s: AudioState) => s.canUndo);

  // Sync currentAudioUrl with audioUrl prop
  useEffect(() => {
    actions.setCurrentAudioUrl(audioUrl);
  }, [audioUrl, actions]);

  // Keep refs in sync with state
  useEffect(() => {
    isLoopingRef.current = state.isLooping;
  }, [state.isLooping, isLoopingRef]);

  useEffect(() => {
    cropRegionRef.current = state.cropRegion;
  }, [state.cropRegion, cropRegionRef]);

  // Update current time periodically when playing
  useEffect(() => {
    let interval: number;

    if (state.isPlaying && wavesurferRef.current) {
      interval = setInterval(() => {
        if (wavesurferRef.current) {
          setCurrentTime(wavesurferRef.current.getCurrentTime());
        }
      }, 100); // Update every 100ms
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isPlaying, setCurrentTime]);

  // Memoized update splice marker colors function
  const memoizedUpdateSpliceMarkerColors = useCallback((selectedMarker: Region | null) => {
    updateSpliceMarkerColors(regionsRef.current!, selectedMarker, theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Main wavesurfer initialization effect
  useEffect(() => {
    if (!audioUrl) {
      // If no audioUrl, clean up the wavesurfer instance
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch {
          // Ignore DOMException: The operation was aborted
        }
        wavesurferRef.current = null;
        regionsRef.current = null;
      }
      // Reset component state
      actions.setIsPlaying(false);
      actions.setIsLooping(false);
      actions.setCropMode(false);
      actions.setCropRegion(null);
      actions.setFadeInMode(false);
      actions.setFadeOutMode(false);
      actions.setZoom(0);
      actions.setCurrentTime(0);
      actions.setDuration(0);
      actions.setCurrentAudioUrl(null);
      return;
    }

    // Create regions plugin instance
    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    // Create wavesurfer instance
    const ws = WaveSurfer.create({
      container: "#waveform-container",
      waveColor: theme.palette.primary.main,
      progressColor: "white",
      cursorColor: theme.palette.primary.main,
      cursorWidth: 2,
      minPxPerSec: 20, // Ensure waveform fills container initially
      plugins: [
        regions,
        TimelinePlugin.create({}),
        Hover.create({
          lineColor: theme.palette.secondary.main,
          lineWidth: 1,
          labelBackground: "#555",
          labelColor: "#fff",
          labelSize: "11px",
          formatTimeCallback: (seconds: number) => {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            const millis = Math.floor((seconds % 1) * 1000);
            return `${minutes}:${secs < 10 ? "0" : ""}${secs}.${millis}`;
          },
        }),
      ],
    });

    wavesurferRef.current = ws;

    // Set up event listeners
    ws.on("ready", async () => {
      actions.setDuration(ws.getDuration());

      // Apply zoom - either current zoom or calculate initial zoom to fill container
      let zoomToApply = state.zoom;
      if (state.zoom === 0) {
        // Get container width with multiple fallbacks
        const container = document.getElementById("waveform-container");
        let containerWidth = 800; // Default fallback

        if (container) {
          const rect = container.getBoundingClientRect();
          containerWidth = rect.width > 0 ? rect.width : container.clientWidth || 800;
        }

        // Calculate appropriate zoom to fill the container
        const duration = ws.getDuration();
        const minPxPerSec = containerWidth / duration;
        // Allow very low zoom values for long audio files, but ensure minimum usability
        zoomToApply = Math.min(1000, Math.max(1, minPxPerSec));
        actions.setZoom(zoomToApply);

        console.log("Initial zoom calculated:", { duration, containerWidth, zoomToApply });
      } else {
        console.log("Applying existing zoom:", zoomToApply);
      }
      // Always apply the zoom to ensure waveform displays correctly
      ws.zoom(zoomToApply);

      // Parse WAV file for existing cue points and load them as splice markers
      const urlToLoad = state.currentAudioUrl || audioUrl;
      try {
        const existingCuePoints = await parseWavCuePoints(urlToLoad);
        loadExistingCuePoints(regions, existingCuePoints, setSpliceMarkersStore);
      } catch (error) {
        console.error("Error loading cue points:", error);
      }

      // Update audio buffer in store - but only if not already correctly set
      const currentStoredBuffer = useAudioStore.getState().audioBuffer;
      const wsDuration = ws.getDuration();

      // Check if we already have a buffer with the correct duration (within 0.01s tolerance)
      const bufferAlreadyCorrect = currentStoredBuffer &&
        Math.abs((currentStoredBuffer.length / currentStoredBuffer.sampleRate) - wsDuration) < 0.01;

      if (bufferAlreadyCorrect) {
        console.log("Ready event - audio buffer already correctly set in store, skipping update");
        return;
      }

      const backend = (ws as unknown as { backend?: { buffer?: AudioBuffer } }).backend;

      console.log("Ready event - checking for backend buffer:", !!(backend && backend.buffer));
      console.log("Ready event - audio duration:", wsDuration);

      if (backend && backend.buffer) {
        console.log("Setting audio buffer from backend - duration:", backend.buffer.length / backend.buffer.sampleRate, "seconds");
        setAudioBuffer(backend.buffer);
      } else {
        console.log("No backend buffer available, attempting manual decode");
        // Fallback: load and decode the current audio file manually
        const urlToLoad = state.currentAudioUrl || audioUrl;
        if (urlToLoad) {
          fetch(urlToLoad)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
              const audioContext = new (window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
              return audioContext.decodeAudioData(arrayBuffer);
            })
            .then(decodedBuffer => {
              console.log("Audio buffer decoded successfully - duration:", decodedBuffer.length / decodedBuffer.sampleRate, "seconds");
              setAudioBuffer(decodedBuffer);
            })
            .catch(error => {
              console.error("Error decoding audio:", error);
            });
        } else {
          console.log("No URL available for manual decode");
        }
      }
    });

    ws.on("play", () => actions.setIsPlaying(true));
    ws.on("pause", () => actions.setIsPlaying(false));
    ws.on("finish", () => {
      console.log("Playback finished");
      actions.setIsPlaying(false);
      // Handle whole-audio looping (when no crop region exists)
      if (isLoopingRef.current && !cropRegionRef.current) {
        ws.seekTo(0);
        ws.play();
      }
    });

    // Update current time during playback
    ws.on("timeupdate", (time: number) => {
      actions.setCurrentTime(time);
    });

    // Update current time when interacting with the waveform
    ws.on("interaction", () => {
      actions.setCurrentTime(ws.getCurrentTime());
    });

    // Update current time when clicking on the waveform
    ws.on("click", () => {
      actions.setCurrentTime(ws.getCurrentTime());
    });

    // Load audio - preprocess for truncation if needed
    const loadAudio = async () => {
      let urlToLoad = audioUrl;
      
      console.log("=== loadAudio called ===");
      console.log("shouldTruncate:", shouldTruncate);
      console.log("Original audioUrl:", audioUrl);
      console.log("state.currentAudioUrl:", state.currentAudioUrl);
      
      // Check if we already have a truncated URL for this audio file to prevent loops
      const currentUrl = state.currentAudioUrl;
      const isAlreadyTruncated = currentUrl && currentUrl.startsWith('blob:') && currentUrl !== audioUrl;
      
      if (shouldTruncate && !isAlreadyTruncated) {
        console.log("🔄 Preprocessing audio for truncation before loading...");
        try {
          // Fetch and decode the original audio to check if truncation is needed
          const response = await fetch(audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          
          const audioContext = new (window.AudioContext || 
            (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
          
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const originalDuration = audioBuffer.length / audioBuffer.sampleRate;
          
          console.log("Original audio duration:", originalDuration, "seconds");
          
          if (originalDuration > MORPHAGENE_MAX_DURATION) {
            console.log("✂️ Audio exceeds max duration, creating truncated version");
            
            // Truncate the buffer
            const truncatedBuffer = truncateAudioBuffer(audioBuffer, MORPHAGENE_MAX_DURATION);
            const truncatedDuration = truncatedBuffer.length / truncatedBuffer.sampleRate;
            console.log("Truncated duration:", truncatedDuration, "seconds");
            
            // Convert to WAV blob
            const { audioBufferToWavFormat } = await import('./utils/exportUtils');
            const { exportFormats } = await import('./utils/exportUtils');
            const defaultFormat = exportFormats[0];
            
            const wavArrayBuffer = audioBufferToWavFormat(truncatedBuffer, defaultFormat, []);
            const wavBlob = new Blob([wavArrayBuffer], { type: "audio/wav" });
            urlToLoad = URL.createObjectURL(wavBlob);
            
            console.log("Created truncated URL for loading:", urlToLoad);
            
            // Store the truncated buffer in the store immediately
            setAudioBuffer(truncatedBuffer);
            
            // Update current audio URL
            actions.setCurrentAudioUrl(urlToLoad);
          } else {
            console.log("✅ Audio is within limits, no truncation needed");
          }
        } catch (error) {
          console.error("❌ Error preprocessing audio for truncation:", error);
          // If preprocessing fails, use original URL
        }
      } else if (isAlreadyTruncated) {
        console.log("🔄 Using already truncated URL:", currentUrl);
        urlToLoad = currentUrl;
      }
      
      console.log("Loading URL into WaveSurfer:", urlToLoad);
      ws.load(urlToLoad);
    };
    
    loadAudio();

    // Set up region event listeners
    regions.on("region-out", (region: Region) => {
      // When a region finishes playing, loop it if looping is enabled
      if (region.id === "crop-loop" && isLoopingRef.current) {
        region.play();
      } else if (region.id === "crop-loop") {
        ws.pause();
      }
    });

    const updateRegionsAndMarkers = () => {
      // @ts-expect-error: regions is not typed in wavesurfer.js yet
      const regionList: Region[] = Object.values(ws.regions?.list ?? {});
      setRegions(
        regionList
          .filter((r) => r.end > r.start)
          .map((r) => ({ start: r.start, end: r.end })),
      );
      setMarkers(
        regionList.filter((r) => r.end === r.start).map((r) => r.start),
      );
      // Trigger region info update for WaveformControls
      setRegionUpdateTrigger(prev => prev + 1);
    };

    // @ts-expect-error: event types are not complete in wavesurfer.js
    ws.on("region-updated", updateRegionsAndMarkers);
    // @ts-expect-error: event types are not complete in wavesurfer.js
    ws.on("region-created", updateRegionsAndMarkers);
    // @ts-expect-error: event types are not complete in wavesurfer.js
    ws.on("region-removed", updateRegionsAndMarkers);

    // Listen to region plugin events for real-time updates during dragging/resizing
    regions.on("region-updated", updateRegionsAndMarkers);
    regions.on("region-created", updateRegionsAndMarkers);
    regions.on("region-removed", updateRegionsAndMarkers);

    // Handle splice marker selection
    regions.on("region-clicked", (region: Region) => {
      console.log("Region clicked:", region.id, "starts with splice-marker:", region.id.startsWith("splice-marker-"));
      if (region.id.startsWith("splice-marker-")) {
        console.log("Splice marker selected:", region.id);
        actions.setSelectedSpliceMarker(region);
        memoizedUpdateSpliceMarkerColors(region);

        // Store current position to restore it after the region click
        const currentPosition = ws.getCurrentTime();

        // Use a timeout to restore the position after the region click processing
        setTimeout(() => {
          if (wavesurferRef.current) {
            const duration = wavesurferRef.current.getDuration();
            if (duration > 0) {
              wavesurferRef.current.seekTo(currentPosition / duration);
            }
          }
        }, 0);
      } else {
        console.log("Non-splice marker clicked, clearing selection");
        actions.setSelectedSpliceMarker(null);
        memoizedUpdateSpliceMarkerColors(null);
      }
    });

    return () => {
      // Only destroy if not already destroyed
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch {
          // Ignore DOMException: The operation was aborted
        }
        wavesurferRef.current = null;
        regionsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, setAudioBuffer, setMarkers, setRegions, theme, setSpliceMarkersStore, memoizedUpdateSpliceMarkerColors, actions, shouldTruncate]);

  // Handler functions using extracted utilities
  const handlePlayPause = useCallback(() => {
    playPause(wavesurferRef.current!, regionsRef.current!, state.isPlaying, state.cropRegion);
  }, [state.isPlaying, state.cropRegion, wavesurferRef, regionsRef]);

  const handleRewind = useCallback(() => {
    rewind(wavesurferRef.current!, regionsRef.current!, state.cropRegion);
  }, [state.cropRegion, wavesurferRef, regionsRef]);

  const handleZoom = useCallback((value: number) => {
    actions.setZoom(value);
    zoom(wavesurferRef.current!, value);
  }, [actions, wavesurferRef]);

  const handleZoomReset = useCallback(() => {
    if (!wavesurferRef.current) return;

    const duration = wavesurferRef.current.getDuration();
    if (duration <= 0) return;

    // Get container width with multiple fallbacks
    const container = document.getElementById("waveform-container");
    let containerWidth = 800; // Default fallback

    if (container) {
      const rect = container.getBoundingClientRect();
      containerWidth = rect.width > 0 ? rect.width : container.clientWidth || 800;
    }

    // Calculate appropriate zoom to fill the container
    const minPxPerSec = containerWidth / duration;
    // Allow very low zoom values for long audio files, but ensure minimum usability
    const resetZoom = Math.min(1000, Math.max(1, minPxPerSec));

    console.log("Zoom reset:", { duration, containerWidth, resetZoom });

    // Update state and apply zoom
    actions.setZoom(resetZoom);
    wavesurferRef.current.zoom(resetZoom);
  }, [actions, wavesurferRef]);

  const handleCropRegion = useCallback(() => {
    const region = createCropRegion(
      wavesurferRef.current!,
      regionsRef.current!,
      actions.setCropRegion,
      actions.setCropMode
    );
    if (region) {
      cropRegionRef.current = region;
    } else {
      cropRegionRef.current = null;
    }
  }, [actions, wavesurferRef, regionsRef, cropRegionRef]);

  const handleLoop = useCallback(() => {
    actions.setIsLooping((prev: boolean) => !prev);
  }, [actions]);

  const handleFadeInRegion = useCallback(() => {
    createFadeInRegion(wavesurferRef.current!, regionsRef.current!, actions.setFadeInMode);
  }, [actions, wavesurferRef, regionsRef]);

  const handleFadeOutRegion = useCallback(() => {
    createFadeOutRegion(wavesurferRef.current!, regionsRef.current!, actions.setFadeOutMode);
  }, [actions, wavesurferRef, regionsRef]);

  const handleAddSpliceMarker = useCallback(() => {
    addSpliceMarker(
      wavesurferRef.current!,
      regionsRef.current!,
      state.currentTime,
      spliceMarkersStore,
      setSpliceMarkersStore
    );
  }, [state.currentTime, spliceMarkersStore, setSpliceMarkersStore, wavesurferRef, regionsRef]);

  const handleRemoveSpliceMarker = useCallback(() => {
    removeSpliceMarker(
      wavesurferRef.current!,
      regionsRef.current!,
      state.selectedSpliceMarker,
      spliceMarkersStore,
      setSpliceMarkersStore,
      actions.setSelectedSpliceMarker,
      memoizedUpdateSpliceMarkerColors
    );
  }, [state.selectedSpliceMarker, spliceMarkersStore, setSpliceMarkersStore, actions, memoizedUpdateSpliceMarkerColors, wavesurferRef, regionsRef]);

  const handleAutoSlice = useCallback(() => {
    autoSlice(
      wavesurferRef.current!,
      regionsRef.current!,
      state.numberOfSlices,
      setSpliceMarkersStore,
      actions.setSelectedSpliceMarker,
      memoizedUpdateSpliceMarkerColors
    );
  }, [state.numberOfSlices, setSpliceMarkersStore, actions, memoizedUpdateSpliceMarkerColors, wavesurferRef, regionsRef]);

  const handleHalfMarkers = useCallback(() => {
    halfMarkers(
      regionsRef.current!,
      setSpliceMarkersStore,
      actions.setSelectedSpliceMarker,
      memoizedUpdateSpliceMarkerColors
    );
  }, [setSpliceMarkersStore, actions, memoizedUpdateSpliceMarkerColors, regionsRef]);

  const handleApplyCrop = useCallback(async () => {
    await applyCrop(
      wavesurferRef.current!,
      regionsRef.current!,
      state.cropRegion,
      state.currentAudioUrl,
      spliceMarkersStore,
      {
        setPreviousAudioUrl,
        setCanUndo,
        setAudioBuffer,
        setCropMode: actions.setCropMode,
        setCropRegion: actions.setCropRegion,
        setCurrentAudioUrl: actions.setCurrentAudioUrl,
        setFadeInMode: actions.setFadeInMode,
        setFadeOutMode: actions.setFadeOutMode,
        setZoom: actions.setZoom,
      }
    );
    cropRegionRef.current = null;
  }, [state.cropRegion, state.currentAudioUrl, spliceMarkersStore, setPreviousAudioUrl, setCanUndo, setAudioBuffer, actions, wavesurferRef, regionsRef, cropRegionRef]);

  const handleApplyFades = useCallback(async () => {
    await applyFades(
      wavesurferRef.current!,
      regionsRef.current!,
      state.fadeInMode,
      state.fadeOutMode,
      state.currentAudioUrl,
      spliceMarkersStore,
      {
        setPreviousAudioUrl,
        setCanUndo,
        setAudioBuffer,
        setFadeInMode: actions.setFadeInMode,
        setFadeOutMode: actions.setFadeOutMode,
        setCurrentAudioUrl: actions.setCurrentAudioUrl,
        setCropMode: actions.setCropMode,
        setCropRegion: actions.setCropRegion,
        setZoom: actions.setZoom,
      }
    );
  }, [state.fadeInMode, state.fadeOutMode, state.currentAudioUrl, spliceMarkersStore, setPreviousAudioUrl, setCanUndo, setAudioBuffer, actions, wavesurferRef, regionsRef]);

  const handleUndo = useCallback(async () => {
    await undo(
      wavesurferRef.current!,
      canUndo,
      previousAudioUrl,
      {
        setCurrentAudioUrl: actions.setCurrentAudioUrl,
        setPreviousAudioUrl,
        setCanUndo,
        setCropMode: actions.setCropMode,
        setCropRegion: actions.setCropRegion,
        setFadeInMode: actions.setFadeInMode,
        setFadeOutMode: actions.setFadeOutMode,
      }
    );
  }, [canUndo, previousAudioUrl, setPreviousAudioUrl, setCanUndo, actions, wavesurferRef]);

  const handleSkipForward = useCallback(() => {
    skipForward(wavesurferRef.current!, state.skipIncrement);
  }, [state.skipIncrement, wavesurferRef]);

  const handleSkipBackward = useCallback(() => {
    skipBackward(wavesurferRef.current!, state.skipIncrement);
  }, [state.skipIncrement, wavesurferRef]);

  const handleIncreaseSkipIncrement = useCallback(() => {
    const newIncrement = increaseSkipIncrement(state.skipIncrement);
    actions.setSkipIncrement(newIncrement);
  }, [state.skipIncrement, actions]);

  const handleDecreaseSkipIncrement = useCallback(() => {
    const newIncrement = decreaseSkipIncrement(state.skipIncrement);
    actions.setSkipIncrement(newIncrement);
  }, [state.skipIncrement, actions]);

  // Export handlers
  const handleExportWav = useCallback(() => {
    const audioBuffer = useAudioStore.getState().audioBuffer;
    if (!audioBuffer) {
      console.log("No audio buffer found");
      return;
    }

    console.log("Exporting WAV with splice markers as cue points:", spliceMarkersStore);

    // Use the default export format (48kHz 32-bit Float Stereo)
    const defaultFormat = exportFormats[0]; // 48kHz 32-bit Float Stereo
    const wav = audioBufferToWavFormat(audioBuffer, defaultFormat, spliceMarkersStore);
    downloadWav(wav, 'morphedit-export.wav');
  }, [spliceMarkersStore]);

  const handleExportWavFormat = useCallback((format: ExportFormat) => {
    const audioBuffer = useAudioStore.getState().audioBuffer;
    if (!audioBuffer) {
      console.log("No audio buffer found");
      return;
    }

    console.log("Exporting WAV in format:", format, "with splice markers:", spliceMarkersStore);

    const wav = audioBufferToWavFormat(audioBuffer, format, spliceMarkersStore);
    const filename = `morphedit-export-${format.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}.wav`;
    downloadWav(wav, filename);

    // Close the export menu
    actions.setExportAnchorEl(null);
  }, [spliceMarkersStore, actions]);

  // Memoized region info that updates when regions change
  const regionInfo = useMemo(() => {
    return getRegionInfo(regionsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionUpdateTrigger]); // Re-calculate when regions are updated

  // Expose methods to parent component via ref
  useImperativeHandle(
    ref,
    () => ({
      handlePlayPause,
      handleCropRegion,
      handleLoop,
      handleZoom,
      handleZoomReset,
      getCurrentZoom: () => state.zoom,
      handleSkipForward,
      handleSkipBackward,
      handleIncreaseSkipIncrement,
      handleDecreaseSkipIncrement,
      handleFadeInRegion,
      handleFadeOutRegion,
      handleApplyCrop,
      handleApplyFades,
      handleUndo,
      handleExportWav,
      handleAddSpliceMarker,
      handleRemoveSpliceMarker,
      handleAutoSlice,
      handleHalfMarkers,
    }),
    [
      handlePlayPause,
      handleCropRegion,
      handleLoop,
      handleZoom,
      handleZoomReset,
      handleSkipForward,
      handleSkipBackward,
      handleIncreaseSkipIncrement,
      handleDecreaseSkipIncrement,
      handleFadeInRegion,
      handleFadeOutRegion,
      handleApplyCrop,
      handleApplyFades,
      handleUndo,
      handleExportWav,
      handleAddSpliceMarker,
      handleRemoveSpliceMarker,
      handleAutoSlice,
      handleHalfMarkers,
      state.zoom,
    ],
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
      {/* Playback controls */}
      <WaveformControls
        isPlaying={state.isPlaying}
        isLooping={state.isLooping}
        currentTime={state.currentTime}
        duration={state.duration}
        zoom={state.zoom}
        skipIncrement={state.skipIncrement}
        spliceMarkersCount={spliceMarkersStore.length}
        regionInfo={regionInfo}
        onPlayPause={handlePlayPause}
        onLoop={handleLoop}
        onRewind={handleRewind}
        onZoom={handleZoom}
        onZoomReset={handleZoomReset}
      />

      {/* Export and Region controls */}
      <Stack direction="row" alignItems="center" sx={{ mt: 2, width: '100%' }}>
        {/* Left column - Export controls */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
          <ExportControls
            exportAnchorEl={state.exportAnchorEl}
            onExportWav={handleExportWav}
            onExportWavFormat={handleExportWavFormat}
            onSetExportAnchorEl={actions.setExportAnchorEl}
          />
        </Stack>

        {/* Right column - Region controls */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, justifyContent: 'flex-end' }}>
          <RegionControls
            cropMode={state.cropMode}
            fadeInMode={state.fadeInMode}
            fadeOutMode={state.fadeOutMode}
            canUndo={canUndo}
            onCropRegion={handleCropRegion}
            onFadeInRegion={handleFadeInRegion}
            onFadeOutRegion={handleFadeOutRegion}
            onApplyCrop={handleApplyCrop}
            onApplyFades={handleApplyFades}
            onUndo={handleUndo}
          />
        </Stack>
      </Stack>

      {/* Splice marker controls */}
      <SpliceMarkerControls
        selectedSpliceMarker={!!state.selectedSpliceMarker}
        numberOfSlices={state.numberOfSlices}
        spliceMarkersCount={spliceMarkersStore.length}
        duration={state.duration}
        onAddSpliceMarker={handleAddSpliceMarker}
        onRemoveSpliceMarker={handleRemoveSpliceMarker}
        onAutoSlice={handleAutoSlice}
        onHalfMarkers={handleHalfMarkers}
        onSetNumberOfSlices={actions.setNumberOfSlices}
      />
    </Container>
  );
});

Waveform.displayName = "Waveform";

export default Waveform;

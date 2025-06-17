// Event handlers for the Waveform component
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

import { useCallback, useMemo } from "react";
import type { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";

import { useAudioStore } from "../audioStore";
import type { AudioState } from "../audioStore";
import { ZOOM_LEVELS, MAX_SPLICE_MARKERS, MARKER_ICONS } from "../constants";
import {
  playPause,
  rewind,
  zoom,
  skipForward,
  skipBackward,
  increaseSkipIncrement,
  decreaseSkipIncrement,
  undo,
} from "../utils/playbackUtils";
import {
  createCropRegion,
  createFadeInRegion,
  createFadeOutRegion,
  applyCrop,
  applyFades,
} from "../utils/regionUtils";
import {
  addSpliceMarker,
  removeSpliceMarker,
  autoSlice,
  halfMarkers,
  clearAllMarkers,
  toggleMarkerLock,
} from "../utils/spliceMarkerUtils";
import {
  applyTransientDetection,
  snapToZeroCrossings,
} from "../utils/transientDetection";
import {
  audioBufferToWavFormat,
  downloadWav,
  type ExportFormat,
} from "../utils/exportUtils";
import { createGenericSpliceHandler } from "../utils/spliceMarkerHandlers";
import { calculateInitialZoom } from "../utils/waveformInitialization";

interface MarkerData {
  id: string;
  start: number;
  end: number;
  content: string;
  color: string;
  drag: boolean;
  resize: boolean;
}

interface WaveformState {
  isPlaying: boolean;
  cropRegion: Region | null;
  resetZoom: number;
  skipIncrement: number;
  currentTime: number;
  numberOfSlices: number;
  selectedSpliceMarker: Region | null;
  transientSensitivity: number;
  transientFrameSize: number;
  transientOverlap: number;
  fadeInMode: boolean;
  fadeOutMode: boolean;
  fadeInCurveType: string;
  fadeOutCurveType: string;
  currentAudioUrl: string | null;
  selectedExportFormat: ExportFormat;
}

interface WaveformActions {
  setZoom: (zoom: number) => void;
  setResetZoom: (zoom: number) => void;
  setSkipIncrement: (increment: number) => void;
  setCropRegion: (region: Region | null) => void;
  setCropMode: (mode: boolean) => void;
  setIsLooping: (looping: boolean | ((prev: boolean) => boolean)) => void;
  setFadeInMode: (mode: boolean) => void;
  setFadeOutMode: (mode: boolean) => void;
  setSelectedSpliceMarker: (marker: Region | null) => void;
  setCurrentAudioUrl: (url: string | null) => void;
  setSelectedExportFormat: (format: ExportFormat) => void;
}

interface WaveformHandlersProps {
  state: WaveformState;
  actions: WaveformActions;
  wavesurferRef: React.RefObject<WaveSurfer | null>;
  regionsRef: React.RefObject<RegionsPlugin | null>;
  cropRegionRef: React.RefObject<Region | null>;
  memoizedUpdateSpliceMarkerColors: (selectedMarker: Region | null) => void;
  onProcessingStart?: (message: string) => void;
  onProcessingComplete?: () => void;
}

export const useWaveformHandlers = ({
  state,
  actions,
  wavesurferRef,
  regionsRef,
  cropRegionRef,
  memoizedUpdateSpliceMarkerColors,
  onProcessingStart,
  onProcessingComplete,
}: WaveformHandlersProps) => {
  // Audio store hooks
  const spliceMarkersStore = useAudioStore((s: AudioState) => s.spliceMarkers);
  const lockedSpliceMarkersStore = useAudioStore(
    (s: AudioState) => s.lockedSpliceMarkers
  );
  const setSpliceMarkersStore = useAudioStore(
    (s: AudioState) => s.setSpliceMarkers
  );
  const setLockedSpliceMarkersStore = useAudioStore(
    (s: AudioState) => s.setLockedSpliceMarkers
  );
  const setPreviousAudioUrl = useAudioStore(
    (s: AudioState) => s.setPreviousAudioUrl
  );
  const setPreviousSpliceMarkers = useAudioStore(
    (s: AudioState) => s.setPreviousSpliceMarkers
  );
  const setPreviousLockedSpliceMarkers = useAudioStore(
    (s: AudioState) => s.setPreviousLockedSpliceMarkers
  );
  const setCanUndo = useAudioStore((s: AudioState) => s.setCanUndo);
  const setAudioBuffer = useAudioStore((s: AudioState) => s.setAudioBuffer);
  const previousAudioUrl = useAudioStore((s: AudioState) => s.previousAudioUrl);
  const canUndo = useAudioStore((s: AudioState) => s.canUndo);

  // Playback handlers
  const handlePlayPause = useCallback(() => {
    playPause(
      wavesurferRef.current!,
      regionsRef.current!,
      state.isPlaying,
      state.cropRegion
    );
  }, [state.isPlaying, state.cropRegion, wavesurferRef, regionsRef]);

  const handleRewind = useCallback(() => {
    rewind(wavesurferRef.current!, regionsRef.current!, state.cropRegion);
  }, [state.cropRegion, wavesurferRef, regionsRef]);

  const handleZoom = useCallback(
    (value: number) => {
      // Apply zoom constraints - use the resetZoom as minimum and ZOOM_LEVELS.MAX as maximum
      const minZoom = Math.max(ZOOM_LEVELS.MIN, state.resetZoom);
      const maxZoom = ZOOM_LEVELS.MAX;
      const constrainedValue = Math.min(maxZoom, Math.max(minZoom, value));

      actions.setZoom(constrainedValue);
      zoom(wavesurferRef.current!, constrainedValue);
    },
    [actions, wavesurferRef, state.resetZoom]
  );

  const handleZoomReset = useCallback(() => {
    if (!wavesurferRef.current) return;

    const duration = wavesurferRef.current.getDuration();
    if (duration <= 0) return;

    // Calculate appropriate zoom to fill the container
    const resetZoom = calculateInitialZoom(duration);

    console.log("Zoom reset:", { duration, resetZoom });

    // Update state and apply zoom
    actions.setZoom(resetZoom);
    actions.setResetZoom(resetZoom); // Update the resetZoom level for the slider
    wavesurferRef.current.zoom(resetZoom);

    // Force a complete redraw of regions after zoom to ensure splice markers are visible
    setTimeout(() => {
      if (regionsRef.current && wavesurferRef.current) {
        console.log("Refreshing regions after zoom reset");

        // Get all current regions data before clearing
        const allRegions = regionsRef.current.getRegions();
        const spliceMarkers = allRegions.filter((r: Region) =>
          r.id.startsWith("splice-marker-")
        );

        if (spliceMarkers.length > 0) {
          console.log(
            `Found ${spliceMarkers.length} splice markers to refresh`
          );

          // Store region data
          const markerData = spliceMarkers.map((region: Region) => ({
            id: region.id,
            start: region.start,
            end: region.end,
            content: region.content?.textContent || MARKER_ICONS.UNLOCKED,
            color: region.color,
            drag: region.drag,
            resize: region.resize,
          }));

          // Remove all splice markers
          spliceMarkers.forEach((region: Region) => region.remove());

          // Re-add them after a brief delay to force complete re-render
          setTimeout(() => {
            markerData.forEach((data: MarkerData) => {
              regionsRef.current!.addRegion({
                id: data.id,
                start: data.start,
                end: data.end,
                content: data.content,
                color: data.color,
                drag: data.drag,
                resize: data.resize,
              });
            });
            console.log("Re-added splice markers after zoom reset");
          }, 50);
        }
      }
    }, 150);
  }, [actions, wavesurferRef, regionsRef]);

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

  // Region handlers
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
    createFadeInRegion(
      wavesurferRef.current!,
      regionsRef.current!,
      actions.setFadeInMode
    );
  }, [actions, wavesurferRef, regionsRef]);

  const handleFadeOutRegion = useCallback(() => {
    createFadeOutRegion(
      wavesurferRef.current!,
      regionsRef.current!,
      actions.setFadeOutMode
    );
  }, [actions, wavesurferRef, regionsRef]);

  const handleApplyCrop = useCallback(async () => {
    if (onProcessingStart) {
      onProcessingStart("Applying crop to audio...");
    }

    await applyCrop(
      wavesurferRef.current!,
      regionsRef.current!,
      state.cropRegion,
      state.currentAudioUrl,
      spliceMarkersStore,
      lockedSpliceMarkersStore,
      {
        setPreviousAudioUrl,
        setCanUndo,
        setAudioBuffer,
        setCropMode: actions.setCropMode,
        setCropRegion: actions.setCropRegion,
        setCurrentAudioUrl: actions.setCurrentAudioUrl,
        setFadeInMode: actions.setFadeInMode,
        setFadeOutMode: actions.setFadeOutMode,
        setSpliceMarkersStore,
        setLockedSpliceMarkersStore,
        setPreviousSpliceMarkers,
        setPreviousLockedSpliceMarkers,
        setZoom: actions.setZoom,
      }
    );
    cropRegionRef.current = null;

    if (onProcessingComplete) {
      onProcessingComplete();
    }
  }, [
    state.cropRegion,
    state.currentAudioUrl,
    spliceMarkersStore,
    setPreviousAudioUrl,
    setPreviousSpliceMarkers,
    setPreviousLockedSpliceMarkers,
    setCanUndo,
    setAudioBuffer,
    actions,
    wavesurferRef,
    regionsRef,
    cropRegionRef,
    onProcessingStart,
    onProcessingComplete,
    setSpliceMarkersStore,
    lockedSpliceMarkersStore,
    setLockedSpliceMarkersStore,
  ]);

  const handleApplyFades = useCallback(async () => {
    if (onProcessingStart) {
      onProcessingStart("Applying fades to audio...");
    }

    await applyFades(
      wavesurferRef.current!,
      regionsRef.current!,
      state.fadeInMode,
      state.fadeOutMode,
      state.fadeInCurveType,
      state.fadeOutCurveType,
      state.currentAudioUrl,
      spliceMarkersStore,
      lockedSpliceMarkersStore,
      {
        setPreviousAudioUrl,
        setCanUndo,
        setAudioBuffer,
        setFadeInMode: actions.setFadeInMode,
        setFadeOutMode: actions.setFadeOutMode,
        setCurrentAudioUrl: actions.setCurrentAudioUrl,
        setCropMode: actions.setCropMode,
        setCropRegion: actions.setCropRegion,
        setSpliceMarkersStore,
        setPreviousSpliceMarkers,
        setPreviousLockedSpliceMarkers,
        setZoom: actions.setZoom,
      }
    );

    if (onProcessingComplete) {
      onProcessingComplete();
    }
  }, [
    state.fadeInMode,
    state.fadeOutMode,
    state.fadeInCurveType,
    state.fadeOutCurveType,
    state.currentAudioUrl,
    spliceMarkersStore,
    lockedSpliceMarkersStore,
    setPreviousAudioUrl,
    setPreviousSpliceMarkers,
    setPreviousLockedSpliceMarkers,
    setCanUndo,
    setAudioBuffer,
    actions,
    wavesurferRef,
    regionsRef,
    onProcessingStart,
    onProcessingComplete,
    setSpliceMarkersStore,
  ]);

  const handleUndo = useCallback(async () => {
    await undo(wavesurferRef.current!, canUndo, previousAudioUrl, {
      setCurrentAudioUrl: actions.setCurrentAudioUrl,
      setPreviousAudioUrl,
      setCanUndo,
      setCropMode: actions.setCropMode,
      setCropRegion: actions.setCropRegion,
      setFadeInMode: actions.setFadeInMode,
      setFadeOutMode: actions.setFadeOutMode,
      setSpliceMarkersStore,
      setLockedSpliceMarkersStore,
    });
  }, [
    canUndo,
    previousAudioUrl,
    setPreviousAudioUrl,
    setCanUndo,
    actions,
    wavesurferRef,
    setSpliceMarkersStore,
    setLockedSpliceMarkersStore,
  ]);

  // Splice marker handlers
  const handleAddSpliceMarker = useCallback(() => {
    addSpliceMarker(
      wavesurferRef.current!,
      regionsRef.current!,
      state.currentTime,
      spliceMarkersStore,
      setSpliceMarkersStore
    );
  }, [
    state.currentTime,
    spliceMarkersStore,
    setSpliceMarkersStore,
    wavesurferRef,
    regionsRef,
  ]);

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
  }, [
    state.selectedSpliceMarker,
    spliceMarkersStore,
    setSpliceMarkersStore,
    actions,
    memoizedUpdateSpliceMarkerColors,
    wavesurferRef,
    regionsRef,
  ]);

  const handleToggleMarkerLock = useCallback(() => {
    if (!state.selectedSpliceMarker) {
      console.log("No splice marker selected for locking/unlocking");
      return;
    }

    const markerTime = state.selectedSpliceMarker.start;
    toggleMarkerLock(
      markerTime,
      lockedSpliceMarkersStore,
      setLockedSpliceMarkersStore,
      regionsRef.current! // Pass regions to update drag properties
    );

    // Update visual appearance of all markers
    memoizedUpdateSpliceMarkerColors(state.selectedSpliceMarker);
  }, [
    state.selectedSpliceMarker,
    lockedSpliceMarkersStore,
    setLockedSpliceMarkersStore,
    memoizedUpdateSpliceMarkerColors,
    regionsRef,
  ]);

  const handleAutoSlice = useCallback(() => {
    autoSlice(
      wavesurferRef.current!,
      regionsRef.current!,
      state.numberOfSlices,
      setSpliceMarkersStore,
      actions.setSelectedSpliceMarker,
      memoizedUpdateSpliceMarkerColors
    );
  }, [
    state.numberOfSlices,
    setSpliceMarkersStore,
    actions,
    memoizedUpdateSpliceMarkerColors,
    wavesurferRef,
    regionsRef,
  ]);

  const handleHalfMarkers = useCallback(() => {
    halfMarkers(
      regionsRef.current!,
      setSpliceMarkersStore,
      actions.setSelectedSpliceMarker,
      memoizedUpdateSpliceMarkerColors
    );
  }, [
    setSpliceMarkersStore,
    actions,
    memoizedUpdateSpliceMarkerColors,
    regionsRef,
  ]);

  const handleClearAllMarkers = useCallback(() => {
    clearAllMarkers(
      regionsRef.current!,
      setSpliceMarkersStore,
      actions.setSelectedSpliceMarker,
      memoizedUpdateSpliceMarkerColors
    );
  }, [
    setSpliceMarkersStore,
    actions,
    memoizedUpdateSpliceMarkerColors,
    regionsRef,
  ]);

  const handleTransientDetection = useCallback(() => {
    const audioBuffer = useAudioStore.getState().audioBuffer;
    if (!audioBuffer) {
      console.log("No audio buffer available for transient detection");
      return;
    }

    console.log(
      "Starting transient detection with sensitivity:",
      state.transientSensitivity
    );
    const detectedCount = applyTransientDetection(
      wavesurferRef.current!,
      regionsRef.current!,
      audioBuffer,
      state.transientSensitivity,
      state.transientFrameSize,
      state.transientOverlap,
      setSpliceMarkersStore,
      actions.setSelectedSpliceMarker,
      memoizedUpdateSpliceMarkerColors
    );
    console.log(
      `Transient detection completed. Detected ${detectedCount} transients.`
    );
  }, [
    state.transientSensitivity,
    state.transientFrameSize,
    state.transientOverlap,
    setSpliceMarkersStore,
    actions,
    memoizedUpdateSpliceMarkerColors,
    wavesurferRef,
    regionsRef,
  ]);

  const handleSnapToZeroCrossings = useCallback(() => {
    const audioBuffer = useAudioStore.getState().audioBuffer;
    if (!audioBuffer || spliceMarkersStore.length === 0) {
      console.log(
        "No audio buffer or splice markers available for zero crossing snap"
      );
      return;
    }

    console.log("Snapping splice markers to zero crossings");
    snapToZeroCrossings(
      wavesurferRef.current!,
      regionsRef.current!,
      audioBuffer,
      spliceMarkersStore,
      setSpliceMarkersStore,
      actions.setSelectedSpliceMarker,
      memoizedUpdateSpliceMarkerColors
    );
  }, [
    spliceMarkersStore,
    setSpliceMarkersStore,
    actions,
    memoizedUpdateSpliceMarkerColors,
    wavesurferRef,
    regionsRef,
  ]);

  // Export handlers
  const handleExport = useCallback(() => {
    const audioBuffer = useAudioStore.getState().audioBuffer;
    const isProcessing = useAudioStore.getState().isProcessingAudio;

    if (!audioBuffer) {
      console.log("No audio buffer found");
      return;
    }

    console.log("=================== EXPORT DEBUG ===================");
    console.log("Export - Current audio URL:", state.currentAudioUrl);
    console.log("Export - Is processing:", isProcessing);
    console.log(
      "Exporting WAV with splice markers as cue points:",
      spliceMarkersStore
    );
    console.log(
      "Export - Audio buffer details:",
      `Duration: ${audioBuffer.length / audioBuffer.sampleRate}s`,
      `Length: ${audioBuffer.length} samples`,
      `Sample rate: ${audioBuffer.sampleRate}Hz`,
      `Channels: ${audioBuffer.numberOfChannels}`
    );
    console.log(
      "Export - Current WaveSurfer duration:",
      wavesurferRef.current?.getDuration() || "N/A"
    );
    console.log("Export format:", state.selectedExportFormat);
    console.log("=====================================================");

    const wav = audioBufferToWavFormat(
      audioBuffer,
      state.selectedExportFormat,
      spliceMarkersStore
    );
    const filename = `morphedit-export-${state.selectedExportFormat.label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")}.wav`;
    downloadWav(wav, filename);
  }, [
    spliceMarkersStore,
    wavesurferRef,
    state.currentAudioUrl,
    state.selectedExportFormat,
  ]);

  const handleExportFormatChange = useCallback(
    (format: ExportFormat) => {
      console.log("Changing export format to:", format);
      actions.setSelectedExportFormat(format);
    },
    [actions]
  );

  // Splice playback handlers - dynamically generate handlers for all 20 splice markers
  const spliceHandlers = useMemo(() => {
    const handlers: Record<string, () => void> = {};

    for (let i = 1; i <= MAX_SPLICE_MARKERS; i++) {
      handlers[`handlePlaySplice${i}`] = createGenericSpliceHandler(
        wavesurferRef,
        spliceMarkersStore,
        i
      );
    }

    return handlers;
  }, [spliceMarkersStore, wavesurferRef]);

  return {
    // Playback handlers
    handlePlayPause,
    handleRewind,
    handleZoom,
    handleZoomReset,
    handleSkipForward,
    handleSkipBackward,
    handleIncreaseSkipIncrement,
    handleDecreaseSkipIncrement,

    // Region handlers
    handleCropRegion,
    handleLoop,
    handleFadeInRegion,
    handleFadeOutRegion,
    handleApplyCrop,
    handleApplyFades,
    handleUndo,

    // Splice marker handlers
    handleAddSpliceMarker,
    handleRemoveSpliceMarker,
    handleToggleMarkerLock,
    handleAutoSlice,
    handleHalfMarkers,
    handleClearAllMarkers,
    handleTransientDetection,
    handleSnapToZeroCrossings,

    // Export handlers
    handleExport,
    handleExportFormatChange,

    // Splice playback handlers
    spliceHandlers,
  };
};

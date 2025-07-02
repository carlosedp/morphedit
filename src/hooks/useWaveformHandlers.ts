// Event handlers for the Waveform component
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

import { useCallback, useMemo, useRef } from 'react';
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';

import { useAudioStore } from '../audioStore';
import type { AudioState } from '../audioStore';
import {
  ZOOM_LEVELS,
  MAX_KEYBOARD_SHORTCUT_MARKERS,
  MARKER_ICONS,
} from '../constants';
import {
  playPause,
  rewind,
  zoom,
  skipForward,
  skipBackward,
  increaseSkipIncrement,
  decreaseSkipIncrement,
  undo,
} from '../utils/playbackUtils';
import {
  createCropRegion,
  createFadeInRegion,
  createFadeOutRegion,
  createCrossfadeRegion,
  applyCrop,
  applyFades,
  applyCrossfade,
} from '../utils/regionUtils';
import { applyNormalization } from '../utils/audioNormalization';
import { applyReversal } from '../utils/audioReversal';
import { applyTempoAndPitch } from '../utils/tempoAndPitchProcessing';
import type { TempoAndPitchOptions } from '../utils/rubberbandProcessor';
import {
  addSpliceMarker,
  removeSpliceMarker,
  autoSlice,
  halfMarkers,
  clearAllMarkers,
  toggleMarkerLock,
} from '../utils/spliceMarkerUtils';
import {
  applyTransientDetection,
  snapToZeroCrossings,
} from '../utils/transientDetection';
import {
  audioBufferToWavFormat,
  downloadWav,
  type ExportFormat,
} from '../utils/exportUtils';
import { createGenericSpliceHandler } from '../utils/spliceMarkerHandlers';
import { calculateInitialZoom } from '../utils/waveformInitialization';
import { exportSlicesWithProgress } from '../utils/sliceExportUtils';

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
  crossfadeMode: boolean;
  crossfadeCurveType: string;
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
  setCrossfadeMode: (mode: boolean) => void;
  setCrossfadeRegion: (region: Region | null) => void;
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
  // Ref to prevent rapid zoom reset clicks
  const isZoomResetInProgress = useRef(false);

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
  const bpm = useAudioStore((s: AudioState) => s.bpm);
  const setBpm = useAudioStore((s: AudioState) => s.setBpm);
  const setIsProcessingAudio = useAudioStore(
    (s: AudioState) => s.setIsProcessingAudio
  );
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
    console.log('🔍 handleZoomReset called');

    // Prevent rapid clicking issues
    if (isZoomResetInProgress.current) {
      console.log('🔍 Zoom reset already in progress, ignoring click');
      return;
    }

    if (!wavesurferRef.current) {
      console.log('🔍 No WaveSurfer instance available');
      return;
    }

    const duration = wavesurferRef.current.getDuration();
    if (duration <= 0) {
      console.log('🔍 Duration is 0 or negative:', duration);
      return;
    }

    // Set flag to prevent rapid clicks
    isZoomResetInProgress.current = true;

    // Cleanup function to ensure flag is always reset
    const cleanup = () => {
      isZoomResetInProgress.current = false;
    };

    // Auto-cleanup after maximum expected time (Edge browser safety)
    const maxTimeoutId = setTimeout(cleanup, 5000);

    try {
      // Calculate the optimal zoom first to minimize visual flicker
      let zoomToApply = state.resetZoom;

      // Calculate expected zoom for current duration
      const expectedZoomForDuration = calculateInitialZoom(duration);

      // Check if we need to calculate the initial zoom:
      // 1. First time or invalid state (resetZoom <= MIN or default value)
      // 2. Duration has changed significantly (suggesting tempo/pitch processing or other major change)
      const durationMismatch =
        Math.abs(zoomToApply - expectedZoomForDuration) >
        expectedZoomForDuration * 0.1; // 10% tolerance
      const needsRecalculation =
        state.resetZoom <= ZOOM_LEVELS.MIN ||
        state.resetZoom === 2 ||
        durationMismatch;

      if (needsRecalculation) {
        zoomToApply = expectedZoomForDuration;
        actions.setResetZoom(zoomToApply); // Store the calculated value for future use
        console.log('🔍 Calculated new resetZoom:', {
          duration,
          zoomToApply,
          reason: durationMismatch ? 'duration-changed' : 'first-time',
        });
      } else {
        console.log('🔍 Using stored resetZoom:', zoomToApply);
      }

      console.log('🔍 Applying zoom reset:', { duration, zoomToApply });

      // Apply zoom directly - simplified approach for better Edge compatibility
      actions.setZoom(zoomToApply);
      wavesurferRef.current.zoom(zoomToApply);

      // Force a single redraw after a short delay
      setTimeout(() => {
        try {
          if (wavesurferRef.current) {
            // Force a container resize event to trigger redraw
            const container = wavesurferRef.current.getWrapper();
            if (container) {
              const event = new Event('resize');
              window.dispatchEvent(event);
            }
            console.log(
              '🔍 Zoom reset applied successfully with forced redraw'
            );
          }

          // Handle region refresh if needed
          if (regionsRef.current && wavesurferRef.current) {
            const allRegions = regionsRef.current.getRegions();
            const spliceMarkers = allRegions.filter((r: Region) =>
              r.id.startsWith('splice-marker-')
            );

            if (spliceMarkers.length > 0) {
              console.log(
                `Refreshing ${spliceMarkers.length} splice markers after zoom reset`
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

              // Remove and re-add markers for proper rendering
              spliceMarkers.forEach((region: Region) => region.remove());

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

              console.log('Re-added splice markers after zoom reset');
            }
          }

          console.log('🔍 Zoom reset completed successfully');
        } catch (error) {
          console.error('🔍 Error during zoom reset cleanup:', error);
        } finally {
          // Clear timeouts and reset flag
          clearTimeout(maxTimeoutId);
          cleanup();
        }
      }, 50);
    } catch (error) {
      console.error('🔍 Error during zoom reset:', error);
      clearTimeout(maxTimeoutId);
      cleanup();
    }
  }, [actions, wavesurferRef, regionsRef, state.resetZoom]);

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

  const handleCrossfadeRegion = useCallback(() => {
    createCrossfadeRegion(
      wavesurferRef.current!,
      regionsRef.current!,
      state.selectedSpliceMarker,
      actions.setCrossfadeMode,
      actions.setCrossfadeRegion
    );
  }, [actions, wavesurferRef, regionsRef, state.selectedSpliceMarker]);

  const handleApplyCrop = useCallback(async () => {
    if (onProcessingStart) {
      onProcessingStart('Applying crop to audio...');
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
        setCrossfadeMode: actions.setCrossfadeMode,
        setCrossfadeRegion: actions.setCrossfadeRegion,
        setSpliceMarkersStore,
        setLockedSpliceMarkersStore,
        setPreviousSpliceMarkers,
        setPreviousLockedSpliceMarkers,
        setZoom: actions.setZoom,
        setResetZoom: actions.setResetZoom,
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
      onProcessingStart('Applying fades to audio...');
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
        setCrossfadeMode: actions.setCrossfadeMode,
        setCrossfadeRegion: actions.setCrossfadeRegion,
        setSpliceMarkersStore,
        setPreviousSpliceMarkers,
        setPreviousLockedSpliceMarkers,
        setZoom: actions.setZoom,
        setResetZoom: actions.setResetZoom,
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

  const handleApplyCrossfade = useCallback(async () => {
    if (onProcessingStart) {
      onProcessingStart('Applying crossfade to audio...');
    }

    await applyCrossfade(
      wavesurferRef.current!,
      regionsRef.current!,
      state.crossfadeMode,
      state.crossfadeCurveType,
      state.currentAudioUrl,
      spliceMarkersStore,
      lockedSpliceMarkersStore,
      {
        setPreviousAudioUrl,
        setCanUndo,
        setAudioBuffer,
        setCrossfadeMode: actions.setCrossfadeMode,
        setCrossfadeRegion: actions.setCrossfadeRegion,
        setCurrentAudioUrl: actions.setCurrentAudioUrl,
        setCropMode: actions.setCropMode,
        setCropRegion: actions.setCropRegion,
        setFadeInMode: actions.setFadeInMode,
        setFadeOutMode: actions.setFadeOutMode,
        setSpliceMarkersStore,
        setPreviousSpliceMarkers,
        setPreviousLockedSpliceMarkers,
        setZoom: actions.setZoom,
        setResetZoom: actions.setResetZoom,
      }
    );

    if (onProcessingComplete) {
      onProcessingComplete();
    }
  }, [
    state.crossfadeMode,
    state.crossfadeCurveType,
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

  const handleNormalize = useCallback(async () => {
    if (onProcessingStart) {
      onProcessingStart('Normalizing audio to -1dB...');
    }

    await applyNormalization(
      wavesurferRef.current!,
      -1, // Target -1dB peak
      state.currentAudioUrl,
      spliceMarkersStore,
      lockedSpliceMarkersStore,
      {
        setPreviousAudioUrl,
        setCanUndo,
        setAudioBuffer,
        setCurrentAudioUrl: actions.setCurrentAudioUrl,
        setSpliceMarkersStore,
        setPreviousSpliceMarkers,
        setPreviousLockedSpliceMarkers,
        resetZoom: handleZoomReset,
        setResetZoom: actions.setResetZoom,
      }
    );

    if (onProcessingComplete) {
      onProcessingComplete();
    }
  }, [
    state.currentAudioUrl,
    spliceMarkersStore,
    lockedSpliceMarkersStore,
    setPreviousAudioUrl,
    setPreviousSpliceMarkers,
    setPreviousLockedSpliceMarkers,
    setCanUndo,
    setAudioBuffer,
    actions.setCurrentAudioUrl,
    actions.setResetZoom,
    setSpliceMarkersStore,
    wavesurferRef,
    onProcessingStart,
    onProcessingComplete,
    handleZoomReset,
  ]);

  const handleReverse = useCallback(async () => {
    if (onProcessingStart) {
      onProcessingStart('Reversing audio...');
    }

    await applyReversal(
      wavesurferRef.current!,
      regionsRef.current!,
      state.currentAudioUrl,
      spliceMarkersStore,
      lockedSpliceMarkersStore,
      {
        setPreviousAudioUrl,
        setCanUndo,
        setAudioBuffer,
        setCurrentAudioUrl: actions.setCurrentAudioUrl,
        setSpliceMarkersStore,
        setPreviousSpliceMarkers,
        setPreviousLockedSpliceMarkers,
        resetZoom: handleZoomReset,
        setResetZoom: actions.setResetZoom,
      }
    );

    if (onProcessingComplete) {
      onProcessingComplete();
    }
  }, [
    state.currentAudioUrl,
    spliceMarkersStore,
    lockedSpliceMarkersStore,
    setPreviousAudioUrl,
    setPreviousSpliceMarkers,
    setPreviousLockedSpliceMarkers,
    setCanUndo,
    setAudioBuffer,
    actions.setCurrentAudioUrl,
    actions.setResetZoom,
    setSpliceMarkersStore,
    wavesurferRef,
    regionsRef,
    onProcessingStart,
    onProcessingComplete,
    handleZoomReset,
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
      resetZoom: handleZoomReset,
      setResetZoom: actions.setResetZoom,
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
    handleZoomReset,
  ]);

  const handleTempoAndPitch = useCallback(() => {
    // This will be called when the user clicks the Tempo & Pitch button
    // The actual dialog will be handled by the parent component (App.tsx)
    // We'll add a custom event or use a state management approach
    const audioBuffer = useAudioStore.getState().audioBuffer;
    const event = new CustomEvent('openTempoAndPitchDialog', {
      detail: {
        audioBuffer: audioBuffer,
        duration: audioBuffer ? audioBuffer.duration : 0,
        estimatedBpm: bpm || undefined, // Use the detected BPM from the store
        onApply: async (options: TempoAndPitchOptions) => {
          // Apply tempo and pitch processing directly
          if (onProcessingStart) {
            onProcessingStart('Processing audio with RubberBand...');
          }

          await applyTempoAndPitch(
            wavesurferRef.current!,
            options,
            state.currentAudioUrl,
            spliceMarkersStore,
            lockedSpliceMarkersStore,
            {
              setPreviousAudioUrl,
              setCanUndo,
              setAudioBuffer,
              setCurrentAudioUrl: actions.setCurrentAudioUrl,
              setSpliceMarkersStore,
              setLockedSpliceMarkersStore,
              setPreviousSpliceMarkers,
              setPreviousLockedSpliceMarkers,
              setIsProcessingAudio,
              setBpm,
              resetZoom: handleZoomReset,
              setResetZoom: actions.setResetZoom,
            }
          );

          if (onProcessingComplete) {
            onProcessingComplete();
          }
        },
      },
    });
    window.dispatchEvent(event);
  }, [
    bpm,
    state.currentAudioUrl,
    spliceMarkersStore,
    lockedSpliceMarkersStore,
    setPreviousAudioUrl,
    setPreviousSpliceMarkers,
    setPreviousLockedSpliceMarkers,
    setCanUndo,
    setAudioBuffer,
    setIsProcessingAudio,
    setBpm,
    actions.setCurrentAudioUrl,
    actions.setResetZoom,
    setSpliceMarkersStore,
    setLockedSpliceMarkersStore,
    wavesurferRef,
    onProcessingStart,
    onProcessingComplete,
    handleZoomReset,
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
      console.log('No splice marker selected for locking/unlocking');
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
      console.log('No audio buffer available for transient detection');
      return;
    }

    console.log(
      'Starting transient detection with sensitivity:',
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
        'No audio buffer or splice markers available for zero crossing snap'
      );
      return;
    }

    console.log('Snapping splice markers to zero crossings');
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
      console.log('No audio buffer found');
      return;
    }

    console.log('=================== EXPORT DEBUG ===================');
    console.log('Export - Current audio URL:', state.currentAudioUrl);
    console.log('Export - Is processing:', isProcessing);
    console.log(
      'Exporting WAV with splice markers as cue points:',
      spliceMarkersStore
    );
    console.log(
      'Export - Audio buffer details:',
      `Duration: ${audioBuffer.length / audioBuffer.sampleRate}s`,
      `Length: ${audioBuffer.length} samples`,
      `Sample rate: ${audioBuffer.sampleRate}Hz`,
      `Channels: ${audioBuffer.numberOfChannels}`
    );
    console.log(
      'Export - Current WaveSurfer duration:',
      wavesurferRef.current?.getDuration() || 'N/A'
    );
    console.log('Export format:', state.selectedExportFormat);
    console.log('=====================================================');

    const wav = audioBufferToWavFormat(
      audioBuffer,
      state.selectedExportFormat,
      spliceMarkersStore
    );
    const filename = `morphedit-export-${state.selectedExportFormat.label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')}.wav`;
    downloadWav(wav, filename);
  }, [
    spliceMarkersStore,
    wavesurferRef,
    state.currentAudioUrl,
    state.selectedExportFormat,
  ]);

  const handleExportSlices = useCallback(async (): Promise<
    'no-slices' | 'no-audio' | 'success' | 'error'
  > => {
    const audioBuffer = useAudioStore.getState().audioBuffer;

    if (!audioBuffer) {
      console.log('No audio buffer found for slice export');
      return 'no-audio';
    }

    // Get current marker positions directly from visual regions (most up-to-date)
    const regions = regionsRef.current;
    let currentSpliceMarkers: number[] = [];

    if (regions) {
      const allRegions = regions.getRegions();
      currentSpliceMarkers = allRegions
        .filter((r: Region) => r.id.startsWith('splice-marker-'))
        .map((r: Region) => r.start)
        .sort((a, b) => a - b);
    }

    // Fallback to store if no visual regions found
    if (currentSpliceMarkers.length === 0) {
      currentSpliceMarkers = useAudioStore.getState().spliceMarkers;
    }

    if (currentSpliceMarkers.length === 0) {
      console.log('No splice markers found - cannot export slices');
      return 'no-slices';
    }

    console.log('=================== SLICE EXPORT DEBUG ===================');
    console.log('Slice Export - Current audio URL:', state.currentAudioUrl);
    console.log('Exporting slices with splice markers:', currentSpliceMarkers);
    console.log('Export format:', state.selectedExportFormat);
    console.log('Number of splice markers:', currentSpliceMarkers.length);
    console.log('==========================================================');

    if (onProcessingStart) {
      onProcessingStart('Exporting individual slices...');
    }

    try {
      const results = await exportSlicesWithProgress(
        audioBuffer,
        currentSpliceMarkers,
        state.selectedExportFormat,
        'morphedit-slice',
        (current, total) => {
          if (onProcessingStart) {
            onProcessingStart(`Exporting slice ${current} of ${total}...`);
          }
        }
      );

      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      console.log(
        `Slice export completed: ${successCount} successful, ${errorCount} failed`
      );

      if (errorCount > 0) {
        console.warn(
          'Some slices failed to export:',
          results.filter((r) => !r.success)
        );
      }

      return successCount > 0 ? 'success' : 'error';
    } catch (error) {
      console.error('Error during slice export:', error);
      return 'error';
    } finally {
      if (onProcessingComplete) {
        onProcessingComplete();
      }
    }
  }, [
    state.selectedExportFormat,
    state.currentAudioUrl,
    onProcessingStart,
    onProcessingComplete,
    regionsRef,
  ]);

  const handleExportFormatChange = useCallback(
    (format: ExportFormat) => {
      console.log('Changing export format to:', format);
      actions.setSelectedExportFormat(format);
    },
    [actions]
  );

  // Splice playback handlers - dynamically generate handlers for all 20 splice markers
  const spliceHandlers = useMemo(() => {
    const handlers: Record<string, () => void> = {};

    for (let i = 1; i <= MAX_KEYBOARD_SHORTCUT_MARKERS; i++) {
      handlers[`handlePlaySplice${i}`] = createGenericSpliceHandler(
        wavesurferRef,
        spliceMarkersStore,
        i
      );
    }

    return handlers;
  }, [spliceMarkersStore, wavesurferRef]);

  // Additional utility handler for resetting zoom state (for browser compatibility)
  const resetZoomState = useCallback(() => {
    isZoomResetInProgress.current = false;
  }, []);

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
    handleCrossfadeRegion,
    handleApplyCrop,
    handleApplyFades,
    handleApplyCrossfade,
    handleNormalize,
    handleReverse,
    handleTempoAndPitch,
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
    handleExportSlices,
    handleExportFormatChange,

    // Splice playback handlers
    spliceHandlers,

    // Utility handlers
    resetZoomState,
  };
};

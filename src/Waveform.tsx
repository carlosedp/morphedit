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
import {
  truncateAudioBuffer,
} from "./utils/fileLengthUtils";
import { MORPHAGENE_MAX_DURATION, REGION_COLORS, UI_COLORS, MARKER_ICONS, POSITION_UPDATE_INTERVAL, PLAYBACK_TIMING, WAVEFORM_RENDERING } from "./constants";
import { waveformLogger } from "./utils/logger";
import {
  audioBufferToWavFormat,
  downloadWav,
  exportFormats,
  type ExportFormat,
} from "./utils/exportUtils";
import {
  addSpliceMarker,
  removeSpliceMarker,
  autoSlice,
  halfMarkers,
  clearAllMarkers,
  updateSpliceMarkerColors,
  loadExistingCuePoints,
  toggleMarkerLock,
  isMarkerLocked,
} from "./utils/spliceMarkerUtils";
import { removeAllSpliceMarkersAndClearSelection } from "./utils/regionHelpers";
import {
  applyTransientDetection,
  snapToZeroCrossings,
} from "./utils/transientDetection";
import {
  createCropRegion,
  createFadeInRegion,
  createFadeOutRegion,
  applyCrop,
  applyFades,
  getRegionInfo,
} from "./utils/regionUtils";
import { createGenericSpliceHandler } from "./utils/spliceMarkerHandlers";
import { MAX_SPLICE_MARKERS } from "./constants";
import {
  playPause,
  rewind,
  zoom,
  skipForward,
  skipBackward,
  increaseSkipIncrement,
  decreaseSkipIncrement,
  undo,
} from "./utils/playbackUtils";
import { useWaveformState, useWaveformRefs } from "./hooks/useWaveformState";
import { WaveformControls } from "./components/WaveformControls";
import { ExportControls } from "./components/ExportControls";
import { RegionControls } from "./components/RegionControls";
import { SpliceMarkerControls } from "./components/SpliceMarkerControls";

interface WaveformProps {
  audioUrl: string;
  shouldTruncate?: boolean;
  onLoadingComplete?: () => void;
  onProcessingStart?: (message: string) => void;
  onProcessingComplete?: () => void;
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
  handleToggleMarkerLock: () => void;
  handleAutoSlice: () => void;
  handleHalfMarkers: () => void;
  handleClearAllMarkers: () => void;
  handleTransientDetection: () => void;
  handleSnapToZeroCrossings: () => void;
  handlePlaySplice1: () => void;
  handlePlaySplice2: () => void;
  handlePlaySplice3: () => void;
  handlePlaySplice4: () => void;
  handlePlaySplice5: () => void;
  handlePlaySplice6: () => void;
  handlePlaySplice7: () => void;
  handlePlaySplice8: () => void;
  handlePlaySplice9: () => void;
  handlePlaySplice10: () => void;
  handlePlaySplice11: () => void;
  handlePlaySplice12: () => void;
  handlePlaySplice13: () => void;
  handlePlaySplice14: () => void;
  handlePlaySplice15: () => void;
  handlePlaySplice16: () => void;
  handlePlaySplice17: () => void;
  handlePlaySplice18: () => void;
  handlePlaySplice19: () => void;
  handlePlaySplice20: () => void;
}

const Waveform = forwardRef<WaveformRef, WaveformProps>(
  (
    {
      audioUrl,
      shouldTruncate = false,
      onLoadingComplete,
      onProcessingStart,
      onProcessingComplete,
    },
    ref,
  ) => {
    const theme = useTheme();

    // Use custom hooks for state and refs management
    const [state, actions] = useWaveformState(audioUrl);
    const { wavesurferRef, regionsRef, isLoopingRef, cropRegionRef } =
      useWaveformRefs();

    // State to trigger region info updates when regions change
    const [regionUpdateTrigger, setRegionUpdateTrigger] = useState(0);

    // Extract stable action functions
    const { setCurrentTime } = actions;

    // Audio store hooks
    const setAudioBuffer = useAudioStore((s: AudioState) => s.setAudioBuffer);
    const setMarkers = useAudioStore((s: AudioState) => s.setMarkers);
    const setRegions = useAudioStore((s: AudioState) => s.setRegions);
    const setSpliceMarkersStore = useAudioStore(
      (s: AudioState) => s.setSpliceMarkers,
    );
    const spliceMarkersStore = useAudioStore(
      (s: AudioState) => s.spliceMarkers,
    );
    const lockedSpliceMarkersStore = useAudioStore(
      (s: AudioState) => s.lockedSpliceMarkers,
    );
    const setLockedSpliceMarkersStore = useAudioStore(
      (s: AudioState) => s.setLockedSpliceMarkers,
    );
    const setPreviousAudioUrl = useAudioStore(
      (s: AudioState) => s.setPreviousAudioUrl,
    );
    const setCanUndo = useAudioStore((s: AudioState) => s.setCanUndo);
    const previousAudioUrl = useAudioStore(
      (s: AudioState) => s.previousAudioUrl,
    );
    const canUndo = useAudioStore((s: AudioState) => s.canUndo);

    // Sync currentAudioUrl with audioUrl prop
    useEffect(() => {
      waveformLogger.debug("audioUrl changed, updating currentAudioUrl");
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
      let interval: NodeJS.Timeout | undefined;

      if (state.isPlaying && wavesurferRef.current) {
        interval = setInterval(() => {
          if (wavesurferRef.current) {
            setCurrentTime(wavesurferRef.current.getCurrentTime());
          }
        }, POSITION_UPDATE_INTERVAL); // Update every 100ms
      }

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.isPlaying, setCurrentTime]);

    // Memoized update splice marker colors function
    const memoizedUpdateSpliceMarkerColors = useCallback(
      (selectedMarker: Region | null) => {
        updateSpliceMarkerColors(regionsRef.current!, selectedMarker, theme);
      },
      [theme, regionsRef],
    );

    // Main wavesurfer initialization effect
    useEffect(() => {
      waveformLogger.debug("WaveSurfer useEffect starting");

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

      // Expose regions plugin to global window for debug function
      (window as DebugWindow).morpheditRegions = regions;

      // Create wavesurfer instance
      const ws = WaveSurfer.create({
        container: "#waveform-container",
        waveColor: theme.palette.primary.main,
        progressColor: "white",
        cursorColor: theme.palette.primary.main,
        cursorWidth: WAVEFORM_RENDERING.CURSOR_WIDTH,
        minPxPerSec: 20, // Ensure waveform fills container initially
        plugins: [
          regions,
          TimelinePlugin.create({}),
          Hover.create({
            lineColor: theme.palette.secondary.main,
            lineWidth: WAVEFORM_RENDERING.GRID_LINE_WIDTH,
            labelBackground: UI_COLORS.LABEL_BACKGROUND,
            labelColor: UI_COLORS.LABEL_TEXT,
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
        try {
          waveformLogger.debug("WaveSurfer ready - starting setup");

          actions.setDuration(ws.getDuration());

          // Apply zoom - either current zoom or calculate initial zoom to fill container
          let zoomToApply = state.zoom;
          if (state.zoom === 0) {
            // Get container width with multiple fallbacks
            const container = document.getElementById("waveform-container");
            let containerWidth = 800; // Default fallback

            if (container) {
              const rect = container.getBoundingClientRect();
              containerWidth =
                rect.width > 0 ? rect.width : container.clientWidth || 800;
            }

            // Calculate appropriate zoom to fill the container
            const duration = ws.getDuration();
            const minPxPerSec = containerWidth / duration;
            // Allow very low zoom values for long audio files, but ensure minimum usability
            zoomToApply = Math.min(1000, Math.max(1, minPxPerSec));
            actions.setZoom(zoomToApply);

            console.log("Initial zoom calculated:", {
              duration,
              containerWidth,
              zoomToApply,
            });
          } else {
            console.log("Applying existing zoom:", zoomToApply);
          }
          // Always apply the zoom to ensure waveform displays correctly
          ws.zoom(zoomToApply);

          // Parse WAV file for existing cue points and load them as splice markers
          // Skip this for cropped/faded URLs (processed audio) since markers are handled manually
          // Use audioUrl (the new URL) instead of state.currentAudioUrl (the old URL) for appended/concatenated audio
          const urlToLoad = audioUrl;
          const isProcessedAudio =
            urlToLoad.includes("#morphedit-cropped") ||
            urlToLoad.includes("#morphedit-faded");
          const isConcatenatedAudio = urlToLoad.includes(
            "#morphedit-concatenated",
          );
          const isAppendedAudio = urlToLoad.includes("#morphedit-appended");

          // Get current store state directly (not from React hook closure)
          const currentStoreState = useAudioStore.getState();
          const currentSpliceMarkers = currentStoreState.spliceMarkers;
          const currentLockedMarkers = currentStoreState.lockedSpliceMarkers;

          // For concatenated or appended audio, always prioritize the store markers over file cue points
          // BUT skip this for processed audio since crop/fade operations handle markers manually
          if (
            (isConcatenatedAudio || isAppendedAudio) &&
            !isProcessedAudio &&
            currentSpliceMarkers.length > 0
          ) {
            console.log(
              "Loading splice markers from store for concatenated/appended audio",
            );

            // Clear existing visual markers
            removeAllSpliceMarkersAndClearSelection(regions, () => { }, () => { });

            // Create visual markers from store
            currentSpliceMarkers.forEach((markerTime, index) => {
              const isLocked = isMarkerLocked(markerTime, currentLockedMarkers);
              regions.addRegion({
                start: markerTime,
                color: REGION_COLORS.SPLICE_MARKER,
                drag: !isLocked, // Prevent dragging if marker is locked
                resize: false,
                id: `splice-marker-concat-${index}-${Date.now()}`,
                content: isLocked ? MARKER_ICONS.LOCKED : MARKER_ICONS.UNLOCKED, // Use lock icon for locked markers
              });
            });

            console.log(
              `Created ${currentSpliceMarkers.length} visual markers from store for concatenated/appended audio`,
            );
          }
          // For processed audio (cropped/faded), create visual markers directly from store to ensure correct positioning
          else if (isProcessedAudio && currentSpliceMarkers.length > 0) {
            console.log(
              "Creating visual markers from store for processed audio",
            );

            // Clear existing visual markers
            const allRegions = regions.getRegions();
            const existingSpliceMarkers = allRegions.filter((r: Region) =>
              r.id.startsWith("splice-marker-"),
            );
            existingSpliceMarkers.forEach((marker: Region) => marker.remove());

            // Create visual markers from store (which has the correct adjusted times)
            currentSpliceMarkers.forEach((markerTime, index) => {
              const isLocked = isMarkerLocked(markerTime, currentLockedMarkers);
              regions.addRegion({
                start: markerTime,
                color: REGION_COLORS.SPLICE_MARKER,
                drag: !isLocked, // Prevent dragging if marker is locked
                resize: false,
                id: `splice-marker-processed-${index}-${Date.now()}`,
                content: isLocked ? MARKER_ICONS.LOCKED : MARKER_ICONS.UNLOCKED, // Use lock icon for locked markers
              });
            });

            console.log(
              `Created ${currentSpliceMarkers.length} visual markers from store for processed audio`,
            );
          }
          // Load cue points from WAV files (for regular unprocessed audio)
          else {
            console.log("Loading cue points from audio file...");
            try {
              const existingCuePoints = await parseWavCuePoints(urlToLoad);
              if (existingCuePoints.length > 0) {
                console.log(
                  "Found cue points, loading as splice markers:",
                  existingCuePoints,
                );
                loadExistingCuePoints(
                  regions,
                  existingCuePoints,
                  setSpliceMarkersStore,
                );
              } else {
                console.log("No cue points found in audio file");
              }
            } catch (error) {
              console.error("Error loading cue points:", error);
            }
          }

          // Call loading complete callback after everything is set up
          // Always call the callback for each ready event since each represents a new audio load
          console.log("About to call onLoadingComplete callback", {
            hasCallback: !!onLoadingComplete,
          });
          if (onLoadingComplete) {
            console.log("Waveform ready - calling onLoadingComplete callback");
            // Add a small delay to ensure everything is truly ready
            setTimeout(() => {
              console.log("Calling onLoadingComplete after brief delay");
              onLoadingComplete();
            }, PLAYBACK_TIMING.READY_CALLBACK_DELAY);
          } else {
            console.log(
              "Waveform ready - no onLoadingComplete callback provided",
            );
          }

          // Update audio buffer in store - but only if not already correctly set
          const currentStoredBuffer = useAudioStore.getState().audioBuffer;
          const isCurrentlyProcessing =
            useAudioStore.getState().isProcessingAudio;
          const wsDuration = ws.getDuration();

          // If we're currently processing audio, don't override the buffer
          if (isCurrentlyProcessing) {
            console.log(
              "Ready event - audio processing in progress, skipping buffer update",
            );
            return;
          }

          // For processed audio (cropped/faded), trust the buffer that's already in the store
          // since it was specifically set by the processing operations
          if (isProcessedAudio && currentStoredBuffer) {
            console.log(
              "Ready event - processed audio detected, keeping existing buffer in store",
            );
            console.log(
              `Store buffer duration: ${currentStoredBuffer.length / currentStoredBuffer.sampleRate}s, WS duration: ${wsDuration}s`,
            );

            // Double-check that our store buffer makes sense for processed audio
            const urlContainsCropped = urlToLoad.includes("#morphedit-cropped");
            const urlContainsFaded = urlToLoad.includes("#morphedit-faded");
            console.log("Ready event - URL flags:", {
              urlContainsCropped,
              urlContainsFaded,
            });
            return;
          }

          // Check if we already have a buffer with the correct duration (within tolerance)
          const bufferAlreadyCorrect =
            currentStoredBuffer &&
            Math.abs(
              currentStoredBuffer.length / currentStoredBuffer.sampleRate -
              wsDuration,
            ) < WAVEFORM_RENDERING.BUFFER_DURATION_TOLERANCE;

          if (bufferAlreadyCorrect) {
            console.log(
              "Ready event - audio buffer already correctly set in store, skipping update",
            );
            return;
          }

          const backend = (
            ws as unknown as { backend?: { buffer?: AudioBuffer } }
          ).backend;

          console.log(
            "Ready event - checking for backend buffer:",
            !!(backend && backend.buffer),
          );
          console.log("Ready event - audio duration:", wsDuration);

          if (backend && backend.buffer) {
            console.log(
              "Setting audio buffer from backend - duration:",
              backend.buffer.length / backend.buffer.sampleRate,
              "seconds",
            );
            setAudioBuffer(backend.buffer);
          } else {
            console.log(
              "No backend buffer available, attempting manual decode",
            );
            // Fallback: load and decode the current audio file manually
            // Use cleaned URL to avoid fragment issues
            const urlToLoad = (state.currentAudioUrl || audioUrl).split("#")[0];
            if (urlToLoad) {
              fetch(urlToLoad)
                .then((response) => response.arrayBuffer())
                .then((arrayBuffer) => {
                  const audioContext = new (window.AudioContext ||
                    (
                      window as Window &
                      typeof globalThis & {
                        webkitAudioContext?: typeof AudioContext;
                      }
                    ).webkitAudioContext)();
                  return audioContext.decodeAudioData(arrayBuffer);
                })
                .then((decodedBuffer) => {
                  console.log(
                    "Audio buffer decoded successfully - duration:",
                    decodedBuffer.length / decodedBuffer.sampleRate,
                    "seconds",
                  );
                  setAudioBuffer(decodedBuffer);
                })
                .catch((error) => {
                  console.error("Error decoding audio:", error);
                });
            } else {
              console.log("No URL available for manual decode");
            }
          }

          console.log("WaveSurfer ready event completed successfully");
        } catch (error) {
          console.error("Error in WaveSurfer ready event:", error);
          // Continue execution - callback was already called at the beginning
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
        // Deselect any selected splice marker when clicking on waveform
        if (state.selectedSpliceMarker) {
          actions.setSelectedSpliceMarker(null);
          memoizedUpdateSpliceMarkerColors(null);
        }
      });

      // Load audio - preprocess for truncation if needed
      const loadAudio = async () => {
        // Strip URL fragments early to ensure all operations use clean URLs
        let urlToLoad = audioUrl.split("#")[0];

        console.log("=== loadAudio called ===");
        console.log("shouldTruncate:", shouldTruncate);
        console.log("Original audioUrl:", audioUrl);
        console.log("Cleaned audioUrl:", urlToLoad);
        console.log("state.currentAudioUrl:", state.currentAudioUrl);

        // Check if we already have a truncated URL for this audio file to prevent loops
        const currentUrl = state.currentAudioUrl;
        const isAlreadyTruncated =
          currentUrl &&
          currentUrl.startsWith("blob:") &&
          currentUrl !== urlToLoad && // Compare with clean URL
          !audioUrl.includes("#morphedit-appended") && // Don't reuse URLs for appended audio
          !audioUrl.includes("#morphedit-concatenated"); // Don't reuse URLs for concatenated audio

        if (shouldTruncate && !isAlreadyTruncated) {
          console.log(
            "🔄 Preprocessing audio for truncation before loading...",
          );
          try {
            // Parse cue points from original file BEFORE truncation
            let originalCuePoints: number[] = [];
            try {
              console.log(
                "🔍 Parsing cue points from original file before truncation...",
              );
              originalCuePoints = await parseWavCuePoints(urlToLoad);
              console.log(
                "🔍 Found cue points in original file:",
                originalCuePoints,
              );
            } catch (error) {
              console.warn(
                "Could not parse cue points from original file:",
                error,
              );
            }

            // Fetch and decode the original audio to check if truncation is needed
            const response = await fetch(urlToLoad);
            const arrayBuffer = await response.arrayBuffer();

            const audioContext = new (window.AudioContext ||
              (
                window as Window &
                typeof globalThis & {
                  webkitAudioContext?: typeof AudioContext;
                }
              ).webkitAudioContext)();

            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const originalDuration =
              audioBuffer.length / audioBuffer.sampleRate;

            console.log(
              "Original audio duration:",
              originalDuration,
              "seconds",
            );

            if (originalDuration > MORPHAGENE_MAX_DURATION) {
              console.log(
                "✂️ Audio exceeds max duration, creating truncated version",
              );

              // Filter cue points to only include those within the truncated range
              const filteredCuePoints = originalCuePoints.filter(
                (cueTime) => cueTime <= MORPHAGENE_MAX_DURATION,
              );
              console.log(
                "🔍 Filtered cue points for truncated audio:",
                filteredCuePoints,
              );

              // Truncate the buffer
              const truncatedBuffer = truncateAudioBuffer(
                audioBuffer,
                MORPHAGENE_MAX_DURATION,
              );
              const truncatedDuration =
                truncatedBuffer.length / truncatedBuffer.sampleRate;
              console.log("Truncated duration:", truncatedDuration, "seconds");

              // Convert to WAV blob
              const { audioBufferToWavFormat } = await import(
                "./utils/exportUtils"
              );
              const { exportFormats } = await import("./utils/exportUtils");
              const defaultFormat = exportFormats[0];

              const wavArrayBuffer = audioBufferToWavFormat(
                truncatedBuffer,
                defaultFormat,
                filteredCuePoints, // Include the filtered cue points in the truncated file
              );
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
            console.error(
              "❌ Error preprocessing audio for truncation:",
              error,
            );
            // If preprocessing fails, use original URL
          }
        } else if (isAlreadyTruncated) {
          console.log("🔄 Using already truncated URL:", currentUrl);
          urlToLoad = currentUrl;
        }

        console.log("Loading URL into WaveSurfer:", urlToLoad);
        // Update current audio URL with the clean URL
        actions.setCurrentAudioUrl(urlToLoad);
        try {
          ws.load(urlToLoad);
        } catch (error) {
          console.error("Error loading URL into WaveSurfer:", error);
          // Continue anyway as WaveSurfer might still work
        }
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
        setRegionUpdateTrigger((prev) => prev + 1);
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
        console.log(
          "Region clicked:",
          region.id,
          "starts with splice-marker:",
          region.id.startsWith("splice-marker-"),
        );
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
    }, [
      audioUrl,
      setAudioBuffer,
      setMarkers,
      setRegions,
      theme,
      setSpliceMarkersStore,
      memoizedUpdateSpliceMarkerColors,
      actions,
      shouldTruncate,
    ]);

    // Handler functions using extracted utilities
    const handlePlayPause = useCallback(() => {
      playPause(
        wavesurferRef.current!,
        regionsRef.current!,
        state.isPlaying,
        state.cropRegion,
      );
    }, [state.isPlaying, state.cropRegion, wavesurferRef, regionsRef]);

    const handleRewind = useCallback(() => {
      rewind(wavesurferRef.current!, regionsRef.current!, state.cropRegion);
    }, [state.cropRegion, wavesurferRef, regionsRef]);

    const handleZoom = useCallback(
      (value: number) => {
        actions.setZoom(value);
        zoom(wavesurferRef.current!, value);
      },
      [actions, wavesurferRef],
    );

    const handleZoomReset = useCallback(() => {
      if (!wavesurferRef.current) return;

      const duration = wavesurferRef.current.getDuration();
      if (duration <= 0) return;

      // Get container width with multiple fallbacks
      const container = document.getElementById("waveform-container");
      let containerWidth = 800; // Default fallback

      if (container) {
        const rect = container.getBoundingClientRect();
        containerWidth =
          rect.width > 0 ? rect.width : container.clientWidth || 800;
      }

      // Calculate appropriate zoom to fill the container
      const minPxPerSec = containerWidth / duration;
      // Allow very low zoom values for long audio files, but ensure minimum usability
      const resetZoom = Math.min(1000, Math.max(1, minPxPerSec));

      console.log("Zoom reset:", { duration, containerWidth, resetZoom });

      // Update state and apply zoom
      actions.setZoom(resetZoom);
      wavesurferRef.current.zoom(resetZoom);

      // Force a complete redraw of regions after zoom to ensure splice markers are visible
      setTimeout(() => {
        if (regionsRef.current && wavesurferRef.current) {
          console.log("Refreshing regions after zoom reset");

          // Get all current regions data before clearing
          const allRegions = regionsRef.current.getRegions();
          const spliceMarkers = allRegions.filter((r: Region) =>
            r.id.startsWith("splice-marker-"),
          );

          if (spliceMarkers.length > 0) {
            console.log(
              `Found ${spliceMarkers.length} splice markers to refresh`,
            );

            // Store region data
            const markerData = spliceMarkers.map((region) => ({
              id: region.id,
              start: region.start,
              end: region.end,
              content: region.content?.textContent || "🔶",
              color: region.color,
              drag: region.drag,
              resize: region.resize,
            }));

            // Remove all splice markers
            spliceMarkers.forEach((region) => region.remove());

            // Re-add them after a brief delay to force complete re-render
            setTimeout(() => {
              markerData.forEach((data) => {
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

    const handleCropRegion = useCallback(() => {
      const region = createCropRegion(
        wavesurferRef.current!,
        regionsRef.current!,
        actions.setCropRegion,
        actions.setCropMode,
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
        actions.setFadeInMode,
      );
    }, [actions, wavesurferRef, regionsRef]);

    const handleFadeOutRegion = useCallback(() => {
      createFadeOutRegion(
        wavesurferRef.current!,
        regionsRef.current!,
        actions.setFadeOutMode,
      );
    }, [actions, wavesurferRef, regionsRef]);

    const handleAddSpliceMarker = useCallback(() => {
      addSpliceMarker(
        wavesurferRef.current!,
        regionsRef.current!,
        state.currentTime,
        spliceMarkersStore,
        setSpliceMarkersStore,
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
        memoizedUpdateSpliceMarkerColors,
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
        regionsRef.current!, // Pass regions to update drag properties
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
        memoizedUpdateSpliceMarkerColors,
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
        memoizedUpdateSpliceMarkerColors,
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
        memoizedUpdateSpliceMarkerColors,
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
        state.transientSensitivity,
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
        memoizedUpdateSpliceMarkerColors,
      );
      console.log(
        `Transient detection completed. Detected ${detectedCount} transients.`,
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
          "No audio buffer or splice markers available for zero crossing snap",
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
        memoizedUpdateSpliceMarkerColors,
      );
    }, [
      spliceMarkersStore,
      setSpliceMarkersStore,
      actions,
      memoizedUpdateSpliceMarkerColors,
      wavesurferRef,
      regionsRef,
    ]);

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
          setZoom: actions.setZoom,
        },
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
          setSpliceMarkersStore,
          setZoom: actions.setZoom,
        },
      );

      if (onProcessingComplete) {
        onProcessingComplete();
      }
    }, [
      state.fadeInMode,
      state.fadeOutMode,
      state.currentAudioUrl,
      spliceMarkersStore,
      setPreviousAudioUrl,
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
      });
    }, [
      canUndo,
      previousAudioUrl,
      setPreviousAudioUrl,
      setCanUndo,
      actions,
      wavesurferRef,
    ]);

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
        spliceMarkersStore,
      );
      console.log(
        "Export - Audio buffer details:",
        `Duration: ${audioBuffer.length / audioBuffer.sampleRate}s`,
        `Length: ${audioBuffer.length} samples`,
        `Sample rate: ${audioBuffer.sampleRate}Hz`,
        `Channels: ${audioBuffer.numberOfChannels}`,
      );
      console.log(
        "Export - Current WaveSurfer duration:",
        wavesurferRef.current?.getDuration() || "N/A",
      );
      console.log("=====================================================");

      // Use the default export format (48kHz 32-bit Float Stereo)
      const defaultFormat = exportFormats[0]; // 48kHz 32-bit Float Stereo
      const wav = audioBufferToWavFormat(
        audioBuffer,
        defaultFormat,
        spliceMarkersStore,
      );
      downloadWav(wav, "morphedit-export.wav");
    }, [spliceMarkersStore, wavesurferRef, state.currentAudioUrl]);

    const handleExportWavFormat = useCallback(
      (format: ExportFormat) => {
        const audioBuffer = useAudioStore.getState().audioBuffer;
        if (!audioBuffer) {
          console.log("No audio buffer found");
          return;
        }

        console.log(
          "Exporting WAV in format:",
          format,
          "with splice markers:",
          spliceMarkersStore,
        );
        console.log(
          "Export format - Audio buffer details:",
          `Duration: ${audioBuffer.length / audioBuffer.sampleRate}s`,
          `Length: ${audioBuffer.length} samples`,
          `Sample rate: ${audioBuffer.sampleRate}Hz`,
          `Channels: ${audioBuffer.numberOfChannels}`,
        );

        const wav = audioBufferToWavFormat(
          audioBuffer,
          format,
          spliceMarkersStore,
        );
        const filename = `morphedit-export-${format.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}.wav`;
        downloadWav(wav, filename);

        // Close the export menu
        actions.setExportAnchorEl(null);
      },
      [spliceMarkersStore, actions],
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

    // Extract individual handlers for the interface
    const handlePlaySplice1 = spliceHandlers.handlePlaySplice1;
    const handlePlaySplice2 = spliceHandlers.handlePlaySplice2;
    const handlePlaySplice3 = spliceHandlers.handlePlaySplice3;
    const handlePlaySplice4 = spliceHandlers.handlePlaySplice4;
    const handlePlaySplice5 = spliceHandlers.handlePlaySplice5;
    const handlePlaySplice6 = spliceHandlers.handlePlaySplice6;
    const handlePlaySplice7 = spliceHandlers.handlePlaySplice7;
    const handlePlaySplice8 = spliceHandlers.handlePlaySplice8;
    const handlePlaySplice9 = spliceHandlers.handlePlaySplice9;
    const handlePlaySplice10 = spliceHandlers.handlePlaySplice10;
    const handlePlaySplice11 = spliceHandlers.handlePlaySplice11;
    const handlePlaySplice12 = spliceHandlers.handlePlaySplice12;
    const handlePlaySplice13 = spliceHandlers.handlePlaySplice13;
    const handlePlaySplice14 = spliceHandlers.handlePlaySplice14;
    const handlePlaySplice15 = spliceHandlers.handlePlaySplice15;
    const handlePlaySplice16 = spliceHandlers.handlePlaySplice16;
    const handlePlaySplice17 = spliceHandlers.handlePlaySplice17;
    const handlePlaySplice18 = spliceHandlers.handlePlaySplice18;
    const handlePlaySplice19 = spliceHandlers.handlePlaySplice19;
    const handlePlaySplice20 = spliceHandlers.handlePlaySplice20;

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
        handleToggleMarkerLock,
        handleAutoSlice,
        handleHalfMarkers,
        handleClearAllMarkers,
        handleTransientDetection,
        handleSnapToZeroCrossings,
        handlePlaySplice1,
        handlePlaySplice2,
        handlePlaySplice3,
        handlePlaySplice4,
        handlePlaySplice5,
        handlePlaySplice6,
        handlePlaySplice7,
        handlePlaySplice8,
        handlePlaySplice9,
        handlePlaySplice10,
        handlePlaySplice11,
        handlePlaySplice12,
        handlePlaySplice13,
        handlePlaySplice14,
        handlePlaySplice15,
        handlePlaySplice16,
        handlePlaySplice17,
        handlePlaySplice18,
        handlePlaySplice19,
        handlePlaySplice20,
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
        handleToggleMarkerLock,
        handleAutoSlice,
        handleHalfMarkers,
        handleClearAllMarkers,
        handleTransientDetection,
        handleSnapToZeroCrossings,
        handlePlaySplice1,
        handlePlaySplice2,
        handlePlaySplice3,
        handlePlaySplice4,
        handlePlaySplice5,
        handlePlaySplice6,
        handlePlaySplice7,
        handlePlaySplice8,
        handlePlaySplice9,
        handlePlaySplice10,
        handlePlaySplice11,
        handlePlaySplice12,
        handlePlaySplice13,
        handlePlaySplice14,
        handlePlaySplice15,
        handlePlaySplice16,
        handlePlaySplice17,
        handlePlaySplice18,
        handlePlaySplice19,
        handlePlaySplice20,
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
        <Stack
          direction="row"
          alignItems="center"
          sx={{
            mt: 2,
            width: "100%",
            flexDirection: { xs: "column", lg: "row" },
            gap: { xs: 2, lg: 0 },
          }}
        >
          {/* Left column - Export controls */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              flex: 1,
              justifyContent: { xs: "center", lg: "flex-start" },
            }}
          >
            <ExportControls
              exportAnchorEl={state.exportAnchorEl}
              onExportWav={handleExportWav}
              onExportWavFormat={handleExportWavFormat}
              onSetExportAnchorEl={actions.setExportAnchorEl}
            />
          </Stack>

          {/* Right column - Region controls */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              flex: 1,
              justifyContent: { xs: "center", lg: "flex-end" },
              flexWrap: "wrap",
              gap: { xs: 1, sm: 1 },
            }}
          >
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
          selectedSpliceMarkerLocked={
            state.selectedSpliceMarker
              ? isMarkerLocked(
                state.selectedSpliceMarker.start,
                lockedSpliceMarkersStore,
              )
              : false
          }
          numberOfSlices={state.numberOfSlices}
          spliceMarkersCount={spliceMarkersStore.length}
          duration={state.duration}
          transientSensitivity={state.transientSensitivity}
          transientFrameSize={state.transientFrameSize}
          transientOverlap={state.transientOverlap}
          onAddSpliceMarker={handleAddSpliceMarker}
          onRemoveSpliceMarker={handleRemoveSpliceMarker}
          onToggleMarkerLock={handleToggleMarkerLock}
          onAutoSlice={handleAutoSlice}
          onHalfMarkers={handleHalfMarkers}
          onClearAllMarkers={handleClearAllMarkers}
          onSetNumberOfSlices={actions.setNumberOfSlices}
          onSetTransientSensitivity={actions.setTransientSensitivity}
          onSetTransientFrameSize={actions.setTransientFrameSize}
          onSetTransientOverlap={actions.setTransientOverlap}
          onTransientDetection={handleTransientDetection}
          onSnapToZeroCrossings={handleSnapToZeroCrossings}
        />
      </Container>
    );
  },
);

Waveform.displayName = "Waveform";

export default Waveform;

// Debug function to inspect regions from browser console
// Using proper types and accessing the global window object
interface DebugWindow extends Window {
  debugListRegions?: () => void;
  morpheditRegions?: {
    getRegions: () => Region[];
  };
}

(window as DebugWindow).debugListRegions = () => {
  const regions = (window as DebugWindow).morpheditRegions;
  if (!regions) {
    console.log(
      "🚫 No regions plugin found. Make sure an audio file is loaded.",
    );
    return;
  }

  const allRegions: Region[] = regions.getRegions();
  console.log(`📊 Found ${allRegions.length} total regions:`);
  console.log("=====================================");

  // Separate splice markers from other regions
  const spliceMarkers = allRegions.filter((r: Region) =>
    r.id.startsWith("splice-marker-"),
  );
  const otherRegions = allRegions.filter(
    (r: Region) => !r.id.startsWith("splice-marker-"),
  );

  // Display splice markers
  if (spliceMarkers.length > 0) {
    console.log(`🔷 SPLICE MARKERS (${spliceMarkers.length}):`);
    spliceMarkers
      .sort((a: Region, b: Region) => a.start - b.start)
      .forEach((region: Region, index: number) => {
        // Check if region content indicates it's locked (based on how markers are created)
        const contentText = region.content?.textContent || "";
        const isLocked = contentText === "🔒";
        console.log(`  ${index + 1}. ID: ${region.id}`);
        console.log(`     Time: ${region.start.toFixed(3)}s`);
        console.log(
          `     Content: ${contentText} ${isLocked ? "(LOCKED)" : "(UNLOCKED)"}`,
        );
        console.log(`     Draggable: ${region.drag}`);
        console.log("");
      });
  } else {
    console.log("🔷 SPLICE MARKERS: None");
  }

  // Display other regions
  if (otherRegions.length > 0) {
    console.log(`🔶 OTHER REGIONS (${otherRegions.length}):`);
    otherRegions.forEach((region: Region, index: number) => {
      console.log(`  ${index + 1}. ID: ${region.id}`);
      console.log(`     Start: ${region.start.toFixed(3)}s`);
      console.log(`     End: ${region.end.toFixed(3)}s`);
      console.log(`     Duration: ${(region.end - region.start).toFixed(3)}s`);
      console.log("");
    });
  } else {
    console.log("🔶 OTHER REGIONS: None");
  }

  // Display store information
  const store = useAudioStore.getState();
  console.log("📦 STORE INFORMATION:");
  console.log(`     Splice markers in store: ${store.spliceMarkers.length}`);
  console.log(
    `     Store marker times: [${store.spliceMarkers.map((m) => m.toFixed(3)).join(", ")}]`,
  );
  console.log(`     Locked markers: ${store.lockedSpliceMarkers.length}`);
  console.log(
    `     Locked marker times: [${store.lockedSpliceMarkers.map((m) => m.toFixed(3)).join(", ")}]`,
  );
  console.log("=====================================");
};

console.log("🛠️  Debug function available: debugListRegions()");

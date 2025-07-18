import { Container } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';

import type { AudioState } from './audioStore';
import { useAudioStore } from './audioStore';
import { SpliceMarkerControls } from './components/SpliceMarkerControls';
import { WaveformActionControls } from './components/WaveformActionControls';
import { WaveformControls } from './components/WaveformInfoBar';
import {
  MARKER_ICONS,
  MAX_KEYBOARD_SHORTCUT_MARKERS,
  PLAYBACK_TIMING,
  POSITION_UPDATE_INTERVAL,
  REGION_COLORS,
  REGION_POSITIONING,
  WAVEFORM_RENDERING,
} from './constants';
import { useWaveformHandlers } from './hooks/useWaveformHandlers';
import { useWaveformRefs, useWaveformState } from './hooks/useWaveformState';
// Import separated utilities and components
import { parseWavCuePoints } from './utils/audioProcessing';
import { detectBPMWithTimeout } from './utils/bpmDetection';
import { type ExportFormat } from './utils/exportUtils';
import { waveformLogger } from './utils/logger';
import { removeAllSpliceMarkersAndClearSelection } from './utils/regionHelpers';
import { getRegionInfo } from './utils/regionUtils';
import {
  createGenericSpliceHandler,
  type SpliceMarkerHandlers,
} from './utils/spliceMarkerHandlers';
import {
  isMarkerLocked,
  loadExistingCuePoints,
  updateSpliceMarkerColors,
} from './utils/spliceMarkerUtils';
import { findNearestZeroCrossing } from './utils/transientDetection';
import { loadAudioIntoWaveform } from './utils/waveformAudioLoader';
import { setupWaveformDebugUtils } from './utils/waveformDebugUtils';
import {
  calculatePerfectFitZoom,
  createWaveSurferInstance,
} from './utils/waveformInitialization';

interface WaveformProps {
  audioUrl: string;
  shouldTruncate?: boolean;
  onLoadingComplete?: () => void;
  onProcessingStart?: (message: string) => void;
  onProcessingComplete?: () => void;
}

export interface WaveformRef extends SpliceMarkerHandlers {
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
  handleCrossfadeRegion: () => void;
  handleApplyCrop: () => void;
  handleApplyFades: () => void;
  handleApplyCrossfade: () => void;
  handleNormalize: () => void;
  handleReverse: () => void;
  handleTempoAndPitch: () => void;
  handleUndo: () => void;
  handleExport: () => void;
  handleExportSlices: () => Promise<
    'no-slices' | 'no-audio' | 'success' | 'error'
  >;
  handleExportFormatChange: (format: ExportFormat) => void;
  handleAddSpliceMarker: () => void;
  handleRemoveSpliceMarker: () => void;
  handleToggleMarkerLock: () => void;
  handleAutoSlice: () => void;
  handleHalfMarkers: () => void;
  handleClearAllMarkers: () => void;
  handleTransientDetection: () => void;
  handleSnapToZeroCrossings: () => void;
  resetZoomState: () => void;
}

const Waveform = forwardRef<WaveformRef, WaveformProps>(
  (
    {
      audioUrl,
      onLoadingComplete,
      onProcessingComplete,
      onProcessingStart,
      shouldTruncate = false,
    },
    ref
  ) => {
    const theme = useTheme();

    // Use custom hooks for state and refs management
    const [state, actions] = useWaveformState(audioUrl);
    const { cropRegionRef, isLoopingRef, regionsRef, wavesurferRef } =
      useWaveformRefs();

    // State to trigger region info updates when regions change
    const [regionUpdateTrigger, setRegionUpdateTrigger] = useState(0);

    // Extract stable action functions
    const { setCurrentTime } = actions;

    // Audio store hooks
    const setAudioBuffer = useAudioStore((s: AudioState) => s.setAudioBuffer);
    const setBpm = useAudioStore((s: AudioState) => s.setBpm);
    const setMarkers = useAudioStore((s: AudioState) => s.setMarkers);
    const setRegions = useAudioStore((s: AudioState) => s.setRegions);
    const setSpliceMarkersStore = useAudioStore(
      (s: AudioState) => s.setSpliceMarkers
    );
    const spliceMarkersStore = useAudioStore(
      (s: AudioState) => s.spliceMarkers
    );
    const bpm = useAudioStore((s: AudioState) => s.bpm);
    const lockedSpliceMarkersStore = useAudioStore(
      (s: AudioState) => s.lockedSpliceMarkers
    );
    const setLockedSpliceMarkersStore = useAudioStore(
      (s: AudioState) => s.setLockedSpliceMarkers
    );
    const setPendingTempoCallbacks = useAudioStore(
      (s: AudioState) => s.setPendingTempoCallbacks
    );

    const canUndo = useAudioStore((s: AudioState) => s.canUndo);

    // Sync currentAudioUrl with audioUrl prop
    useEffect(() => {
      waveformLogger.debug('audioUrl changed, updating currentAudioUrl');
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
      [theme, regionsRef]
    );

    // Helper function to detect BPM from audio buffer
    const detectAndSetBPM = useCallback(
      async (audioBuffer: AudioBuffer) => {
        try {
          waveformLogger.debug('Starting BPM detection for audio buffer');
          const detectedBpm = await detectBPMWithTimeout(audioBuffer, 20000); // 20 second timeout
          setBpm(detectedBpm);
          if (detectedBpm) {
            waveformLogger.debug(`BPM detected: ${detectedBpm}`);
          } else {
            waveformLogger.warn('BPM detection failed or returned no result');
          }
        } catch (error) {
          waveformLogger.error('Error during BPM detection:', error);
          setBpm(null);
        }
      },
      [setBpm]
    );

    // Extract handlers using the custom hook
    const handlers = useWaveformHandlers({
      state,
      actions,
      wavesurferRef,
      regionsRef,
      cropRegionRef,
      memoizedUpdateSpliceMarkerColors,
      onProcessingStart,
      onProcessingComplete,
    });

    // Main wavesurfer initialization effect
    useEffect(() => {
      waveformLogger.debug('WaveSurfer useEffect starting');

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

      const { regions, wavesurfer: ws } = createWaveSurferInstance(theme);
      wavesurferRef.current = ws;
      regionsRef.current = regions;

      // Reset zoom state flag when creating new WaveSurfer instance to prevent Edge browser issues
      if (handlers.resetZoomState) {
        handlers.resetZoomState();
      }

      // Check for recorded audio flag early for use in multiple handlers
      const urlToCheck = audioUrl || state.currentAudioUrl || '';
      const isRecordedAudio = urlToCheck.includes('#morphedit-recorded');

      // Set up event listeners
      ws.on('ready', async () => {
        try {
          waveformLogger.debug('WaveSurfer ready - starting setup');

          actions.setDuration(ws.getDuration());

          // Apply zoom - calculate initial zoom to fit container perfectly
          if (state.zoom === 0) {
            const duration = ws.getDuration();

            // Simple, clean zoom calculation after a short delay to ensure container is ready
            setTimeout(() => {
              if (ws && wavesurferRef.current === ws) {
                const perfectZoom = calculatePerfectFitZoom(duration);

                console.log('Applying perfect fit zoom:', {
                  duration,
                  perfectZoom,
                });

                // Set state and apply zoom
                actions.setZoom(perfectZoom);
                actions.setResetZoom(perfectZoom);
                ws.zoom(perfectZoom);
              }
            }, 100); // Short delay for container to be ready
          } else {
            console.log('Applying existing zoom:', state.zoom);
            ws.zoom(state.zoom);
          }

          // Parse WAV file for existing cue points and load them as splice markers
          // Skip this for cropped/faded URLs (processed audio) since markers are handled manually
          // For processed audio, we need to check if we're currently processing or if the URL has processing flags
          const isAudioProcessing = useAudioStore.getState().isProcessingAudio;
          const isUndoing = useAudioStore.getState().isUndoing;

          console.log('=== URL DEBUG ===');
          console.log('audioUrl prop:', audioUrl);
          console.log('state.currentAudioUrl:', state.currentAudioUrl);
          console.log('urlToCheck:', urlToCheck);
          console.log('isAudioProcessing:', isAudioProcessing);
          console.log('isUndoing:', isUndoing);

          const isProcessedAudio =
            urlToCheck.includes('#morphedit-cropped') ||
            urlToCheck.includes('#morphedit-faded') ||
            urlToCheck.includes('#morphedit-tempo-pitch') ||
            isAudioProcessing || // Also treat as processed if we're currently processing
            isUndoing; // Also treat as processed if we're undoing to preserve restored markers
          const isConcatenatedAudio = urlToCheck.includes(
            '#morphedit-concatenated'
          );
          const isAppendedAudio = urlToCheck.includes('#morphedit-appended');

          console.log('isProcessedAudio:', isProcessedAudio);
          console.log('isConcatenatedAudio:', isConcatenatedAudio);
          console.log('isAppendedAudio:', isAppendedAudio);
          console.log('isRecordedAudio:', isRecordedAudio);
          console.log('Undo operation in progress:', isUndoing);
          console.log('=== END URL DEBUG ===');

          // Use the checked URL for loading
          const urlToLoad = urlToCheck;

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
              'Loading splice markers from store for concatenated/appended audio'
            );

            // Clear existing visual markers
            removeAllSpliceMarkersAndClearSelection(
              regions,
              () => {},
              () => {}
            );

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
              `Created ${currentSpliceMarkers.length} visual markers from store for concatenated/appended audio`
            );
          }
          // For processed audio (cropped/faded) or undo operations, create visual markers directly from store to ensure correct positioning
          else if (isProcessedAudio && currentSpliceMarkers.length > 0) {
            console.log('=== PROCESSED AUDIO MARKER LOADING DEBUG ===');
            console.log(
              'URL contains cropped:',
              urlToLoad.includes('#morphedit-cropped')
            );
            console.log(
              'URL contains faded:',
              urlToLoad.includes('#morphedit-faded')
            );
            console.log('Is undo operation:', isUndoing);
            console.log('Current store splice markers:', currentSpliceMarkers);
            console.log('Current store locked markers:', currentLockedMarkers);
            console.log(
              'Creating visual markers from store for processed audio or undo operation'
            );

            // Clear existing visual markers
            const allRegions = regions.getRegions();
            const existingSpliceMarkers = allRegions.filter((r: Region) =>
              r.id.startsWith('splice-marker-')
            );
            console.log(
              'Clearing existing splice markers:',
              existingSpliceMarkers.length
            );
            existingSpliceMarkers.forEach((marker: Region) => marker.remove());

            // Create visual markers from store (which has the correct adjusted times for crops or restored times for undo)
            currentSpliceMarkers.forEach((markerTime, index) => {
              const isLocked = isMarkerLocked(markerTime, currentLockedMarkers);
              console.log(
                `Creating visual marker ${index}: time=${markerTime}, locked=${isLocked}`
              );
              const markerId = isUndoing
                ? `splice-marker-undo-${index}-${Date.now()}`
                : `splice-marker-processed-${index}-${Date.now()}`;
              regions.addRegion({
                start: markerTime,
                color: REGION_COLORS.SPLICE_MARKER,
                drag: !isLocked, // Prevent dragging if marker is locked
                resize: false,
                id: markerId,
                content: isLocked ? MARKER_ICONS.LOCKED : MARKER_ICONS.UNLOCKED, // Use lock icon for locked markers
              });
            });

            console.log(
              `Created ${currentSpliceMarkers.length} visual markers from store for ${isUndoing ? 'undo operation' : 'processed audio'}`
            );
            console.log('=== END PROCESSED AUDIO MARKER LOADING DEBUG ===');
          }
          // Load cue points from WAV files (for regular unprocessed audio)
          else {
            console.log('Loading cue points from audio file...');
            try {
              if (urlToLoad) {
                const existingCuePoints = await parseWavCuePoints(urlToLoad);
                if (existingCuePoints.length > 0) {
                  console.log(
                    'Found cue points, loading as splice markers:',
                    existingCuePoints
                  );
                  loadExistingCuePoints(
                    regions,
                    existingCuePoints,
                    setSpliceMarkersStore
                  );
                } else {
                  console.log('No cue points found in audio file');
                }
              } else {
                console.log('No URL available for cue point parsing');
              }
            } catch (error) {
              console.error('Error loading cue points:', error);
            }
          }

          // Call loading complete callback after everything is set up
          // Always call the callback for each ready event since each represents a new audio load
          console.log('About to call onLoadingComplete callback', {
            hasCallback: !!onLoadingComplete,
          });
          if (onLoadingComplete) {
            console.log('Waveform ready - calling onLoadingComplete callback');
            // Add a small delay to ensure everything is truly ready
            setTimeout(() => {
              console.log('Calling onLoadingComplete after brief delay');
              onLoadingComplete();
            }, PLAYBACK_TIMING.READY_CALLBACK_DELAY);
          } else {
            console.log(
              'Waveform ready - no onLoadingComplete callback provided'
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
              'Ready event - audio processing in progress, skipping buffer update'
            );
            return;
          }

          // For processed audio (cropped/faded/tempo-pitch), trust the buffer that's already in the store
          // since it was specifically set by the processing operations
          if (isProcessedAudio && currentStoredBuffer) {
            console.log(
              'Ready event - processed audio detected, checking processing type'
            );
            console.log(
              `Store buffer duration: ${currentStoredBuffer.length / currentStoredBuffer.sampleRate}s, WS duration: ${wsDuration}s`
            );

            // Double-check that our store buffer makes sense for processed audio
            const urlContainsCropped = urlToLoad.includes('#morphedit-cropped');
            const urlContainsFaded = urlToLoad.includes('#morphedit-faded');
            const urlContainsTempoPitch = urlToLoad.includes(
              '#morphedit-tempo-pitch'
            );
            console.log('Ready event - URL flags:', {
              urlContainsCropped,
              urlContainsFaded,
              urlContainsTempoPitch,
            });

            // For tempo/pitch processing, we need to allow the buffer to be updated
            // because the duration and content have changed significantly
            if (!urlContainsTempoPitch) {
              console.log(
                'Ready event - keeping existing buffer for non-tempo-pitch processing'
              );
              return;
            } else {
              console.log(
                'Ready event - tempo/pitch processing detected, will force buffer update from backend'
              );
              // Don't return here - we want to continue and update the buffer
            }
          }

          // Check if we already have a buffer with the correct duration (within tolerance)
          // BUT skip this check for tempo/pitch processing and recorded audio since we always want to update
          const isTempoOrPitchProcessing = audioUrl.includes(
            '#morphedit-tempo-pitch'
          );
          console.log('🎵 isTempoOrPitchProcessing:', isTempoOrPitchProcessing);
          console.log('🎵 isRecordedAudio:', isRecordedAudio);
          console.log('🎵 audioUrl for check:', audioUrl);
          console.log('🎵 urlToLoad for check:', urlToLoad);

          // Special handling for recorded audio to ensure proper interaction setup
          if (isRecordedAudio) {
            console.log(
              '🎙️ Recorded audio detected - ensuring proper WaveSurfer setup'
            );
            // Force interaction to be enabled for recorded audio
            if (wavesurferRef.current) {
              console.log(
                '🎙️ Setting interaction properties for recorded audio'
              );
              // Ensure the wavesurfer instance has proper interaction enabled
              const wsInstance = wavesurferRef.current as unknown as {
                options?: { interact?: boolean };
              };
              if (wsInstance.options) {
                wsInstance.options.interact = true;
              }
            }
          }

          const bufferAlreadyCorrect =
            !isTempoOrPitchProcessing &&
            !isRecordedAudio && // Always update buffer for recorded audio
            currentStoredBuffer &&
            Math.abs(
              currentStoredBuffer.length / currentStoredBuffer.sampleRate -
                wsDuration
            ) < WAVEFORM_RENDERING.BUFFER_DURATION_TOLERANCE;

          if (bufferAlreadyCorrect) {
            console.log(
              'Ready event - audio buffer already correctly set in store, skipping update'
            );
            return;
          }

          console.log(
            'Ready event - proceeding with buffer update for audio type:',
            {
              isRecordedAudio,
              isTempoOrPitchProcessing,
              hasCurrentBuffer: !!currentStoredBuffer,
              wsDuration,
            }
          );

          const backend = (
            ws as unknown as { backend?: { buffer?: AudioBuffer } }
          ).backend;

          console.log(
            'Ready event - checking for backend buffer:',
            !!(backend && backend.buffer)
          );
          console.log('Ready event - audio duration:', wsDuration);

          if (backend && backend.buffer) {
            console.log(
              'Setting audio buffer from backend - duration:',
              backend.buffer.length / backend.buffer.sampleRate,
              'seconds'
            );
            setAudioBuffer(backend.buffer);
            // Detect BPM in the background
            detectAndSetBPM(backend.buffer);

            // Check for and execute pending tempo/pitch callbacks
            const currentPendingCallbacks =
              useAudioStore.getState().pendingTempoCallbacks;
            console.log(
              '🎵 Checking for pending callbacks after backend buffer set:',
              {
                hasPendingCallbacks: !!currentPendingCallbacks,
                callbackCount: currentPendingCallbacks?.length || 0,
              }
            );
            if (currentPendingCallbacks && currentPendingCallbacks.length > 0) {
              console.log(
                '🎵 Executing pending tempo/pitch callbacks after backend buffer set',
                currentPendingCallbacks
              );
              currentPendingCallbacks.forEach((callback, index) => {
                try {
                  console.log(
                    `🎵 Executing callback ${index + 1}/${currentPendingCallbacks.length}`
                  );
                  callback();
                } catch (error) {
                  console.error('Error executing pending callback:', error);
                }
              });
              // Clear the pending callbacks
              setPendingTempoCallbacks(null);
              console.log('🎵 Cleared pending callbacks after execution');
            }
          } else {
            console.log(
              'No backend buffer available, attempting manual decode'
            );
            // Fallback: load and decode the current audio file manually
            // For tempo/pitch processing, use the new processed audio URL
            // For recorded audio and regular audio, use cleaned URL to avoid fragment issues
            const urlToLoad = isTempoOrPitchProcessing
              ? audioUrl.split('#')[0] // Use new processed audio URL
              : isRecordedAudio
                ? audioUrl.split('#')[0] // Use recorded audio URL without fragment
                : (state.currentAudioUrl || audioUrl).split('#')[0]; // Use current URL for regular audio

            console.log('🎵 Manual decode - using URL:', urlToLoad);
            console.log('🎵 Manual decode - audio type:', {
              isRecordedAudio,
              isTempoOrPitchProcessing,
            });

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
                    'Audio buffer decoded successfully - duration:',
                    decodedBuffer.length / decodedBuffer.sampleRate,
                    'seconds'
                  );
                  setAudioBuffer(decodedBuffer);
                  // Detect BPM in the background
                  detectAndSetBPM(decodedBuffer);

                  // If this was a tempo/pitch processed audio, reset zoom
                  if (isTempoOrPitchProcessing) {
                    console.log(
                      '🔍 [Waveform] Resetting zoom after tempo/pitch processing'
                    );
                    if (typeof handleZoomReset === 'function') {
                      handleZoomReset();
                    }
                  }

                  // Check for and execute pending tempo/pitch callbacks
                  const currentPendingCallbacks =
                    useAudioStore.getState().pendingTempoCallbacks;
                  console.log(
                    '🎵 Checking for pending callbacks after manual decode:',
                    {
                      hasPendingCallbacks: !!currentPendingCallbacks,
                      callbackCount: currentPendingCallbacks?.length || 0,
                    }
                  );
                  if (
                    currentPendingCallbacks &&
                    currentPendingCallbacks.length > 0
                  ) {
                    console.log(
                      '🎵 Executing pending tempo/pitch callbacks after manual decode'
                    );
                    currentPendingCallbacks.forEach((callback, index) => {
                      try {
                        console.log(
                          `🎵 Executing callback ${index + 1}/${currentPendingCallbacks.length}`
                        );
                        callback();
                      } catch (error) {
                        console.error(
                          'Error executing pending callback:',
                          error
                        );
                      }
                    });
                    // Clear the pending callbacks
                    setPendingTempoCallbacks(null);
                    console.log('🎵 Cleared pending callbacks after execution');
                  }
                })
                .catch((error) => {
                  console.error('Error decoding audio:', error);
                });
            } else {
              console.log('No URL available for manual decode');
            }
          }

          console.log('WaveSurfer ready event completed successfully');
        } catch (error) {
          console.error('Error in WaveSurfer ready event:', error);
          // Continue execution - callback was already called at the beginning
        }
      });

      ws.on('play', () => actions.setIsPlaying(true));
      ws.on('pause', () => actions.setIsPlaying(false));
      ws.on('finish', () => {
        console.log('Playback finished');
        actions.setIsPlaying(false);
        // Handle whole-audio looping (when no crop region exists)
        if (isLoopingRef.current && !cropRegionRef.current) {
          ws.seekTo(0);
          ws.play();
        }
      });

      // Update current time during playback
      ws.on('timeupdate', (time: number) => {
        actions.setCurrentTime(time);
      });

      // Update current time when interacting with the waveform
      ws.on('interaction', () => {
        actions.setCurrentTime(ws.getCurrentTime());
      });

      // Update current time when clicking on the waveform
      ws.on('click', () => {
        const newTime = ws.getCurrentTime();
        console.log('🎙️ WaveSurfer click event - seeking to:', newTime);
        actions.setCurrentTime(newTime);

        // Use a longer timeout to allow region-clicked event to fire first and be processed
        // If a region was clicked, the region-clicked handler will re-select the marker
        // If no region was clicked, this will clear the selection
        setTimeout(() => {
          console.log('Checking if we should clear selection after click');
          // Always clear first, region-clicked will re-select if needed
          actions.setSelectedSpliceMarker(null);
          if (regionsRef.current) {
            memoizedUpdateSpliceMarkerColors(null);
          }
        }, 10); // Longer delay to ensure region-clicked fires first

        // For recorded audio, ensure the seek actually works
        if (isRecordedAudio) {
          console.log('🎙️ Recorded audio click - forcing seek update');
          // Small delay to ensure the seek takes effect
          setTimeout(() => {
            if (wavesurferRef.current) {
              const actualTime = wavesurferRef.current.getCurrentTime();
              console.log('🎙️ Actual time after seek:', actualTime);
              actions.setCurrentTime(actualTime);
            }
          }, 10);
        }
      });

      // Load audio using extracted helper function
      (async () => {
        await loadAudioIntoWaveform(
          ws,
          audioUrl,
          shouldTruncate,
          state,
          actions,
          setAudioBuffer
        );
      })();

      // Set up region event listeners
      regions.on('region-out', (region: Region) => {
        // When a region finishes playing, loop it if looping is enabled
        if (region.id === 'crop-loop' && isLoopingRef.current) {
          region.play();
        } else if (region.id === 'crop-loop') {
          ws.pause();
        }
      });

      const updateRegionsAndMarkers = () => {
        console.log('=== updateRegionsAndMarkers called ===');

        // @ts-expect-error: regions is not typed in wavesurfer.js yet
        const regionList: Region[] = Object.values(ws.regions?.list ?? {});
        console.log('Raw region list from WS:', regionList);
        // @ts-expect-error: regions is not typed in wavesurfer.js yet
        console.log('WS regions object:', ws.regions);

        // Also try getting regions from the regions plugin directly
        const pluginRegions = regions?.getRegions() || [];
        console.log('Regions from plugin:', pluginRegions);

        // Snap regions to zero if they're close enough
        const SNAP_TO_ZERO_THRESHOLD =
          REGION_POSITIONING.SNAP_TO_ZERO_THRESHOLD; // 50ms threshold for snapping to zero

        [...regionList, ...pluginRegions].forEach((region: Region) => {
          // Only snap crop and fade regions, not splice markers
          if (
            region.id === 'crop-loop' ||
            region.id === 'fade-in' ||
            region.id === 'fade-out'
          ) {
            const shouldSnapStart =
              region.start > 0 && region.start <= SNAP_TO_ZERO_THRESHOLD;

            if (shouldSnapStart) {
              console.log(
                `Snapping ${region.id} start from ${region.start} to 0`
              );
              // Update the region to snap to zero
              region.setOptions({ start: 0 });

              // If it's a crop region, update the state
              if (region.id === 'crop-loop') {
                actions.setCropRegion(region);
              }
            }
          }
        });

        setRegions(
          regionList
            .filter((r) => r.end > r.start)
            .map((r) => ({ start: r.start, end: r.end }))
        );
        setMarkers(
          regionList.filter((r) => r.end === r.start).map((r) => r.start)
        );

        // Synchronize splice marker positions back to the store when they are moved
        const spliceMarkerRegions = regionList.filter((r: Region) =>
          r.id.startsWith('splice-marker-')
        );

        // Also check plugin regions
        const pluginSpliceMarkers = pluginRegions.filter((r: Region) =>
          r.id.startsWith('splice-marker-')
        );

        console.log(
          'Found splice marker regions (WS):',
          spliceMarkerRegions.length
        );
        console.log(
          'Found splice marker regions (plugin):',
          pluginSpliceMarkers.length
        );
        console.log(
          'Splice marker region IDs (WS):',
          spliceMarkerRegions.map((r) => r.id)
        );
        console.log(
          'Splice marker region IDs (plugin):',
          pluginSpliceMarkers.map((r) => r.id)
        );

        // Use plugin regions if WS regions are empty
        const actualSpliceMarkers =
          spliceMarkerRegions.length > 0
            ? spliceMarkerRegions
            : pluginSpliceMarkers;

        if (actualSpliceMarkers.length > 0) {
          // Get current marker positions from visual regions
          const currentVisualMarkerPositions = actualSpliceMarkers
            .map((r: Region) => r.start)
            .sort((a, b) => a - b);

          // Get current store positions
          const currentStorePositions = [...spliceMarkersStore].sort(
            (a, b) => a - b
          );

          // Check if positions have changed (tolerance check to avoid infinite updates)
          const positionsChanged =
            currentVisualMarkerPositions.length !==
              currentStorePositions.length ||
            currentVisualMarkerPositions.some(
              (pos, index) =>
                Math.abs(pos - (currentStorePositions[index] || 0)) > 0.001
            );

          if (positionsChanged) {
            console.log(
              'Splice marker positions changed, synchronizing store...'
            );
            console.log('Old positions:', currentStorePositions);
            console.log('New positions:', currentVisualMarkerPositions);

            // Apply zero-crossing detection to moved markers
            const audioBuffer = useAudioStore.getState().audioBuffer;
            let finalMarkerPositions = currentVisualMarkerPositions;

            if (audioBuffer) {
              finalMarkerPositions = currentVisualMarkerPositions.map(
                (markerTime) => findNearestZeroCrossing(audioBuffer, markerTime)
              );
              console.log('Applied zero-crossing to moved markers:', {
                original: currentVisualMarkerPositions,
                snapped: finalMarkerPositions,
              });
            }

            setSpliceMarkersStore(finalMarkerPositions);

            // Also synchronize locked markers - check which visual markers are locked
            // and update the locked markers store accordingly
            const currentLockedMarkers =
              useAudioStore.getState().lockedSpliceMarkers;
            const newLockedMarkers: number[] = [];

            actualSpliceMarkers.forEach((region: Region) => {
              // Check if this marker was previously locked by finding the closest match in old locked markers
              const markerPosition = region.start;
              const wasLocked = currentLockedMarkers.some((lockedPos) =>
                currentStorePositions.some(
                  (oldPos) =>
                    Math.abs(oldPos - lockedPos) < 0.001 &&
                    Math.abs(oldPos - markerPosition) < 0.1
                )
              );

              if (wasLocked) {
                // Use the snapped position for locked markers too
                const snappedPosition = audioBuffer
                  ? findNearestZeroCrossing(audioBuffer, markerPosition)
                  : markerPosition;
                newLockedMarkers.push(snappedPosition);
              }
            });

            // Update locked markers store if needed
            const lockedPositionsChanged =
              newLockedMarkers.length !== currentLockedMarkers.length ||
              newLockedMarkers.some(
                (pos) =>
                  !currentLockedMarkers.some(
                    (locked) => Math.abs(pos - locked) < 0.001
                  )
              );

            if (lockedPositionsChanged) {
              console.log(
                'Locked marker positions changed, synchronizing locked store...'
              );
              console.log('Old locked positions:', currentLockedMarkers);
              console.log('New locked positions:', newLockedMarkers);
              setLockedSpliceMarkersStore(newLockedMarkers);
            }
          }
        }

        // Trigger region info update for WaveformControls
        setRegionUpdateTrigger((prev) => prev + 1);

        console.log('=== updateRegionsAndMarkers completed ===');
      };

      // @ts-expect-error: event types are not complete in wavesurfer.js
      ws.on('region-updated', updateRegionsAndMarkers);
      // @ts-expect-error: event types are not complete in wavesurfer.js
      ws.on('region-created', updateRegionsAndMarkers);
      // @ts-expect-error: event types are not complete in wavesurfer.js
      ws.on('region-removed', updateRegionsAndMarkers);

      // Listen to region plugin events for real-time updates during dragging/resizing
      regions.on('region-updated', updateRegionsAndMarkers);
      regions.on('region-created', updateRegionsAndMarkers);
      regions.on('region-removed', updateRegionsAndMarkers);

      // Handle splice marker selection
      regions.on('region-clicked', (region: Region) => {
        console.log(
          'Region clicked:',
          region.id,
          'starts with splice-marker:',
          region.id.startsWith('splice-marker-')
        );

        // Only handle splice marker regions, ignore other regions and waveform clicks
        if (region.id.startsWith('splice-marker-')) {
          console.log('Splice marker selected:', region.id);

          // Use a timeout to ensure this runs after the click event's timeout
          setTimeout(() => {
            actions.setSelectedSpliceMarker(region);
            memoizedUpdateSpliceMarkerColors(region);
          }, 20); // Longer than the click event timeout

          // Store current position to restore it after the region click
          const currentPosition = ws.getCurrentTime();

          // Use a timeout to restore the position after the region click processing
          // ONLY for splice marker clicks, not for general waveform clicks
          setTimeout(() => {
            if (wavesurferRef.current) {
              const duration = wavesurferRef.current.getDuration();
              if (duration > 0) {
                wavesurferRef.current.seekTo(currentPosition / duration);
              }
            }
          }, 25); // After selection is set
        } else if (
          region.id.startsWith('crop-') ||
          region.id.startsWith('fade-')
        ) {
          // Handle other specific region types without position restoration
          console.log(
            'Crop/fade region clicked, clearing splice marker selection'
          );
          actions.setSelectedSpliceMarker(null);
          memoizedUpdateSpliceMarkerColors(null);
        }
        // Note: Removed the else clause here since waveform clicks are now handled by the 'click' event
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
    const handlePlayPause = handlers.handlePlayPause;
    const handleRewind = handlers.handleRewind;
    const handleZoom = handlers.handleZoom;
    const handleZoomReset = handlers.handleZoomReset;
    const handleSkipForward = handlers.handleSkipForward;
    const handleSkipBackward = handlers.handleSkipBackward;
    const handleIncreaseSkipIncrement = handlers.handleIncreaseSkipIncrement;
    const handleDecreaseSkipIncrement = handlers.handleDecreaseSkipIncrement;

    // Region handlers
    const handleCropRegion = handlers.handleCropRegion;
    const handleLoop = handlers.handleLoop;
    const handleFadeInRegion = handlers.handleFadeInRegion;
    const handleFadeOutRegion = handlers.handleFadeOutRegion;
    const handleCrossfadeRegion = handlers.handleCrossfadeRegion;
    const handleApplyCrop = handlers.handleApplyCrop;
    const handleApplyFades = handlers.handleApplyFades;
    const handleApplyCrossfade = handlers.handleApplyCrossfade;
    const handleNormalize = handlers.handleNormalize;
    const handleReverse = handlers.handleReverse;
    const handleTempoAndPitch = handlers.handleTempoAndPitch;
    const handleUndo = handlers.handleUndo;

    // Splice marker handlers
    const handleAddSpliceMarker = handlers.handleAddSpliceMarker;
    const handleRemoveSpliceMarker = handlers.handleRemoveSpliceMarker;
    const handleToggleMarkerLock = handlers.handleToggleMarkerLock;
    const handleAutoSlice = handlers.handleAutoSlice;
    const handleHalfMarkers = handlers.handleHalfMarkers;
    const handleClearAllMarkers = handlers.handleClearAllMarkers;
    const handleTransientDetection = handlers.handleTransientDetection;
    const handleSnapToZeroCrossings = handlers.handleSnapToZeroCrossings;

    // Export handlers
    const handleExport = handlers.handleExport;
    const handleExportSlices = handlers.handleExportSlices;
    const handleExportFormatChange = handlers.handleExportFormatChange;

    // Utility handlers
    const resetZoomState = handlers.resetZoomState;

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

    // Extract individual handlers for the interface
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
        handleCrossfadeRegion,
        handleApplyCrop,
        handleApplyFades,
        handleApplyCrossfade,
        handleNormalize,
        handleReverse,
        handleTempoAndPitch,
        handleUndo,
        handleExport,
        handleExportSlices,
        handleExportFormatChange,
        handleAddSpliceMarker,
        handleRemoveSpliceMarker,
        handleToggleMarkerLock,
        handleAutoSlice,
        handleHalfMarkers,
        handleClearAllMarkers,
        handleTransientDetection,
        handleSnapToZeroCrossings,
        resetZoomState,
        ...spliceHandlers,
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
        handleCrossfadeRegion,
        handleApplyCrop,
        handleApplyFades,
        handleApplyCrossfade,
        handleNormalize,
        handleReverse,
        handleTempoAndPitch,
        handleUndo,
        handleExport,
        handleExportSlices,
        handleExportFormatChange,
        handleAddSpliceMarker,
        handleRemoveSpliceMarker,
        handleToggleMarkerLock,
        handleAutoSlice,
        handleHalfMarkers,
        handleClearAllMarkers,
        handleTransientDetection,
        handleSnapToZeroCrossings,
        resetZoomState,
        spliceHandlers,
        state.zoom,
      ]
    );

    // Handle mouse wheel zoom with passive: false
    useEffect(() => {
      const handleWheelZoom = (event: WheelEvent) => {
        // Always prevent page scrolling when mouse wheel is used over the waveform area
        event.preventDefault();
        event.stopPropagation();

        // Calculate zoom step based on current zoom level for smoother experience
        const currentZoom = state.zoom;
        const zoomStep = Math.max(1, currentZoom * 0.1); // 10% of current zoom, minimum 1
        const zoomDelta = event.deltaY > 0 ? -zoomStep : zoomStep; // Negative deltaY means zoom in
        const newZoom = currentZoom + zoomDelta;

        // Apply zoom with constraints
        handleZoom(newZoom);
      };

      // Get the container element
      const container = document.getElementById('waveform-container');
      if (container) {
        // Add event listener with passive: false to allow preventDefault
        container.addEventListener('wheel', handleWheelZoom, {
          passive: false,
        });

        return () => {
          container.removeEventListener('wheel', handleWheelZoom);
        };
      }
    }, [state.zoom, handleZoom]);

    // Initialize debug utilities
    useEffect(() => {
      setupWaveformDebugUtils();
    }, []);

    return (
      <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
        {/* Playback controls */}
        <WaveformControls
          isPlaying={state.isPlaying}
          isLooping={state.isLooping}
          currentTime={state.currentTime}
          duration={state.duration}
          bpm={bpm}
          zoom={state.zoom}
          skipIncrement={state.skipIncrement}
          spliceMarkersCount={spliceMarkersStore.length}
          regionInfo={regionInfo}
          selectedSpliceMarkerTime={state.selectedSpliceMarker?.start ?? null}
          onPlayPause={handlePlayPause}
          onLoop={handleLoop}
          onRewind={handleRewind}
          onZoom={handleZoom}
          onZoomReset={handleZoomReset}
        />

        {/* Export and Region controls */}
        <WaveformActionControls
          selectedExportFormat={state.selectedExportFormat}
          exportAnchorEl={state.exportAnchorEl}
          fadeInAnchorEl={state.fadeInAnchorEl}
          fadeOutAnchorEl={state.fadeOutAnchorEl}
          crossfadeAnchorEl={state.crossfadeAnchorEl}
          cropMode={state.cropMode}
          fadeInMode={state.fadeInMode}
          fadeOutMode={state.fadeOutMode}
          fadeInCurveType={state.fadeInCurveType}
          fadeOutCurveType={state.fadeOutCurveType}
          crossfadeMode={state.crossfadeMode}
          crossfadeCurveType={state.crossfadeCurveType}
          selectedSpliceMarker={!!state.selectedSpliceMarker}
          canUndo={canUndo}
          onExport={handleExport}
          onExportSlices={handleExportSlices}
          onExportFormatChange={handleExportFormatChange}
          onSetExportAnchorEl={actions.setExportAnchorEl}
          onSetFadeInAnchorEl={actions.setFadeInAnchorEl}
          onSetFadeOutAnchorEl={actions.setFadeOutAnchorEl}
          onSetCrossfadeAnchorEl={actions.setCrossfadeAnchorEl}
          onNormalize={handleNormalize}
          onReverse={handleReverse}
          onTempoAndPitch={handleTempoAndPitch}
          onCropRegion={handleCropRegion}
          onApplyCrop={handleApplyCrop}
          onFadeInRegion={handleFadeInRegion}
          onFadeOutRegion={handleFadeOutRegion}
          onApplyFades={handleApplyFades}
          onCrossfadeRegion={handleCrossfadeRegion}
          onApplyCrossfade={handleApplyCrossfade}
          onSetCrossfadeCurveType={actions.setCrossfadeCurveType}
          onUndo={handleUndo}
          onSetFadeInCurveType={actions.setFadeInCurveType}
          onSetFadeOutCurveType={actions.setFadeOutCurveType}
        />

        {/* Splice marker controls */}
        <SpliceMarkerControls
          selectedSpliceMarker={!!state.selectedSpliceMarker}
          selectedSpliceMarkerLocked={
            state.selectedSpliceMarker
              ? isMarkerLocked(
                  state.selectedSpliceMarker.start,
                  lockedSpliceMarkersStore
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
  }
);

Waveform.displayName = 'Waveform';

export default Waveform;

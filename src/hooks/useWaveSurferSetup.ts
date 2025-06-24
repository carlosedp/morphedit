// WaveSurfer initialization and event setup logic

import WaveSurfer from 'wavesurfer.js';
import { WaveformActions, WaveformState } from '../hooks/useWaveformState';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { useEffect } from 'react';
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';

import { useAudioStore } from '../audioStore';
import type { AudioState } from '../audioStore';
import {
  createWaveSurferInstance,
  calculateInitialZoom,
} from '../utils/waveformInitialization';
import { loadAudioIntoWaveform } from '../utils/waveformAudioLoader';
import { parseWavCuePoints } from '../utils/audioProcessing';
import {
  loadExistingCuePoints,
  isMarkerLocked,
} from '../utils/spliceMarkerUtils';
import { removeAllSpliceMarkersAndClearSelection } from '../utils/regionHelpers';
import {
  REGION_COLORS,
  MARKER_ICONS,
  PLAYBACK_TIMING,
  WAVEFORM_RENDERING,
} from '../constants';
import { waveformLogger } from '../utils/logger';
import type { Theme } from '@mui/material/styles';

interface WaveSurferSetupProps {
  audioUrl: string;
  shouldTruncate: boolean;
  state: WaveformState; // TODO: Type this properly
  actions: WaveformActions; // TODO: Type this properly
  wavesurferRef: React.RefObject<WaveSurfer | null>;
  regionsRef: React.RefObject<RegionsPlugin | null>;
  isLoopingRef: React.RefObject<boolean>;
  cropRegionRef: React.RefObject<Region | null>;
  theme: Theme;
  memoizedUpdateSpliceMarkerColors: (selectedMarker: Region | null) => void;
  onLoadingComplete?: () => void;
}

export const useWaveSurferSetup = ({
  audioUrl,
  shouldTruncate,
  state,
  actions,
  wavesurferRef,
  regionsRef,
  isLoopingRef,
  cropRegionRef,
  theme,
  memoizedUpdateSpliceMarkerColors,
  onLoadingComplete,
}: WaveSurferSetupProps) => {
  // Audio store hooks
  const setAudioBuffer = useAudioStore((s: AudioState) => s.setAudioBuffer);
  const setMarkers = useAudioStore((s: AudioState) => s.setMarkers);
  const setRegions = useAudioStore((s: AudioState) => s.setRegions);
  const setSpliceMarkersStore = useAudioStore(
    (s: AudioState) => s.setSpliceMarkers
  );

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

    const { wavesurfer: ws, regions } = createWaveSurferInstance(theme);
    wavesurferRef.current = ws;
    regionsRef.current = regions;

    // Set up event listeners
    ws.on('ready', async () => {
      try {
        waveformLogger.debug('WaveSurfer ready - starting setup');

        actions.setDuration(ws.getDuration());

        // Apply zoom - either current zoom or calculate initial zoom to fill container
        let zoomToApply = state.zoom;
        if (state.zoom === 0) {
          // Calculate initial zoom based on audio duration and container size
          zoomToApply = calculateInitialZoom(ws.getDuration());
          actions.setZoom(zoomToApply);
          actions.setResetZoom(zoomToApply); // Store the resetZoom level for the slider

          console.log('Initial zoom calculated:', {
            duration: ws.getDuration(),
            zoomToApply,
          });
        } else {
          console.log('Applying existing zoom:', zoomToApply);
        }
        // Always apply the zoom to ensure waveform displays correctly
        ws.zoom(zoomToApply);

        // Parse WAV file for existing cue points and load them as splice markers
        // Skip this for cropped/faded URLs (processed audio) since markers are handled manually
        // For processed audio, we need to check if we're currently processing or if the URL has processing flags
        const isAudioProcessing = useAudioStore.getState().isProcessingAudio;
        const isUndoing = useAudioStore.getState().isUndoing;
        const urlToCheck = state.currentAudioUrl || audioUrl;

        console.log('=== URL DEBUG ===');
        console.log('audioUrl prop:', audioUrl);
        console.log('state.currentAudioUrl:', state.currentAudioUrl);
        console.log('urlToCheck:', urlToCheck);
        console.log('isAudioProcessing:', isAudioProcessing);
        console.log('isUndoing:', isUndoing);

        const isProcessedAudio =
          urlToCheck.includes('#morphedit-cropped') ||
          urlToCheck.includes('#morphedit-faded') ||
          isAudioProcessing || // Also treat as processed if we're currently processing
          isUndoing; // Also treat as processed if we're undoing to preserve restored markers
        const isConcatenatedAudio = urlToCheck.includes(
          '#morphedit-concatenated'
        );
        const isAppendedAudio = urlToCheck.includes('#morphedit-appended');

        console.log('isProcessedAudio:', isProcessedAudio);
        console.log('isConcatenatedAudio:', isConcatenatedAudio);
        console.log('isAppendedAudio:', isAppendedAudio);
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
            `Created ${
              currentSpliceMarkers.length
            } visual markers from store for ${
              isUndoing ? 'undo operation' : 'processed audio'
            }`
          );
          console.log('=== END PROCESSED AUDIO MARKER LOADING DEBUG ===');
        }
        // Load cue points from WAV files (for regular unprocessed audio)
        else {
          console.log('Loading cue points from audio file...');
          try {
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

        // For processed audio (cropped/faded), trust the buffer that's already in the store
        // since it was specifically set by the processing operations
        if (isProcessedAudio && currentStoredBuffer) {
          console.log(
            'Ready event - processed audio detected, keeping existing buffer in store'
          );
          console.log(
            `Store buffer duration: ${
              currentStoredBuffer.length / currentStoredBuffer.sampleRate
            }s, WS duration: ${wsDuration}s`
          );

          // Double-check that our store buffer makes sense for processed audio
          const urlContainsCropped = urlToLoad.includes('#morphedit-cropped');
          const urlContainsFaded = urlToLoad.includes('#morphedit-faded');
          console.log('Ready event - URL flags:', {
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
              wsDuration
          ) < WAVEFORM_RENDERING.BUFFER_DURATION_TOLERANCE;

        if (bufferAlreadyCorrect) {
          console.log(
            'Ready event - audio buffer already correctly set in store, skipping update'
          );
          return;
        }

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
        } else {
          console.log('No backend buffer available, attempting manual decode');
          // Fallback: load and decode the current audio file manually
          // Use cleaned URL to avoid fragment issues
          const urlToLoad = (state.currentAudioUrl || audioUrl).split('#')[0];
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
      actions.setCurrentTime(ws.getCurrentTime());
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
      // @ts-expect-error: regions is not typed in wavesurfer.js yet
      const regionList: Region[] = Object.values(ws.regions?.list ?? {});
      setRegions(
        regionList
          .filter((r) => r.end > r.start)
          .map((r) => ({ start: r.start, end: r.end }))
      );
      setMarkers(
        regionList.filter((r) => r.end === r.start).map((r) => r.start)
      );
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
      if (region.id.startsWith('splice-marker-')) {
        console.log('Splice marker selected:', region.id);
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
        console.log('Non-splice marker clicked, clearing selection');
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
};

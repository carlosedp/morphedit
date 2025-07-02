// Playback control utilities
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type WaveSurfer from 'wavesurfer.js';
import { SKIP_INCREMENTS } from '../constants';
import { useAudioStore } from '../audioStore';

// Store the current splice stop listener to clean it up when needed
let currentSpliceStopListener: ((time: number) => void) | null = null;
let currentAnimationFrame: number | null = null;

/**
 * Play a specific splice marker by its index (1-20)
 * Jumps to the splice marker position and starts playback
 * Automatically stops at the next splice marker
 */
export const playSpliceMarker = (
  ws: WaveSurfer,
  _spliceMarkers: number[], // Unused - we always get fresh markers from store
  index: number
) => {
  // Always get the current splice markers from store to ensure we have the latest positions
  // This is critical because markers can be moved by dragging, and the store is updated
  // but the handlers might still have stale marker positions
  const currentSpliceMarkers = useAudioStore.getState().spliceMarkers;

  console.log('=== SPLICE PLAYBACK DEBUG ===');
  console.log('Requested marker index:', index);
  console.log('Current markers in store:', currentSpliceMarkers);
  console.log('Store length:', currentSpliceMarkers.length);
  console.log('=== END SPLICE PLAYBACK DEBUG ===');

  if (!ws || !currentSpliceMarkers || currentSpliceMarkers.length === 0) {
    console.log(
      'Cannot play splice marker: no wavesurfer or splice markers available'
    );
    return;
  }

  // Convert 1-based index to 0-based
  const markerIndex = index - 1;

  if (markerIndex < 0 || markerIndex >= currentSpliceMarkers.length) {
    console.log(
      `Splice marker ${index} does not exist (only ${currentSpliceMarkers.length} markers available)`
    );
    return;
  }

  // Clean up any existing splice stop listener and animation frame
  if (currentSpliceStopListener) {
    ws.un('timeupdate', currentSpliceStopListener);
    currentSpliceStopListener = null;
  }
  if (currentAnimationFrame) {
    cancelAnimationFrame(currentAnimationFrame);
    currentAnimationFrame = null;
  }

  // Sort markers to ensure we get them in chronological order
  const sortedMarkers = [...currentSpliceMarkers].sort((a, b) => a - b);
  const markerTime = sortedMarkers[markerIndex];

  // Find the next splice marker (if any)
  const nextMarkerTime = sortedMarkers[markerIndex + 1];

  console.log(
    `Playing splice marker ${index} at ${markerTime.toFixed(3)}s${
      nextMarkerTime
        ? ` (will stop at ${nextMarkerTime.toFixed(3)}s)`
        : ' (no next marker, will play to end)'
    }`
  );

  // Seek to the marker position (normalized to 0-1)
  const duration = ws.getDuration();
  if (duration > 0) {
    ws.seekTo(markerTime / duration);

    // Set up listener to stop at next splice marker
    if (nextMarkerTime) {
      // Use a much more aggressive tolerance to account for audio pipeline delay
      const stopTolerance = 0.035; // 35ms tolerance - stop well before to prevent any overshoot
      const stopTime = Math.max(
        nextMarkerTime - stopTolerance,
        markerTime + 0.001
      );

      // Use requestAnimationFrame for more precise timing instead of timeupdate
      const checkStopTime = () => {
        if (!ws.isPlaying()) {
          // Playback stopped for other reasons, clean up
          if (currentAnimationFrame) {
            cancelAnimationFrame(currentAnimationFrame);
            currentAnimationFrame = null;
          }
          return;
        }

        const currentTime = ws.getCurrentTime();
        if (currentTime >= stopTime) {
          console.log(
            `Reached next splice marker at ${nextMarkerTime.toFixed(
              3
            )}s (stopped at ${currentTime.toFixed(3)}s), stopping playback`
          );

          // Clean up animation frame first
          if (currentAnimationFrame) {
            cancelAnimationFrame(currentAnimationFrame);
            currentAnimationFrame = null;
          }

          // Stop playback immediately
          ws.pause();

          // Immediately seek to the exact marker position
          ws.seekTo(nextMarkerTime / duration);
        } else {
          // Continue checking
          currentAnimationFrame = requestAnimationFrame(checkStopTime);
        }
      };

      // Start the precise timing check
      currentAnimationFrame = requestAnimationFrame(checkStopTime);

      // Fallback: also keep timeupdate listener as backup
      currentSpliceStopListener = (time: number) => {
        if (time >= stopTime) {
          console.log(`Fallback timeupdate triggered at ${time.toFixed(3)}s`);

          // Clean up both listeners
          if (currentAnimationFrame) {
            cancelAnimationFrame(currentAnimationFrame);
            currentAnimationFrame = null;
          }
          if (currentSpliceStopListener) {
            ws.un('timeupdate', currentSpliceStopListener);
            currentSpliceStopListener = null;
          }

          ws.pause();
          ws.seekTo(nextMarkerTime / duration);
        }
      };

      ws.on('timeupdate', currentSpliceStopListener);

      // Also clean up listeners when playback stops for other reasons
      const cleanupOnPause = () => {
        if (currentSpliceStopListener) {
          ws.un('timeupdate', currentSpliceStopListener);
          currentSpliceStopListener = null;
        }
        if (currentAnimationFrame) {
          cancelAnimationFrame(currentAnimationFrame);
          currentAnimationFrame = null;
        }
        ws.un('pause', cleanupOnPause);
      };
      ws.on('pause', cleanupOnPause);
    }

    // Start playback if not already playing
    if (!ws.isPlaying()) {
      ws.play();
    }
  }
};

export const playPause = (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  isPlaying: boolean,
  cropRegion: Region | null
) => {
  if (!ws) return;

  // Check if we have a crop region
  const region = regions
    ?.getRegions()
    .find((r: Region) => r.id === 'crop-loop');

  if (region && cropRegion) {
    // If we have a crop region, play/pause the region
    if (isPlaying) {
      ws.pause();
    } else {
      region.play();
    }
  } else {
    // No crop region, play/pause normally
    ws.playPause();
  }
};

export const rewind = (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  cropRegion: Region | null
) => {
  if (!ws) return;

  // Check if we have a crop region
  const region = regions
    ?.getRegions()
    .find((r: Region) => r.id === 'crop-loop');

  if (region && cropRegion) {
    // If we have a crop region, rewind to the start of the region
    ws.seekTo(region.start / ws.getDuration());
  } else {
    // No crop region, rewind to the start of the audio
    ws.seekTo(0);
  }
};

export const zoom = (ws: WaveSurfer, value: number) => {
  if (ws) ws.zoom(value);
};

export const skipForward = (ws: WaveSurfer, skipIncrement: number) => {
  if (ws) {
    const currentTime = ws.getCurrentTime();
    const newTime = Math.min(currentTime + skipIncrement, ws.getDuration());
    ws.seekTo(newTime / ws.getDuration());
  }
};

export const skipBackward = (ws: WaveSurfer, skipIncrement: number) => {
  if (ws) {
    const currentTime = ws.getCurrentTime();
    const newTime = Math.max(currentTime - skipIncrement, 0);
    ws.seekTo(newTime / ws.getDuration());
  }
};

export const increaseSkipIncrement = (skipIncrement: number): number => {
  if (skipIncrement < SKIP_INCREMENTS.SMALL_THRESHOLD)
    return skipIncrement + SKIP_INCREMENTS.SMALL_INCREMENT;
  if (skipIncrement < SKIP_INCREMENTS.LARGE_THRESHOLD)
    return skipIncrement + SKIP_INCREMENTS.MEDIUM_INCREMENT;
  if (skipIncrement < 10)
    return skipIncrement + SKIP_INCREMENTS.LARGE_INCREMENT; // 1s increments for medium values
  if (skipIncrement < 60) return skipIncrement + 10; // 10s increments for large values
  return skipIncrement + 30; // 30s increments for very large values
};

export const decreaseSkipIncrement = (skipIncrement: number): number => {
  if (skipIncrement > 60) return skipIncrement - 30; // 30s decrements for very large values
  if (skipIncrement > 10) return skipIncrement - 10; // 10s decrements for large values
  if (skipIncrement > SKIP_INCREMENTS.LARGE_THRESHOLD)
    return skipIncrement - SKIP_INCREMENTS.LARGE_INCREMENT;
  if (skipIncrement > SKIP_INCREMENTS.SMALL_THRESHOLD)
    return skipIncrement - SKIP_INCREMENTS.MEDIUM_INCREMENT;
  if (skipIncrement > SKIP_INCREMENTS.SMALL_INCREMENT)
    return skipIncrement - SKIP_INCREMENTS.SMALL_INCREMENT;
  return SKIP_INCREMENTS.MINIMUM_VALUE; // Minimum value
};

export const undo = async (
  ws: WaveSurfer,
  canUndo: boolean,
  previousAudioUrl: string | null,
  callbacks: {
    setCurrentAudioUrl: (url: string | null) => void;
    setPreviousAudioUrl: (url: string | null) => void;
    setCanUndo: (canUndo: boolean) => void;
    setCropMode: (mode: boolean) => void;
    setCropRegion: (region: Region | null) => void;
    setFadeInMode: (mode: boolean) => void;
    setFadeOutMode: (mode: boolean) => void;
    setSpliceMarkersStore?: (markers: number[]) => void;
    setLockedSpliceMarkersStore?: (markers: number[]) => void;
    resetZoom?: () => void;
    setResetZoom?: (zoom: number) => void;
  }
): Promise<void> => {
  if (!ws || !canUndo || !previousAudioUrl) {
    console.log(
      'Cannot undo: no wavesurfer, undo not available, or no previous URL'
    );
    return;
  }

  console.log('Undoing to previous audio URL:', previousAudioUrl);

  // Get the previous splice markers from the store before clearing them
  const store = useAudioStore.getState();
  const previousSpliceMarkers = store.previousSpliceMarkers;
  const previousLockedSpliceMarkers = store.previousLockedSpliceMarkers;

  console.log('=== UNDO MARKER DEBUG ===');
  console.log('Current markers in store:', store.spliceMarkers);
  console.log('Current locked markers in store:', store.lockedSpliceMarkers);
  console.log('Previous markers to restore:', previousSpliceMarkers);
  console.log(
    'Previous locked markers to restore:',
    previousLockedSpliceMarkers
  );
  console.log('=== END UNDO MARKER DEBUG ===');

  // Set undo flag to prevent the ready event from overriding our restored markers
  store.setIsUndoing(true);

  // Restore splice markers BEFORE loading the audio so the ready event sees them
  if (callbacks.setSpliceMarkersStore) {
    console.log(
      'Restoring splice markers to previous state BEFORE load:',
      previousSpliceMarkers
    );
    callbacks.setSpliceMarkersStore([...previousSpliceMarkers]);
  }

  if (callbacks.setLockedSpliceMarkersStore) {
    console.log(
      'Restoring locked splice markers to previous state BEFORE load:',
      previousLockedSpliceMarkers
    );
    callbacks.setLockedSpliceMarkersStore([...previousLockedSpliceMarkers]);
  }

  // Load the previous audio URL
  try {
    await ws.load(previousAudioUrl);
    console.log('Undo successful');

    // Update the current audio URL to the restored version
    callbacks.setCurrentAudioUrl(previousAudioUrl);
    // Clear undo state after restoring
    callbacks.setPreviousAudioUrl(null);
    callbacks.setCanUndo(false);
    // Clear the previous markers from the store
    store.setPreviousSpliceMarkers([]);
    store.setPreviousLockedSpliceMarkers([]);
    // Clear undo flag
    store.setIsUndoing(false);
    // Clear any active regions
    callbacks.setCropMode(false);
    callbacks.setCropRegion(null);
    callbacks.setFadeInMode(false);
    callbacks.setFadeOutMode(false);

    // Reset the stored resetZoom value to force recalculation for restored audio
    console.log('Resetting zoom after undo for proper display');
    if (callbacks.setResetZoom) {
      callbacks.setResetZoom(2); // Reset to default value to force recalculation
      console.log(
        'Reset stored resetZoom value to force recalculation after undo'
      );
    }

    // Apply zoom reset after a brief delay to ensure everything is loaded
    if (callbacks.resetZoom) {
      setTimeout(() => {
        console.log('Applying zoom reset after undo');
        callbacks.resetZoom!();
      }, 150);
    }
  } catch (error) {
    console.error('Error during undo:', error);
    // Clear undo flag even on error
    store.setIsUndoing(false);
  }
};

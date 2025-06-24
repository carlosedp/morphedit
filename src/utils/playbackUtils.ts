// Playback control utilities
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type WaveSurfer from 'wavesurfer.js';
import { SKIP_INCREMENTS } from '../constants';
import { useAudioStore } from '../audioStore';

// Store the current splice stop listener to clean it up when needed
let currentSpliceStopListener: ((time: number) => void) | null = null;

/**
 * Play a specific splice marker by its index (1-20)
 * Jumps to the splice marker position and starts playback
 * Automatically stops at the next splice marker
 */
export const playSpliceMarker = (
  ws: WaveSurfer,
  spliceMarkers: number[],
  index: number
) => {
  if (!ws || !spliceMarkers || spliceMarkers.length === 0) {
    console.log(
      'Cannot play splice marker: no wavesurfer or splice markers available'
    );
    return;
  }

  // Convert 1-based index to 0-based
  const markerIndex = index - 1;

  if (markerIndex < 0 || markerIndex >= spliceMarkers.length) {
    console.log(
      `Splice marker ${index} does not exist (only ${spliceMarkers.length} markers available)`
    );
    return;
  }

  // Clean up any existing splice stop listener
  if (currentSpliceStopListener) {
    ws.un('timeupdate', currentSpliceStopListener);
    currentSpliceStopListener = null;
  }

  // Sort markers to ensure we get them in chronological order
  const sortedMarkers = [...spliceMarkers].sort((a, b) => a - b);
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
      currentSpliceStopListener = (time: number) => {
        if (time >= nextMarkerTime) {
          console.log(
            `Reached next splice marker at ${nextMarkerTime.toFixed(
              3
            )}s, stopping playback`
          );
          ws.pause();

          // Clean up the listener
          if (currentSpliceStopListener) {
            ws.un('timeupdate', currentSpliceStopListener);
            currentSpliceStopListener = null;
          }
        }
      };

      ws.on('timeupdate', currentSpliceStopListener);

      // Also clean up listener when playback stops for other reasons
      const cleanupOnPause = () => {
        if (currentSpliceStopListener) {
          ws.un('timeupdate', currentSpliceStopListener);
          currentSpliceStopListener = null;
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
  } catch (error) {
    console.error('Error during undo:', error);
    // Clear undo flag even on error
    store.setIsUndoing(false);
  }
};

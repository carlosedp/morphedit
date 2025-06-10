// Playback control utilities
import type { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import type RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type WaveSurfer from "wavesurfer.js";

export const playPause = (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  isPlaying: boolean,
  cropRegion: Region | null,
) => {
  if (!ws) return;

  // Check if we have a crop region
  const region = regions
    ?.getRegions()
    .find((r: Region) => r.id === "crop-loop");

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
  cropRegion: Region | null,
) => {
  if (!ws) return;

  // Check if we have a crop region
  const region = regions
    ?.getRegions()
    .find((r: Region) => r.id === "crop-loop");

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
  if (skipIncrement < 0.1) return skipIncrement + 0.01; // 0.01s increments for very small values
  if (skipIncrement < 1) return skipIncrement + 0.1; // 0.1s increments for small values
  if (skipIncrement < 10) return skipIncrement + 1; // 1s increments for medium values
  if (skipIncrement < 60) return skipIncrement + 10; // 10s increments for large values
  return skipIncrement + 30; // 30s increments for very large values
};

export const decreaseSkipIncrement = (skipIncrement: number): number => {
  if (skipIncrement > 60) return skipIncrement - 30; // 30s decrements for very large values
  if (skipIncrement > 10) return skipIncrement - 10; // 10s decrements for large values
  if (skipIncrement > 1) return skipIncrement - 1; // 1s decrements for medium values
  if (skipIncrement > 0.1) return skipIncrement - 0.1; // 0.1s decrements for small values
  if (skipIncrement > 0.01) return skipIncrement - 0.01; // 0.01s decrements for very small values
  return 0.01; // Minimum value
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
  },
): Promise<void> => {
  if (!ws || !canUndo || !previousAudioUrl) {
    console.log(
      "Cannot undo: no wavesurfer, undo not available, or no previous URL",
    );
    return;
  }

  console.log("Undoing to previous audio URL:", previousAudioUrl);

  // Load the previous audio URL
  try {
    await ws.load(previousAudioUrl);
    console.log("Undo successful");
    // Update the current audio URL to the restored version
    callbacks.setCurrentAudioUrl(previousAudioUrl);
    // Clear undo state after restoring
    callbacks.setPreviousAudioUrl(null);
    callbacks.setCanUndo(false);
    // Clear any active regions
    callbacks.setCropMode(false);
    callbacks.setCropRegion(null);
    callbacks.setFadeInMode(false);
    callbacks.setFadeOutMode(false);
  } catch (error) {
    console.error("Error during undo:", error);
  }
};

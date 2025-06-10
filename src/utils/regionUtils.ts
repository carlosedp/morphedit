// Region utilities for crop and fade operations
import type { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import type RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type WaveSurfer from "wavesurfer.js";
import { useAudioStore } from "../audioStore";
import { audioBufferToWavWithCues } from "./audioProcessing";
import { findNearestZeroCrossing } from "./transientDetection";

// Type for region info display
export interface RegionInfo {
  cropRegion?: { start: number; end: number; duration: number };
  fadeInRegion?: { start: number; end: number; duration: number };
  fadeOutRegion?: { start: number; end: number; duration: number };
}

// Utility function to get current region information for display
export const getRegionInfo = (regions: RegionsPlugin | null): RegionInfo => {
  if (!regions) return {};

  const allRegions = regions.getRegions();
  const info: RegionInfo = {};

  // Find crop region
  const cropRegion = allRegions.find((r: Region) => r.id === "crop-loop");
  if (cropRegion) {
    info.cropRegion = {
      start: cropRegion.start,
      end: cropRegion.end,
      duration: cropRegion.end - cropRegion.start,
    };
  }

  // Find fade-in region
  const fadeInRegion = allRegions.find((r: Region) => r.id === "fade-in");
  if (fadeInRegion) {
    info.fadeInRegion = {
      start: fadeInRegion.start,
      end: fadeInRegion.end,
      duration: fadeInRegion.end - fadeInRegion.start,
    };
  }

  // Find fade-out region
  const fadeOutRegion = allRegions.find((r: Region) => r.id === "fade-out");
  if (fadeOutRegion) {
    info.fadeOutRegion = {
      start: fadeOutRegion.start,
      end: fadeOutRegion.end,
      duration: fadeOutRegion.end - fadeOutRegion.start,
    };
  }

  return info;
};

export const createCropRegion = (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  setCropRegion: (region: Region | null) => void,
  setCropMode: (mode: boolean) => void
) => {
  if (!ws || !regions) return null;

  // Check if crop region already exists by looking for existing region
  const existingRegion = regions
    .getRegions()
    .find((r: Region) => r.id === "crop-loop");

  if (!existingRegion) {
    // Create new crop region
    const duration = ws.getDuration();
    const region = regions.addRegion({
      start: duration * 0.25,
      end: duration * 0.75,
      color: "rgba(255, 208, 0, 0.2)",
      drag: true,
      resize: true,
      id: "crop-loop",
    });
    setCropRegion(region);
    setCropMode(true);
    return region;
  } else {
    // Remove the existing crop-loop region
    existingRegion.remove();
    setCropRegion(null);
    setCropMode(false);
    return null;
  }
};

export const createFadeInRegion = (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  setFadeInMode: (mode: boolean) => void
) => {
  if (!ws || !regions) return null;

  // Check if fade-in region already exists
  const existingRegion = regions
    .getRegions()
    .find((r: Region) => r.id === "fade-in");

  if (!existingRegion) {
    // Create new fade-in region (first 10% of duration)
    const duration = ws.getDuration();
    const region = regions.addRegion({
      start: 0,
      end: duration * 0.1,
      color: "rgba(0, 255, 0, 0.2)",
      drag: true,
      resize: true,
      id: "fade-in",
    });
    setFadeInMode(true);
    return region;
  } else {
    // Remove the existing fade-in region
    existingRegion.remove();
    setFadeInMode(false);
    return null;
  }
};

export const createFadeOutRegion = (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  setFadeOutMode: (mode: boolean) => void
) => {
  if (!ws || !regions) return null;

  // Check if fade-out region already exists
  const existingRegion = regions
    .getRegions()
    .find((r: Region) => r.id === "fade-out");

  if (!existingRegion) {
    // Create new fade-out region (last 10% of duration)
    const duration = ws.getDuration();
    const region = regions.addRegion({
      start: duration * 0.9,
      end: duration,
      color: "rgba(255, 0, 0, 0.2)",
      drag: true,
      resize: true,
      id: "fade-out",
    });
    setFadeOutMode(true);
    return region;
  } else {
    // Remove the existing fade-out region
    existingRegion.remove();
    setFadeOutMode(false);
    return null;
  }
};

export const applyCrop = async (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  cropRegion: Region | null,
  currentAudioUrl: string | null,
  spliceMarkersStore: number[],
  callbacks: {
    setPreviousAudioUrl: (url: string | null) => void;
    setCanUndo: (canUndo: boolean) => void;
    setAudioBuffer: (buffer: AudioBuffer | null) => void;
    setCropMode: (mode: boolean) => void;
    setCropRegion: (region: Region | null) => void;
    setCurrentAudioUrl: (url: string | null) => void;
    setFadeInMode: (mode: boolean) => void;
    setFadeOutMode: (mode: boolean) => void;
    setSpliceMarkersStore: (markers: number[]) => void;
    setZoom?: (zoom: number) => void;
  }
): Promise<void> => {
  if (!ws || !regions || !cropRegion) {
    console.log(
      "Cannot apply crop: missing wavesurfer, regions, or crop region"
    );
    return;
  }

  if (!ws.getDuration() || ws.getDuration() === 0) {
    console.log("Cannot apply crop: no audio loaded or duration is 0");
    return;
  }

  console.log("Applying crop...");

  const cropRegionData = regions
    .getRegions()
    .find((r: Region) => r.id === "crop-loop");
  if (!cropRegionData) {
    console.log("No crop region found");
    return;
  }

  console.log("Crop region:", cropRegionData.start, "to", cropRegionData.end);

  // Get the audio buffer from the audio store instead of wavesurfer backend
  const audioBuffer = useAudioStore.getState().audioBuffer;
  console.log("applyCrop - checking audio buffer in store:", !!audioBuffer);
  if (!audioBuffer) {
    console.log("No audio buffer found in store for crop operation");
    console.log("Current store state:", useAudioStore.getState());
    return;
  }

  console.log("Audio buffer found:", audioBuffer.length, "samples");
  console.log(
    "Audio buffer duration:",
    audioBuffer.length / audioBuffer.sampleRate,
    "seconds"
  );
  console.log(
    "Current audio duration from wavesurfer:",
    ws.getDuration(),
    "seconds"
  );

  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;

  // Snap crop boundaries to nearest zero crossings to avoid audio artifacts
  const adjustedStartTime = findNearestZeroCrossing(
    audioBuffer,
    cropRegionData.start
  );
  const adjustedEndTime = findNearestZeroCrossing(
    audioBuffer,
    cropRegionData.end
  );

  const startSample = Math.floor(adjustedStartTime * sampleRate);
  const endSample = Math.floor(adjustedEndTime * sampleRate);
  const newLength = endSample - startSample;

  console.log(
    "Zero-crossing adjusted crop region:",
    `${cropRegionData.start} -> ${adjustedStartTime}`,
    `to ${cropRegionData.end} -> ${adjustedEndTime}`
  );

  console.log(
    "Cropping from sample",
    startSample,
    "to",
    endSample,
    "new length:",
    newLength
  );

  // Create new audio buffer with cropped data
  const audioContext = new (window.AudioContext ||
    (
      window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext)();
  const newBuffer = audioContext.createBuffer(
    numberOfChannels,
    newLength,
    sampleRate
  );

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    const newChannelData = newBuffer.getChannelData(channel);

    for (let i = 0; i < newLength; i++) {
      newChannelData[i] = channelData[startSample + i];
    }
  }

  console.log("New buffer created, converting to WAV...");

  // Get current splice markers from store for debugging
  console.log("DEBUG: Current splice markers from store:", spliceMarkersStore);
  console.log("DEBUG: Store markers count:", spliceMarkersStore.length);

  // Also check visual markers for comparison
  const allRegions = regions.getRegions();
  const visualSpliceMarkers = allRegions.filter((r: Region) =>
    r.id.startsWith("splice-marker-")
  );
  console.log(
    "DEBUG: Visual splice markers count:",
    visualSpliceMarkers.length
  );
  console.log(
    "DEBUG: Visual marker times:",
    visualSpliceMarkers.map((m) => m.start.toFixed(3))
  );

  // Filter and adjust splice markers to only include those within the cropped region
  const filteredSpliceMarkers = spliceMarkersStore.filter(
    (markerTime) =>
      markerTime >= adjustedStartTime && markerTime <= adjustedEndTime
  );

  // Adjust marker times relative to the new start time (subtract crop start)
  const adjustedSpliceMarkers = filteredSpliceMarkers.map(
    (markerTime) => markerTime - adjustedStartTime
  );

  console.log(
    `Crop markers: ${spliceMarkersStore.length} -> ${filteredSpliceMarkers.length} (filtered) -> ${adjustedSpliceMarkers.length} (adjusted)`
  );

  // Convert to WAV blob and create new URL
  const wav = audioBufferToWavWithCues(newBuffer, adjustedSpliceMarkers);
  const blob = new Blob([wav], { type: "audio/wav" });
  const newUrl = URL.createObjectURL(blob) + "#morphedit-cropped";

  console.log("Loading cropped audio...");

  // Save current audio URL for undo before loading new one
  callbacks.setPreviousAudioUrl(currentAudioUrl);
  callbacks.setCanUndo(true);

  // Load the new cropped audio
  try {
    await ws.load(newUrl);
    console.log("Crop applied successfully");
    // Update the current audio URL to the new cropped version
    callbacks.setCurrentAudioUrl(newUrl);
    // Update the audio buffer in the store with the new cropped buffer
    callbacks.setAudioBuffer(newBuffer);
    console.log("Updated audio buffer with cropped version");

    // Clear crop region after applying
    callbacks.setCropMode(false);
    callbacks.setCropRegion(null);
    cropRegionData.remove();

    // Update splice markers store with filtered and adjusted markers
    console.log(
      "DEBUG: About to update store with adjusted markers:",
      adjustedSpliceMarkers
    );
    callbacks.setSpliceMarkersStore(adjustedSpliceMarkers);
    console.log(
      `Updated splice markers store: ${adjustedSpliceMarkers.length} markers for cropped audio`
    );

    // Remove existing visual splice markers and create new ones for the cropped audio
    const allRegions = regions.getRegions();
    const existingSpliceMarkers = allRegions.filter((r: Region) =>
      r.id.startsWith("splice-marker-")
    );
    console.log(
      `🔍 MARKER DEBUGGING - Found ${existingSpliceMarkers.length} existing visual markers to remove`
    );
    console.log(
      `  Existing marker IDs: [${existingSpliceMarkers
        .map((m) => m.id)
        .join(", ")}]`
    );
    existingSpliceMarkers.forEach((marker: Region) => marker.remove());

    // Create new visual splice markers for the filtered and adjusted markers
    console.log(
      `🔍 MARKER DEBUGGING - Creating ${adjustedSpliceMarkers.length} new visual markers`
    );
    adjustedSpliceMarkers.forEach((markerTime, index) => {
      const markerId = `splice-marker-crop-${index}-${Date.now()}`;
      console.log(
        `  Creating visual marker ${index}: time=${markerTime.toFixed(
          3
        )}s, id=${markerId}`
      );
      regions.addRegion({
        start: markerTime,
        color: "rgba(0, 255, 255, 0.8)",
        drag: true,
        resize: false,
        id: markerId,
        content: "🔻",
      });
    });

    console.log(
      `🔍 MARKER DEBUGGING - Created ${adjustedSpliceMarkers.length} visual splice markers for cropped audio`
    );

    // Also remove any existing fade regions since crop was applied
    const existingFadeInRegion = regions
      .getRegions()
      .find((r: Region) => r.id === "fade-in");
    const existingFadeOutRegion = regions
      .getRegions()
      .find((r: Region) => r.id === "fade-out");

    if (existingFadeInRegion) {
      callbacks.setFadeInMode(false);
      existingFadeInRegion.remove();
      console.log("Removed fade-in region after crop application");
    }

    if (existingFadeOutRegion) {
      callbacks.setFadeOutMode(false);
      existingFadeOutRegion.remove();
      console.log("Removed fade-out region after crop application");
    }

    // Recalculate zoom to fit the new cropped audio
    if (callbacks.setZoom) {
      const container = document.getElementById("waveform-container");
      let containerWidth = 800;

      if (container) {
        const rect = container.getBoundingClientRect();
        containerWidth =
          rect.width > 0 ? rect.width : container.clientWidth || 800;
      }

      const newDuration = ws.getDuration();
      if (newDuration > 0) {
        const minPxPerSec = containerWidth / newDuration;
        // Allow very low zoom values for long audio files, but ensure minimum usability
        const resetZoom = Math.min(1000, Math.max(1, minPxPerSec));
        console.log("Recalculating zoom after crop:", {
          newDuration,
          containerWidth,
          resetZoom,
        });
        callbacks.setZoom(resetZoom);
        ws.zoom(resetZoom);
      }
    }
  } catch (error) {
    console.error("Error loading cropped audio:", error);
  }
};

export const applyFades = async (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  fadeInMode: boolean,
  fadeOutMode: boolean,
  currentAudioUrl: string | null,
  spliceMarkersStore: number[],
  callbacks: {
    setPreviousAudioUrl: (url: string | null) => void;
    setCanUndo: (canUndo: boolean) => void;
    setAudioBuffer: (buffer: AudioBuffer | null) => void;
    setFadeInMode: (mode: boolean) => void;
    setFadeOutMode: (mode: boolean) => void;
    setCurrentAudioUrl: (url: string | null) => void;
    setCropMode: (mode: boolean) => void;
    setCropRegion: (region: Region | null) => void;
    setSpliceMarkersStore: (markers: number[]) => void;
    setZoom?: (zoom: number) => void;
  }
): Promise<void> => {
  if (!ws || !regions || (!fadeInMode && !fadeOutMode)) {
    console.log(
      "Cannot apply fades: missing wavesurfer, regions, or no fade modes active"
    );
    return;
  }

  if (!ws.getDuration() || ws.getDuration() === 0) {
    console.log("Cannot apply fades: no audio loaded or duration is 0");
    return;
  }

  console.log("Applying fades...");
  console.log("Current audio URL passed to applyFades:", currentAudioUrl);

  const fadeInRegionData = regions
    .getRegions()
    .find((r: Region) => r.id === "fade-in");
  const fadeOutRegionData = regions
    .getRegions()
    .find((r: Region) => r.id === "fade-out");

  // Get the audio buffer from the audio store instead of wavesurfer backend
  const audioBuffer = useAudioStore.getState().audioBuffer;
  console.log("applyFades - checking audio buffer in store:", !!audioBuffer);
  if (!audioBuffer) {
    console.log("No audio buffer found in store for fade operation");
    console.log("Current store state:", useAudioStore.getState());
    return;
  }

  console.log("Audio buffer found:", audioBuffer.length, "samples");
  console.log(
    "Audio buffer duration:",
    audioBuffer.length / audioBuffer.sampleRate,
    "seconds"
  );
  console.log("Current WaveSurfer duration:", ws.getDuration(), "seconds");
  console.log("Audio buffer sample rate:", audioBuffer.sampleRate);
  console.log(
    "Fade-in region:",
    fadeInRegionData ? `0 to ${fadeInRegionData.end}` : "none"
  );
  console.log(
    "Fade-out region:",
    fadeOutRegionData ? `${fadeOutRegionData.start} to end` : "none"
  );

  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const bufferLength = audioBuffer.length;

  // Create new audio buffer with fade effects
  const audioContext = new (window.AudioContext ||
    (
      window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext)();
  const newBuffer = audioContext.createBuffer(
    numberOfChannels,
    bufferLength,
    sampleRate
  );

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    const newChannelData = newBuffer.getChannelData(channel);

    // Copy original data
    for (let i = 0; i < bufferLength; i++) {
      newChannelData[i] = channelData[i];
    }

    // Apply fade-in if exists
    if (fadeInRegionData) {
      // Snap fade-in end to nearest zero crossing to avoid audio artifacts
      const adjustedFadeInEnd = findNearestZeroCrossing(
        audioBuffer,
        fadeInRegionData.end
      );
      const fadeInEndSample = Math.floor(adjustedFadeInEnd * sampleRate);
      console.log(
        "Zero-crossing adjusted fade-in end:",
        `${fadeInRegionData.end} -> ${adjustedFadeInEnd} (sample ${fadeInEndSample})`
      );
      for (let i = 0; i < fadeInEndSample; i++) {
        const gain = i / fadeInEndSample; // Linear fade from 0 to 1
        newChannelData[i] *= gain;
      }
    }

    // Apply fade-out if exists
    if (fadeOutRegionData) {
      // Snap fade-out start to nearest zero crossing to avoid audio artifacts
      const adjustedFadeOutStart = findNearestZeroCrossing(
        audioBuffer,
        fadeOutRegionData.start
      );
      const fadeOutStartSample = Math.floor(adjustedFadeOutStart * sampleRate);
      console.log(
        "Zero-crossing adjusted fade-out start:",
        `${fadeOutRegionData.start} -> ${adjustedFadeOutStart} (sample ${fadeOutStartSample})`
      );
      for (let i = fadeOutStartSample; i < bufferLength; i++) {
        const gain = (bufferLength - i) / (bufferLength - fadeOutStartSample); // Linear fade from 1 to 0
        newChannelData[i] *= gain;
      }
    }
  }

  console.log("Fades applied, converting to WAV...");

  // Convert to WAV blob and create new URL
  const wav = audioBufferToWavWithCues(newBuffer, spliceMarkersStore);
  const blob = new Blob([wav], { type: "audio/wav" });
  const newUrl = URL.createObjectURL(blob) + "#morphedit-faded";

  console.log("Loading new faded URL:", newUrl);
  console.log("Saving for undo - currentAudioUrl:", currentAudioUrl);

  // Save current audio URL for undo before loading new one
  callbacks.setPreviousAudioUrl(currentAudioUrl);
  callbacks.setCanUndo(true);

  // Load the new faded audio
  try {
    await ws.load(newUrl);
    console.log("Fades applied successfully");
    console.log("New audio duration after fades:", ws.getDuration(), "seconds");
    // Update the current audio URL to the new faded version
    callbacks.setCurrentAudioUrl(newUrl);
    // Update the audio buffer in the store with the new faded buffer
    callbacks.setAudioBuffer(newBuffer);
    console.log(
      "Updated audio buffer in store with faded version - duration:",
      newBuffer.length / newBuffer.sampleRate,
      "seconds"
    );
    // Clear fade regions after applying
    if (fadeInRegionData) {
      callbacks.setFadeInMode(false);
      fadeInRegionData.remove();
    }
    if (fadeOutRegionData) {
      callbacks.setFadeOutMode(false);
      fadeOutRegionData.remove();
    }

    // Also remove any existing crop region since fades were applied
    const existingCropRegion = regions
      .getRegions()
      .find((r: Region) => r.id === "crop-loop");

    if (existingCropRegion) {
      callbacks.setCropMode(false);
      callbacks.setCropRegion(null);
      existingCropRegion.remove();
      console.log("Removed crop region after fade application");
    }

    // Recalculate zoom to fit the faded audio properly
    if (callbacks.setZoom) {
      const container = document.getElementById("waveform-container");
      let containerWidth = 800;

      if (container) {
        const rect = container.getBoundingClientRect();
        containerWidth =
          rect.width > 0 ? rect.width : container.clientWidth || 800;
      }

      const duration = ws.getDuration();
      if (duration > 0) {
        const minPxPerSec = containerWidth / duration;
        // Allow very low zoom values for long audio files, but ensure minimum usability
        const resetZoom = Math.min(1000, Math.max(1, minPxPerSec));
        console.log("Recalculating zoom after fades:", {
          duration,
          containerWidth,
          resetZoom,
        });
        callbacks.setZoom(resetZoom);
        ws.zoom(resetZoom);
      }
    }
  } catch (error) {
    console.error("Error loading faded audio:", error);
  }
};

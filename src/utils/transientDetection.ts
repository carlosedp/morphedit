// Transient detection utilities for automatic splice point detection
import type WaveSurfer from "wavesurfer.js";
import type RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";

/**
 * Detects transients (sudden changes in energy) in audio buffer
 * Similar to Propellerhead ReCycle's functionality
 */
export const detectTransients = (
  audioBuffer: AudioBuffer,
  sensitivity: number,
  frameSizeMs: number = 20,
  overlapPercent: number = 75
): number[] => {
  if (!audioBuffer || audioBuffer.length === 0) {
    return [];
  }

  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0); // Use first channel for mono analysis
  const frameSize = Math.floor(sampleRate * (frameSizeMs / 1000)); // Convert ms to samples
  const hopSize = Math.floor(frameSize * (1 - overlapPercent / 100)); // Calculate hop size from overlap

  // Calculate energy for each frame
  const energies: number[] = [];
  for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
    let energy = 0;
    for (let j = i; j < i + frameSize; j++) {
      energy += channelData[j] * channelData[j];
    }
    energies.push(energy / frameSize); // Normalize by frame size
  }

  // Calculate energy deltas (first derivative)
  const energyDeltas: number[] = [];
  for (let i = 1; i < energies.length; i++) {
    energyDeltas.push(energies[i] - energies[i - 1]);
  }

  // Find peaks in energy deltas
  const transients: number[] = [];
  const threshold = calculateThreshold(energyDeltas, sensitivity);

  for (let i = 1; i < energyDeltas.length - 1; i++) {
    const current = energyDeltas[i];
    const prev = energyDeltas[i - 1];
    const next = energyDeltas[i + 1];

    // Peak detection: current value is higher than neighbors and above threshold
    if (current > prev && current > next && current > threshold) {
      const timeInSeconds = (i * hopSize) / sampleRate;

      // Avoid transients too close to each other (minimum 50ms apart)
      const minInterval = 0.05;
      if (
        transients.length === 0 ||
        timeInSeconds - transients[transients.length - 1] > minInterval
      ) {
        transients.push(timeInSeconds);
      }
    }
  }

  return transients;
};

/**
 * Calculate threshold based on sensitivity (0-100)
 * Higher sensitivity = lower threshold = more transients detected
 */
const calculateThreshold = (
  energyDeltas: number[],
  sensitivity: number
): number => {
  if (energyDeltas.length === 0) return 0;

  // Calculate statistics
  const sortedDeltas = [...energyDeltas].sort((a, b) => a - b);
  const median = sortedDeltas[Math.floor(sortedDeltas.length / 2)];
  const max = Math.max(...energyDeltas);

  // Sensitivity range: 0 (very low sensitivity) to 100 (very high sensitivity)
  const normalizedSensitivity = Math.max(0, Math.min(100, sensitivity)) / 100;

  // Calculate threshold: high sensitivity = low threshold, low sensitivity = high threshold
  const range = max - median;
  const threshold = max - range * normalizedSensitivity;

  return Math.max(threshold, median); // Never go below median to avoid too many false positives
};

/**
 * Apply transient detection and create splice markers
 */
export const applyTransientDetection = (
  _ws: WaveSurfer,
  regions: RegionsPlugin,
  audioBuffer: AudioBuffer,
  sensitivity: number,
  frameSizeMs: number,
  overlapPercent: number,
  setSpliceMarkersStore: (markers: number[]) => void,
  setSelectedSpliceMarker: (marker: Region | null) => void,
  updateSpliceMarkerColors: (marker: Region | null) => void
): number => {
  if (!_ws || !regions || !audioBuffer) {
    console.log("Cannot apply transient detection: missing dependencies");
    return 0;
  }

  console.log(`Applying transient detection with sensitivity: ${sensitivity}`);

  // Clear existing splice markers
  const allRegions = regions.getRegions();
  const existingSpliceRegions = allRegions.filter((r: Region) =>
    r.id.startsWith("splice-marker-")
  );
  existingSpliceRegions.forEach((region: Region) => region.remove());

  // Detect transients
  const transients = detectTransients(
    audioBuffer,
    sensitivity,
    frameSizeMs,
    overlapPercent
  );
  console.log(`Detected ${transients.length} transients:`, transients);

  // Create visual splice marker regions for each transient
  transients.forEach((transientTime, index) => {
    regions.addRegion({
      start: transientTime,
      color: "rgba(0, 255, 255, 0.8)",
      drag: true,
      resize: false,
      id: `splice-marker-transient-${index}-${Date.now()}`,
      content: "🔻",
    });
  });

  // Update store with new splice marker times
  setSpliceMarkersStore(transients.sort((a, b) => a - b));

  // Clear any selection
  setSelectedSpliceMarker(null);
  updateSpliceMarkerColors(null);

  console.log(
    `Transient detection complete. Created ${transients.length} splice markers`
  );
  return transients.length;
};

/**
 * Detect zero-crossings near transient points for more precise splice points
 * This helps avoid clicks and pops when slicing audio
 */
export const findNearestZeroCrossing = (
  audioBuffer: AudioBuffer,
  targetTime: number,
  searchWindow: number = 0.001 // 1ms search window
): number => {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const targetSample = Math.floor(targetTime * sampleRate);
  const windowSamples = Math.floor(searchWindow * sampleRate);

  const startSample = Math.max(0, targetSample - windowSamples);
  const endSample = Math.min(
    channelData.length - 1,
    targetSample + windowSamples
  );

  let bestZeroCrossing = targetSample;
  let minDistance = Infinity;

  for (let i = startSample; i < endSample - 1; i++) {
    const current = channelData[i];
    const next = channelData[i + 1];

    // Check for zero crossing (sign change)
    if ((current >= 0 && next < 0) || (current < 0 && next >= 0)) {
      const distance = Math.abs(i - targetSample);
      if (distance < minDistance) {
        minDistance = distance;
        bestZeroCrossing = i;
      }
    }
  }

  return bestZeroCrossing / sampleRate;
};

/**
 * Apply zero-crossing detection to existing splice markers
 */
export const snapToZeroCrossings = (
  _ws: WaveSurfer,
  regions: RegionsPlugin,
  audioBuffer: AudioBuffer,
  spliceMarkers: number[],
  setSpliceMarkersStore: (markers: number[]) => void,
  setSelectedSpliceMarker: (marker: Region | null) => void,
  updateSpliceMarkerColors: (marker: Region | null) => void
): void => {
  if (!audioBuffer || spliceMarkers.length === 0) {
    return;
  }

  console.log("Snapping splice markers to zero crossings...");

  // Clear existing visual markers
  const allRegions = regions.getRegions();
  const existingSpliceRegions = allRegions.filter((r: Region) =>
    r.id.startsWith("splice-marker-")
  );
  existingSpliceRegions.forEach((region: Region) => region.remove());

  // Find zero crossings for each marker
  const snappedMarkers = spliceMarkers.map((markerTime) =>
    findNearestZeroCrossing(audioBuffer, markerTime)
  );

  // Remove duplicates and sort
  const uniqueSnappedMarkers = [...new Set(snappedMarkers)].sort(
    (a, b) => a - b
  );

  // Create new visual markers
  uniqueSnappedMarkers.forEach((markerTime, index) => {
    regions.addRegion({
      start: markerTime,
      color: "rgba(0, 255, 255, 0.8)",
      drag: true,
      resize: false,
      id: `splice-marker-zerox-${index}-${Date.now()}`,
      content: "🔻",
    });
  });

  // Update store
  setSpliceMarkersStore(uniqueSnappedMarkers);
  setSelectedSpliceMarker(null);
  updateSpliceMarkerColors(null);

  console.log(
    `Snapped ${spliceMarkers.length} markers to ${uniqueSnappedMarkers.length} zero crossings`
  );
};

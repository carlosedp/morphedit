// Transient detection utilities for automatic splice point detection
import type WaveSurfer from 'wavesurfer.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';

import { useAudioStore } from '../audioStore';
import {
  MARKER_ICONS,
  MARKER_TOLERANCE,
  REGION_COLORS,
  TRANSIENT_DETECTION,
} from '../constants';
import type {
  EssentiaOnsetMethod,
  OnsetDetectionLibrary,
} from '../settingsStore';
import { useSettingsStore } from '../settingsStore';
import { detectOnsetsEssentia } from './essentiaOnsetDetection';
import {
  clearSelectionAndUpdateColors,
  limitSpliceMarkers,
  removeAllSpliceMarkersAndClearSelection,
  removeUnlockedMarkersAndClearSelection,
} from './regionHelpers';
import { isMarkerLocked } from './spliceMarkerUtils';

/**
 * Detects transients (sudden changes in energy) in audio buffer
 * Similar to Propellerhead ReCycle's functionality
 */
const detectTransients = (
  audioBuffer: AudioBuffer,
  sensitivity: number,
  frameSizeMs: number = TRANSIENT_DETECTION.DEFAULT_FRAME_SIZE_MS,
  overlapPercent: number = TRANSIENT_DETECTION.DEFAULT_OVERLAP_PERCENT,
  refinementBaseline: number = TRANSIENT_DETECTION.DEFAULT_ONSET_REFINEMENT_BASELINE
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

  // Check first frame (could be a transient at the very beginning)
  if (energyDeltas.length > 0 && energyDeltas[0] > threshold) {
    // If first energy delta is significantly positive, likely a transient at start
    const isFirstFramePeak =
      energyDeltas.length === 1 || energyDeltas[0] > energyDeltas[1] * 0.8;
    if (isFirstFramePeak) {
      transients.push(0); // Add transient at the very beginning
    }
  }

  for (let i = 1; i < energyDeltas.length - 1; i++) {
    const current = energyDeltas[i];
    const prev = energyDeltas[i - 1];
    const next = energyDeltas[i + 1];

    // Peak detection: current value is higher than neighbors and above threshold
    if (current > prev && current > next && current > threshold) {
      // Refine transient position: look backwards to find where the rise actually starts
      const refinedIndex = refineTransientPosition(
        energyDeltas,
        i,
        threshold,
        refinementBaseline
      );
      const timeInSeconds = (refinedIndex * hopSize) / sampleRate;

      // Avoid transients too close to each other (minimum 50ms apart)
      const minInterval = TRANSIENT_DETECTION.MIN_INTERVAL;
      if (
        transients.length === 0 ||
        timeInSeconds - transients[transients.length - 1] > minInterval
      ) {
        transients.push(timeInSeconds);
      }
    }
  }

  // Check last frame (could be a transient at the very end)
  const lastIdx = energyDeltas.length - 1;
  if (
    lastIdx > 0 &&
    energyDeltas[lastIdx] > threshold &&
    energyDeltas[lastIdx] > energyDeltas[lastIdx - 1]
  ) {
    const refinedIndex = refineTransientPosition(
      energyDeltas,
      lastIdx,
      threshold,
      refinementBaseline
    );
    const timeInSeconds = (refinedIndex * hopSize) / sampleRate;
    const minInterval = TRANSIENT_DETECTION.MIN_INTERVAL;
    if (
      transients.length === 0 ||
      timeInSeconds - transients[transients.length - 1] > minInterval
    ) {
      transients.push(timeInSeconds);
    }
  }

  return transients;
};

/**
 * Refine transient position by looking backwards from peak to find the start of the rise
 * This places the marker at the beginning of the transient, not at the peak
 * @param energyDeltas - Array of energy delta values
 * @param peakIndex - Index of the detected peak
 * @param threshold - Detection threshold
 * @param refinementBaselinePercent - Baseline as percentage of threshold (0-100, default: 30)
 * @returns Refined transient index (start of the rise)
 */
const refineTransientPosition = (
  energyDeltas: number[],
  peakIndex: number,
  threshold: number,
  refinementBaselinePercent: number = 30
): number => {
  if (peakIndex === 0) return 0;

  // Convert percentage to multiplier (0-100 -> 0-1)
  const baselineMultiplier =
    Math.max(0, Math.min(100, refinementBaselinePercent)) / 100;

  // Define the baseline as a percentage of the threshold
  // The transient is where the value starts rising significantly above baseline
  const baseline = threshold * baselineMultiplier;

  // Look backwards from the peak to find where the rise starts
  let transientIndex = peakIndex;

  for (let i = peakIndex - 1; i >= 0; i--) {
    const currentValue = energyDeltas[i];
    const nextValue = energyDeltas[i + 1];

    // Check if we've reached the baseline or if the value stops decreasing
    if (currentValue <= baseline || currentValue >= nextValue) {
      // Found the start of the rise
      transientIndex = i + 1; // Use the next frame (where rise starts)
      break;
    }

    // Don't look back more than 10 frames (to avoid false positives)
    if (peakIndex - i > 10) {
      transientIndex = i;
      break;
    }
  }

  return transientIndex;
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
 * Supports both Web Audio and Essentia.js detection libraries
 */
export const applyTransientDetection = async (
  _ws: WaveSurfer,
  regions: RegionsPlugin,
  audioBuffer: AudioBuffer,
  sensitivity: number,
  frameSizeMs: number,
  overlapPercent: number,
  setSpliceMarkersStore: (markers: number[]) => void,
  setSelectedSpliceMarker: (marker: Region | null) => void,
  updateSpliceMarkerColors: (marker: Region | null) => void,
  library: OnsetDetectionLibrary = 'webaudio',
  essentiaMethod?: EssentiaOnsetMethod,
  essentiaFrameSize?: number,
  essentiaHopSize?: number
): Promise<number> => {
  if (!_ws || !regions || !audioBuffer) {
    console.log('Cannot apply transient detection: missing dependencies');
    return 0;
  }

  const lockedMarkers = useAudioStore.getState().lockedSpliceMarkers;

  console.log(
    `Applying ${library} onset detection with sensitivity: ${sensitivity}, preserving ${lockedMarkers.length} locked markers`
  );

  // Clear existing unlocked splice markers only
  const removedRegions = removeUnlockedMarkersAndClearSelection(
    regions,
    lockedMarkers,
    setSelectedSpliceMarker,
    updateSpliceMarkerColors
  );

  console.log(
    `Removed ${removedRegions.length} unlocked markers, preserving ${lockedMarkers.length} locked markers`
  );

  // Detect transients using selected library
  let transients: number[];

  // Get refinement baseline from settings
  const refinementBaseline =
    useSettingsStore.getState().onsetRefinementBaseline;

  if (library === 'essentia') {
    console.log('Using Essentia.js for onset detection');
    transients = await detectOnsetsEssentia(
      audioBuffer,
      essentiaMethod || 'hfc',
      essentiaFrameSize || 1024,
      essentiaHopSize || 512,
      sensitivity,
      refinementBaseline
    );
  } else {
    console.log('Using Web Audio for transient detection');
    transients = detectTransients(
      audioBuffer,
      sensitivity,
      frameSizeMs,
      overlapPercent,
      refinementBaseline
    );
  }

  console.log(`Detected ${transients.length} transients:`, transients);

  // Filter out transients that are too close to locked markers
  const filteredTransients = transients.filter((transientTime) => {
    const tooCloseToLocked = lockedMarkers.some(
      (locked: number) =>
        Math.abs(locked - transientTime) < TRANSIENT_DETECTION.MIN_INTERVAL // 50ms tolerance
    );
    return !tooCloseToLocked;
  });

  console.log(
    `Filtered to ${filteredTransients.length} transients (removed ${
      transients.length - filteredTransients.length
    } too close to locked markers)`
  );

  // Combine locked markers with new transients for the store
  const allMarkers = [...lockedMarkers, ...filteredTransients].sort(
    (a, b) => a - b
  );

  // Apply limiting for device compatibility
  const { limitedMarkers, wasLimited } = limitSpliceMarkers(
    allMarkers,
    lockedMarkers
  );

  if (wasLimited) {
    console.log(
      `Transient detection markers limited from ${allMarkers.length} to ${limitedMarkers.length} for device compatibility`
    );

    // Clear all existing markers and recreate only the limited ones
    const existingRegions = regions
      .getRegions()
      .filter((r: Region) => r.id.startsWith('splice-marker-'));
    existingRegions.forEach((region: Region) => region.remove());

    // Recreate visual markers for limited set
    const newTransients = limitedMarkers.filter(
      (marker) =>
        !lockedMarkers.some((locked) => Math.abs(locked - marker) < 0.01)
    );
    newTransients.forEach((transientTime, index) => {
      regions.addRegion({
        start: transientTime,
        color: REGION_COLORS.SPLICE_MARKER,
        drag: true,
        resize: false,
        id: `splice-marker-transient-limited-${index}-${Date.now()}`,
        content: MARKER_ICONS.UNLOCKED,
      });
    });

    // Recreate locked markers
    lockedMarkers.forEach((markerTime, index) => {
      if (limitedMarkers.includes(markerTime)) {
        regions.addRegion({
          start: markerTime,
          color: REGION_COLORS.SPLICE_MARKER,
          drag: false,
          resize: false,
          id: `splice-marker-locked-${index}-${Date.now()}`,
          content: MARKER_ICONS.LOCKED,
        });
      }
    });
  } else {
    // Create visual splice marker regions for each filtered transient (original logic)
    filteredTransients.forEach((transientTime, index) => {
      regions.addRegion({
        start: transientTime,
        color: REGION_COLORS.SPLICE_MARKER,
        drag: true, // New transient markers are always draggable initially
        resize: false,
        id: `splice-marker-transient-${index}-${Date.now()}`,
        content: MARKER_ICONS.UNLOCKED,
      });
    });
  }

  setSpliceMarkersStore(limitedMarkers);

  clearSelectionAndUpdateColors(
    setSelectedSpliceMarker,
    updateSpliceMarkerColors
  );

  const detectedTransients = wasLimited
    ? limitedMarkers.length - lockedMarkers.length
    : filteredTransients.length;

  console.log(
    `Transient detection complete. Created ${detectedTransients} new markers${
      wasLimited
        ? ` (limited from ${allMarkers.length} to ${limitedMarkers.length})`
        : ''
    }, total: ${limitedMarkers.length} (${lockedMarkers.length} locked)`
  );
  return detectedTransients;
};

/**
 * Detect zero-crossings near transient points for more precise splice points
 * This helps avoid clicks and pops when slicing audio
 */
export const findNearestZeroCrossing = (
  audioBuffer: AudioBuffer,
  targetTime: number,
  searchWindow: number = MARKER_TOLERANCE // 1ms search window
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

  console.log('Snapping splice markers to zero crossings...');

  // Clear existing visual markers
  removeAllSpliceMarkersAndClearSelection(
    regions,
    setSelectedSpliceMarker,
    updateSpliceMarkerColors
  );

  // Find zero crossings for each marker
  const snappedMarkers = spliceMarkers.map((markerTime) =>
    findNearestZeroCrossing(audioBuffer, markerTime)
  );

  // Remove duplicates and sort
  const uniqueSnappedMarkers = [...new Set(snappedMarkers)].sort(
    (a, b) => a - b
  );

  // Create new visual markers
  const lockedMarkers = useAudioStore.getState().lockedSpliceMarkers;
  uniqueSnappedMarkers.forEach((markerTime, index) => {
    const isLocked = isMarkerLocked(markerTime, lockedMarkers);
    regions.addRegion({
      start: markerTime,
      color: REGION_COLORS.SPLICE_MARKER,
      drag: !isLocked, // Prevent dragging if marker is locked
      resize: false,
      id: `splice-marker-zerox-${index}-${Date.now()}`,
      content: isLocked ? MARKER_ICONS.LOCKED : MARKER_ICONS.UNLOCKED, // Use lock icon for locked markers
    });
  });

  // Update store
  setSpliceMarkersStore(uniqueSnappedMarkers);
  clearSelectionAndUpdateColors(
    setSelectedSpliceMarker,
    updateSpliceMarkerColors
  );

  console.log(
    `Snapped ${spliceMarkers.length} markers to ${uniqueSnappedMarkers.length} zero crossings`
  );
};

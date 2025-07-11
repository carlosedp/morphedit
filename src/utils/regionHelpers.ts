// Region filtering and manipulation utilities
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

import { MAX_TOTAL_SPLICE_POINTS, REGION_POSITIONING } from '../constants';
import { isMarkerLocked } from './spliceMarkerUtils';

/**
 * Get all splice marker regions from regions plugin
 */
export const getSpliceMarkerRegions = (regions: RegionsPlugin): Region[] => {
  return regions
    .getRegions()
    .filter((r: Region) => r.id.startsWith('splice-marker-'));
};

/**
 * Filter splice marker regions by locked state
 */
const filterSpliceMarkersByLocked = (
  regions: Region[],
  lockedMarkers: number[],
  includeLocked: boolean = false
): Region[] => {
  return regions.filter((region: Region) => {
    const isLocked = isMarkerLocked(region.start, lockedMarkers);
    return includeLocked ? isLocked : !isLocked;
  });
};

/**
 * Get unlocked splice marker regions
 */
export const getUnlockedSpliceMarkers = (
  regions: RegionsPlugin,
  lockedMarkers: number[]
): Region[] => {
  const spliceRegions = getSpliceMarkerRegions(regions);
  return filterSpliceMarkersByLocked(spliceRegions, lockedMarkers, false);
};

/**
 * Remove multiple regions from the visual display
 */
export const removeRegions = (regions: Region[]): void => {
  regions.forEach((region: Region) => region.remove());
};

/**
 * Clear selection and update marker colors - common pattern
 */
export const clearSelectionAndUpdateColors = (
  setSelectedSpliceMarker: (marker: Region | null) => void,
  updateSpliceMarkerColors: (marker: Region | null) => void
): void => {
  setSelectedSpliceMarker(null);
  updateSpliceMarkerColors(null);
};

/**
 * Remove all unlocked splice markers and clear selection
 */
export const removeUnlockedMarkersAndClearSelection = (
  regions: RegionsPlugin,
  lockedMarkers: number[],
  setSelectedSpliceMarker: (marker: Region | null) => void,
  updateSpliceMarkerColors: (marker: Region | null) => void
): Region[] => {
  const unlockedRegions = getUnlockedSpliceMarkers(regions, lockedMarkers);
  removeRegions(unlockedRegions);
  clearSelectionAndUpdateColors(
    setSelectedSpliceMarker,
    updateSpliceMarkerColors
  );
  return unlockedRegions;
};

/**
 * Remove all splice markers (both locked and unlocked) and clear selection
 */
export const removeAllSpliceMarkersAndClearSelection = (
  regions: RegionsPlugin,
  setSelectedSpliceMarker: (marker: Region | null) => void,
  updateSpliceMarkerColors: (marker: Region | null) => void
): Region[] => {
  const spliceRegions = getSpliceMarkerRegions(regions);
  removeRegions(spliceRegions);
  clearSelectionAndUpdateColors(
    setSelectedSpliceMarker,
    updateSpliceMarkerColors
  );
  return spliceRegions;
};

/**
 * Check if marker time is close to any existing marker (within tolerance)
 */
export const isMarkerTooCloseToExisting = (
  markerTime: number,
  existingMarkers: number[],
  tolerance: number = REGION_POSITIONING.MARKER_PROXIMITY_THRESHOLD
): boolean => {
  return existingMarkers.some(
    (existing) => Math.abs(existing - markerTime) < tolerance
  );
};

/**
 * Sort marker times in chronological order
 */
const sortMarkerTimes = (markers: number[]): number[] => {
  return [...markers].sort((a, b) => a - b);
};

/**
 * Combine and sort multiple marker arrays
 */
export const combineAndSortMarkers = (
  ...markerArrays: number[][]
): number[] => {
  const combined = markerArrays.flat();
  return sortMarkerTimes(combined);
};

/**
 * Remove duplicates and sort marker times
 */
export const deduplicateAndSortMarkers = (markers: number[]): number[] => {
  return [...new Set(markers)].sort((a, b) => a - b);
};

/**
 * Limit splice markers to maximum allowed count for device compatibility.
 * Preserves locked markers and keeps the most evenly distributed markers when limiting.
 */
export const limitSpliceMarkers = (
  markers: number[],
  lockedMarkers: number[],
  maxCount: number = MAX_TOTAL_SPLICE_POINTS
): { limitedMarkers: number[]; wasLimited: boolean } => {
  if (markers.length <= maxCount) {
    return { limitedMarkers: markers, wasLimited: false };
  }

  console.log(
    `Limiting splice markers from ${markers.length} to ${maxCount} for device compatibility`
  );

  // Sort markers chronologically
  const sortedMarkers = [...markers].sort((a, b) => a - b);

  // Separate locked and unlocked markers
  const locked = sortedMarkers.filter((marker) =>
    isMarkerLocked(marker, lockedMarkers)
  );
  const unlocked = sortedMarkers.filter(
    (marker) => !isMarkerLocked(marker, lockedMarkers)
  );

  // If locked markers already exceed limit, just use the first N locked markers
  if (locked.length >= maxCount) {
    console.warn(
      `Too many locked markers (${locked.length}). Using first ${maxCount} locked markers only.`
    );
    return { limitedMarkers: locked.slice(0, maxCount), wasLimited: true };
  }

  // Calculate how many unlocked markers we can keep
  const remainingSlots = maxCount - locked.length;

  if (unlocked.length <= remainingSlots) {
    // All markers fit
    return { limitedMarkers: sortedMarkers, wasLimited: false };
  }

  // Need to reduce unlocked markers - distribute them evenly
  const selectedUnlocked: number[] = [];
  if (remainingSlots > 0) {
    const step = unlocked.length / remainingSlots;
    for (let i = 0; i < remainingSlots; i++) {
      const index = Math.round(i * step);
      if (index < unlocked.length) {
        selectedUnlocked.push(unlocked[index]);
      }
    }
  }

  // Combine and sort final markers
  const limitedMarkers = [...locked, ...selectedUnlocked].sort((a, b) => a - b);

  console.log(
    `Limited markers: ${locked.length} locked + ${selectedUnlocked.length} unlocked = ${limitedMarkers.length} total`
  );

  return { limitedMarkers, wasLimited: true };
};

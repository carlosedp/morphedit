// Region filtering and manipulation utilities
import type { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import type RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import { isMarkerLocked } from "./spliceMarkerUtils";
import { REGION_POSITIONING } from "../constants";

/**
 * Get all splice marker regions from regions plugin
 */
export const getSpliceMarkerRegions = (regions: RegionsPlugin): Region[] => {
  return regions.getRegions().filter((r: Region) =>
    r.id.startsWith("splice-marker-")
  );
};

/**
 * Get all non-splice marker regions from regions plugin
 */
export const getNonSpliceMarkerRegions = (regions: RegionsPlugin): Region[] => {
  return regions.getRegions().filter((r: Region) =>
    !r.id.startsWith("splice-marker-")
  );
};

/**
 * Filter splice marker regions by locked state
 */
export const filterSpliceMarkersByLocked = (
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
 * Get locked splice marker regions
 */
export const getLockedSpliceMarkers = (
  regions: RegionsPlugin,
  lockedMarkers: number[]
): Region[] => {
  const spliceRegions = getSpliceMarkerRegions(regions);
  return filterSpliceMarkersByLocked(spliceRegions, lockedMarkers, true);
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
  clearSelectionAndUpdateColors(setSelectedSpliceMarker, updateSpliceMarkerColors);
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
  clearSelectionAndUpdateColors(setSelectedSpliceMarker, updateSpliceMarkerColors);
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
export const sortMarkerTimes = (markers: number[]): number[] => {
  return [...markers].sort((a, b) => a - b);
};

/**
 * Combine and sort multiple marker arrays
 */
export const combineAndSortMarkers = (...markerArrays: number[][]): number[] => {
  const combined = markerArrays.flat();
  return sortMarkerTimes(combined);
};

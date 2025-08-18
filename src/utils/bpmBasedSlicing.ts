// BPM-based automatic splice marker generation utility
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

import { MARKER_ICONS, REGION_COLORS, REGION_POSITIONING } from '../constants';
import { createLogger } from './logger';
import {
  clearSelectionAndUpdateColors,
  isMarkerTooCloseToExisting,
  limitSpliceMarkers,
  removeUnlockedMarkersAndClearSelection,
} from './regionHelpers';
import { getAudioBuffer, getLockedSpliceMarkers } from './storeHelpers';
import { findNearestZeroCrossing } from './transientDetection';

const bpmLogger = createLogger('BPMBasedSlicing');

export type MusicalDivision =
  | 'quarter' // 1/4 note (beat)
  | 'eighth' // 1/8 note
  | 'sixteenth' // 1/16 note
  | 'half' // 1/2 note
  | 'whole' // 1/1 note (whole bar)
  | 'two-bars' // 2 bars
  | 'four-bars' // 4 bars
  | 'eighth-triplet' // 1/8 triplet
  | 'quarter-triplet'; // 1/4 triplet

export interface BPMSliceOptions {
  bpm: number;
  division: MusicalDivision;
  startOffset: number; // Offset in seconds from the beginning
  duration: number; // Total audio duration
}

/**
 * Calculate the time interval for a musical division based on BPM
 */
export function calculateMusicalInterval(
  bpm: number,
  division: MusicalDivision
): number {
  const beatDuration = 60 / bpm; // Duration of one quarter note in seconds

  switch (division) {
    case 'sixteenth':
      return beatDuration / 4;
    case 'eighth':
      return beatDuration / 2;
    case 'eighth-triplet':
      return beatDuration / 2 / 3; // Eighth note triplet
    case 'quarter':
      return beatDuration;
    case 'quarter-triplet':
      return beatDuration / 3; // Quarter note triplet
    case 'half':
      return beatDuration * 2;
    case 'whole':
      return beatDuration * 4;
    case 'two-bars':
      return beatDuration * 8;
    case 'four-bars':
      return beatDuration * 16;
    default:
      return beatDuration;
  }
}

/**
 * Get a human-readable label for a musical division
 */
export function getMusicalDivisionLabel(division: MusicalDivision): string {
  switch (division) {
    case 'sixteenth':
      return '1/16 Note';
    case 'eighth':
      return '1/8 Note';
    case 'eighth-triplet':
      return '1/8 Triplet';
    case 'quarter':
      return '1/4 Note (Beat)';
    case 'quarter-triplet':
      return '1/4 Triplet';
    case 'half':
      return '1/2 Note';
    case 'whole':
      return 'Whole Bar';
    case 'two-bars':
      return '2 Bars';
    case 'four-bars':
      return '4 Bars';
    default:
      return division;
  }
}

/**
 * Generate BPM-based splice markers at musical intervals
 */
export function generateBPMBasedMarkers(
  regions: RegionsPlugin,
  options: BPMSliceOptions,
  setSpliceMarkersStore: (markers: number[]) => void,
  setSelectedSpliceMarker: (marker: Region | null) => void,
  updateSpliceMarkerColors: (marker: Region | null) => void
): void {
  if (!regions || options.bpm <= 0) {
    bpmLogger.warn('Invalid parameters for BPM-based marker generation');
    return;
  }

  const { bpm, division, duration, startOffset } = options;
  const interval = calculateMusicalInterval(bpm, division);

  bpmLogger.debug('Generating BPM-based markers', {
    bpm,
    division,
    interval,
    startOffset,
    duration,
  });

  // Get audio buffer for zero-crossing detection and locked markers
  const audioBuffer = getAudioBuffer();
  const lockedMarkers = getLockedSpliceMarkers();

  // Clear existing unlocked splice markers first
  const removedRegions = removeUnlockedMarkersAndClearSelection(
    regions,
    lockedMarkers,
    setSelectedSpliceMarker,
    updateSpliceMarkerColors
  );

  bpmLogger.debug(
    `Removed ${removedRegions.length} unlocked markers, preserving ${lockedMarkers.length} locked markers`
  );

  // Generate marker positions based on musical timing
  const newSpliceMarkers: number[] = [...lockedMarkers];
  const markerPositions: number[] = [];

  // Calculate all marker positions
  let currentTime = startOffset;
  let markerIndex = 0;

  while (currentTime < duration) {
    // Skip if there's already a locked marker very close to this position
    if (
      !isMarkerTooCloseToExisting(
        currentTime,
        lockedMarkers,
        REGION_POSITIONING.MARKER_PROXIMITY_THRESHOLD
      )
    ) {
      markerPositions.push(currentTime);
    } else {
      bpmLogger.debug(
        `Skipping BPM marker at ${currentTime.toFixed(3)}s - too close to locked marker`
      );
    }

    currentTime += interval;
    markerIndex++;

    // Safety check to prevent infinite loops
    if (markerIndex > 10000) {
      bpmLogger.warn(
        'Stopping marker generation - too many markers would be created'
      );
      break;
    }
  }

  bpmLogger.debug(
    `Generated ${markerPositions.length} potential marker positions`
  );

  // Create visual markers and add to array
  markerPositions.forEach((markerTime, index) => {
    let adjustedMarkerTime = markerTime;

    if (audioBuffer) {
      // Snap to nearest zero crossing to avoid audio artifacts
      adjustedMarkerTime = findNearestZeroCrossing(audioBuffer, markerTime);
      bpmLogger.debug(
        `BPM marker ${index} snapped to zero crossing: ${markerTime.toFixed(3)} -> ${adjustedMarkerTime.toFixed(3)}`
      );
    }

    newSpliceMarkers.push(adjustedMarkerTime);

    // Create visual splice marker region
    regions.addRegion({
      start: adjustedMarkerTime,
      color: REGION_COLORS.SPLICE_MARKER,
      drag: true, // New BPM-based markers are draggable initially
      resize: false,
      id: `splice-marker-bpm-${division}-${index}-${Date.now()}`,
      content: MARKER_ICONS.UNLOCKED,
    });
  });

  // Sort markers chronologically
  const sortedMarkers = newSpliceMarkers.sort((a, b) => a - b);

  // Apply limiting for device compatibility
  const { limitedMarkers, wasLimited } = limitSpliceMarkers(
    sortedMarkers,
    lockedMarkers
  );

  if (wasLimited) {
    bpmLogger.warn(
      `BPM markers limited from ${sortedMarkers.length} to ${limitedMarkers.length} for device compatibility`
    );

    // Clear all existing markers and recreate only the limited ones
    const spliceRegions = regions
      .getRegions()
      .filter((r: Region) => r.id.startsWith('splice-marker-'));
    spliceRegions.forEach((region: Region) => region.remove());

    // Recreate visual markers for limited set
    limitedMarkers.forEach((markerTime, index) => {
      const isLocked = lockedMarkers.some(
        (locked) => Math.abs(locked - markerTime) < 0.001
      );
      regions.addRegion({
        start: markerTime,
        color: REGION_COLORS.SPLICE_MARKER,
        drag: !isLocked,
        resize: false,
        id: `splice-marker-bpm-limited-${index}-${Date.now()}`,
        content: isLocked ? MARKER_ICONS.LOCKED : MARKER_ICONS.UNLOCKED,
      });
    });
  }

  // Update store with new splice marker times
  setSpliceMarkersStore(limitedMarkers);

  clearSelectionAndUpdateColors(
    setSelectedSpliceMarker,
    updateSpliceMarkerColors
  );

  const newMarkersCount = limitedMarkers.length - lockedMarkers.length;
  bpmLogger.info(
    `BPM-based slice complete. Created ${newMarkersCount} new markers (${getMusicalDivisionLabel(division)} at ${bpm} BPM)${
      wasLimited
        ? ` (limited from ${sortedMarkers.length} to ${limitedMarkers.length})`
        : ''
    }, total: ${limitedMarkers.length} (${lockedMarkers.length} locked)`
  );
}

/**
 * Estimate how many markers would be created for preview
 */
export function estimateMarkerCount(options: BPMSliceOptions): number {
  if (options.bpm <= 0 || options.duration <= 0) return 0;

  const interval = calculateMusicalInterval(options.bpm, options.division);
  const markersCount =
    Math.floor((options.duration - options.startOffset) / interval) + 1;

  return Math.max(0, markersCount);
}

/**
 * Get all available musical divisions
 */
export function getAvailableMusicalDivisions(): MusicalDivision[] {
  return [
    'sixteenth',
    'eighth-triplet',
    'eighth',
    'quarter-triplet',
    'quarter',
    'half',
    'whole',
    'two-bars',
    'four-bars',
  ];
}

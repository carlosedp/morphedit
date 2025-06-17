// Splice marker utilities and handlers
import type { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import type RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type WaveSurfer from "wavesurfer.js";
import { useAudioStore } from "../audioStore";
import { findNearestZeroCrossing } from "./transientDetection";
import { getAudioBuffer, getLockedSpliceMarkers } from "./storeHelpers";
import { spliceLogger } from "./logger";
import {
  MARKER_TOLERANCE,
  REGION_COLORS,
  MARKER_ICONS,
  UI_COLORS,
  REGION_POSITIONING,
} from "../constants";
import {
  getSpliceMarkerRegions,
  getUnlockedSpliceMarkers,
  removeRegions,
  clearSelectionAndUpdateColors,
  removeUnlockedMarkersAndClearSelection,
  isMarkerTooCloseToExisting,
  combineAndSortMarkers,
} from "./regionHelpers";
import "../App.css";

// Helper functions for locked markers
export const isMarkerLocked = (
  markerTime: number,
  lockedMarkers: number[]
): boolean => {
  return lockedMarkers.some(
    (locked) => Math.abs(locked - markerTime) < MARKER_TOLERANCE
  );
};

export const toggleMarkerLock = (
  markerTime: number,
  lockedMarkers: number[],
  setLockedSpliceMarkers: (markers: number[]) => void,
  regions?: RegionsPlugin
): void => {
  const isLocked = isMarkerLocked(markerTime, lockedMarkers);

  if (isLocked) {
    // Unlock: remove from locked markers
    const newLockedMarkers = lockedMarkers.filter(
      (locked) => Math.abs(locked - markerTime) > MARKER_TOLERANCE
    );
    setLockedSpliceMarkers(newLockedMarkers);
    spliceLogger.markerOperation(
      "Marker unlocked",
      1,
      `at ${markerTime.toFixed(3)}s`
    );

    // Update drag properties and icons of all markers
    if (regions) {
      updateMarkersDragProperty(regions, newLockedMarkers);
      updateMarkerIcons(regions, newLockedMarkers);
    }
  } else {
    // Lock: add to locked markers
    const newLockedMarkers = [...lockedMarkers, markerTime];
    setLockedSpliceMarkers(newLockedMarkers);
    spliceLogger.markerOperation(
      "Marker locked",
      1,
      `at ${markerTime.toFixed(3)}s`
    );

    // Update drag properties and icons of all markers
    if (regions) {
      updateMarkersDragProperty(regions, newLockedMarkers);
      updateMarkerIcons(regions, newLockedMarkers);
    }
  }
};

export interface SpliceMarkerUtils {
  addSpliceMarker: (
    ws: WaveSurfer,
    regions: RegionsPlugin,
    currentTime: number,
    spliceMarkersStore: number[],
    setSpliceMarkersStore: (markers: number[]) => void
  ) => void;
  removeSpliceMarker: (
    ws: WaveSurfer,
    regions: RegionsPlugin,
    selectedSpliceMarker: Region | null,
    spliceMarkersStore: number[],
    setSpliceMarkersStore: (markers: number[]) => void,
    setSelectedSpliceMarker: (marker: Region | null) => void,
    updateSpliceMarkerColors: (marker: Region | null) => void
  ) => void;
  autoSlice: (
    ws: WaveSurfer,
    regions: RegionsPlugin,
    numberOfSlices: number,
    setSpliceMarkersStore: (markers: number[]) => void,
    setSelectedSpliceMarker: (marker: Region | null) => void,
    updateSpliceMarkerColors: (marker: Region | null) => void
  ) => void;
  halfMarkers: (
    regions: RegionsPlugin,
    setSpliceMarkersStore: (markers: number[]) => void,
    setSelectedSpliceMarker: (marker: Region | null) => void,
    updateSpliceMarkerColors: (marker: Region | null) => void
  ) => void;
  updateSpliceMarkerColors: (
    regions: RegionsPlugin,
    selectedMarker: Region | null,
    theme: { palette: { primary: { main: string } } }
  ) => void;
}

export const addSpliceMarker = (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  currentTime: number,
  spliceMarkersStore: number[],
  setSpliceMarkersStore: (markers: number[]) => void
) => {
  if (!ws || !regions) return;

  // Get audio buffer for zero-crossing detection
  const audioBuffer = getAudioBuffer();
  let adjustedTime = currentTime;

  if (audioBuffer) {
    // Snap to nearest zero crossing to avoid audio artifacts
    adjustedTime = findNearestZeroCrossing(audioBuffer, currentTime);
    console.log(
      "Splice marker snapped to zero crossing:",
      `${currentTime} -> ${adjustedTime}`
    );
  } else {
    console.log("No audio buffer available, using original time");
  }

  spliceLogger.markerOperation(
    "Adding splice marker",
    1,
    `at time: ${adjustedTime}`
  );

  // Create a zero-width region for the splice marker
  regions.addRegion({
    start: adjustedTime,
    color: REGION_COLORS.SPLICE_MARKER,
    drag: true, // New markers are always draggable initially
    resize: false,
    id: `splice-marker-${Date.now()}`,
    content: MARKER_ICONS.UNLOCKED,
  });

  // Update store with splice marker times
  const allSpliceMarkers = [...spliceMarkersStore, adjustedTime].sort(
    (a, b) => a - b
  );
  setSpliceMarkersStore(allSpliceMarkers);

  console.log("Splice marker added. Total markers:", allSpliceMarkers.length);
};

export const removeSpliceMarker = (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  selectedSpliceMarker: Region | null,
  spliceMarkersStore: number[],
  setSpliceMarkersStore: (markers: number[]) => void,
  setSelectedSpliceMarker: (marker: Region | null) => void,
  updateSpliceMarkerColors: (marker: Region | null) => void
) => {
  if (!ws || !regions) return;

  const lockedMarkers = getLockedSpliceMarkers();

  if (selectedSpliceMarker) {
    const markerTime = selectedSpliceMarker.start;

    // Check if the selected marker is locked
    if (isMarkerLocked(markerTime, lockedMarkers)) {
      console.log("Cannot remove locked marker at time:", markerTime);
      return;
    }

    console.log("Removing selected splice marker");

    // Remove from regions
    selectedSpliceMarker.remove();

    clearSelectionAndUpdateColors(
      setSelectedSpliceMarker,
      updateSpliceMarkerColors
    );

    // Update store
    const updatedMarkers = spliceMarkersStore.filter(
      (time) => Math.abs(time - markerTime) > MARKER_TOLERANCE
    );
    setSpliceMarkersStore(updatedMarkers);

    console.log(
      "Splice marker removed. Remaining markers:",
      updatedMarkers.length
    );
  } else {
    // If no marker is selected, try to remove the closest unlocked one to cursor
    const currentTime = ws.getCurrentTime();
    const spliceRegions = getSpliceMarkerRegions(regions);

    if (spliceRegions.length === 0) {
      console.log("No splice markers to remove");
      return;
    }

    // Find the closest unlocked splice marker to current cursor position
    let closestMarker = null;
    let closestDistance = Infinity;

    for (const marker of spliceRegions) {
      const distance = Math.abs(marker.start - currentTime);
      const isLocked = isMarkerLocked(marker.start, lockedMarkers);

      if (!isLocked && distance < closestDistance) {
        closestDistance = distance;
        closestMarker = marker;
      }
    }

    if (!closestMarker) {
      console.log("No unlocked splice markers found to remove");
      return;
    }

    console.log(
      "Removing closest unlocked splice marker at time:",
      closestMarker.start
    );
    const markerTime = closestMarker.start;

    // Remove from regions
    closestMarker.remove();

    clearSelectionAndUpdateColors(
      setSelectedSpliceMarker,
      updateSpliceMarkerColors
    );

    // Update store
    const updatedMarkers = spliceMarkersStore.filter(
      (time) => Math.abs(time - markerTime) > MARKER_TOLERANCE
    );
    setSpliceMarkersStore(updatedMarkers);

    console.log(
      "Closest unlocked splice marker removed. Remaining markers:",
      updatedMarkers.length
    );
  }
};

export const autoSlice = (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  numberOfSlices: number,
  setSpliceMarkersStore: (markers: number[]) => void,
  setSelectedSpliceMarker: (marker: Region | null) => void,
  updateSpliceMarkerColors: (marker: Region | null) => void
) => {
  if (!ws || !regions || numberOfSlices < 2) return;

  const duration = ws.getDuration();
  if (duration <= 0) {
    console.log("Audio duration not available");
    return;
  }

  // Get audio buffer for zero-crossing detection
  const audioBuffer = getAudioBuffer();
  const lockedMarkers = getLockedSpliceMarkers();

  spliceLogger.markerOperation(
    `Creating ${numberOfSlices} equally distributed splice markers`,
    lockedMarkers.length,
    "locked preserved"
  );

  // Clear existing unlocked splice markers first
  const removedRegions = removeUnlockedMarkersAndClearSelection(
    regions,
    lockedMarkers,
    setSelectedSpliceMarker,
    updateSpliceMarkerColors
  );

  console.log(
    `Removed ${removedRegions.length} unlocked markers, preserving ${lockedMarkers.length} locked markers`
  );

  // Create new equally distributed splice markers
  const newSpliceMarkers: number[] = [...lockedMarkers]; // Start with locked markers
  const sliceInterval = duration / numberOfSlices;

  // Add splice marker at time 0 (start) if not locked
  if (!isMarkerLocked(0, lockedMarkers)) {
    newSpliceMarkers.push(0);
    regions.addRegion({
      start: 0,
      color: REGION_COLORS.SPLICE_MARKER,
      drag: true,
      resize: false,
      id: `splice-marker-auto-0-${Date.now()}`,
      content: MARKER_ICONS.UNLOCKED,
    });
  }

  // Create splice markers at the boundaries between slices (excluding end)
  for (let i = 1; i < numberOfSlices; i++) {
    const markerTime = i * sliceInterval;

    // Skip if there's already a locked marker very close to this position
    if (
      isMarkerTooCloseToExisting(
        markerTime,
        lockedMarkers,
        REGION_POSITIONING.MARKER_PROXIMITY_THRESHOLD
      )
    ) {
      console.log(
        `Skipping auto marker at ${markerTime.toFixed(
          3
        )}s - too close to locked marker`
      );
      continue;
    }

    let adjustedMarkerTime = markerTime;

    if (audioBuffer) {
      // Snap to nearest zero crossing to avoid audio artifacts
      adjustedMarkerTime = findNearestZeroCrossing(audioBuffer, markerTime);
      console.log(
        `Auto-slice marker ${i} snapped to zero crossing:`,
        `${markerTime} -> ${adjustedMarkerTime}`
      );
    }

    newSpliceMarkers.push(adjustedMarkerTime);

    // Create visual splice marker region
    regions.addRegion({
      start: adjustedMarkerTime,
      color: REGION_COLORS.SPLICE_MARKER,
      drag: true, // New auto-slice markers are always draggable initially
      resize: false,
      id: `splice-marker-auto-${i}-${Date.now()}`,
      content: MARKER_ICONS.UNLOCKED,
    });
  }

  // Update store with new splice marker times (including locked ones)
  setSpliceMarkersStore(newSpliceMarkers.sort((a, b) => a - b));

  clearSelectionAndUpdateColors(
    setSelectedSpliceMarker,
    updateSpliceMarkerColors
  );

  console.log(
    `Auto-slice complete. Created ${
      newSpliceMarkers.length - lockedMarkers.length
    } new markers, total: ${newSpliceMarkers.length} (${
      lockedMarkers.length
    } locked)${audioBuffer ? " with zero-crossing adjustment" : ""}`
  );
};

export const halfMarkers = (
  regions: RegionsPlugin,
  setSpliceMarkersStore: (markers: number[]) => void,
  setSelectedSpliceMarker: (marker: Region | null) => void,
  updateSpliceMarkerColors: (marker: Region | null) => void
) => {
  if (!regions) return;

  const spliceRegions = getSpliceMarkerRegions(regions);
  const lockedMarkers = useAudioStore.getState().lockedSpliceMarkers;

  if (spliceRegions.length === 0) {
    console.log("No splice markers to process");
    return;
  }

  // Filter out locked regions - we'll only operate on unlocked ones
  const unlockedRegions = getUnlockedSpliceMarkers(regions, lockedMarkers);

  if (unlockedRegions.length === 0) {
    console.log("No unlocked splice markers to process");
    return;
  }

  if (unlockedRegions.length === 1) {
    // When there's only one unlocked marker, remove it
    console.log("Removing single unlocked splice marker");
    unlockedRegions[0].remove();

    // Update store: keep locked markers, remove the unlocked one
    setSpliceMarkersStore(lockedMarkers.slice());
    clearSelectionAndUpdateColors(
      setSelectedSpliceMarker,
      updateSpliceMarkerColors
    );
    console.log("Single unlocked splice marker removed");
    return;
  }

  console.log(
    `Halving unlocked splice markers. Current unlocked count: ${unlockedRegions.length}`
  );

  // Sort unlocked splice regions by their time position
  const sortedUnlockedRegions = unlockedRegions.sort(
    (a, b) => a.start - b.start
  );

  // Remove every other unlocked marker starting from index 1 (second marker)
  const markersToRemove: Region[] = [];
  const remainingUnlockedMarkerTimes: number[] = [];

  sortedUnlockedRegions.forEach((region, index) => {
    if (index % 2 === 1) {
      // Remove every second unlocked marker (index 1, 3, 5, etc.)
      markersToRemove.push(region);
    } else {
      // Keep every first unlocked marker (index 0, 2, 4, etc.)
      remainingUnlockedMarkerTimes.push(region.start);
    }
  });

  // Remove the selected markers from the visual display
  removeRegions(markersToRemove);

  // Update store with remaining markers (locked + remaining unlocked)
  const allRemainingMarkers = combineAndSortMarkers(
    lockedMarkers,
    remainingUnlockedMarkerTimes
  );
  setSpliceMarkersStore(allRemainingMarkers);

  clearSelectionAndUpdateColors(
    setSelectedSpliceMarker,
    updateSpliceMarkerColors
  );

  console.log(
    `Half markers complete. Removed ${markersToRemove.length} unlocked markers, ${allRemainingMarkers.length} total remaining (${lockedMarkers.length} locked + ${remainingUnlockedMarkerTimes.length} unlocked)`
  );
};

export const clearAllMarkers = (
  regions: RegionsPlugin,
  setSpliceMarkersStore: (markers: number[]) => void,
  setSelectedSpliceMarker: (marker: Region | null) => void,
  updateSpliceMarkerColors: (marker: Region | null) => void
) => {
  if (!regions) return;

  const lockedMarkers = useAudioStore.getState().lockedSpliceMarkers;
  const unlockedRegions = removeUnlockedMarkersAndClearSelection(
    regions,
    lockedMarkers,
    setSelectedSpliceMarker,
    updateSpliceMarkerColors
  );

  if (unlockedRegions.length === 0) {
    console.log("No unlocked splice markers to clear");
    return;
  }

  console.log(
    `Clearing ${unlockedRegions.length} unlocked splice markers, preserving ${lockedMarkers.length} locked markers`
  );

  // Update store to keep only locked markers
  setSpliceMarkersStore(lockedMarkers.slice());

  console.log(
    `Cleared ${unlockedRegions.length} unlocked markers, ${lockedMarkers.length} locked markers preserved`
  );
};

export const updateSpliceMarkerColors = (
  regions: RegionsPlugin,
  selectedMarker: Region | null,
  theme: { palette: { primary: { main: string } } }
) => {
  if (!regions) return;

  spliceLogger.debug(
    "Updating splice marker colors and icons, selected marker:",
    selectedMarker?.id
  );

  const spliceRegions = getSpliceMarkerRegions(regions);

  // Get locked markers from store
  const lockedMarkers = useAudioStore.getState().lockedSpliceMarkers;

  spliceLogger.debug(
    "Found splice regions:",
    spliceRegions.map((r) => r.id)
  );

  spliceRegions.forEach((region: Region) => {
    const markerTime = region.start;
    const isLocked = isMarkerLocked(markerTime, lockedMarkers);
    const isSelected = selectedMarker && region.id === selectedMarker.id;

    // Update the drag property based on locked state
    (region as Region & { drag: boolean }).drag = !isLocked;

    // Determine the appropriate icon based on state priority: locked > selected > unlocked
    let newIcon: string;
    if (isLocked) {
      newIcon = MARKER_ICONS.LOCKED;
    } else if (isSelected) {
      newIcon = MARKER_ICONS.SELECTED;
    } else {
      newIcon = MARKER_ICONS.UNLOCKED;
    }

    if (region.element) {
      region.setContent(newIcon); // Update content property directly
    }

    if (isSelected) {
      // Selected marker: use primary theme color for selection
      region.element.style.borderLeft = `2px solid ${theme.palette.primary.main}`;
      region.element.style.backgroundColor = isLocked
        ? UI_COLORS.SELECTED_MARKER_BACKGROUND_LOCKED // Orange background if locked
        : UI_COLORS.SELECTED_MARKER_BACKGROUND_UNLOCKED; // Blue background if unlocked
    } else {
      // Unselected markers (both locked and unlocked): use same default cyan color
      // Only the icon will differ between locked (🔒) and unlocked (🔶) markers
      region.element.style.borderLeft = `2px solid ${REGION_COLORS.SPLICE_MARKER}`;
      region.element.style.backgroundColor =
        UI_COLORS.DEFAULT_MARKER_BACKGROUND;
      region.element.style.boxShadow = `none`; // Remove any existing glow
    }
  });
};

export const loadExistingCuePoints = (
  regions: RegionsPlugin,
  existingCuePoints: number[],
  setSpliceMarkersStore: (markers: number[]) => void
) => {
  console.log(
    `Loading ${existingCuePoints.length} existing cue points as splice markers`
  );

  if (existingCuePoints.length === 0) {
    return;
  }

  // Check if there are already markers in the store
  const currentStoreMarkers = useAudioStore.getState().spliceMarkers;
  console.log(
    `Current store has ${currentStoreMarkers.length} existing markers`
  );

  // Clear all existing visual splice markers first to avoid duplicates
  const allRegions = regions.getRegions();
  const existingSpliceMarkers = allRegions.filter((r: Region) =>
    r.id.startsWith("splice-marker-")
  );
  console.log(
    `Removing ${existingSpliceMarkers.length} existing visual markers`
  );
  existingSpliceMarkers.forEach((marker: Region) => marker.remove());

  // If there are existing markers in the store, use those instead of loading cue points
  // This prevents overwriting manually added markers when files are reloaded
  if (currentStoreMarkers.length > 0) {
    console.log(
      "Store has existing markers, recreating visual markers from store instead of loading cue points"
    );

    // Recreate visual markers from store
    const lockedMarkers = useAudioStore.getState().lockedSpliceMarkers;
    currentStoreMarkers.forEach((markerTime, index) => {
      const isLocked = isMarkerLocked(markerTime, lockedMarkers);
      regions.addRegion({
        start: markerTime,
        color: REGION_COLORS.SPLICE_MARKER,
        drag: !isLocked, // Prevent dragging if marker is locked
        resize: false,
        id: `splice-marker-store-${index}-${Date.now()}`,
        content: isLocked ? MARKER_ICONS.LOCKED : MARKER_ICONS.UNLOCKED, // Use lock icon for locked markers
      });
    });

    console.log(
      `Recreated ${currentStoreMarkers.length} visual markers from store`
    );
    return;
  }

  // No existing markers in store, proceed with loading cue points
  console.log(
    "No existing markers in store, loading cue points as new splice markers:",
    existingCuePoints
  );

  // Get audio buffer for zero-crossing detection
  const audioBuffer = useAudioStore.getState().audioBuffer;
  const adjustedCuePoints: number[] = [];

  // Create visual splice marker regions for each cue point
  existingCuePoints.forEach((cueTime, index) => {
    let adjustedCueTime = cueTime;

    if (audioBuffer) {
      // Snap to nearest zero crossing to avoid audio artifacts
      adjustedCueTime = findNearestZeroCrossing(audioBuffer, cueTime);
      console.log(
        `Cue point ${index} snapped to zero crossing:`,
        `${cueTime} -> ${adjustedCueTime}`
      );
    }

    adjustedCuePoints.push(adjustedCueTime);

    regions.addRegion({
      start: adjustedCueTime,
      color: REGION_COLORS.SPLICE_MARKER,
      drag: true, // Cue points from files are always draggable initially
      resize: false,
      id: `splice-marker-cue-${index}-${Date.now()}`,
      content: MARKER_ICONS.UNLOCKED,
    });
  });

  // Update store with adjusted cue points
  setSpliceMarkersStore(adjustedCuePoints.sort((a, b) => a - b));
  console.log(
    `Loaded ${adjustedCuePoints.length} cue points as splice markers`
  );
};

// Helper function to update marker icons based on locked state
export const updateMarkerIcons = (
  regions: RegionsPlugin,
  lockedMarkers: number[]
): void => {
  if (!regions) return;

  const spliceRegions = getSpliceMarkerRegions(regions);

  spliceRegions.forEach((region: Region) => {
    const markerTime = region.start;
    const isLocked = isMarkerLocked(markerTime, lockedMarkers);
    const newIcon = isLocked ? MARKER_ICONS.LOCKED : MARKER_ICONS.UNLOCKED;

    // Update the content (icon) of the region
    region.setContent(newIcon);

    console.log(
      `Updated marker icon at ${markerTime.toFixed(3)}s: ${
        isLocked ? "🔒 (locked)" : "🔶 (unlocked)"
      }`
    );
  });
};

// Helper function to update drag property of all splice markers based on locked state
export const updateMarkersDragProperty = (
  regions: RegionsPlugin,
  lockedMarkers: number[]
): void => {
  if (!regions) return;

  const spliceRegions = getSpliceMarkerRegions(regions);

  spliceRegions.forEach((region: Region) => {
    const markerTime = region.start;
    const isLocked = isMarkerLocked(markerTime, lockedMarkers);

    // Update the drag property of the region
    (region as Region & { drag: boolean }).drag = !isLocked;

    console.log(
      `Updated marker at ${markerTime.toFixed(
        3
      )}s: drag=${!isLocked}, locked=${isLocked}`
    );
  });
};

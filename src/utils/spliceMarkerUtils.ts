// Splice marker utilities and handlers
import type { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import type RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type WaveSurfer from "wavesurfer.js";

export interface SpliceMarkerUtils {
  addSpliceMarker: (ws: WaveSurfer, regions: RegionsPlugin, currentTime: number, spliceMarkersStore: number[], setSpliceMarkersStore: (markers: number[]) => void) => void;
  removeSpliceMarker: (ws: WaveSurfer, regions: RegionsPlugin, selectedSpliceMarker: Region | null, spliceMarkersStore: number[], setSpliceMarkersStore: (markers: number[]) => void, setSelectedSpliceMarker: (marker: Region | null) => void, updateSpliceMarkerColors: (marker: Region | null) => void) => void;
  autoSlice: (ws: WaveSurfer, regions: RegionsPlugin, numberOfSlices: number, setSpliceMarkersStore: (markers: number[]) => void, setSelectedSpliceMarker: (marker: Region | null) => void, updateSpliceMarkerColors: (marker: Region | null) => void) => void;
  halfMarkers: (regions: RegionsPlugin, setSpliceMarkersStore: (markers: number[]) => void, setSelectedSpliceMarker: (marker: Region | null) => void, updateSpliceMarkerColors: (marker: Region | null) => void) => void;
  updateSpliceMarkerColors: (regions: RegionsPlugin, selectedMarker: Region | null, theme: { palette: { primary: { main: string } } }) => void;
}

export const addSpliceMarker = (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  currentTime: number,
  spliceMarkersStore: number[],
  setSpliceMarkersStore: (markers: number[]) => void
) => {
  if (!ws || !regions) return;

  console.log("Adding splice marker at time:", currentTime);

  // Create a zero-width region (start === end) for the splice marker
  regions.addRegion({
    start: currentTime,
    end: currentTime,
    color: "rgba(0, 255, 255, 0.8)",
    drag: true,
    resize: false,
    id: `splice-marker-${Date.now()}`,
    content: "⚡",
  });

  // Update store with splice marker times
  const allSpliceMarkers = [...spliceMarkersStore, currentTime].sort((a, b) => a - b);
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

  if (selectedSpliceMarker) {
    console.log("Removing selected splice marker");
    const markerTime = selectedSpliceMarker.start;

    // Remove from regions
    selectedSpliceMarker.remove();

    setSelectedSpliceMarker(null);
    updateSpliceMarkerColors(null);

    // Update store
    const updatedMarkers = spliceMarkersStore.filter(time => Math.abs(time - markerTime) > 0.001);
    setSpliceMarkersStore(updatedMarkers);

    console.log("Splice marker removed. Remaining markers:", updatedMarkers.length);
  } else {
    // If no marker is selected, try to remove the closest one to cursor
    const currentTime = ws.getCurrentTime();
    const allRegions = regions.getRegions();
    const spliceRegions = allRegions.filter((r: Region) => r.id.startsWith("splice-marker-"));

    if (spliceRegions.length === 0) {
      console.log("No splice markers to remove");
      return;
    }

    // Find the closest splice marker to current cursor position
    let closestMarker = spliceRegions[0];
    let closestDistance = Math.abs(closestMarker.start - currentTime);

    for (const marker of spliceRegions) {
      const distance = Math.abs(marker.start - currentTime);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestMarker = marker;
      }
    }

    console.log("Removing closest splice marker at time:", closestMarker.start);
    const markerTime = closestMarker.start;

    // Remove from regions
    closestMarker.remove();

    // Reset selection and update colors
    setSelectedSpliceMarker(null);
    updateSpliceMarkerColors(null);

    // Update store
    const updatedMarkers = spliceMarkersStore.filter(time => Math.abs(time - markerTime) > 0.001);
    setSpliceMarkersStore(updatedMarkers);

    console.log("Closest splice marker removed. Remaining markers:", updatedMarkers.length);
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

  console.log(`Creating ${numberOfSlices} equally distributed splice markers`);

  // Clear existing splice markers first
  const allRegions = regions.getRegions();
  const existingSpliceRegions = allRegions.filter((r: Region) => r.id.startsWith("splice-marker-"));
  existingSpliceRegions.forEach(region => region.remove());

  // Create new equally distributed splice markers
  const newSpliceMarkers: number[] = [];
  const sliceInterval = duration / numberOfSlices;

  // Add splice marker at time 0 (start)
  newSpliceMarkers.push(0);
  regions.addRegion({
    start: 0,
    end: 0,
    color: "rgba(0, 255, 255, 0.8)",
    drag: true,
    resize: false,
    id: `splice-marker-auto-0-${Date.now()}`,
    content: "⚡",
  });

  // Create splice markers at the boundaries between slices (excluding end)
  for (let i = 1; i < numberOfSlices; i++) {
    const markerTime = i * sliceInterval;
    newSpliceMarkers.push(markerTime);

    // Create visual splice marker region
    regions.addRegion({
      start: markerTime,
      end: markerTime,
      color: "rgba(0, 255, 255, 0.8)",
      drag: true,
      resize: false,
      id: `splice-marker-auto-${i}-${Date.now()}`,
      content: "⚡",
    });
  }

  // Update store with new splice marker times
  setSpliceMarkersStore(newSpliceMarkers.sort((a, b) => a - b));

  // Clear any selection
  setSelectedSpliceMarker(null);
  updateSpliceMarkerColors(null);

  console.log(`Auto-slice complete. Created ${newSpliceMarkers.length} splice markers`);
};

export const halfMarkers = (
  regions: RegionsPlugin,
  setSpliceMarkersStore: (markers: number[]) => void,
  setSelectedSpliceMarker: (marker: Region | null) => void,
  updateSpliceMarkerColors: (marker: Region | null) => void
) => {
  if (!regions) return;

  const allRegions = regions.getRegions();
  const spliceRegions = allRegions.filter((r: Region) => r.id.startsWith("splice-marker-"));

  if (spliceRegions.length === 0) {
    console.log("No splice markers to process");
    return;
  }

  if (spliceRegions.length === 1) {
    // When there's only one marker, clear all markers
    console.log("Clearing single splice marker");
    spliceRegions[0].remove();
    setSpliceMarkersStore([]);
    setSelectedSpliceMarker(null);
    updateSpliceMarkerColors(null);
    console.log("Single splice marker cleared");
    return;
  }

  console.log(`Halving splice markers. Current count: ${spliceRegions.length}`);

  // Sort splice regions by their time position
  const sortedSpliceRegions = spliceRegions.sort((a, b) => a.start - b.start);

  // Remove every other marker starting from index 1 (second marker)
  const markersToRemove: Region[] = [];
  const remainingMarkerTimes: number[] = [];

  sortedSpliceRegions.forEach((region, index) => {
    if (index % 2 === 1) {
      // Remove every second marker (index 1, 3, 5, etc.)
      markersToRemove.push(region);
    } else {
      // Keep every first marker (index 0, 2, 4, etc.)
      remainingMarkerTimes.push(region.start);
    }
  });

  // Remove the selected markers from the visual display
  markersToRemove.forEach(region => region.remove());

  // Update store with remaining splice marker times
  setSpliceMarkersStore(remainingMarkerTimes.sort((a, b) => a - b));

  // Clear any selection
  setSelectedSpliceMarker(null);
  updateSpliceMarkerColors(null);

  console.log(`Half markers complete. Removed ${markersToRemove.length} markers, ${remainingMarkerTimes.length} remaining`);
};

export const updateSpliceMarkerColors = (
  regions: RegionsPlugin,
  selectedMarker: Region | null,
  theme: { palette: { primary: { main: string } } }
) => {
  if (!regions) return;

  console.log("Updating splice marker colors, selected marker:", selectedMarker?.id);

  const allRegions = regions.getRegions();
  const spliceRegions = allRegions.filter((r: Region) => r.id.startsWith("splice-marker-"));

  console.log("Found splice regions:", spliceRegions.map(r => r.id));

  spliceRegions.forEach((region: Region) => {
    if (selectedMarker && region.id === selectedMarker.id) {
      // Selected marker: use primary theme color for selection
      region.element.style.borderLeft = `2px solid ${theme.palette.primary.main}`;
    } else {
      // Unselected markers: use default cyan color
      region.element.style.borderLeft = `2px solid rgba(0, 255, 255, 0.8)`;
    }
  });
};

export const loadExistingCuePoints = (
  regions: RegionsPlugin,
  existingCuePoints: number[],
  setSpliceMarkersStore: (markers: number[]) => void
) => {
  if (existingCuePoints.length > 0) {
    console.log("Loading existing cue points as splice markers:", existingCuePoints);
    setSpliceMarkersStore(existingCuePoints);

    // Create visual splice marker regions for each cue point
    existingCuePoints.forEach((cueTime, index) => {
      regions.addRegion({
        start: cueTime,
        end: cueTime,
        color: "rgba(0, 255, 255, 0.8)",
        drag: true,
        resize: false,
        id: `splice-marker-cue-${index}-${Date.now()}`,
        content: "⚡",
      });
    });
  }
};

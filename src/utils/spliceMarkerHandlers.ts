// Utility for generating splice marker handlers
import type WaveSurfer from 'wavesurfer.js';
import { playSpliceMarker } from './playbackUtils';

// Type for individual splice marker handler
type SpliceMarkerHandler = () => void;

// Type for all splice marker handlers as an object
export type SpliceMarkerHandlers = Record<
  `handlePlaySplice${number}`,
  SpliceMarkerHandler
>;

// Create a single generic handler function
export const createGenericSpliceHandler = (
  wavesurferRef: React.RefObject<WaveSurfer | null>,
  spliceMarkersStore: number[],
  markerNumber: number
): SpliceMarkerHandler => {
  return () => {
    if (wavesurferRef.current) {
      playSpliceMarker(wavesurferRef.current, spliceMarkersStore, markerNumber);
    }
  };
};

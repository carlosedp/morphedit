// Utility for generating splice marker handlers
import { useCallback } from 'react';
import type WaveSurfer from 'wavesurfer.js';
import { playSpliceMarker } from './playbackUtils';
import { MAX_KEYBOARD_SHORTCUT_MARKERS } from '../constants';

// Generate array of marker numbers 1-20
export const SPLICE_MARKER_NUMBERS = Array.from(
  { length: MAX_KEYBOARD_SHORTCUT_MARKERS },
  (_, i) => i + 1
);

// Type for individual splice marker handler
export type SpliceMarkerHandler = () => void;

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

// Generate splice marker handlers object dynamically
export const createSpliceMarkerHandlers = (
  wavesurferRef: React.RefObject<WaveSurfer | null>,
  spliceMarkersStore: number[]
): SpliceMarkerHandlers => {
  const handlers = {} as SpliceMarkerHandlers;

  for (let i = 1; i <= MAX_KEYBOARD_SHORTCUT_MARKERS; i++) {
    const handlerName = `handlePlaySplice${i}` as keyof SpliceMarkerHandlers;
    handlers[handlerName] = createGenericSpliceHandler(
      wavesurferRef,
      spliceMarkersStore,
      i
    );
  }

  return handlers;
};

// Hook for splice marker handlers with proper memoization
export const useSpliceMarkerHandlers = (
  wavesurferRef: React.RefObject<WaveSurfer | null>,
  spliceMarkersStore: number[]
) => {
  return useCallback(() => {
    return createSpliceMarkerHandlers(wavesurferRef, spliceMarkersStore);
  }, [wavesurferRef, spliceMarkersStore]);
};

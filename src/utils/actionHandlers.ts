// Generic handler factory to reduce repetitive switch case patterns

import type { WaveformRef } from "../Waveform";
import { MAX_SPLICE_MARKERS } from "../constants";

// Type for action handlers
type ActionHandler = () => void;

// Create a mapping object for actions to avoid large switch statements
export const createActionHandlers = (
  waveformRef: React.RefObject<WaveformRef | null>,
) => {
  const handlers: Record<string, ActionHandler> = {
    // Playback controls
    playPause: () => waveformRef.current?.handlePlayPause(),
    toggleLoop: () => waveformRef.current?.handleLoop(),

    // Navigation
    skipForward: () => waveformRef.current?.handleSkipForward(),
    skipBackward: () => waveformRef.current?.handleSkipBackward(),
    increaseSkipIncrement: () =>
      waveformRef.current?.handleIncreaseSkipIncrement(),
    decreaseSkipIncrement: () =>
      waveformRef.current?.handleDecreaseSkipIncrement(),

    // Zoom controls
    zoomIn: () => {
      if (waveformRef.current) {
        const currentZoom = waveformRef.current.getCurrentZoom();
        waveformRef.current.handleZoom(Math.min(currentZoom + 20, 500));
      }
    },
    zoomOut: () => {
      if (waveformRef.current) {
        const currentZoom = waveformRef.current.getCurrentZoom();
        waveformRef.current.handleZoom(Math.max(currentZoom - 20, 0));
      }
    },

    // Region controls
    toggleCropRegion: () => waveformRef.current?.handleCropRegion(),
    toggleFadeInRegion: () => waveformRef.current?.handleFadeInRegion(),
    toggleFadeOutRegion: () => waveformRef.current?.handleFadeOutRegion(),

    // Processing
    undo: () => waveformRef.current?.handleUndo(),

    // Splice marker controls
    addSpliceMarker: () => waveformRef.current?.handleAddSpliceMarker(),
    removeSpliceMarker: () => waveformRef.current?.handleRemoveSpliceMarker(),
    toggleMarkerLock: () => waveformRef.current?.handleToggleMarkerLock(),
    autoSlice: () => waveformRef.current?.handleAutoSlice(),
    halfMarkers: () => waveformRef.current?.handleHalfMarkers(),
    clearAllMarkers: () => waveformRef.current?.handleClearAllMarkers(),
  };

  // Dynamically add splice marker playback handlers
  for (let i = 1; i <= MAX_SPLICE_MARKERS; i++) {
    const actionName = `playSplice${i}`;
    const handlerName = `handlePlaySplice${i}` as keyof WaveformRef;

    handlers[actionName] = () => {
      const handler = waveformRef.current?.[handlerName] as
        | (() => void)
        | undefined;
      handler?.();
    };
  }

  return handlers;
};

// Generic action dispatcher
export const createActionDispatcher = (
  waveformRef: React.RefObject<WaveformRef | null>,
) => {
  const handlers = createActionHandlers(waveformRef);

  return (action: string) => {
    const handler = handlers[action];
    if (handler) {
      handler();
    } else {
      console.warn(`Unknown action: ${action}`);
    }
  };
};

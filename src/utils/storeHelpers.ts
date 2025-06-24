// Audio store access utilities to reduce repeated getState() calls
import { useAudioStore } from '../audioStore';

// Common store state getters
const getAudioStoreState = () => useAudioStore.getState();

export const getAudioBuffer = () => getAudioStoreState().audioBuffer;

export const getLockedSpliceMarkers = () =>
  getAudioStoreState().lockedSpliceMarkers;

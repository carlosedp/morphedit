// Audio store access utilities to reduce repeated getState() calls
import { useAudioStore } from "../audioStore";

// Common store state getters
export const getAudioStoreState = () => useAudioStore.getState();

export const getAudioBuffer = () => getAudioStoreState().audioBuffer;

export const getLockedSpliceMarkers = () =>
  getAudioStoreState().lockedSpliceMarkers;

export const getSpliceMarkers = () => getAudioStoreState().spliceMarkers;

export const getIsProcessingAudio = () =>
  getAudioStoreState().isProcessingAudio;

export const getCanUndo = () => getAudioStoreState().canUndo;

export const getPreviousAudioUrl = () => getAudioStoreState().previousAudioUrl;

// Utility to extract multiple store values at once
export const getStoreValues = <
  T extends keyof ReturnType<typeof getAudioStoreState>,
>(
  ...keys: T[]
): Pick<ReturnType<typeof getAudioStoreState>, T> => {
  const state = getAudioStoreState();
  const result = {} as Pick<ReturnType<typeof getAudioStoreState>, T>;

  keys.forEach((key) => {
    result[key] = state[key];
  });

  return result;
};

import { beforeEach, describe, expect, it } from 'vitest';

import { useAudioStore } from '../audioStore';
import { createMockAudioBuffer } from './mocks';

describe('audioStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useAudioStore.getState().reset();
  });

  it('should initialize with default state', () => {
    const store = useAudioStore.getState();

    expect(store.audioBuffer).toBe(null);
    expect(store.markers).toEqual([]);
    expect(store.regions).toEqual([]);
    expect(store.spliceMarkers).toEqual([]);
    expect(store.lockedSpliceMarkers).toEqual([]);
    expect(store.bpm).toBe(null);
    expect(store.previousAudioUrl).toBe(null);
    expect(store.previousSpliceMarkers).toEqual([]);
    expect(store.previousLockedSpliceMarkers).toEqual([]);
    expect(store.canUndo).toBe(false);
    expect(store.isProcessingAudio).toBe(false);
    expect(store.isUndoing).toBe(false);
    expect(store.pendingTempoCallbacks).toBe(null);
  });

  it('should set audio buffer correctly', () => {
    const mockBuffer = createMockAudioBuffer(1000, 44100, 2);

    useAudioStore.getState().setAudioBuffer(mockBuffer);
    expect(useAudioStore.getState().audioBuffer).toBe(mockBuffer);

    useAudioStore.getState().setAudioBuffer(null);
    expect(useAudioStore.getState().audioBuffer).toBe(null);
  });

  it('should manage markers', () => {
    const markers = [10, 20, 30];

    useAudioStore.getState().setMarkers(markers);
    expect(useAudioStore.getState().markers).toEqual(markers);

    useAudioStore.getState().setMarkers([]);
    expect(useAudioStore.getState().markers).toEqual([]);
  });

  it('should manage regions', () => {
    const regions = [
      { start: 5, end: 15 },
      { start: 25, end: 35 },
    ];

    useAudioStore.getState().setRegions(regions);
    expect(useAudioStore.getState().regions).toEqual(regions);

    useAudioStore.getState().setRegions([]);
    expect(useAudioStore.getState().regions).toEqual([]);
  });

  it('should manage splice markers', () => {
    const spliceMarkers = [10, 20, 30];

    useAudioStore.getState().setSpliceMarkers(spliceMarkers);
    expect(useAudioStore.getState().spliceMarkers).toEqual(spliceMarkers);

    useAudioStore.getState().setSpliceMarkers([]);
    expect(useAudioStore.getState().spliceMarkers).toEqual([]);
  });

  it('should manage locked splice markers', () => {
    const lockedMarkers = [15, 25];

    useAudioStore.getState().setLockedSpliceMarkers(lockedMarkers);
    expect(useAudioStore.getState().lockedSpliceMarkers).toEqual(lockedMarkers);

    useAudioStore.getState().setLockedSpliceMarkers([]);
    expect(useAudioStore.getState().lockedSpliceMarkers).toEqual([]);
  });

  it('should manage BPM', () => {
    useAudioStore.getState().setBpm(120);
    expect(useAudioStore.getState().bpm).toBe(120);

    useAudioStore.getState().setBpm(null);
    expect(useAudioStore.getState().bpm).toBe(null);
  });

  it('should manage undo state', () => {
    useAudioStore.getState().setPreviousAudioUrl('blob:test-url');
    expect(useAudioStore.getState().previousAudioUrl).toBe('blob:test-url');

    useAudioStore.getState().setPreviousSpliceMarkers([10, 20]);
    expect(useAudioStore.getState().previousSpliceMarkers).toEqual([10, 20]);

    useAudioStore.getState().setPreviousLockedSpliceMarkers([15]);
    expect(useAudioStore.getState().previousLockedSpliceMarkers).toEqual([15]);

    useAudioStore.getState().setCanUndo(true);
    expect(useAudioStore.getState().canUndo).toBe(true);

    useAudioStore.getState().setCanUndo(false);
    expect(useAudioStore.getState().canUndo).toBe(false);
  });

  it('should manage processing state', () => {
    useAudioStore.getState().setIsProcessingAudio(true);
    expect(useAudioStore.getState().isProcessingAudio).toBe(true);

    useAudioStore.getState().setIsProcessingAudio(false);
    expect(useAudioStore.getState().isProcessingAudio).toBe(false);
  });

  it('should manage undo state flag', () => {
    useAudioStore.getState().setIsUndoing(true);
    expect(useAudioStore.getState().isUndoing).toBe(true);

    useAudioStore.getState().setIsUndoing(false);
    expect(useAudioStore.getState().isUndoing).toBe(false);
  });

  it('should manage pending tempo callbacks', () => {
    const callbacks = [() => {}, () => {}];

    useAudioStore.getState().setPendingTempoCallbacks(callbacks);
    expect(useAudioStore.getState().pendingTempoCallbacks).toBe(callbacks);

    useAudioStore.getState().setPendingTempoCallbacks(null);
    expect(useAudioStore.getState().pendingTempoCallbacks).toBe(null);
  });

  it('should reset to initial state', () => {
    const mockBuffer = createMockAudioBuffer(1000, 44100, 2);

    // Set some values
    useAudioStore.getState().setAudioBuffer(mockBuffer);
    useAudioStore.getState().setMarkers([10, 20]);
    useAudioStore.getState().setSpliceMarkers([15, 25]);
    useAudioStore.getState().setBpm(120);
    useAudioStore.getState().setCanUndo(true);
    useAudioStore.getState().setIsProcessingAudio(true);

    // Reset
    useAudioStore.getState().reset();

    // Check that everything is back to initial state
    expect(useAudioStore.getState().audioBuffer).toBe(null);
    expect(useAudioStore.getState().markers).toEqual([]);
    expect(useAudioStore.getState().spliceMarkers).toEqual([]);
    expect(useAudioStore.getState().bpm).toBe(null);
    expect(useAudioStore.getState().canUndo).toBe(false);
    expect(useAudioStore.getState().isProcessingAudio).toBe(false);
  });
});

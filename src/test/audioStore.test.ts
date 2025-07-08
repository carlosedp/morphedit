import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAudioStore } from '../audioStore';
import { createMockAudioBuffer } from './mocks';

describe('audioStore', () => {
  beforeEach(() => {
    // Reset store state before each test using getState()
    const state = useAudioStore.getState();
    state.reset();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAudioStore());

    expect(result.current.audioBuffer).toBeNull();
    expect(result.current.spliceMarkers).toEqual([]);
    expect(result.current.lockedSpliceMarkers).toEqual([]);
    expect(result.current.bpm).toBeNull();
    expect(result.current.isProcessingAudio).toBe(false);
    expect(result.current.canUndo).toBe(false);
  });

  it('should set audio buffer correctly', () => {
    const { result } = renderHook(() => useAudioStore());
    const mockBuffer = createMockAudioBuffer();

    act(() => {
      result.current.setAudioBuffer(mockBuffer);
    });

    expect(result.current.audioBuffer).toBe(mockBuffer);
  });

  it('should manage splice markers', () => {
    const { result } = renderHook(() => useAudioStore());
    const markers = [1.5, 3.0, 4.5];

    act(() => {
      result.current.setSpliceMarkers(markers);
    });

    expect(result.current.spliceMarkers).toEqual(markers);
  });

  it('should handle undo state correctly', () => {
    const { result } = renderHook(() => useAudioStore());

    act(() => {
      result.current.setCanUndo(true);
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.setCanUndo(false);
    });

    expect(result.current.canUndo).toBe(false);
  });

  it('should manage processing state', () => {
    const { result } = renderHook(() => useAudioStore());

    act(() => {
      result.current.setIsProcessingAudio(true);
    });

    expect(result.current.isProcessingAudio).toBe(true);

    act(() => {
      result.current.setIsProcessingAudio(false);
    });

    expect(result.current.isProcessingAudio).toBe(false);
  });

  it('should set and clear BPM', () => {
    const { result } = renderHook(() => useAudioStore());

    act(() => {
      result.current.setBpm(120);
    });

    expect(result.current.bpm).toBe(120);

    act(() => {
      result.current.setBpm(null);
    });

    expect(result.current.bpm).toBeNull();
  });
});

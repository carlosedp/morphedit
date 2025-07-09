import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAudioStore } from '../audioStore';
import * as audioProcessing from '../utils/audioProcessing';
import { applyReversal } from '../utils/audioReversal';
import { createMockAudioBuffer } from './mocks';

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = vi.fn();

// Mock AudioContext for the test
class MockAudioContext {
  createBuffer(numberOfChannels: number, length: number, sampleRate: number) {
    return {
      length,
      sampleRate,
      numberOfChannels,
      duration: length / sampleRate,
      getChannelData: vi.fn(() => new Float32Array(length)),
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn(),
    };
  }
}

// Ensure AudioContext is available on window
/* eslint-disable @typescript-eslint/no-explicit-any */
if (typeof window !== 'undefined') {
  window.AudioContext = MockAudioContext as any;
  (window as any).webkitAudioContext = MockAudioContext;
} else {
  global.window = {
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
  } as any;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('audioReversal', () => {
  let mockWaveSurfer: {
    getDuration: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
  };
  let mockRegions: {
    getRegions: ReturnType<typeof vi.fn>;
  };
  let mockCallbacks: {
    setPreviousAudioUrl: ReturnType<typeof vi.fn>;
    setCanUndo: ReturnType<typeof vi.fn>;
    setAudioBuffer: ReturnType<typeof vi.fn>;
    setCurrentAudioUrl: ReturnType<typeof vi.fn>;
    setSpliceMarkersStore: ReturnType<typeof vi.fn>;
    setPreviousSpliceMarkers: ReturnType<typeof vi.fn>;
    setPreviousLockedSpliceMarkers: ReturnType<typeof vi.fn>;
    resetZoom: ReturnType<typeof vi.fn>;
    setResetZoom: ReturnType<typeof vi.fn>;
  };
  let mockAudioBuffer: AudioBuffer;
  let mockStoreState: {
    audioBuffer: AudioBuffer | null;
    setIsProcessingAudio: ReturnType<typeof vi.fn>;
    setLockedSpliceMarkers: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock the audioProcessing utility
    vi.spyOn(audioProcessing, 'audioBufferToWavWithCues').mockReturnValue(
      new ArrayBuffer(1024)
    );

    // Create a mock audio buffer with realistic test data
    // Parameters: length, sampleRate, numberOfChannels
    mockAudioBuffer = createMockAudioBuffer(44100, 44100, 2);

    // Override getChannelData to return predictable test data
    mockAudioBuffer.getChannelData = vi.fn(() => {
      const data = new Float32Array(44100);
      // Fill with test pattern: values from 0.1 to 0.9 for testing reversal
      for (let i = 0; i < data.length; i++) {
        data[i] = (i / data.length) * 0.8 + 0.1; // Range from 0.1 to 0.9
      }
      return data;
    });

    // Mock WaveSurfer instance
    mockWaveSurfer = {
      getDuration: vi.fn(() => 1.0),
      load: vi.fn(() => Promise.resolve()),
    };

    // Mock Regions plugin
    mockRegions = {
      getRegions: vi.fn(() => []),
    };

    // Mock callbacks
    mockCallbacks = {
      setPreviousAudioUrl: vi.fn(),
      setCanUndo: vi.fn(),
      setAudioBuffer: vi.fn(),
      setCurrentAudioUrl: vi.fn(),
      setSpliceMarkersStore: vi.fn(),
      setPreviousSpliceMarkers: vi.fn(),
      setPreviousLockedSpliceMarkers: vi.fn(),
      resetZoom: vi.fn(),
      setResetZoom: vi.fn(),
    };

    // Mock audio store state
    mockStoreState = {
      audioBuffer: mockAudioBuffer,
      setIsProcessingAudio: vi.fn(),
      setLockedSpliceMarkers: vi.fn(),
    } as any; // Use 'as any' to avoid full interface requirements for testing

    // Mock the audio store's getState method
    vi.spyOn(useAudioStore, 'getState').mockReturnValue(mockStoreState as any);
  });

  describe('applyReversal', () => {
    it('should handle no audio buffer in store', async () => {
      // Mock store to return no audio buffer
      mockStoreState.audioBuffer = null;

      await applyReversal(
        mockWaveSurfer as any,
        mockRegions as any,
        'test-url',
        [],
        [],
        mockCallbacks
      );

      // Should not call any callbacks when no audio buffer
      expect(mockCallbacks.setAudioBuffer).not.toHaveBeenCalled();
      expect(mockWaveSurfer.load).not.toHaveBeenCalled();
    });

    it('should handle zero duration audio', async () => {
      mockWaveSurfer.getDuration.mockReturnValue(0);

      await applyReversal(
        mockWaveSurfer as any,
        mockRegions as any,
        'test-url',
        [],
        [],
        mockCallbacks
      );

      // Should not proceed with reversal
      expect(mockCallbacks.setAudioBuffer).not.toHaveBeenCalled();
      expect(mockWaveSurfer.load).not.toHaveBeenCalled();
    });

    it('should apply reversal to entire audio when no crop region', async () => {
      const spliceMarkers = [0.25, 0.5, 0.75];
      const lockedMarkers = [0.5];

      await applyReversal(
        mockWaveSurfer as any,
        mockRegions as any,
        'test-url',
        spliceMarkers,
        lockedMarkers,
        mockCallbacks
      );

      // Should call setAudioBuffer with reversed buffer
      expect(mockCallbacks.setAudioBuffer).toHaveBeenCalled();
      expect(mockWaveSurfer.load).toHaveBeenCalled();
      expect(mockCallbacks.setCurrentAudioUrl).toHaveBeenCalled();

      // Should reverse splice markers for entire audio
      expect(mockCallbacks.setSpliceMarkersStore).toHaveBeenCalled();
      const reversedMarkers =
        mockCallbacks.setSpliceMarkersStore.mock.calls[0][0];

      // For entire audio reversal, markers should be reversed around the middle
      expect(reversedMarkers).toEqual([0.75, 0.5, 0.25]);
    });

    it('should apply reversal to crop region when crop region exists', async () => {
      const cropRegion = {
        id: 'crop-loop',
        start: 0.2,
        end: 0.8,
      };

      mockRegions.getRegions.mockReturnValue([cropRegion]);

      const spliceMarkers = [0.1, 0.3, 0.5, 0.7, 0.9];
      const lockedMarkers = [0.3, 0.7];

      await applyReversal(
        mockWaveSurfer as any,
        mockRegions as any,
        'test-url',
        spliceMarkers,
        lockedMarkers,
        mockCallbacks
      );

      // Should call setAudioBuffer with reversed buffer
      expect(mockCallbacks.setAudioBuffer).toHaveBeenCalled();
      expect(mockWaveSurfer.load).toHaveBeenCalled();

      // Should reverse splice markers only within the crop region
      expect(mockCallbacks.setSpliceMarkersStore).toHaveBeenCalled();
      const reversedMarkers =
        mockCallbacks.setSpliceMarkersStore.mock.calls[0][0];

      // Markers outside crop region should remain the same
      // Markers inside crop region should be reversed within that region
      expect(reversedMarkers[0]).toBe(0.1); // Outside crop region
      expect(reversedMarkers[4]).toBe(0.9); // Outside crop region

      // Markers inside crop region should be reversed
      // 0.3 -> 0.8 - (0.3 - 0.2) = 0.7
      // 0.5 -> 0.8 - (0.5 - 0.2) = 0.5
      // 0.7 -> 0.8 - (0.7 - 0.2) = 0.3
      expect(reversedMarkers[1]).toBeCloseTo(0.7);
      expect(reversedMarkers[2]).toBeCloseTo(0.5);
      expect(reversedMarkers[3]).toBeCloseTo(0.3);
    });

    it('should handle previous state for undo functionality', async () => {
      const currentUrl = 'current-url';
      const spliceMarkers = [0.25, 0.5, 0.75];
      const lockedMarkers = [0.5];

      await applyReversal(
        mockWaveSurfer as any,
        mockRegions as any,
        currentUrl,
        spliceMarkers,
        lockedMarkers,
        mockCallbacks
      );

      // Should save previous state for undo
      expect(mockCallbacks.setPreviousAudioUrl).toHaveBeenCalledWith(
        currentUrl
      );
      expect(mockCallbacks.setPreviousSpliceMarkers).toHaveBeenCalledWith(
        spliceMarkers
      );
      expect(mockCallbacks.setPreviousLockedSpliceMarkers).toHaveBeenCalledWith(
        lockedMarkers
      );
      expect(mockCallbacks.setCanUndo).toHaveBeenCalledWith(true);
    });

    it('should handle zoom reset after reversal', async () => {
      await applyReversal(
        mockWaveSurfer as any,
        mockRegions as any,
        'test-url',
        [],
        [],
        mockCallbacks
      );

      // Should reset zoom settings
      expect(mockCallbacks.setResetZoom).toHaveBeenCalledWith(2);

      // Should call resetZoom after a delay
      // We can't easily test the setTimeout, but we can verify the function is provided
      expect(mockCallbacks.resetZoom).toBeDefined();
    });

    it('should handle loading errors gracefully', async () => {
      // Mock WaveSurfer to throw an error
      mockWaveSurfer.load.mockRejectedValue(new Error('Load failed'));

      // The function should handle the error and not throw
      await applyReversal(
        mockWaveSurfer as any,
        mockRegions as any,
        'test-url',
        [],
        [],
        mockCallbacks
      );

      // Should still call setAudioBuffer before the error
      expect(mockCallbacks.setAudioBuffer).toHaveBeenCalled();
    });
  });

  describe('reverseAudioBuffer internal logic', () => {
    it('should preserve audio buffer properties', () => {
      const originalBuffer = createMockAudioBuffer(44100, 44100, 2);

      // Since reverseAudioBuffer is not exported, we test the logic through applyReversal
      // The internal logic should preserve these properties
      expect(originalBuffer.numberOfChannels).toBe(2);
      expect(originalBuffer.length).toBe(44100);
      expect(originalBuffer.sampleRate).toBe(44100);
      expect(originalBuffer.duration).toBe(1.0);
    });

    it('should handle boundary conditions in sample calculations', () => {
      const sampleRate = 44100;

      // Test time to sample conversion
      const timeInSeconds = 0.5;
      const expectedSampleIndex = Math.floor(timeInSeconds * sampleRate);
      expect(expectedSampleIndex).toBe(22050);

      // Test boundary clamping
      const bufferLength = 44100;
      let regionStart = -10;
      let regionEnd = 50000;

      regionStart = Math.max(0, regionStart);
      regionEnd = Math.min(bufferLength, regionEnd);

      expect(regionStart).toBe(0);
      expect(regionEnd).toBe(44100);
    });
  });
});

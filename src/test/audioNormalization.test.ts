import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  findPeakAmplitude,
  normalizeAudioBuffer,
} from '../utils/audioNormalization';

// Mock the audioStore and audioProcessing dependencies
vi.mock('../audioStore', () => ({
  useAudioStore: {
    getState: vi.fn(() => ({
      audioBuffer: null,
      setIsProcessingAudio: vi.fn(),
    })),
  },
}));

vi.mock('../utils/audioProcessing', () => ({
  audioBufferToWavWithCues: vi.fn(() => new ArrayBuffer(0)),
}));

// Mock AudioContext for testing
const mockAudioContext = {
  createBuffer: vi.fn(
    (_channels: number, _length: number, _sampleRate: number) => {
      return {
        numberOfChannels: _channels,
        length: _length,
        sampleRate: _sampleRate,
        getChannelData: vi.fn(() => new Float32Array(_length)),
      };
    }
  ),
};

// Mock window.AudioContext
Object.defineProperty(window, 'AudioContext', {
  value: function () {
    return mockAudioContext;
  },
  writable: true,
});

// Helper function to create mock AudioBuffer
const createMockAudioBuffer = (
  numberOfChannels: number,
  length: number,
  sampleRate: number,
  getChannelDataFn: (channel: number) => Float32Array
): AudioBuffer =>
  ({
    numberOfChannels,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData: getChannelDataFn,
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  }) as AudioBuffer;

describe('audioNormalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findPeakAmplitude', () => {
    it('should find peak amplitude in mono audio', () => {
      const mockAudioBuffer = createMockAudioBuffer(
        1,
        5,
        44100,
        (channel: number) => {
          expect(channel).toBe(0);
          return new Float32Array([0.1, -0.5, 0.3, -0.8, 0.2]);
        }
      );

      const peak = findPeakAmplitude(mockAudioBuffer);
      expect(peak).toBeCloseTo(0.8);
    });

    it('should find peak amplitude in stereo audio', () => {
      const mockAudioBuffer = createMockAudioBuffer(
        2,
        3,
        44100,
        (channel: number) => {
          if (channel === 0) {
            return new Float32Array([0.1, -0.5, 0.3]);
          } else if (channel === 1) {
            return new Float32Array([0.2, -0.9, 0.1]);
          }
          return new Float32Array();
        }
      );

      const peak = findPeakAmplitude(mockAudioBuffer);
      expect(peak).toBeCloseTo(0.9);
    });

    it('should handle silent audio', () => {
      const mockAudioBuffer = createMockAudioBuffer(
        1,
        3,
        44100,
        () => new Float32Array([0, 0, 0])
      );

      const peak = findPeakAmplitude(mockAudioBuffer);
      expect(peak).toBe(0);
    });
  });

  describe('normalizeAudioBuffer', () => {
    it('should normalize audio to target peak level', () => {
      const inputData = new Float32Array([0.1, -0.5, 0.3, -0.8, 0.2]);
      const outputData = new Float32Array(5);

      const mockAudioBuffer = createMockAudioBuffer(
        1,
        5,
        44100,
        (channel: number) => {
          expect(channel).toBe(0);
          return inputData;
        }
      );

      // Setup mock for createBuffer
      mockAudioContext.createBuffer.mockReturnValue({
        numberOfChannels: 1,
        length: 5,
        sampleRate: 44100,
        getChannelData: vi.fn((channel: number) => {
          expect(channel).toBe(0);
          return outputData;
        }),
      });

      const result = normalizeAudioBuffer(mockAudioBuffer, -1);

      // Check that createBuffer was called with correct parameters
      expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(1, 5, 44100);

      // The peak was 0.8, target peak for -1dB is ~0.8913
      const expectedGain = Math.pow(10, -1 / 20) / 0.8;

      // Check that the output data was modified with correct gain
      expect(outputData[0]).toBeCloseTo(0.1 * expectedGain);
      expect(outputData[1]).toBeCloseTo(-0.5 * expectedGain);
      expect(outputData[2]).toBeCloseTo(0.3 * expectedGain);
      expect(outputData[3]).toBeCloseTo(-0.8 * expectedGain);
      expect(outputData[4]).toBeCloseTo(0.2 * expectedGain);

      expect(result).toBeDefined();
    });

    it('should handle stereo audio normalization', () => {
      const leftChannelData = new Float32Array([0.1, -0.5, 0.3]);
      const rightChannelData = new Float32Array([0.2, -0.9, 0.1]);
      const leftOutputData = new Float32Array(3);
      const rightOutputData = new Float32Array(3);

      const mockAudioBuffer = createMockAudioBuffer(
        2,
        3,
        44100,
        (channel: number) => {
          if (channel === 0) return leftChannelData;
          if (channel === 1) return rightChannelData;
          return new Float32Array();
        }
      );

      mockAudioContext.createBuffer.mockReturnValue({
        numberOfChannels: 2,
        length: 3,
        sampleRate: 44100,
        getChannelData: vi.fn((channel: number) => {
          if (channel === 0) return leftOutputData;
          if (channel === 1) return rightOutputData;
          return new Float32Array();
        }),
      });

      const result = normalizeAudioBuffer(mockAudioBuffer, -6);

      expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(2, 3, 44100);

      // Peak amplitude should be 0.9 (from right channel)
      const expectedGain = Math.pow(10, -6 / 20) / 0.9;

      // Check left channel normalization
      expect(leftOutputData[0]).toBeCloseTo(0.1 * expectedGain);
      expect(leftOutputData[1]).toBeCloseTo(-0.5 * expectedGain);
      expect(leftOutputData[2]).toBeCloseTo(0.3 * expectedGain);

      // Check right channel normalization
      expect(rightOutputData[0]).toBeCloseTo(0.2 * expectedGain);
      expect(rightOutputData[1]).toBeCloseTo(-0.9 * expectedGain);
      expect(rightOutputData[2]).toBeCloseTo(0.1 * expectedGain);

      expect(result).toBeDefined();
    });

    it('should return original buffer for very quiet audio', () => {
      const quietData = new Float32Array([0.0000001, -0.0000001, 0.0000001]);

      const mockAudioBuffer = createMockAudioBuffer(
        1,
        3,
        44100,
        () => quietData
      );

      // Mock console.log to capture the message
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = normalizeAudioBuffer(mockAudioBuffer, -1);

      // Should return the original buffer without processing
      expect(result).toBe(mockAudioBuffer);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Audio is too quiet to normalize effectively'
      );

      consoleSpy.mockRestore();
    });

    it('should handle different target dB levels', () => {
      const inputData = new Float32Array([0.5, -0.5]);
      const outputData = new Float32Array(2);

      const mockAudioBuffer = createMockAudioBuffer(
        1,
        2,
        44100,
        () => inputData
      );

      mockAudioContext.createBuffer.mockReturnValue({
        numberOfChannels: 1,
        length: 2,
        sampleRate: 44100,
        getChannelData: vi.fn(() => outputData),
      });

      // Test with 0dB target (no attenuation)
      const result = normalizeAudioBuffer(mockAudioBuffer, 0);

      // Peak was 0.5, target for 0dB is 1.0
      const expectedGain = 1.0 / 0.5; // Should be 2.0

      expect(outputData[0]).toBeCloseTo(0.5 * expectedGain);
      expect(outputData[1]).toBeCloseTo(-0.5 * expectedGain);
      expect(result).toBeDefined();
    });
  });

  describe('dB to linear conversion', () => {
    it('should convert dB values to linear scale correctly', () => {
      // Test dB to linear conversion: linear = 10^(dB/20)
      const testCases = [
        { dB: 0, expectedLinear: 1 },
        { dB: -1, expectedLinear: 0.8913 },
        { dB: -6, expectedLinear: 0.5012 },
        { dB: -12, expectedLinear: 0.2512 },
        { dB: -20, expectedLinear: 0.1 },
      ];

      testCases.forEach(({ dB, expectedLinear }) => {
        const result = Math.pow(10, dB / 20);
        expect(result).toBeCloseTo(expectedLinear, 3);
      });
    });
  });

  describe('integration tests', () => {
    it('should normalize audio and verify peak amplitude', () => {
      // Create test audio with known peak
      const inputData = new Float32Array([0.1, -0.6, 0.4, -0.8, 0.3]);
      const outputData = new Float32Array(5);

      const mockAudioBuffer = createMockAudioBuffer(
        1,
        5,
        44100,
        () => inputData
      );

      mockAudioContext.createBuffer.mockReturnValue({
        numberOfChannels: 1,
        length: 5,
        sampleRate: 44100,
        getChannelData: vi.fn(() => outputData),
      });

      // Normalize to -1dB
      const normalizedBuffer = normalizeAudioBuffer(mockAudioBuffer, -1);

      // Check that the normalized buffer has the expected peak
      const normalizedPeak = findPeakAmplitude(normalizedBuffer);
      const expectedPeak = Math.pow(10, -1 / 20); // -1dB in linear scale

      expect(normalizedPeak).toBeCloseTo(expectedPeak, 3);
    });
  });
});

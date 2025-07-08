import { describe, expect, it } from 'vitest';

import { audioBufferToWavWithCues } from '../utils/audioProcessing';
import { createMockAudioBuffer } from './mocks';

describe('audioProcessing', () => {
  describe('audioBufferToWavWithCues', () => {
    it('should convert AudioBuffer to WAV format without cues', () => {
      const mockBuffer = createMockAudioBuffer(1000, 44100, 2);
      const result = audioBufferToWavWithCues(mockBuffer, []);

      expect(result).toBeInstanceOf(ArrayBuffer);

      // Check WAV header
      const view = new DataView(result);

      // Check RIFF header
      expect(
        String.fromCharCode(
          view.getUint8(0),
          view.getUint8(1),
          view.getUint8(2),
          view.getUint8(3)
        )
      ).toBe('RIFF');

      // Check WAVE format
      expect(
        String.fromCharCode(
          view.getUint8(8),
          view.getUint8(9),
          view.getUint8(10),
          view.getUint8(11)
        )
      ).toBe('WAVE');

      // Check fmt chunk
      expect(
        String.fromCharCode(
          view.getUint8(12),
          view.getUint8(13),
          view.getUint8(14),
          view.getUint8(15)
        )
      ).toBe('fmt ');

      // Check sample rate
      expect(view.getUint32(24, true)).toBe(44100);

      // Check channels
      expect(view.getUint16(22, true)).toBe(2);
    });

    it('should convert AudioBuffer to WAV format with cue points', () => {
      const mockBuffer = createMockAudioBuffer(1000, 44100, 2);
      const cuePoints = [0.5, 1.0, 1.5]; // 3 cue points
      const result = audioBufferToWavWithCues(mockBuffer, cuePoints);

      expect(result).toBeInstanceOf(ArrayBuffer);

      // Should be larger than without cues due to cue chunk
      const expectedBaseSize = 44 + 1000 * 2 * 2; // header + data
      const expectedCueSize = 12 + 3 * 24; // cue chunk header + 3 cue points
      expect(result.byteLength).toBe(expectedBaseSize + expectedCueSize);
    });

    it('should handle mono audio correctly', () => {
      const mockBuffer = createMockAudioBuffer(1000, 44100, 1);
      const result = audioBufferToWavWithCues(mockBuffer, []);

      const view = new DataView(result);

      // Check channels
      expect(view.getUint16(22, true)).toBe(1);

      // Check block align (should be 2 for mono 16-bit)
      expect(view.getUint16(32, true)).toBe(2);
    });

    it('should handle different sample rates', () => {
      const mockBuffer = createMockAudioBuffer(1000, 48000, 2);
      const result = audioBufferToWavWithCues(mockBuffer, []);

      const view = new DataView(result);

      // Check sample rate
      expect(view.getUint32(24, true)).toBe(48000);

      // Check byte rate (should be sample rate * block align)
      expect(view.getUint32(28, true)).toBe(48000 * 4); // 48000 * 2 channels * 2 bytes
    });

    it('should handle empty buffer', () => {
      const mockBuffer = createMockAudioBuffer(0, 44100, 2);
      const result = audioBufferToWavWithCues(mockBuffer, []);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(44); // Just the header
    });
  });
});

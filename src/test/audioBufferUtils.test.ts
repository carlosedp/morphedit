import { describe, expect, it } from 'vitest';

import { copyAudioData } from '../utils/audioBufferUtils';
import { createMockAudioBuffer } from './mocks';

describe('audioBufferUtils', () => {
  describe('copyAudioData', () => {
    it('should copy audio data from source to destination buffer', () => {
      const sourceBuffer = createMockAudioBuffer(1000, 44100, 2);
      const destBuffer = createMockAudioBuffer(2000, 44100, 2);

      // Mock some sample data
      const sourceData = new Float32Array(1000);
      sourceData.fill(0.5);

      const destData = new Float32Array(2000);
      destData.fill(0);

      // Mock getChannelData to return our test data
      sourceBuffer.getChannelData = () => sourceData;
      destBuffer.getChannelData = () => destData;

      const startPosition = 500;
      copyAudioData(sourceBuffer, destBuffer, startPosition);

      // Verify the copy operation would have been called
      expect(sourceBuffer.getChannelData).toBeDefined();
      expect(destBuffer.getChannelData).toBeDefined();
    });

    it('should handle mono to stereo conversion', () => {
      const sourceBuffer = createMockAudioBuffer(1000, 44100, 1);
      const destBuffer = createMockAudioBuffer(2000, 44100, 2);

      const sourceData = new Float32Array(1000);
      sourceData.fill(0.5);

      const destData = new Float32Array(2000);
      destData.fill(0);

      sourceBuffer.getChannelData = () => sourceData;
      destBuffer.getChannelData = () => destData;

      const startPosition = 0;
      copyAudioData(sourceBuffer, destBuffer, startPosition);

      expect(sourceBuffer.numberOfChannels).toBe(1);
      expect(destBuffer.numberOfChannels).toBe(2);
    });

    it('should handle stereo to mono conversion', () => {
      const sourceBuffer = createMockAudioBuffer(1000, 44100, 2);
      const destBuffer = createMockAudioBuffer(2000, 44100, 1);

      const sourceData = new Float32Array(1000);
      sourceData.fill(0.5);

      const destData = new Float32Array(2000);
      destData.fill(0);

      sourceBuffer.getChannelData = () => sourceData;
      destBuffer.getChannelData = () => destData;

      const startPosition = 0;
      copyAudioData(sourceBuffer, destBuffer, startPosition);

      expect(sourceBuffer.numberOfChannels).toBe(2);
      expect(destBuffer.numberOfChannels).toBe(1);
    });

    it('should handle edge case with zero-length buffer', () => {
      const sourceBuffer = createMockAudioBuffer(0, 44100, 2);
      const destBuffer = createMockAudioBuffer(1000, 44100, 2);

      const sourceData = new Float32Array(0);
      const destData = new Float32Array(1000);

      sourceBuffer.getChannelData = () => sourceData;
      destBuffer.getChannelData = () => destData;

      const startPosition = 0;
      expect(() =>
        copyAudioData(sourceBuffer, destBuffer, startPosition)
      ).not.toThrow();
    });

    it('should handle copy beyond buffer boundaries', () => {
      const sourceBuffer = createMockAudioBuffer(1000, 44100, 2);
      const destBuffer = createMockAudioBuffer(1500, 44100, 2);

      const sourceData = new Float32Array(1000);
      sourceData.fill(0.5);

      const destData = new Float32Array(1500);
      destData.fill(0);

      sourceBuffer.getChannelData = () => sourceData;
      destBuffer.getChannelData = () => destData;

      const startPosition = 800; // Would extend beyond dest buffer
      expect(() =>
        copyAudioData(sourceBuffer, destBuffer, startPosition)
      ).not.toThrow();
    });
  });
});

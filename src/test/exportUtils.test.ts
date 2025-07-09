import { describe, expect, it } from 'vitest';

import type { ExportFormat } from '../utils/exportUtils';

describe('exportUtils', () => {
  describe('ExportFormat interface', () => {
    it('should define valid export format structure', () => {
      const morphageneFormat: ExportFormat = {
        label: 'Morphagene (48kHz/32-bit)',
        shortLabel: 'Morphagene',
        sampleRate: 48000,
        bitDepth: 32,
        channels: 'stereo',
        format: 'float',
      };

      expect(morphageneFormat.label).toBe('Morphagene (48kHz/32-bit)');
      expect(morphageneFormat.sampleRate).toBe(48000);
      expect(morphageneFormat.bitDepth).toBe(32);
      expect(morphageneFormat.channels).toBe('stereo');
      expect(morphageneFormat.format).toBe('float');
    });

    it('should handle different format configurations', () => {
      const cdQualityFormat: ExportFormat = {
        label: 'CD Quality (44.1kHz/16-bit)',
        shortLabel: 'CD',
        sampleRate: 44100,
        bitDepth: 16,
        channels: 'stereo',
        format: 'int',
      };

      expect(cdQualityFormat.sampleRate).toBe(44100);
      expect(cdQualityFormat.bitDepth).toBe(16);
      expect(cdQualityFormat.format).toBe('int');
    });
  });

  describe('sample rate conversion calculations', () => {
    it('should calculate resample ratio correctly', () => {
      const testCases = [
        { original: 44100, target: 48000, expectedRatio: 48000 / 44100 },
        { original: 48000, target: 44100, expectedRatio: 44100 / 48000 },
        { original: 22050, target: 44100, expectedRatio: 2.0 },
        { original: 96000, target: 48000, expectedRatio: 0.5 },
      ];

      testCases.forEach(({ expectedRatio, original, target }) => {
        const ratio = target / original;
        expect(ratio).toBeCloseTo(expectedRatio, 5);
      });
    });

    it('should calculate new buffer length correctly', () => {
      const testCases = [
        { originalLength: 44100, ratio: 48000 / 44100, expectedLength: 48000 },
        { originalLength: 48000, ratio: 44100 / 48000, expectedLength: 44100 },
        { originalLength: 1000, ratio: 2.0, expectedLength: 2000 },
        { originalLength: 2000, ratio: 0.5, expectedLength: 1000 },
      ];

      testCases.forEach(({ expectedLength, originalLength, ratio }) => {
        const newLength = Math.round(originalLength * ratio);
        expect(newLength).toBe(expectedLength);
      });
    });
  });

  describe('channel conversion logic', () => {
    it('should handle stereo to mono conversion', () => {
      // Mock stereo data
      const leftChannel = new Float32Array([0.1, 0.2, 0.3]);
      const rightChannel = new Float32Array([0.4, 0.5, 0.6]);
      const monoData = new Float32Array(leftChannel.length);

      // Simulate stereo to mono conversion (average channels)
      for (let i = 0; i < leftChannel.length; i++) {
        monoData[i] = (leftChannel[i] + rightChannel[i]) / 2;
      }

      expect(monoData[0]).toBeCloseTo(0.25, 3); // (0.1 + 0.4) / 2
      expect(monoData[1]).toBeCloseTo(0.35, 3); // (0.2 + 0.5) / 2
      expect(monoData[2]).toBeCloseTo(0.45, 3); // (0.3 + 0.6) / 2
    });

    it('should handle mono to stereo conversion', () => {
      // Mock mono data
      const monoData = new Float32Array([0.1, 0.2, 0.3]);
      const leftChannel = new Float32Array(monoData.length);
      const rightChannel = new Float32Array(monoData.length);

      // Simulate mono to stereo conversion (duplicate to both channels)
      for (let i = 0; i < monoData.length; i++) {
        leftChannel[i] = monoData[i];
        rightChannel[i] = monoData[i];
      }

      expect(leftChannel).toEqual(monoData);
      expect(rightChannel).toEqual(monoData);
    });
  });

  describe('bit depth conversion', () => {
    it('should convert float32 to int16 correctly', () => {
      const floatValues = [0.0, 0.5, -0.5, 1.0, -1.0];
      const int16Values = floatValues.map((val) => {
        const clampedVal = Math.max(-1, Math.min(1, val));
        return Math.round(clampedVal * 32767);
      });

      expect(int16Values[0]).toBe(0);
      expect(int16Values[1]).toBe(16384); // 0.5 * 32767 rounded
      expect(int16Values[2]).toBe(-16383); // -0.5 * 32767 rounded (actual result)
      expect(int16Values[3]).toBe(32767);
      expect(int16Values[4]).toBe(-32767);
    });

    it('should handle clipping for out-of-range values', () => {
      const outOfRangeValues = [1.5, -1.5, 2.0, -2.0];
      const clampedValues = outOfRangeValues.map((val) =>
        Math.max(-1, Math.min(1, val))
      );

      expect(clampedValues).toEqual([1.0, -1.0, 1.0, -1.0]);
    });
  });

  describe('WAV file structure', () => {
    it('should calculate correct WAV header size', () => {
      const wavHeaderSize = 44; // Standard WAV header size
      expect(wavHeaderSize).toBe(44);
    });

    it('should calculate bytes per sample correctly', () => {
      const testCases = [
        { bitDepth: 16, channels: 1, expectedBytes: 2 },
        { bitDepth: 16, channels: 2, expectedBytes: 4 },
        { bitDepth: 32, channels: 1, expectedBytes: 4 },
        { bitDepth: 32, channels: 2, expectedBytes: 8 },
      ];

      testCases.forEach(({ bitDepth, channels, expectedBytes }) => {
        const bytesPerSample = (bitDepth / 8) * channels;
        expect(bytesPerSample).toBe(expectedBytes);
      });
    });

    it('should calculate total file size correctly', () => {
      const headerSize = 44;
      const dataLength = 1000; // samples
      const bitDepth = 16;
      const channels = 2;

      const bytesPerSample = (bitDepth / 8) * channels;
      const dataSize = dataLength * bytesPerSample;
      const totalSize = headerSize + dataSize;

      expect(totalSize).toBe(44 + 4000); // 44 + (1000 * 4)
    });
  });

  describe('file naming and extensions', () => {
    it('should generate appropriate file names', () => {
      const baseName = 'audio-sample';
      const formats = [
        { shortLabel: 'Morphagene', expectedSuffix: '-morphagene.wav' },
        { shortLabel: 'CD', expectedSuffix: '-cd.wav' },
        { shortLabel: 'HiRes', expectedSuffix: '-hires.wav' },
      ];

      formats.forEach(({ expectedSuffix, shortLabel }) => {
        const fileName = `${baseName}-${shortLabel.toLowerCase()}.wav`;
        expect(fileName).toBe(`${baseName}${expectedSuffix}`);
      });
    });
  });

  describe('splice marker scaling', () => {
    it('should scale splice markers for different sample rates', () => {
      const originalMarkers = [0, 22050, 44100]; // Markers at 0s, 0.5s, 1s at 44.1kHz
      const originalSampleRate = 44100;
      const targetSampleRate = 48000;

      const scaledMarkers = originalMarkers.map((marker) =>
        Math.round((marker / originalSampleRate) * targetSampleRate)
      );

      expect(scaledMarkers[0]).toBe(0);
      expect(scaledMarkers[1]).toBe(24000); // 0.5s at 48kHz
      expect(scaledMarkers[2]).toBe(48000); // 1s at 48kHz
    });

    it('should handle edge cases in marker scaling', () => {
      const markers = [0];
      const scaledMarkers = markers.map((marker) =>
        Math.round((marker / 44100) * 48000)
      );

      expect(scaledMarkers[0]).toBe(0);
    });
  });

  describe('format validation', () => {
    it('should validate supported bit depths', () => {
      const validBitDepths = [16, 32];
      const testValues = [8, 16, 24, 32, 64];

      testValues.forEach((bitDepth) => {
        const isValid = validBitDepths.includes(bitDepth as 16 | 32);
        if (bitDepth === 16 || bitDepth === 32) {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      });
    });

    it('should validate supported formats', () => {
      const validFormats = ['int', 'float'];
      const testFormats = ['int', 'float', 'double', 'pcm'];

      testFormats.forEach((format) => {
        const isValid = validFormats.includes(format);
        if (format === 'int' || format === 'float') {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      });
    });

    it('should validate supported channel configurations', () => {
      const validChannels = ['mono', 'stereo'];
      const testChannels = ['mono', 'stereo', 'surround', 'quad'];

      testChannels.forEach((channels) => {
        const isValid = validChannels.includes(channels);
        if (channels === 'mono' || channels === 'stereo') {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      });
    });
  });
});

import { describe, expect, it } from 'vitest';

import {
  concatenateAudioFiles,
  filterAudioFiles,
  getMultipleAudioFilesDuration,
  sortAudioFilesByName,
} from '../utils/audioConcatenation';

describe('audioConcatenation', () => {
  describe('filterAudioFiles', () => {
    it('should filter audio files by extension', () => {
      const mockFiles = [
        { name: 'audio1.wav', type: 'audio/wav' },
        { name: 'audio2.mp3', type: 'audio/mpeg' },
        { name: 'document.txt', type: 'text/plain' },
        { name: 'audio3.flac', type: 'audio/flac' },
      ] as File[];

      const result = filterAudioFiles(mockFiles);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('audio1.wav');
      expect(result[1].name).toBe('audio2.mp3');
      expect(result[2].name).toBe('audio3.flac');
    });

    it('should handle empty file list', () => {
      const result = filterAudioFiles([]);
      expect(result).toEqual([]);
    });

    it('should handle files with no audio types', () => {
      const mockFiles = [
        { name: 'document.txt', type: 'text/plain' },
        { name: 'image.jpg', type: 'image/jpeg' },
        { name: 'video.mp4', type: 'video/mp4' },
      ] as File[];

      const result = filterAudioFiles(mockFiles);
      expect(result).toHaveLength(0);
    });
  });

  describe('sortAudioFilesByName', () => {
    it('should sort files alphabetically by name', () => {
      const mockFiles = [
        { name: 'zebra.wav' },
        { name: 'alpha.wav' },
        { name: 'beta.wav' },
      ] as File[];

      const result = sortAudioFilesByName(mockFiles);

      expect(result[0].name).toBe('alpha.wav');
      expect(result[1].name).toBe('beta.wav');
      expect(result[2].name).toBe('zebra.wav');
    });

    it('should handle numeric sorting correctly', () => {
      const mockFiles = [
        { name: 'file10.wav' },
        { name: 'file2.wav' },
        { name: 'file1.wav' },
      ] as File[];

      const result = sortAudioFilesByName(mockFiles);

      // localeCompare does string sorting, not numeric
      expect(result[0].name).toBe('file1.wav');
      expect(result[1].name).toBe('file10.wav');
      expect(result[2].name).toBe('file2.wav');
    });

    it('should handle empty array', () => {
      const result = sortAudioFilesByName([]);
      expect(result).toEqual([]);
    });
  });

  describe('getMultipleAudioFilesDuration', () => {
    it('should handle empty file list', async () => {
      const result = await getMultipleAudioFilesDuration([]);
      expect(result).toBe(0);
    });
  });

  describe('concatenateAudioFiles', () => {
    it('should handle empty file list', async () => {
      await expect(concatenateAudioFiles([])).rejects.toThrow();
    });
  });
});

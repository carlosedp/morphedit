import { describe, expect, it } from 'vitest';

import {
  isFileTooLong,
  MORPHAGENE_MAX_DURATION,
} from '../utils/fileLengthUtils';

describe('fileLengthUtils', () => {
  describe('isFileTooLong', () => {
    it('should return false for short audio files', () => {
      expect(isFileTooLong(10)).toBe(false);
    });

    it('should return true for files longer than Morphagene limit', () => {
      expect(isFileTooLong(MORPHAGENE_MAX_DURATION + 10)).toBe(true);
    });

    it('should handle edge case at exact limit', () => {
      expect(isFileTooLong(MORPHAGENE_MAX_DURATION)).toBe(false);
    });

    it('should return true for duration exactly over limit', () => {
      expect(isFileTooLong(MORPHAGENE_MAX_DURATION + 0.1)).toBe(true);
    });

    it('should handle zero duration', () => {
      expect(isFileTooLong(0)).toBe(false);
    });

    it('should handle negative duration', () => {
      expect(isFileTooLong(-1)).toBe(false);
    });
  });

  describe('MORPHAGENE_MAX_DURATION constant', () => {
    it('should be defined and positive', () => {
      expect(MORPHAGENE_MAX_DURATION).toBeDefined();
      expect(MORPHAGENE_MAX_DURATION).toBeGreaterThan(0);
      expect(typeof MORPHAGENE_MAX_DURATION).toBe('number');
    });
  });
});

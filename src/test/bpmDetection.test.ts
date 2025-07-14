import { describe, expect, it } from 'vitest';

import { formatBPM } from '../utils/bpmDetection';

describe('bpmDetection', () => {
  describe('formatBPM', () => {
    it('should format valid BPM values', () => {
      expect(formatBPM(120)).toBe('120 BPM');
      expect(formatBPM(120.5)).toBe('120.5 BPM');
      expect(formatBPM(95.3)).toBe('95.3 BPM');
    });

    it('should handle null BPM', () => {
      expect(formatBPM(null)).toBe('--');
    });

    it('should handle zero BPM', () => {
      expect(formatBPM(0)).toBe('0 BPM');
    });

    it('should handle decimal BPM values', () => {
      expect(formatBPM(120.123)).toBe('120.123 BPM');
      expect(formatBPM(95.9)).toBe('95.9 BPM');
    });
  });
});

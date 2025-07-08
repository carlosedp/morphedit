import { describe, expect, it } from 'vitest';

import { isMarkerLocked } from '../utils/spliceMarkerUtils';

describe('spliceMarkerUtils', () => {
  describe('isMarkerLocked', () => {
    it('should return true for locked markers', () => {
      const markerPosition = 2.5;
      const lockedMarkers = [1.0, 2.5, 4.0];

      expect(isMarkerLocked(markerPosition, lockedMarkers)).toBe(true);
    });

    it('should return false for unlocked markers', () => {
      const markerPosition = 3.0;
      const lockedMarkers = [1.0, 2.5, 4.0];

      expect(isMarkerLocked(markerPosition, lockedMarkers)).toBe(false);
    });

    it('should handle empty locked markers array', () => {
      const markerPosition = 2.5;
      const lockedMarkers: number[] = [];

      expect(isMarkerLocked(markerPosition, lockedMarkers)).toBe(false);
    });

    it('should handle floating point precision correctly', () => {
      const markerPosition = 2.50000001; // Very close to 2.5
      const lockedMarkers = [2.5];

      // The function should handle floating point precision
      expect(isMarkerLocked(markerPosition, lockedMarkers)).toBe(true);
    });

    it('should return false for markers not in locked list', () => {
      const markerPosition = 5.0;
      const lockedMarkers = [1.0, 2.5, 4.0];

      expect(isMarkerLocked(markerPosition, lockedMarkers)).toBe(false);
    });
  });
});

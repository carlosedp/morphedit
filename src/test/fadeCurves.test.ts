import { describe, expect, it } from 'vitest';

import { calculateFadeGain, getFadeCurveOptions } from '../utils/fadeCurves';

describe('fadeCurves', () => {
  describe('calculateFadeGain', () => {
    describe('linear fade curves', () => {
      it('should calculate linear fade-in correctly', () => {
        expect(calculateFadeGain(0, 'linear')).toBe(0);
        expect(calculateFadeGain(0.25, 'linear')).toBe(0.25);
        expect(calculateFadeGain(0.5, 'linear')).toBe(0.5);
        expect(calculateFadeGain(0.75, 'linear')).toBe(0.75);
        expect(calculateFadeGain(1, 'linear')).toBe(1);
      });

      it('should calculate linear fade-out correctly', () => {
        expect(calculateFadeGain(0, 'linear', true)).toBe(1);
        expect(calculateFadeGain(0.25, 'linear', true)).toBe(0.75);
        expect(calculateFadeGain(0.5, 'linear', true)).toBe(0.5);
        expect(calculateFadeGain(0.75, 'linear', true)).toBe(0.25);
        expect(calculateFadeGain(1, 'linear', true)).toBe(0);
      });
    });

    describe('exponential fade curves', () => {
      it('should calculate exponential fade-in correctly', () => {
        expect(calculateFadeGain(0, 'exponential')).toBe(0);
        expect(calculateFadeGain(0.5, 'exponential')).toBe(0.25); // 0.5^2
        expect(calculateFadeGain(0.7, 'exponential')).toBeCloseTo(0.49, 2); // 0.7^2
        expect(calculateFadeGain(1, 'exponential')).toBe(1);
      });

      it('should calculate exponential fade-out correctly', () => {
        expect(calculateFadeGain(0, 'exponential', true)).toBe(1);
        expect(calculateFadeGain(0.5, 'exponential', true)).toBe(0.25); // (1-0.5)^2
        expect(calculateFadeGain(1, 'exponential', true)).toBe(0);
      });
    });

    describe('logarithmic fade curves', () => {
      it('should calculate logarithmic fade-in correctly', () => {
        expect(calculateFadeGain(0, 'logarithmic')).toBe(0);
        expect(calculateFadeGain(0.25, 'logarithmic')).toBe(0.5); // sqrt(0.25)
        expect(calculateFadeGain(0.5, 'logarithmic')).toBeCloseTo(0.707, 3); // sqrt(0.5)
        expect(calculateFadeGain(1, 'logarithmic')).toBe(1);
      });

      it('should calculate logarithmic fade-out correctly', () => {
        expect(calculateFadeGain(0, 'logarithmic', true)).toBe(1);
        expect(calculateFadeGain(0.75, 'logarithmic', true)).toBe(0.5); // sqrt(1-0.75)
        expect(calculateFadeGain(1, 'logarithmic', true)).toBe(0);
      });
    });

    describe('position clamping', () => {
      it('should clamp negative positions to 0', () => {
        expect(calculateFadeGain(-0.5, 'linear')).toBe(0);
        expect(calculateFadeGain(-1, 'exponential')).toBe(0);
        expect(calculateFadeGain(-0.1, 'logarithmic')).toBe(0);
      });

      it('should clamp positions greater than 1', () => {
        expect(calculateFadeGain(1.5, 'linear')).toBe(1);
        expect(calculateFadeGain(2, 'exponential')).toBe(1);
        expect(calculateFadeGain(1.1, 'logarithmic')).toBe(1);
      });
    });

    describe('unknown curve types', () => {
      it('should default to linear for unknown curve types', () => {
        expect(calculateFadeGain(0.5, 'unknown')).toBe(0.5);
        expect(calculateFadeGain(0.3, 'invalid')).toBe(0.3);
        expect(calculateFadeGain(0.8, '')).toBe(0.8);
      });
    });

    describe('edge cases', () => {
      it('should handle boundary values correctly', () => {
        const curves = ['linear', 'exponential', 'logarithmic'];

        curves.forEach((curve) => {
          // Start positions should always be 0 for fade-in
          expect(calculateFadeGain(0, curve)).toBe(0);
          // End positions should always be 1 for fade-in
          expect(calculateFadeGain(1, curve)).toBe(1);

          // Start positions should always be 1 for fade-out
          expect(calculateFadeGain(0, curve, true)).toBe(1);
          // End positions should always be 0 for fade-out
          expect(calculateFadeGain(1, curve, true)).toBe(0);
        });
      });
    });
  });

  describe('getFadeCurveOptions', () => {
    it('should return all available fade curve options', () => {
      const options = getFadeCurveOptions();

      expect(options).toHaveLength(3);
      expect(options[0]).toEqual({
        value: 'linear',
        label: 'Linear',
        description: 'Constant fade rate',
      });
      expect(options[1]).toEqual({
        value: 'exponential',
        label: 'Exponential',
        description: 'Smooth, gradual start',
      });
      expect(options[2]).toEqual({
        value: 'logarithmic',
        label: 'Logarithmic',
        description: 'Quick start, gentle end',
      });
    });

    it('should return consistent values', () => {
      const options1 = getFadeCurveOptions();
      const options2 = getFadeCurveOptions();

      expect(options1).toEqual(options2);
    });
  });

  describe('curve characteristics', () => {
    it('should verify exponential curve is smoother at start', () => {
      // At 0.25 position, exponential should be lower than linear
      const linearGain = calculateFadeGain(0.25, 'linear');
      const expGain = calculateFadeGain(0.25, 'exponential');

      expect(expGain).toBeLessThan(linearGain);
      expect(expGain).toBe(0.0625); // 0.25^2
    });

    it('should verify logarithmic curve is steeper at start', () => {
      // At 0.25 position, logarithmic should be higher than linear
      const linearGain = calculateFadeGain(0.25, 'linear');
      const logGain = calculateFadeGain(0.25, 'logarithmic');

      expect(logGain).toBeGreaterThan(linearGain);
      expect(logGain).toBe(0.5); // sqrt(0.25)
    });

    it('should verify all curves converge at endpoints', () => {
      const curves = ['linear', 'exponential', 'logarithmic'];

      // All curves should start at 0
      curves.forEach((curve) => {
        expect(calculateFadeGain(0, curve)).toBe(0);
      });

      // All curves should end at 1
      curves.forEach((curve) => {
        expect(calculateFadeGain(1, curve)).toBe(1);
      });
    });
  });
});

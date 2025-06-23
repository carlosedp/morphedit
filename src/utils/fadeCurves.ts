// Fade curve calculation utilities
import { FADE_CURVE_TYPES } from "../constants";

/**
 * Calculate fade gain value based on curve type and position
 * @param position - Normalized position from 0 to 1 (0 = start, 1 = end)
 * @param curveType - Type of curve to apply
 * @param isFadeOut - Whether this is a fade-out (inverts the curve)
 * @returns Gain value from 0 to 1
 */
export const calculateFadeGain = (
  position: number,
  curveType: string,
  isFadeOut: boolean = false,
): number => {
  // Clamp position to valid range
  position = Math.max(0, Math.min(1, position));

  // For fade-out, invert the position
  if (isFadeOut) {
    position = 1 - position;
  }

  let gain: number;

  switch (curveType) {
    case "exponential":
      // Exponential curve: gain = position^2 (smoother transition, more gradual at start)
      gain = position * position;
      break;

    case "logarithmic":
      // Logarithmic curve: gain = sqrt(position) (steeper at start, more gradual at end)
      gain = Math.sqrt(position);
      break;

    case "linear":
    default:
      // Linear curve: gain = position (constant rate of change)
      gain = position;
      break;
  }

  return gain;
};

/**
 * Get a human-readable description of the fade curve type
 */
export const getFadeCurveDescription = (curveType: string): string => {
  switch (curveType) {
    case "linear":
      return "Linear - Constant fade rate";
    case "exponential":
      return "Exponential - Smooth, gradual start";
    case "logarithmic":
      return "Logarithmic - Quick start, gentle end";
    default:
      return "Unknown curve type";
  }
};

/**
 * Get all available fade curve types with descriptions
 */
export const getFadeCurveOptions = () => [
  {
    value: FADE_CURVE_TYPES.LINEAR,
    label: "Linear",
    description: "Constant fade rate",
  },
  {
    value: FADE_CURVE_TYPES.EXPONENTIAL,
    label: "Exponential",
    description: "Smooth, gradual start",
  },
  {
    value: FADE_CURVE_TYPES.LOGARITHMIC,
    label: "Logarithmic",
    description: "Quick start, gentle end",
  },
];

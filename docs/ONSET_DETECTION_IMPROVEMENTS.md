# Onset Detection Improvements

## Problem

The onset detection algorithms (both Web Audio and Essentia.js) had two main issues:

### 1. Missing First Transient

The detection was skipping the first frame, causing it to miss drum hits at the very beginning of the audio file.

**Root cause**: The peak detection loop started at index 1 (`for i = 1`), skipping index 0.

### 2. Markers Placed After Transient Start

Detected onsets were placed at the **peak of the energy change**, not at the **beginning of the transient attack**. This resulted in markers appearing slightly after the actual drum hit started.

**Root cause**: Peak detection finds the maximum value, which occurs after the transient has already begun.

## Solution

### Part 1: Detect First Frame

Added explicit checks for the first and last frames:

```typescript
// Check first frame (could be an onset at the very beginning)
if (detectionValues.length > 0 && detectionValues[0] > threshold) {
  const isFirstFramePeak =
    detectionValues.length === 1 ||
    detectionValues[0] > detectionValues[1] * 0.8;
  if (isFirstFramePeak) {
    onsets.push(0); // Add onset at the very beginning
  }
}
```

### Part 2: Onset Position Refinement

Implemented `refineOnsetPosition()` function that:

1. **Looks backwards** from the detected peak
2. **Finds where the energy starts rising** above baseline
3. **Places the marker at the beginning** of the rise, not the peak

```typescript
function refineOnsetPosition(
  detectionValues: number[],
  peakIndex: number,
  threshold: number
): number {
  // Define baseline as 30% of threshold
  const baseline = threshold * 0.3;
  
  // Look backwards from peak to find where rise starts
  for (let i = peakIndex - 1; i >= 0; i--) {
    if (currentValue <= baseline || currentValue >= nextValue) {
      return i + 1; // Start of the rise
    }
  }
}
```

### Algorithm Details

**Before refinement:**

```text
Energy:  ----___/‾‾‾‾\___----
Marker:           ^ (at peak)
Actual hit: ^
```

**After refinement:**

```text
Energy:  ----___/‾‾‾‾\___----
Marker:      ^ (at start of rise)
Actual hit: ^
```

## Technical Implementation

### Files Modified

1. **`src/utils/essentiaOnsetDetection.ts`**
   - Added first/last frame detection
   - Added `refineOnsetPosition()` function
   - Applied refinement to all detected peaks

2. **`src/utils/transientDetection.ts`**
   - Added first/last frame detection
   - Added `refineTransientPosition()` function
   - Applied refinement to all detected peaks

### Parameters

- **Baseline threshold**: 30% of detection threshold
  - Below this is considered noise floor
  - Above this indicates onset activity

- **Lookback limit**: Maximum 10 frames
  - Prevents false positives from looking too far back
  - With 512 sample hop size at 44.1kHz: ~116ms maximum adjustment

- **Minimum interval**: 50ms between onsets
  - Unchanged from original implementation
  - Prevents duplicate detections

## Benefits

### ✅ Accurate First Hit Detection

- No longer misses drum hits at the very beginning
- Handles audio files that start with a transient

### ✅ Precise Marker Placement

- Markers now align with the **visual start** of the transient
- Better for beat-synced slicing and editing
- More intuitive user experience

### ✅ Works with Both Libraries

- Applied to Web Audio implementation
- Applied to Essentia.js implementation
- Consistent behavior across detection methods

## Testing

### Test Case: Drum Loop Starting with Kick

**Before:**

- First kick missed
- Markers appear after visual transient peaks

**After:**

- First kick detected at time 0
- All markers align with visual transient starts

### Detection Methods Affected

- ✅ Web Audio (energy-based)
- ✅ Essentia.js HFC
- ✅ Essentia.js Complex
- ✅ Essentia.js Complex Phase
- ✅ Essentia.js Flux
- ✅ Essentia.js MelFlux
- ✅ Essentia.js RMS

## Performance Impact

**Negligible** - The refinement function:

- Only processes detected peaks (typically 10-50 per file)
- Looks back maximum 10 frames
- Simple comparisons, no FFT or complex math

Typical overhead: < 1ms for entire detection pass

## Future Improvements

Potential enhancements:

1. **Adaptive lookback**: Adjust based on tempo/density
2. **Phase-based refinement**: Use phase information for percussion
3. **Zero-crossing snap**: Combine with existing zero-crossing feature
4. **Attack time estimation**: Calculate actual attack duration

## References

- ReCycle by Propellerhead: Similar "look backwards from peak" approach
- Essentia OnsetDetection: [Documentation](https://essentia.upf.edu/reference/std_OnsetDetection.html)
- Web Audio API: Energy-based detection

---

**Date**: October 8, 2025  
**Issue**: Missing first transient, markers after transient start  
**Status**: ✅ Fixed  
**Impact**: All onset detection methods

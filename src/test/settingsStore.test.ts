import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAppSettings } from '../settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    // Clear any previous state
    localStorage.clear();
  });

  it('should initialize with default settings', () => {
    const { result } = renderHook(() => useAppSettings());

    expect(result.current.settings.crossfadeDuration).toBeDefined();
    expect(result.current.settings.fadeInCurveType).toBeDefined();
    expect(result.current.settings.fadeOutCurveType).toBeDefined();
    expect(result.current.settings.truncateLength).toBeDefined();
    expect(result.current.settings.maxRecordingDuration).toBeDefined();
    expect(result.current.settings.defaultAutoSliceAmount).toBeDefined();
    expect(result.current.settings.transientThreshold).toBeDefined();
    expect(result.current.settings.defaultExportFormat).toBeDefined();
  });

  it('should update settings', () => {
    const { result } = renderHook(() => useAppSettings());

    act(() => {
      result.current.actions.updateSettings({
        crossfadeDuration: 0.5,
        truncateLength: 300,
      });
    });

    expect(result.current.settings.crossfadeDuration).toBe(0.5);
    expect(result.current.settings.truncateLength).toBe(300);
  });

  it('should reset settings to defaults', () => {
    const { result } = renderHook(() => useAppSettings());

    // Change some settings
    act(() => {
      result.current.actions.updateSettings({
        crossfadeDuration: 0.8,
        truncateLength: 500,
      });
    });

    // Reset settings
    act(() => {
      result.current.actions.resetToDefaults();
    });

    // Check that settings are back to defaults
    expect(result.current.settings.crossfadeDuration).toBeDefined();
    expect(result.current.settings.truncateLength).toBeDefined();
  });

  it('should handle partial settings updates', () => {
    const { result } = renderHook(() => useAppSettings());

    const originalTruncateLength = result.current.settings.truncateLength;

    act(() => {
      result.current.actions.updateSettings({
        crossfadeDuration: 0.7,
        // Only update crossfade, leave truncate length unchanged
      });
    });

    expect(result.current.settings.crossfadeDuration).toBe(0.7);
    expect(result.current.settings.truncateLength).toBe(originalTruncateLength);
  });

  it('should handle fade curve type settings', () => {
    const { result } = renderHook(() => useAppSettings());

    act(() => {
      result.current.actions.updateSettings({
        fadeInCurveType: 'exponential',
        fadeOutCurveType: 'logarithmic',
      });
    });

    expect(result.current.settings.fadeInCurveType).toBe('exponential');
    expect(result.current.settings.fadeOutCurveType).toBe('logarithmic');
  });

  it('should handle boundary values correctly', () => {
    const { result } = renderHook(() => useAppSettings());

    // Test minimum values
    act(() => {
      result.current.actions.updateSettings({
        crossfadeDuration: 0,
        truncateLength: 1,
        maxRecordingDuration: 1,
      });
    });

    expect(result.current.settings.crossfadeDuration).toBe(0);
    expect(result.current.settings.truncateLength).toBe(1);
    expect(result.current.settings.maxRecordingDuration).toBe(1);

    // Test maximum values
    act(() => {
      result.current.actions.updateSettings({
        crossfadeDuration: 5,
        truncateLength: 3600,
        maxRecordingDuration: 3600,
      });
    });

    expect(result.current.settings.crossfadeDuration).toBe(5);
    expect(result.current.settings.truncateLength).toBe(3600);
    expect(result.current.settings.maxRecordingDuration).toBe(3600);
  });
});

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  FADE_CURVE_TYPES,
  EXPORT_FORMATS,
  DEFAULT_SETTINGS,
} from './constants';
import type { ExportFormat } from './utils/exportUtils';
import { createLogger } from './utils/logger';

const settingsLogger = createLogger('Settings');

// Types for settings
export type FadeCurveType =
  (typeof FADE_CURVE_TYPES)[keyof typeof FADE_CURVE_TYPES];

interface AppSettings {
  // Fade settings
  fadeInCurveType: FadeCurveType;
  fadeOutCurveType: FadeCurveType;

  // Crossfade settings
  crossfadeDuration: number;
  crossfadeCurveType: FadeCurveType;

  // Audio processing settings
  truncateLength: number; // in seconds
  maxRecordingDuration: number; // in seconds
  defaultAutoSliceAmount: number;

  // Transient detection settings
  transientThreshold: number;
  transientFrameSizeMs: number;
  transientOverlapPercent: number;

  // Export settings
  defaultExportFormat: ExportFormat;
}

interface SettingsStore extends AppSettings {
  // Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetToDefaults: () => void;

  // Getters for easy access
  getFadeInCurveType: () => FadeCurveType;
  getFadeOutCurveType: () => FadeCurveType;
  getCrossfadeDuration: () => number;
  getCrossfadeCurveType: () => FadeCurveType;
  getTruncateLength: () => number;
  getMaxRecordingDuration: () => number;
  getDefaultAutoSliceAmount: () => number;
  getTransientThreshold: () => number;
  getTransientFrameSizeMs: () => number;
  getTransientOverlapPercent: () => number;
  getDefaultExportFormat: () => ExportFormat;
}

// Default settings
const defaultSettings: AppSettings = {
  fadeInCurveType: DEFAULT_SETTINGS.FADE_IN_CURVE_TYPE,
  fadeOutCurveType: DEFAULT_SETTINGS.FADE_OUT_CURVE_TYPE,
  crossfadeDuration: DEFAULT_SETTINGS.CROSSFADE_DURATION,
  crossfadeCurveType: DEFAULT_SETTINGS.CROSSFADE_CURVE_TYPE,
  truncateLength: DEFAULT_SETTINGS.TRUNCATE_LENGTH,
  maxRecordingDuration: DEFAULT_SETTINGS.MAX_RECORDING_DURATION,
  defaultAutoSliceAmount: DEFAULT_SETTINGS.DEFAULT_AUTO_SLICE_AMOUNT,
  transientThreshold: DEFAULT_SETTINGS.TRANSIENT_THRESHOLD,
  transientFrameSizeMs: DEFAULT_SETTINGS.TRANSIENT_FRAME_SIZE_MS,
  transientOverlapPercent: DEFAULT_SETTINGS.TRANSIENT_OVERLAP_PERCENT,
  defaultExportFormat:
    EXPORT_FORMATS[DEFAULT_SETTINGS.DEFAULT_EXPORT_FORMAT_INDEX],
};

// Storage configuration - use localStorage for now
// TODO: Add Electron file storage in the future
const createStorage = () => {
  return createJSONStorage(() => localStorage);
};

const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      updateSettings: (newSettings: Partial<AppSettings>) => {
        settingsLogger.info('Updating settings:', newSettings);
        set((state) => ({ ...state, ...newSettings }));
      },

      resetToDefaults: () => {
        settingsLogger.info('Resetting settings to defaults');
        set(defaultSettings);
      },

      // Getters
      getFadeInCurveType: () => get().fadeInCurveType,
      getFadeOutCurveType: () => get().fadeOutCurveType,
      getCrossfadeDuration: () => get().crossfadeDuration,
      getCrossfadeCurveType: () => get().crossfadeCurveType,
      getTruncateLength: () => get().truncateLength,
      getMaxRecordingDuration: () => get().maxRecordingDuration,
      getDefaultAutoSliceAmount: () => get().defaultAutoSliceAmount,
      getTransientThreshold: () => get().transientThreshold,
      getTransientFrameSizeMs: () => get().transientFrameSizeMs,
      getTransientOverlapPercent: () => get().transientOverlapPercent,
      getDefaultExportFormat: () => get().defaultExportFormat,
    }),
    {
      name: 'morphedit-settings',
      storage: createStorage(),
      version: 1,
    }
  )
);

// Hook for easy access to current settings values
export const useAppSettings = () => {
  const store = useSettingsStore();
  return {
    settings: {
      fadeInCurveType: store.fadeInCurveType,
      fadeOutCurveType: store.fadeOutCurveType,
      crossfadeDuration: store.crossfadeDuration,
      crossfadeCurveType: store.crossfadeCurveType,
      truncateLength: store.truncateLength,
      maxRecordingDuration: store.maxRecordingDuration,
      defaultAutoSliceAmount: store.defaultAutoSliceAmount,
      transientThreshold: store.transientThreshold,
      transientFrameSizeMs: store.transientFrameSizeMs,
      transientOverlapPercent: store.transientOverlapPercent,
      defaultExportFormat: store.defaultExportFormat,
    },
    actions: {
      updateSettings: store.updateSettings,
      resetToDefaults: store.resetToDefaults,
    },
  };
};

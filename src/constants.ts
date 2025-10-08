import { ExportFormat } from './utils/exportUtils';

// Shared constants to avoid magic numbers and duplicate values throughout the codebase

// Audio processing constants
export const AUDIO_MAX_DURATION = 174; // seconds
export const AUDIO_RECORD_MAX_DURATION = 300; // seconds for recording

// Tempo and pitch preview
export const TEMPO_PITCH_PREVIEW_DURATION = 5; // seconds for preview playback

// UI timing constants
export const POSITION_UPDATE_INTERVAL = 100; // ms

// Splice marker constants
export const MAX_KEYBOARD_SHORTCUT_MARKERS = 20; // Number of markers accessible via keyboard shortcuts
export const MAX_TOTAL_SPLICE_POINTS = 300; // Maximum splice points for output device compatibility
export const MARKER_TOLERANCE = 0.01; // seconds for comparing marker positions

// Enable or disable minimap in the waveform view
export const MINIMAP_ENABLED = true;

// Region colors (hex with alpha)
export const REGION_COLORS = {
  SPLICE_MARKER: 'rgba(0, 255, 255, 0.8)',
  CROP_REGION: 'rgba(255, 167, 38, 0.2)',
  FADE_IN: 'rgba(0, 255, 0, 0.2)',
  FADE_OUT: 'rgba(255, 0, 0, 0.2)',
  CROSSFADE: 'rgba(255, 0, 255, 0.2)',
  LOCKED_MARKER: 'rgba(255, 165, 0, 0.8)',
} as const;

// Icons for different marker states
export const MARKER_ICONS = {
  LOCKED: '🔒',
  UNLOCKED: '🔶',
  SELECTED: '🔵',
} as const;

// Available export formats
export const EXPORT_FORMATS: ExportFormat[] = [
  {
    label: '48kHz 32-bit Float Stereo',
    shortLabel: '48kHz/32-bit',
    sampleRate: 48000,
    bitDepth: 32,
    channels: 'stereo',
    format: 'float',
  },
  {
    label: '44.1kHz 32-bit Float Stereo',
    shortLabel: '44.1kHz/32-bit',
    sampleRate: 44100,
    bitDepth: 32,
    channels: 'stereo',
    format: 'float',
  },
  {
    label: '48kHz 16-bit Stereo',
    shortLabel: '48kHz/16-bit',
    sampleRate: 48000,
    bitDepth: 16,
    channels: 'stereo',
    format: 'int',
  },
  {
    label: '44.1kHz 16-bit Stereo',
    shortLabel: '44.1kHz/16-bit',
    sampleRate: 44100,
    bitDepth: 16,
    channels: 'stereo',
    format: 'int',
  },
  {
    label: '44.1kHz 16-bit Mono',
    shortLabel: '44.1kHz/16-bit Mono',
    sampleRate: 44100,
    bitDepth: 16,
    channels: 'mono',
    format: 'int',
  },
  {
    label: '22.05kHz 16-bit Mono',
    shortLabel: '22.05kHz/16-bit Mono',
    sampleRate: 22050,
    bitDepth: 16,
    channels: 'mono',
    format: 'int',
  },
];

export const FADE_CURVE_TYPES = {
  LINEAR: 'linear',
  EXPONENTIAL: 'exponential',
  LOGARITHMIC: 'logarithmic',
} as const;

// UI colors and styling
export const UI_COLORS = {
  OVERLAY_BACKGROUND: 'rgba(0, 0, 0, 0.7)',
  LOCKED_MARKER_GLOW: 'rgba(255, 152, 0, 0.5)',
  LOCKED_MARKER_BACKGROUND: 'rgba(255, 152, 0, 0.15)',
  LOCKED_MARKER_BORDER: '#ff9800',
  SELECTED_MARKER_BACKGROUND_UNLOCKED: 'rgba(0, 123, 255, 0.1)',
  SELECTED_MARKER_BACKGROUND_LOCKED: 'rgba(255, 152, 0, 0.2)',
  DEFAULT_MARKER_BACKGROUND: 'rgba(0, 255, 255, 0.1)',
  LABEL_BACKGROUND: '#555',
  LABEL_TEXT: '#fff',
} as const;

// Tooltip delays
export const TOOLTIP_DELAYS = {
  ENTER: 500, // ms
  LEAVE: 200, // ms
} as const;

// Auto-slice/transient detection
export const ONSET_DETECTION_LIBRARIES = {
  WEBAUDIO: 'webaudio',
  ESSENTIA: 'essentia',
} as const;

// UI-friendly library options
export const ONSET_DETECTION_LIBRARY_OPTIONS = [
  {
    value: 'webaudio' as const,
    label: 'Web Audio API',
    speed: 'Fast',
    description: 'Energy-based detection - fast and responsive',
  },
  {
    value: 'essentia' as const,
    label: 'Essentia.js',
    speed: 'Accurate',
    description: 'Advanced spectral analysis - slower but more accurate',
  },
] as const;

// Essentia.js onset detection settings with UI labels
export const ESSENTIA_ONSET_METHODS = {
  hfc: {
    label: 'HFC - High Frequency Content',
    description: 'Best for percussive sounds with bright attacks',
  },
  complex: {
    label: 'Complex - Magnitude & Phase',
    description: 'Detects pitch and energy changes',
  },
  complex_phase: {
    label: 'Complex Phase',
    description: 'Good for tonal sounds and phase changes',
  },
  flux: {
    label: 'Spectral Flux',
    description: 'Tracks magnitude spectrum changes',
  },
  // melflux: {
  //   label: 'Mel Flux',
  //   description: 'Mel-frequency band energy changes',
  // },
  // rms: {
  //   label: 'RMS - Energy Flux',
  //   description: 'Overall energy changes in frequency domain',
  // },
} as const;

export const TRANSIENT_DETECTION = {
  DEFAULT_THRESHOLD: 65,
  MIN_INTERVAL: 0.05, // Minimum 50ms between transients
  DEFAULT_FRAME_SIZE_MS: 20,
  DEFAULT_OVERLAP_PERCENT: 75,
  DEFAULT_LIBRARY: ONSET_DETECTION_LIBRARIES.WEBAUDIO,
  DEFAULT_ONSET_REFINEMENT_BASELINE: 30, // Percentage of threshold for onset position refinement (0-100)
} as const;

// Essentia.js onset detection settings
export const ESSENTIA_ONSET_DETECTION = {
  DEFAULT_METHOD: 'hfc' as const, // High Frequency Content
  METHODS: [
    'hfc',
    'complex',
    'complex_phase',
    'flux',
    // 'melflux',
    // 'rms',
  ] as const,
  DEFAULT_FRAME_SIZE: 1024,
  DEFAULT_HOP_SIZE: 512,
  DEFAULT_SENSITIVITY: 65, // 0-100 scale mapped to algorithm parameters
} as const;

// File handling
export const FILE_HANDLING = {
  FIRST_FILE_INDEX: 0,
  SECOND_FILE_INDEX: 1,
  MIN_FILES_FOR_MULTIPLE: 1,
  NO_FILES: 0,
} as const;

// Zoom levels
export const ZOOM_LEVELS = {
  MIN: 2,
  MAX: 5000,
  STEP: 1,
} as const;

// Playback timing
export const PLAYBACK_TIMING = {
  BRIEF_DELAY: 100, // ms for brief delays
  READY_CALLBACK_DELAY: 100, // ms
} as const;

// Region positioning and fade constants
export const REGION_POSITIONING = {
  DEFAULT_START_RATIO: 0.25, // Start at 25% of duration
  DEFAULT_END_RATIO: 0.75, // End at 75% of duration
  FADE_RATIO: 0.1, // Fade length as 10% of region/duration
  MARKER_PROXIMITY_THRESHOLD: 0.1, // Seconds threshold for marker proximity
  SNAP_TO_ZERO_THRESHOLD: 0.05, // Seconds threshold for snapping regions to zero (50ms)
} as const;

// Crossfade constants
export const CROSSFADE = {
  DEFAULT_DURATION: 1.0, // Default crossfade length in seconds
} as const;

// Waveform rendering constants
export const WAVEFORM_RENDERING = {
  CURSOR_WIDTH: 1, // Cursor width in pixels
  GRID_LINE_WIDTH: 1, // Grid line width in pixels
  BUFFER_DURATION_TOLERANCE: 0.1, // Tolerance for buffer duration comparison in seconds
} as const;

// Skip increment constants for playback navigation
export const SKIP_INCREMENTS = {
  MINIMUM_VALUE: 0.1, // Minimum skip increment in seconds
  SMALL_INCREMENT: 0.1, // Small increment size in seconds
  MEDIUM_INCREMENT: 0.5, // Medium increment size in seconds
  LARGE_INCREMENT: 1.0, // Large increment size in seconds
  SMALL_THRESHOLD: 1.0, // Threshold for small increments in seconds
  LARGE_THRESHOLD: 5.0, // Threshold for large increments in seconds
} as const;

// Default settings for the application
export const DEFAULT_SETTINGS = {
  FADE_IN_CURVE_TYPE: FADE_CURVE_TYPES.LINEAR,
  FADE_OUT_CURVE_TYPE: FADE_CURVE_TYPES.LINEAR,
  CROSSFADE_DURATION: CROSSFADE.DEFAULT_DURATION,
  CROSSFADE_CURVE_TYPE: FADE_CURVE_TYPES.LINEAR,
  TRUNCATE_LENGTH: AUDIO_MAX_DURATION,
  MAX_RECORDING_DURATION: AUDIO_RECORD_MAX_DURATION,
  DEFAULT_AUTO_SLICE_AMOUNT: 8, // Default number of auto slices
  DEFAULT_EXPORT_FORMAT_INDEX: 0, // Index of the first format in EXPORT_FORMATS
  // Transient detection defaults
  TRANSIENT_THRESHOLD: TRANSIENT_DETECTION.DEFAULT_THRESHOLD,
  TRANSIENT_FRAME_SIZE_MS: TRANSIENT_DETECTION.DEFAULT_FRAME_SIZE_MS,
  TRANSIENT_OVERLAP_PERCENT: TRANSIENT_DETECTION.DEFAULT_OVERLAP_PERCENT,
  ONSET_DETECTION_LIBRARY: TRANSIENT_DETECTION.DEFAULT_LIBRARY,
  ONSET_REFINEMENT_BASELINE:
    TRANSIENT_DETECTION.DEFAULT_ONSET_REFINEMENT_BASELINE,
  ESSENTIA_ONSET_METHOD: ESSENTIA_ONSET_DETECTION.DEFAULT_METHOD,
  ESSENTIA_FRAME_SIZE: ESSENTIA_ONSET_DETECTION.DEFAULT_FRAME_SIZE,
  ESSENTIA_HOP_SIZE: ESSENTIA_ONSET_DETECTION.DEFAULT_HOP_SIZE,
  ESSENTIA_SENSITIVITY: ESSENTIA_ONSET_DETECTION.DEFAULT_SENSITIVITY,
} as const;

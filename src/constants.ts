// Shared constants to avoid magic numbers and duplicate values throughout the codebase

// Audio processing constants
export const MORPHAGENE_MAX_DURATION = 174; // seconds
export const DEFAULT_SAMPLE_RATE = 48000; // Hz

// UI timing constants
export const DEBOUNCE_DELAY = 300; // ms
export const POSITION_UPDATE_INTERVAL = 100; // ms
export const LOADING_DIALOG_DELAY = 500; // ms

// Splice marker constants
export const MAX_SPLICE_MARKERS = 20;
export const MARKER_TOLERANCE = 0.001; // seconds for comparing marker positions

// Region colors (hex with alpha)
export const REGION_COLORS = {
  SPLICE_MARKER: 'rgba(0, 255, 255, 0.8)',
  CROP_REGION: 'rgba(255, 208, 0, 0.2)',
  FADE_IN: 'rgba(0, 255, 0, 0.2)',
  FADE_OUT: 'rgba(255, 0, 0, 0.2)',
  LOCKED_MARKER: 'rgba(255, 165, 0, 0.8)'
} as const;

// Icons for different marker states
export const MARKER_ICONS = {
  LOCKED: '🔒',
  UNLOCKED: '🔶',
  SELECTED: '🔵'
} as const;

// Keyboard shortcuts (for documentation and potential future use)
export const SHORTCUT_KEYS = {
  PLAY_PAUSE: ' ',
  CROP_REGION: 'c',
  RESET: '\\',
  LOOP: 'l',
  ZOOM_IN: '=',
  ZOOM_OUT: '-',
  FADE_IN: '[',
  FADE_OUT: ']',
  UNDO: 'z',
  ADD_MARKER: 'j',
  REMOVE_MARKER: 'k',
  LOCK_MARKER: 'm',
  AUTO_SLICE: 's',
  HALF_MARKERS: 'h',
  CLEAR_MARKERS: 'x'
} as const;

// File validation
export const SUPPORTED_AUDIO_EXTENSIONS = [
  '.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac'
] as const;

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

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
  LABEL_TEXT: '#fff'
} as const;

// Tooltip delays
export const TOOLTIP_DELAYS = {
  ENTER: 500, // ms
  LEAVE: 200  // ms
} as const;

// Auto-slice/transient detection
export const TRANSIENT_DETECTION = {
  MIN_THRESHOLD: 0.01,
  MAX_THRESHOLD: 0.5,
  DEFAULT_THRESHOLD: 0.1,
  WINDOW_SIZE: 1024,
  HOP_SIZE: 512,
  MIN_INTERVAL: 0.05, // Minimum 50ms between transients
  DEFAULT_FRAME_SIZE_MS: 20,
  DEFAULT_OVERLAP_PERCENT: 75
} as const;

// File handling
export const FILE_HANDLING = {
  FIRST_FILE_INDEX: 0,
  SECOND_FILE_INDEX: 1,
  MIN_FILES_FOR_MULTIPLE: 1,
  NO_FILES: 0
} as const;

// Zoom levels
export const ZOOM_LEVELS = {
  MIN: 2,
  MAX: 5000,
  STEP: 1
} as const;

// Playback timing
export const PLAYBACK_TIMING = {
  BRIEF_DELAY: 100, // ms for brief delays
  READY_CALLBACK_DELAY: 100 // ms
} as const;

// Region positioning and fade constants
export const REGION_POSITIONING = {
  DEFAULT_START_RATIO: 0.25, // Start at 25% of duration
  DEFAULT_END_RATIO: 0.75,   // End at 75% of duration
  FADE_RATIO: 0.1,           // Fade length as 10% of region/duration
  MARKER_PROXIMITY_THRESHOLD: 0.1 // Seconds threshold for marker proximity
} as const;

// Playback skip increments
export const SKIP_INCREMENTS = {
  SMALL_THRESHOLD: 0.1,  // Threshold for small skip values
  LARGE_THRESHOLD: 1.0,  // Threshold for large skip values
  SMALL_INCREMENT: 0.01, // Increment for very small values
  MEDIUM_INCREMENT: 0.1, // Increment for small values
  LARGE_INCREMENT: 1.0,  // Increment for large values
  MINIMUM_VALUE: 0.01    // Minimum skip value
} as const;

// Waveform rendering constants
export const WAVEFORM_RENDERING = {
  CURSOR_WIDTH: 2,       // Width of the playback cursor
  GRID_LINE_WIDTH: 1,    // Width of grid lines
  BUFFER_DURATION_TOLERANCE: 0.01 // Tolerance for buffer duration comparison (seconds)
} as const;

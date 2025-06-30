// Keyboard shortcuts configuration for the audio editor

interface KeyboardShortcut {
  key: string;
  description: string;
  action: string;
}

export const keyboardShortcuts: Record<string, KeyboardShortcut> = {
  ' ': {
    key: 'Space',
    description: 'Play/Pause audio',
    action: 'playPause',
  },
  c: {
    key: 'C',
    description: 'Toggle crop/loop region',
    action: 'toggleCropRegion',
  },
  '\\': {
    key: '\\',
    description: 'Toggle crossfade region on selected marker',
    action: 'toggleCrossfadeRegion',
  },
  l: {
    key: 'L',
    description: 'Toggle loop mode',
    action: 'toggleLoop',
  },
  '=': {
    key: '=',
    description: 'Zoom in',
    action: 'zoomIn',
  },
  '-': {
    key: '-',
    description: 'Zoom out',
    action: 'zoomOut',
  },
  ArrowLeft: {
    key: '←',
    description: 'Skip backward',
    action: 'skipBackward',
  },
  ArrowRight: {
    key: '→',
    description: 'Skip forward',
    action: 'skipForward',
  },
  ArrowUp: {
    key: '↑',
    description: 'Increase skip increment',
    action: 'increaseSkipIncrement',
  },
  ArrowDown: {
    key: '↓',
    description: 'Decrease skip increment',
    action: 'decreaseSkipIncrement',
  },
  '[': {
    key: '[',
    description: 'Toggle fade-in region',
    action: 'toggleFadeInRegion',
  },
  ']': {
    key: ']',
    description: 'Toggle fade-out region',
    action: 'toggleFadeOutRegion',
  },
  z: {
    key: 'Ctrl+Z / Cmd+Z',
    description: 'Undo last operation',
    action: 'undo',
  },
  j: {
    key: 'J',
    description: 'Add splice marker at cursor position',
    action: 'addSpliceMarker',
  },
  k: {
    key: 'K',
    description: 'Remove selected splice marker',
    action: 'removeSpliceMarker',
  },
  m: {
    key: 'M',
    description: 'Lock/unlock selected splice marker',
    action: 'toggleMarkerLock',
  },
  s: {
    key: 'S',
    description: 'Create auto-slice markers',
    action: 'autoSlice',
  },
  h: {
    key: 'H',
    description: 'Remove every other splice marker',
    action: 'halfMarkers',
  },
  x: {
    key: 'X',
    description: 'Clear all splice markers',
    action: 'clearAllMarkers',
  },
  // Generate splice marker shortcuts dynamically
  ...(() => {
    const shortcuts: Record<string, KeyboardShortcut> = {};

    // Numbers 1-0 for splice markers 1-10
    const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    numberKeys.forEach((key, index) => {
      const markerNum = index + 1;
      const displayMarkerNum = markerNum === 10 ? 10 : markerNum; // Handle 0 key = marker 10
      shortcuts[key] = {
        key,
        description: `Play splice marker ${displayMarkerNum}`,
        action: `playSplice${displayMarkerNum}`,
      };
    });

    // Letters q-p for splice markers 11-20
    const letterKeys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
    letterKeys.forEach((key, index) => {
      const markerNum = index + 11;
      shortcuts[key] = {
        key: key.toUpperCase(),
        description: `Play splice marker ${markerNum}`,
        action: `playSplice${markerNum}`,
      };
    });

    return shortcuts;
  })(),
};

export type ShortcutAction =
  | 'playPause'
  | 'toggleCropRegion'
  | 'reset'
  | 'toggleLoop'
  | 'zoomIn'
  | 'zoomOut'
  | 'skipForward'
  | 'skipBackward'
  | 'increaseSkipIncrement'
  | 'decreaseSkipIncrement'
  | 'toggleFadeInRegion'
  | 'toggleFadeOutRegion'
  | 'undo'
  | 'addSpliceMarker'
  | 'removeSpliceMarker'
  | 'toggleMarkerLock'
  | 'autoSlice'
  | 'halfMarkers'
  | 'clearAllMarkers'
  | `playSplice${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20}`;

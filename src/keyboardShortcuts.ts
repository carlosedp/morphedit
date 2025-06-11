// Keyboard shortcuts configuration for Morphedit

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: string;
}

export const keyboardShortcuts: Record<string, KeyboardShortcut> = {
  " ": {
    key: "Space",
    description: "Play/Pause audio",
    action: "playPause",
  },
  c: {
    key: "C",
    description: "Toggle crop/loop region",
    action: "toggleCropRegion",
  },
  "\\": {
    key: "\\",
    description: "Reset audio and clear all data",
    action: "reset",
  },
  l: {
    key: "L",
    description: "Toggle loop mode",
    action: "toggleLoop",
  },
  "=": {
    key: "=",
    description: "Zoom in",
    action: "zoomIn",
  },
  "-": {
    key: "-",
    description: "Zoom out",
    action: "zoomOut",
  },
  ArrowLeft: {
    key: "←",
    description: "Skip backward",
    action: "skipBackward",
  },
  ArrowRight: {
    key: "→",
    description: "Skip forward",
    action: "skipForward",
  },
  ArrowUp: {
    key: "↑",
    description: "Increase skip increment",
    action: "increaseSkipIncrement",
  },
  ArrowDown: {
    key: "↓",
    description: "Decrease skip increment",
    action: "decreaseSkipIncrement",
  },
  i: {
    key: "I",
    description: "Toggle fade-in region",
    action: "toggleFadeInRegion",
  },
  o: {
    key: "O",
    description: "Toggle fade-out region",
    action: "toggleFadeOutRegion",
  },
  z: {
    key: "Ctrl+Z / Cmd+Z",
    description: "Undo last operation",
    action: "undo",
  },
  j: {
    key: "J",
    description: "Add splice marker at cursor position",
    action: "addSpliceMarker",
  },
  k: {
    key: "K",
    description: "Remove selected splice marker",
    action: "removeSpliceMarker",
  },
  m: {
    key: "M",
    description: "Lock/unlock selected splice marker",
    action: "toggleMarkerLock",
  },
  s: {
    key: "S",
    description: "Create auto-slice markers",
    action: "autoSlice",
  },
  h: {
    key: "H",
    description: "Remove every other splice marker",
    action: "halfMarkers",
  },
  x: {
    key: "X",
    description: "Clear all splice markers",
    action: "clearAllMarkers",
  },
};

export type ShortcutAction =
  | "playPause"
  | "toggleCropRegion"
  | "reset"
  | "toggleLoop"
  | "zoomIn"
  | "zoomOut"
  | "skipForward"
  | "skipBackward"
  | "increaseSkipIncrement"
  | "decreaseSkipIncrement"
  | "toggleFadeInRegion"
  | "toggleFadeOutRegion"
  | "undo"
  | "addSpliceMarker"
  | "removeSpliceMarker"
  | "toggleMarkerLock"
  | "autoSlice"
  | "halfMarkers"
  | "clearAllMarkers";

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
  "[": {
    key: "[",
    description: "Toggle fade-in region",
    action: "toggleFadeInRegion",
  },
  "]": {
    key: "]",
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
  // Splice marker playback shortcuts (numbers 1-0 and letters q-p for first 20 splice markers)
  "1": {
    key: "1",
    description: "Play splice marker 1",
    action: "playSplice1",
  },
  "2": {
    key: "2",
    description: "Play splice marker 2",
    action: "playSplice2",
  },
  "3": {
    key: "3",
    description: "Play splice marker 3",
    action: "playSplice3",
  },
  "4": {
    key: "4",
    description: "Play splice marker 4",
    action: "playSplice4",
  },
  "5": {
    key: "5",
    description: "Play splice marker 5",
    action: "playSplice5",
  },
  "6": {
    key: "6",
    description: "Play splice marker 6",
    action: "playSplice6",
  },
  "7": {
    key: "7",
    description: "Play splice marker 7",
    action: "playSplice7",
  },
  "8": {
    key: "8",
    description: "Play splice marker 8",
    action: "playSplice8",
  },
  "9": {
    key: "9",
    description: "Play splice marker 9",
    action: "playSplice9",
  },
  "0": {
    key: "0",
    description: "Play splice marker 10",
    action: "playSplice10",
  },
  q: {
    key: "Q",
    description: "Play splice marker 11",
    action: "playSplice11",
  },
  w: {
    key: "W",
    description: "Play splice marker 12",
    action: "playSplice12",
  },
  e: {
    key: "E",
    description: "Play splice marker 13",
    action: "playSplice13",
  },
  r: {
    key: "R",
    description: "Play splice marker 14",
    action: "playSplice14",
  },
  t: {
    key: "T",
    description: "Play splice marker 15",
    action: "playSplice15",
  },
  y: {
    key: "Y",
    description: "Play splice marker 16",
    action: "playSplice16",
  },
  u: {
    key: "U",
    description: "Play splice marker 17",
    action: "playSplice17",
  },
  i: {
    key: "I",
    description: "Play splice marker 18",
    action: "playSplice18",
  },
  o: {
    key: "O",
    description: "Play splice marker 19",
    action: "playSplice19",
  },
  p: {
    key: "P",
    description: "Play splice marker 20",
    action: "playSplice20",
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
  | "clearAllMarkers"
  | "playSplice1"
  | "playSplice2"
  | "playSplice3"
  | "playSplice4"
  | "playSplice5"
  | "playSplice6"
  | "playSplice7"
  | "playSplice8"
  | "playSplice9"
  | "playSplice10"
  | "playSplice11"
  | "playSplice12"
  | "playSplice13"
  | "playSplice14"
  | "playSplice15"
  | "playSplice16"
  | "playSplice17"
  | "playSplice18"
  | "playSplice19"
  | "playSplice20";

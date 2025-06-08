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
  | "decreaseSkipIncrement";

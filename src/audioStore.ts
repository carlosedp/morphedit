import { create } from "zustand";

export interface AudioState {
  audioBuffer: AudioBuffer | null;
  setAudioBuffer: (buffer: AudioBuffer | null) => void;
  markers: number[];
  setMarkers: (markers: number[]) => void;
  regions: { start: number; end: number }[];
  setRegions: (regions: { start: number; end: number }[]) => void;
  // Undo functionality
  previousAudioUrl: string | null;
  setPreviousAudioUrl: (url: string | null) => void;
  canUndo: boolean;
  setCanUndo: (canUndo: boolean) => void;
  reset: () => void;
}

export const useAudioStore = create<AudioState>(
  (set: (partial: Partial<AudioState>) => void) => ({
    audioBuffer: null,
    setAudioBuffer: (buffer) => set({ audioBuffer: buffer }),
    markers: [],
    setMarkers: (markers) => set({ markers }),
    regions: [],
    setRegions: (regions) => set({ regions }),
    // Undo functionality
    previousAudioUrl: null,
    setPreviousAudioUrl: (url) => set({ previousAudioUrl: url }),
    canUndo: false,
    setCanUndo: (canUndo) => set({ canUndo }),
    reset: () => set({
      audioBuffer: null,
      markers: [],
      regions: [],
      previousAudioUrl: null,
      canUndo: false
    }),
  }),
);

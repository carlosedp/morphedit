import { create } from 'zustand';

export interface AudioState {
  audioBuffer: AudioBuffer | null;
  setAudioBuffer: (buffer: AudioBuffer | null) => void;
  markers: number[];
  setMarkers: (markers: number[]) => void;
  regions: { start: number; end: number }[];
  setRegions: (regions: { start: number; end: number }[]) => void;
}

export const useAudioStore = create<AudioState>((set: (partial: Partial<AudioState>) => void) => ({
  audioBuffer: null,
  setAudioBuffer: (buffer) => set({ audioBuffer: buffer }),
  markers: [],
  setMarkers: (markers) => set({ markers }),
  regions: [],
  setRegions: (regions) => set({ regions }),
}));

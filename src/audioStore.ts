import { create } from 'zustand';

export interface AudioState {
  audioBuffer: AudioBuffer | null;
  setAudioBuffer: (buffer: AudioBuffer | null) => void;
  markers: number[];
  setMarkers: (markers: number[]) => void;
  regions: { start: number; end: number }[];
  setRegions: (regions: { start: number; end: number }[]) => void;
  // Splice markers - times where cue points should be placed
  spliceMarkers: number[];
  setSpliceMarkers: (markers: number[]) => void;
  // Locked splice markers - times that should not be removed/moved
  lockedSpliceMarkers: number[];
  setLockedSpliceMarkers: (markers: number[]) => void;
  // BPM detection
  bpm: number | null;
  setBpm: (bpm: number | null) => void;
  // Undo functionality
  previousAudioUrl: string | null;
  setPreviousAudioUrl: (url: string | null) => void;
  previousSpliceMarkers: number[];
  setPreviousSpliceMarkers: (markers: number[]) => void;
  previousLockedSpliceMarkers: number[];
  setPreviousLockedSpliceMarkers: (markers: number[]) => void;
  canUndo: boolean;
  setCanUndo: (canUndo: boolean) => void;
  // Processing state to prevent buffer overrides
  isProcessingAudio: boolean;
  setIsProcessingAudio: (processing: boolean) => void;
  // Undo state to prevent marker overrides during undo operations
  isUndoing: boolean;
  setIsUndoing: (undoing: boolean) => void;
  reset: () => void;
}

export const useAudioStore = create<AudioState>(
  (set: (partial: Partial<AudioState>) => void) => ({
    audioBuffer: null,
    setAudioBuffer: (buffer) => {
      console.log(
        'AudioStore - setAudioBuffer called with:',
        !!buffer,
        buffer ? `duration: ${buffer.length / buffer.sampleRate}s` : 'null'
      );
      set({ audioBuffer: buffer });
    },
    markers: [],
    setMarkers: (markers) => set({ markers }),
    regions: [],
    setRegions: (regions) => set({ regions }),
    // Splice markers
    spliceMarkers: [],
    setSpliceMarkers: (markers) => set({ spliceMarkers: markers }),
    // Locked splice markers
    lockedSpliceMarkers: [],
    setLockedSpliceMarkers: (markers) => set({ lockedSpliceMarkers: markers }),
    // BPM detection
    bpm: null,
    setBpm: (bpm) => set({ bpm }),
    // Undo functionality
    previousAudioUrl: null,
    setPreviousAudioUrl: (url) => set({ previousAudioUrl: url }),
    previousSpliceMarkers: [],
    setPreviousSpliceMarkers: (markers) =>
      set({ previousSpliceMarkers: markers }),
    previousLockedSpliceMarkers: [],
    setPreviousLockedSpliceMarkers: (markers) =>
      set({ previousLockedSpliceMarkers: markers }),
    canUndo: false,
    setCanUndo: (canUndo) => set({ canUndo }),
    // Processing state
    isProcessingAudio: false,
    setIsProcessingAudio: (processing) =>
      set({ isProcessingAudio: processing }),
    // Undo state
    isUndoing: false,
    setIsUndoing: (undoing) => set({ isUndoing: undoing }),
    reset: () =>
      set({
        audioBuffer: null,
        markers: [],
        regions: [],
        spliceMarkers: [],
        lockedSpliceMarkers: [],
        previousAudioUrl: null,
        previousSpliceMarkers: [],
        previousLockedSpliceMarkers: [],
        canUndo: false,
        isProcessingAudio: false,
        isUndoing: false,
        bpm: null,
      }),
  })
);

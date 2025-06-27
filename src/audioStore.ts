// Use worker for rubberband processing
import { create } from 'zustand';

// Import demo worker URL as classic script for importScripts
import workerUrl from 'rubberband-wasm/demo/worker.js?url';

// Worker will handle all WASM operations

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
  // Tempo & pitch controls for rubberband
  tempo: number;
  setTempo: (tempo: number) => void;
  pitch: number;
  setPitch: (pitch: number) => void;
  /** Process current buffer through RubberBand */
  applyRubberband: () => Promise<void>;
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
    // Rubberband controls
    tempo: 1.0,
    setTempo: (tempo) => set({ tempo }),
    pitch: 0,
    setPitch: (pitch) => set({ pitch }),
    /** Process current buffer through RubberBand */
    applyRubberband: async () => {
      const state = useAudioStore.getState();
      if (!state.audioBuffer || state.isProcessingAudio) return;
      set({ isProcessingAudio: true });
      const buf = state.audioBuffer!;
      // extract channel buffers
      const channelBuffers: Float32Array[] = [];
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        channelBuffers.push(buf.getChannelData(ch));
      }
      const worker = new Worker(workerUrl, { type: 'classic' });
      const pitchSemitones = state.pitch;
      const tempoRatio = state.tempo;
      // wait for worker to finish WASM initialization
      await new Promise<void>((resolve) => {
        const initHandler = (e: MessageEvent) => {
          if (e.data && e.data.ready) {
            worker.removeEventListener('message', initHandler);
            resolve();
          }
        };
        worker.addEventListener('message', initHandler);
      });
      // send processing request and await result (ignore 'ready')
      const result: { channelBuffers: Float32Array[] } = await new Promise((resolve) => {
        const processHandler = (e: MessageEvent) => {
          const data = e.data;
          if (data && Array.isArray(data.channelBuffers)) {
            worker.removeEventListener('message', processHandler);
            resolve(data);
          }
        };
        worker.addEventListener('message', processHandler);
        worker.postMessage({ channelBuffers, sampleRate: buf.sampleRate, pitch: Math.pow(2, pitchSemitones / 12), tempo: tempoRatio });
      });
      // terminate worker
      worker.terminate();
      // build new AudioBuffer from worker result
      const outBuffers = result.channelBuffers;
      const outLength = outBuffers[0].length;
      const newBuf = new AudioBuffer({ length: outLength, numberOfChannels: outBuffers.length, sampleRate: buf.sampleRate });
      outBuffers.forEach((data, ch) => {
        // Ensure we have a standard ArrayBuffer for copyToChannel
        const channelData = new Float32Array(data.buffer as ArrayBuffer, data.byteOffset, data.length);
        newBuf.copyToChannel(channelData, ch);
      });
     set({ audioBuffer: newBuf, isProcessingAudio: false });
     },
    reset: () =>
      set({
        audioBuffer: null,
        tempo: 1.0,
        pitch: 0,
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

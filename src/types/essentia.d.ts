// Type definitions for essentia.js
declare module 'essentia.js' {
  // Main Essentia class
  export class Essentia {
    constructor(wasmModule: unknown, isDebug?: boolean);

    // Properties
    version: string;
    algorithmNames: string[];

    // Audio buffer conversion
    audioBufferToMonoSignal(buffer: AudioBuffer): Float32Array;

    // Frame generation
    FrameGenerator(
      inputAudioData: Float32Array,
      frameSize?: number,
      hopSize?: number
    ): VectorVectorFloat;

    // Windowing
    Windowing(
      frame: Float32Array,
      normalize?: boolean,
      size?: number,
      type?: string
    ): { frame: Float32Array };

    // FFT
    FFT(frame: Float32Array): {
      spectrum: Float32Array;
      phase: Float32Array;
    };

    // Onset detection
    OnsetDetection(
      spectrum: Float32Array,
      phase: Float32Array,
      method?: string,
      sampleRate?: number
    ): { onsetDetection: number };

    // Onsets
    Onsets(
      detections: number[][],
      weights: number[],
      alpha?: number,
      delay?: number,
      frameRate?: number,
      silenceThreshold?: number
    ): { onsets: number[] };

    // Utility methods
    arrayToVector(inputArray: Float32Array): VectorFloat;
    vectorToArray(inputVector: VectorFloat): Float32Array;
    shutdown(): void;
    reinstantiate(): void;
    delete(): void;
  }

  // Vector types used by Essentia
  export interface VectorFloat {
    size(): number;
    get(index: number): number;
    push_back(value: number): void;
    delete(): void;
  }

  export interface VectorVectorFloat {
    size(): number;
    get(index: number): Float32Array;
    delete(): void;
  }

  // WASM backend module - exported as a property
  export const EssentiaWASM: unknown;

  // Add-on modules
  export const EssentiaModel: unknown;
  export const EssentiaExtractor: unknown;
  export const EssentiaPlot: unknown;
}

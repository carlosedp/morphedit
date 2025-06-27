// Rubberband WASM processor for tempo and pitch shifting

import { RubberBandInterface, RubberBandOption } from 'rubberband-wasm';
import wasmUrl from 'rubberband-wasm/dist/rubberband.wasm?url';
import { createLogger } from './logger';

const logger = createLogger('RubberbandProcessor');

export interface TempoAndPitchOptions {
  tempoRatio: number; // 1.0 = original tempo, 0.5 = half speed, 2.0 = double speed
  pitchScale: number; // 1.0 = original pitch, 0.5 = one octave down, 2.0 = one octave up
  preserveFormants: boolean; // Whether to preserve formants for vocal content
  detector: 'compound' | 'percussive' | 'soft'; // Transient detection mode
  smoothing: boolean; // Whether to use smoothing
  pitchHQ: boolean; // High quality pitch shifting
  tempoHQ: boolean; // High quality tempo shifting
}

export const DEFAULT_TEMPO_PITCH_OPTIONS: TempoAndPitchOptions = {
  tempoRatio: 1.0,
  pitchScale: 1.0,
  preserveFormants: false,
  detector: 'compound',
  smoothing: false,
  pitchHQ: true,
  tempoHQ: true,
};

class RubberbandProcessor {
  private rbApi: RubberBandInterface | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      logger.debug('Initializing RubberBand WASM interface');

      // Initialize the RubberBand WASM interface using direct WASM import
      // Vite will handle the WASM file and provide the correct URL
      const response = await fetch(wasmUrl);
      const wasmModule = await WebAssembly.compile(
        await response.arrayBuffer()
      );
      this.rbApi = await RubberBandInterface.initialize(wasmModule);
      this.isInitialized = true;

      logger.info('RubberBand WASM interface initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RubberBand WASM interface:', error);
      throw new Error(`Failed to initialize RubberBand: ${error}`);
    }
  }

  async processAudio(
    inputBuffer: AudioBuffer,
    options: TempoAndPitchOptions
  ): Promise<AudioBuffer> {
    if (!this.rbApi || !this.isInitialized) {
      throw new Error('RubberBand processor not initialized');
    }

    const rbApi = this.rbApi; // Create local reference to avoid null checks

    try {
      logger.info('Processing audio with RubberBand', {
        inputDuration: inputBuffer.duration,
        tempoRatio: options.tempoRatio,
        pitchScale: options.pitchScale,
        channels: inputBuffer.numberOfChannels,
        sampleRate: inputBuffer.sampleRate,
      });

      const sampleRate = inputBuffer.sampleRate;
      const channels = inputBuffer.numberOfChannels;
      const inputLength = inputBuffer.length;

      // Create RubberBand state with proper options
      let rbOptions = RubberBandOption.RubberBandOptionProcessOffline;

      // Configure options based on user preferences
      if (options.preserveFormants) {
        rbOptions |= RubberBandOption.RubberBandOptionFormantPreserved;
      }

      if (options.pitchHQ) {
        rbOptions |= RubberBandOption.RubberBandOptionPitchHighQuality;
      }

      if (options.tempoHQ) {
        rbOptions |= RubberBandOption.RubberBandOptionStretchPrecise;
      }

      if (options.smoothing) {
        rbOptions |= RubberBandOption.RubberBandOptionSmoothingOn;
      }

      // Set detector type
      if (options.detector === 'percussive') {
        rbOptions |= RubberBandOption.RubberBandOptionDetectorPercussive;
      } else if (options.detector === 'soft') {
        rbOptions |= RubberBandOption.RubberBandOptionDetectorSoft;
      }

      const rbState = rbApi.rubberband_new(
        sampleRate,
        channels,
        rbOptions,
        1,
        1
      );

      try {
        // Set pitch and tempo ratios
        rbApi.rubberband_set_pitch_scale(rbState, options.pitchScale);
        rbApi.rubberband_set_time_ratio(rbState, options.tempoRatio);

        // Set expected input duration
        rbApi.rubberband_set_expected_input_duration(rbState, inputLength);

        // Get required sample size
        const samplesRequired = rbApi.rubberband_get_samples_required(rbState);

        // Prepare input channel data
        const channelBuffers: Float32Array[] = [];
        for (let channel = 0; channel < channels; channel++) {
          channelBuffers.push(inputBuffer.getChannelData(channel));
        }

        // Allocate memory for input channels
        const channelArrayPtr = rbApi.malloc(channels * 4);
        const channelDataPtr: number[] = [];

        for (let channel = 0; channel < channels; channel++) {
          const bufferPtr = rbApi.malloc(samplesRequired * 4);
          channelDataPtr.push(bufferPtr);
          rbApi.memWritePtr(channelArrayPtr + channel * 4, bufferPtr);
        }

        // Calculate output size
        const outputSamples = Math.ceil(inputLength * options.tempoRatio);
        const outputBuffers = channelBuffers.map(
          () => new Float32Array(outputSamples)
        );

        // Study phase
        logger.debug('Starting study phase');
        let read = 0;
        while (read < inputLength) {
          const remaining = Math.min(samplesRequired, inputLength - read);

          // Copy input data to WASM memory
          channelBuffers.forEach((buf, i) => {
            rbApi.memWrite(
              channelDataPtr[i],
              buf.subarray(read, read + remaining)
            );
          });

          read += remaining;
          const isFinal = read >= inputLength ? 1 : 0;
          rbApi.rubberband_study(rbState, channelArrayPtr, remaining, isFinal);
        }

        // Process phase
        logger.debug('Starting process phase');
        read = 0;
        let write = 0;

        const tryRetrieve = (final = false) => {
          while (true) {
            const available = rbApi.rubberband_available(rbState);
            if (available < 1) break;
            if (!final && available < samplesRequired) break;

            const recv = rbApi.rubberband_retrieve(
              rbState,
              channelArrayPtr,
              Math.min(samplesRequired, available)
            );

            // Copy output data from WASM memory
            channelDataPtr.forEach((ptr, i) => {
              const outputData = rbApi.memReadF32(ptr, recv);
              outputBuffers[i].set(outputData, write);
            });

            write += recv;
          }
        };

        while (read < inputLength) {
          const remaining = Math.min(samplesRequired, inputLength - read);

          // Copy input data to WASM memory
          channelBuffers.forEach((buf, i) => {
            rbApi.memWrite(
              channelDataPtr[i],
              buf.subarray(read, read + remaining)
            );
          });

          read += remaining;
          const isFinal = read >= inputLength ? 1 : 0;
          rbApi.rubberband_process(
            rbState,
            channelArrayPtr,
            remaining,
            isFinal
          );
          tryRetrieve(false);
        }

        // Final retrieval
        tryRetrieve(true);

        // Create output AudioBuffer
        const outputBuffer = new AudioContext().createBuffer(
          channels,
          write, // Use actual written samples
          sampleRate
        );

        // Copy processed data to output buffer
        for (let channel = 0; channel < channels; channel++) {
          const trimmedOutput = outputBuffers[channel].slice(0, write);
          outputBuffer.copyToChannel(trimmedOutput, channel);
        }

        // Clean up memory
        channelDataPtr.forEach((ptr) => rbApi.free(ptr));
        rbApi.free(channelArrayPtr);

        logger.info('Audio processing completed', {
          inputLength: inputLength,
          outputLength: write,
          inputDuration: inputBuffer.duration,
          outputDuration: outputBuffer.duration,
        });

        return outputBuffer;
      } finally {
        // Clean up RubberBand state
        rbApi.rubberband_delete(rbState);
      }
    } catch (error) {
      logger.error('Failed to process audio with RubberBand:', error);
      throw new Error(`Audio processing failed: ${error}`);
    }
  }

  dispose(): void {
    if (this.rbApi) {
      try {
        // RubberBand WASM doesn't seem to have a dispose method
        this.rbApi = null;
        this.isInitialized = false;
        logger.debug('RubberBand processor disposed');
      } catch (error) {
        logger.warn('Error disposing RubberBand processor:', error);
      }
    }
  }
}

// Utility function to create and process audio with RubberBand
export async function processAudioWithRubberBand(
  inputBuffer: AudioBuffer,
  options: TempoAndPitchOptions
): Promise<AudioBuffer> {
  const processor = new RubberbandProcessor();

  try {
    await processor.initialize();
    const result = await processor.processAudio(inputBuffer, options);
    return result;
  } finally {
    processor.dispose();
  }
}

// Helper functions for common operations
export function semitoneToRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

export function percentToRatio(percent: number): number {
  return percent / 100;
}

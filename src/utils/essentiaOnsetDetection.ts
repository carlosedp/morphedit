// Essentia.js onset detection utilities
// NOTE: Imports ES modules directly to avoid CommonJS require() issues
import type { EssentiaOnsetMethod } from '../settingsStore';
import { createLogger } from './logger';

const essentiaLogger = createLogger('EssentiaOnset');

// Singleton instance of Essentia
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let essentiaInstance: any = null;

/**
 * Initialize Essentia.js instance with WASM backend
 * Uses dynamic import to lazy-load the library only when needed
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getEssentiaInstance(): Promise<any> {
  if (!essentiaInstance) {
    essentiaLogger.debug('Initializing Essentia.js...');

    // Dynamically import essentia.js ES modules directly (avoiding CommonJS index.js)
    // Note: Core is default export, WASM is named export { EssentiaWASM }
    const [EssentiaModule, WasmModule] = await Promise.all([
      import('essentia.js/dist/essentia.js-core.es.js'),
      import('essentia.js/dist/essentia-wasm.es.js'),
    ]);

    const Essentia = EssentiaModule.default;
    const { EssentiaWASM } = WasmModule;

    essentiaLogger.debug('Creating Essentia instance with WASM module');
    essentiaInstance = new Essentia(EssentiaWASM);
    essentiaLogger.debug('Essentia.js initialized successfully');
  }
  return essentiaInstance;
}

/**
 * Detects onsets using Essentia.js
 * @param audioBuffer - The AudioBuffer to analyze
 * @param method - Onset detection method ('hfc', 'complex', 'complex_phase', 'flux', 'melflux', 'rms')
 * @param frameSize - Frame size for analysis (default: 1024)
 * @param hopSize - Hop size for frame overlap (default: 512)
 * @param sensitivity - Detection sensitivity 0-100 (affects threshold)
 * @returns Array of onset times in seconds
 */
export async function detectOnsetsEssentia(
  audioBuffer: AudioBuffer,
  method: EssentiaOnsetMethod = 'hfc',
  frameSize: number = 1024,
  hopSize: number = 512,
  sensitivity: number = 50
): Promise<number[]> {
  try {
    essentiaLogger.debug('Starting Essentia onset detection...', {
      method,
      frameSize,
      hopSize,
      sensitivity,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
    });

    const essentia = await getEssentiaInstance();
    const sampleRate = audioBuffer.sampleRate;

    // Convert audio buffer to mono signal
    const monoSignal = essentia.audioBufferToMonoSignal(audioBuffer);
    essentiaLogger.debug('Converted to mono signal', {
      length: monoSignal.length,
    });

    // Generate frames using FrameGenerator
    const frames = essentia.FrameGenerator(monoSignal, frameSize, hopSize);
    essentiaLogger.debug('Generated frames', { frameCount: frames.size() });

    // Arrays to store detection function values
    const detectionValues: number[] = [];

    // Process each frame
    for (let i = 0; i < frames.size(); i++) {
      const frame = frames.get(i);

      // Compute spectrum for the frame
      const windowing = essentia.Windowing(frame, true, frameSize, 'hann');
      // Use Spectrum to get the magnitude spectrum
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spectrumResult = (essentia as any).Spectrum(windowing.frame);
      const spectrum = spectrumResult.spectrum;

      // Compute onset detection function
      // Note: We pass spectrum twice since OnsetDetection needs both spectrum and phase
      // but for methods like 'hfc', only spectrum is used
      const onsetDetection = essentia.OnsetDetection(
        spectrum,
        spectrum, // Use spectrum for phase parameter (not all methods need phase)
        method,
        sampleRate
      );

      detectionValues.push(onsetDetection.onsetDetection);
    }

    essentiaLogger.debug('Computed detection values', {
      count: detectionValues.length,
    });

    // Convert detection function values to onset times
    // We need to find peaks in the detection function
    const onsets = findPeaksInDetectionFunction(
      detectionValues,
      hopSize,
      sampleRate,
      sensitivity
    );

    essentiaLogger.debug('Detected onsets', { count: onsets.length });

    return onsets;
  } catch (error) {
    essentiaLogger.error('Essentia onset detection failed:', error);
    throw error;
  }
}

/**
 * Find peaks in detection function to identify onsets
 * @param detectionValues - Array of detection function values
 * @param hopSize - Hop size used for frame generation
 * @param sampleRate - Sample rate of audio
 * @param sensitivity - Detection sensitivity 0-100
 * @returns Array of onset times in seconds
 */
function findPeaksInDetectionFunction(
  detectionValues: number[],
  hopSize: number,
  sampleRate: number,
  sensitivity: number
): number[] {
  if (detectionValues.length === 0) return [];

  // Normalize sensitivity (0-100) to threshold multiplier
  // Higher sensitivity = lower threshold = more onsets
  const normalizedSensitivity = Math.max(0, Math.min(100, sensitivity)) / 100;

  // Calculate adaptive threshold
  const mean =
    detectionValues.reduce((sum, val) => sum + val, 0) / detectionValues.length;
  const max = Math.max(...detectionValues);

  // Threshold: high sensitivity = closer to mean, low sensitivity = closer to max
  const threshold = max - (max - mean) * normalizedSensitivity;

  essentiaLogger.debug('Peak detection parameters', {
    mean,
    max,
    threshold,
    sensitivity,
  });

  const onsets: number[] = [];
  const minInterval = 0.05; // Minimum 50ms between onsets

  // Find peaks above threshold
  for (let i = 1; i < detectionValues.length - 1; i++) {
    const current = detectionValues[i];
    const prev = detectionValues[i - 1];
    const next = detectionValues[i + 1];

    // Peak detection: current value is higher than neighbors and above threshold
    if (current > prev && current > next && current > threshold) {
      const timeInSeconds = (i * hopSize) / sampleRate;

      // Avoid onsets too close to each other
      if (
        onsets.length === 0 ||
        timeInSeconds - onsets[onsets.length - 1] > minInterval
      ) {
        onsets.push(timeInSeconds);
      }
    }
  }

  return onsets;
}

// Tempo and pitch processing utility for the Waveform component

import WaveSurfer from 'wavesurfer.js';

import { audioBufferToWavBlob } from './audioConcatenation';
import { detectBPMWithTimeout } from './bpmDetection';
import { createLogger } from './logger';
import {
  processAudioWithRubberBand,
  type TempoAndPitchOptions,
} from './rubberbandProcessor';

const logger = createLogger('TempoAndPitchProcessing');

interface TempoAndPitchCallbacks {
  setPreviousAudioUrl: (url: string | null) => void;
  setCanUndo: (canUndo: boolean) => void;
  setAudioBuffer: (buffer: AudioBuffer) => void;
  setCurrentAudioUrl: (url: string | null) => void;
  setSpliceMarkersStore: (markers: number[]) => void;
  setLockedSpliceMarkersStore: (markers: number[]) => void;
  setPreviousSpliceMarkers: (markers: number[]) => void;
  setPreviousLockedSpliceMarkers: (markers: number[]) => void;
  setIsProcessingAudio: (processing: boolean) => void;
  setBpm: (bpm: number | null) => void;
  resetZoom: () => void;
  setResetZoom?: (zoom: number) => void; // Optional callback to reset the stored zoom value
}

/**
 * Apply tempo and pitch adjustments to the current audio using RubberBand
 */
export async function applyTempoAndPitch(
  ws: WaveSurfer,
  options: TempoAndPitchOptions,
  currentAudioUrl: string | null,
  spliceMarkers: number[],
  lockedSpliceMarkers: number[],
  callbacks: TempoAndPitchCallbacks
): Promise<void> {
  if (!ws) {
    throw new Error('WaveSurfer instance is not available');
  }

  const audioBuffer = ws.getDecodedData();
  if (!audioBuffer) {
    throw new Error('No audio data available for tempo and pitch processing');
  }

  logger.info('Starting tempo and pitch processing', {
    originalDuration: audioBuffer.duration,
    tempoRatio: options.tempoRatio,
    pitchScale: options.pitchScale,
    sampleRate: audioBuffer.sampleRate,
    channels: audioBuffer.numberOfChannels,
  });

  try {
    // Set processing flag to prevent buffer comparison issues
    callbacks.setIsProcessingAudio(true);

    // Reset the stored resetZoom value to force recalculation for new duration
    // This ensures zoom reset will work properly with the changed audio duration
    if (callbacks.setResetZoom) {
      callbacks.setResetZoom(2); // Reset to default value to force recalculation
      logger.debug(
        'Reset stored resetZoom value to force recalculation after tempo/pitch change'
      );
    }

    // Save current state for undo
    if (currentAudioUrl) {
      callbacks.setPreviousAudioUrl(currentAudioUrl);
      callbacks.setPreviousSpliceMarkers([...spliceMarkers]);
      callbacks.setPreviousLockedSpliceMarkers([...lockedSpliceMarkers]);
      callbacks.setCanUndo(true);
    }

    // Process the audio with RubberBand
    logger.debug('Processing audio with RubberBand...');
    const processedBuffer = await processAudioWithRubberBand(
      audioBuffer,
      options
    );

    logger.info('Audio processing completed', {
      originalDuration: audioBuffer.duration,
      processedDuration: processedBuffer.duration,
      originalLength: audioBuffer.length,
      processedLength: processedBuffer.length,
    });

    // Adjust splice markers for the new audio length
    // Since we inverted the tempo ratio, we need to scale markers inversely
    // For faster tempo (higher %), markers should be at earlier positions
    const scaledSpliceMarkers = spliceMarkers.map(
      (marker) => marker * options.tempoRatio
    );
    const scaledLockedSpliceMarkers = lockedSpliceMarkers.map(
      (marker) => marker * options.tempoRatio
    );

    // Convert processed buffer to WAV blob with adjusted splice markers
    logger.debug('Converting processed buffer to WAV blob...');
    const wavBlob = await audioBufferToWavBlob(
      processedBuffer,
      scaledSpliceMarkers
    );
    const newUrl = URL.createObjectURL(wavBlob) + '#morphedit-tempo-pitch';

    // Update the audio buffer in the store BEFORE loading to WaveSurfer
    // This ensures the store has the correct processed buffer
    logger.debug('Setting processed buffer in store BEFORE WaveSurfer load');
    callbacks.setAudioBuffer(processedBuffer);

    // Update other state
    callbacks.setCurrentAudioUrl(newUrl);
    callbacks.setSpliceMarkersStore(scaledSpliceMarkers);
    callbacks.setLockedSpliceMarkersStore(scaledLockedSpliceMarkers);

    // Load the new audio into WaveSurfer
    logger.debug('Loading processed audio into WaveSurfer...');

    // Store callbacks for later execution by the main ready handler
    logger.debug('Storing callbacks for tempo/pitch processing completion');
    const callbackFunctions = [
      () => {
        logger.debug('🔍 Executing stored zoom reset callback');
        // For tempo/pitch processing, the zoom reset function will automatically detect
        // the duration change and recalculate the appropriate zoom
        callbacks.resetZoom();
      },
      () => {
        logger.debug('🎵 Executing stored BPM detection callback');
        detectBPMWithTimeout(processedBuffer, 20000)
          .then((detectedBpm) => {
            if (detectedBpm) {
              logger.info(
                '🎵 BPM re-detected after tempo/pitch processing:',
                detectedBpm
              );
              callbacks.setBpm(detectedBpm);
            } else {
              logger.warn(
                '🎵 Failed to re-detect BPM after tempo/pitch processing'
              );
              callbacks.setBpm(null);
            }
          })
          .catch((error) => {
            logger.error('🎵 Error during BPM re-detection:', error);
            callbacks.setBpm(null);
          });
      },
      () => {
        logger.debug('Clearing processing flag');
        callbacks.setIsProcessingAudio(false);
      },
    ];

    // Store callbacks in the audio store
    const { useAudioStore } = await import('../audioStore');
    logger.debug(
      'Setting pending tempo callbacks in store:',
      callbackFunctions.length,
      callbackFunctions
    );
    useAudioStore.getState().setPendingTempoCallbacks(callbackFunctions);
    logger.debug('Callbacks stored successfully in audio store');

    await ws.load(newUrl);

    // Immediately reset zoom after loading new audio
    callbacks.resetZoom();

    logger.info('Tempo and pitch processing initiated successfully');

    // Clean up the previous URL to free memory
    if (currentAudioUrl && currentAudioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentAudioUrl.split('#')[0]);
    }
  } catch (error) {
    // Clear processing flag on error
    callbacks.setIsProcessingAudio(false);
    logger.error('Failed to apply tempo and pitch processing:', error);
    throw new Error(`Tempo and pitch processing failed: ${error}`);
  }
}

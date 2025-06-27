// Tempo and pitch processing utility for the Waveform component

import WaveSurfer from 'wavesurfer.js';
import { createLogger } from './logger';
import {
  processAudioWithRubberBand,
  type TempoAndPitchOptions,
} from './rubberbandProcessor';
import { audioBufferToWavBlob } from './audioConcatenation';

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
    await ws.load(newUrl);

    // Wait for WaveSurfer to be ready
    await new Promise<void>((resolve) => {
      const onReady = () => {
        ws.un('ready', onReady);
        logger.debug('WaveSurfer ready after tempo/pitch processing');

        const finalDuration = ws.getDuration();
        logger.info('Tempo and pitch processing completed successfully');
        logger.info(
          'WaveSurfer duration after processing:',
          finalDuration,
          'seconds'
        );
        logger.info(
          'Processed buffer duration:',
          processedBuffer.duration,
          'seconds'
        );

        // Verify the durations match (within tolerance)
        const durationDiff = Math.abs(finalDuration - processedBuffer.duration);
        if (durationDiff > 0.1) {
          logger.warn(
            'Duration mismatch between WaveSurfer and processed buffer:',
            {
              waveformDuration: finalDuration,
              bufferDuration: processedBuffer.duration,
              difference: durationDiff,
            }
          );
        }

        // Clear processing flag
        callbacks.setIsProcessingAudio(false);

        resolve();
      };

      ws.on('ready', onReady);
    });

    logger.info('Tempo and pitch processing applied successfully');

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

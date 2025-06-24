// Audio preprocessing utilities for handling truncation before WaveSurfer load

import {
  truncateAudioBuffer,
  MORPHAGENE_MAX_DURATION,
} from './fileLengthUtils';
import { audioBufferToWavFormat } from './exportUtils';
import { EXPORT_FORMATS } from '../constants';

/**
 * Pre-process audio URL for truncation if needed
 * Returns either the original URL or a new blob URL with truncated audio
 */
export const preprocessAudioForTruncation = async (
  originalUrl: string,
  shouldTruncate: boolean
): Promise<string> => {
  if (!shouldTruncate) {
    return originalUrl;
  }

  try {
    console.log('Preprocessing audio for truncation...');

    // Fetch and decode the original audio
    const response = await fetch(originalUrl);
    const arrayBuffer = await response.arrayBuffer();

    const audioContext = new (window.AudioContext ||
      (
        window as Window &
          typeof globalThis & {
            webkitAudioContext?: typeof AudioContext;
          }
      ).webkitAudioContext)();

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const originalDuration = audioBuffer.length / audioBuffer.sampleRate;

    console.log('Original audio duration:', originalDuration, 'seconds');

    if (originalDuration <= MORPHAGENE_MAX_DURATION) {
      console.log('Audio is within limits, no truncation needed');
      return originalUrl;
    }

    console.log(
      'Audio exceeds limits, truncating to',
      MORPHAGENE_MAX_DURATION,
      'seconds'
    );

    // Truncate the buffer
    const truncatedBuffer = truncateAudioBuffer(
      audioBuffer,
      MORPHAGENE_MAX_DURATION
    );
    const truncatedDuration =
      truncatedBuffer.length / truncatedBuffer.sampleRate;

    console.log('Truncated audio duration:', truncatedDuration, 'seconds');

    // Convert to WAV blob
    const defaultFormat = EXPORT_FORMATS[0]; // Use default export format
    const wavArrayBuffer = audioBufferToWavFormat(
      truncatedBuffer,
      defaultFormat,
      []
    );
    const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
    const truncatedUrl = URL.createObjectURL(wavBlob);

    console.log('Created truncated audio URL:', truncatedUrl);

    return truncatedUrl;
  } catch (error) {
    console.error('Error preprocessing audio for truncation:', error);
    // If preprocessing fails, return original URL
    return originalUrl;
  }
};

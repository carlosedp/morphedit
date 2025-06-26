// Utility functions for exporting individual slices as separate WAV files
import type { ExportFormat } from './exportUtils';
import { audioBufferToWavFormat, downloadWav } from './exportUtils';

interface SliceExportResult {
  sliceNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  filename: string;
  success: boolean;
  error?: string;
}

/**
 * Extract a slice from an audio buffer between two time points
 */
const extractSliceFromBuffer = (
  audioBuffer: AudioBuffer,
  startTime: number,
  endTime: number
): AudioBuffer => {
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;

  // Convert time to samples
  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.floor(endTime * sampleRate);
  const sliceLength = endSample - startSample;

  // Create new buffer for the slice
  const audioContext = new (window.AudioContext ||
    (
      window as Window &
        typeof globalThis & {
          webkitAudioContext?: typeof AudioContext;
        }
    ).webkitAudioContext)();
  let sliceBuffer: AudioBuffer;
  try {
    sliceBuffer = audioContext.createBuffer(
      numberOfChannels,
      sliceLength,
      sampleRate
    );

    // Copy audio data for each channel
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sourceChannelData = audioBuffer.getChannelData(channel);
      const sliceChannelData = sliceBuffer.getChannelData(channel);

      for (let i = 0; i < sliceLength; i++) {
        const sourceIndex = startSample + i;
        if (sourceIndex < sourceChannelData.length) {
          sliceChannelData[i] = sourceChannelData[sourceIndex];
        }
      }
    }
  } finally {
    audioContext.close();
  }

  return sliceBuffer;
};

/**
 * Generate filename for a slice
 */
const generateSliceFilename = (
  sliceNumber: number,
  totalSlices: number,
  format: ExportFormat,
  baseFilename: string = 'morphedit-slice'
): string => {
  const paddedNumber = sliceNumber
    .toString()
    .padStart(totalSlices >= 100 ? 3 : 2, '0');
  const formatString = format.label.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${baseFilename}-${paddedNumber}-${formatString}.wav`;
};

/**
 * Export all slices with progress callback
 */
export const exportSlicesWithProgress = async (
  audioBuffer: AudioBuffer,
  spliceMarkers: number[],
  exportFormat: ExportFormat,
  baseFilename: string = 'morphedit-slice',
  onProgress?: (current: number, total: number) => void
): Promise<SliceExportResult[]> => {
  const results: SliceExportResult[] = [];

  if (!audioBuffer) {
    throw new Error('No audio buffer available for slice export');
  }

  if (spliceMarkers.length === 0) {
    throw new Error('No splice markers found - cannot export slices');
  }

  // Sort markers chronologically
  const sortedMarkers = [...spliceMarkers].sort((a, b) => a - b);
  const duration = audioBuffer.length / audioBuffer.sampleRate;

  // Create slice boundaries
  const boundaries = [0, ...sortedMarkers, duration];
  const uniqueBoundaries = [...new Set(boundaries)].sort((a, b) => a - b);
  const totalSlices = uniqueBoundaries.length - 1;

  console.log(
    `Exporting ${totalSlices} slices with boundaries:`,
    uniqueBoundaries
  );

  // Export each slice with progress updates
  for (let i = 0; i < uniqueBoundaries.length - 1; i++) {
    const startTime = uniqueBoundaries[i];
    const endTime = uniqueBoundaries[i + 1];
    const sliceDuration = endTime - startTime;
    const sliceNumber = i + 1;

    // Update progress
    if (onProgress) {
      onProgress(sliceNumber, totalSlices);
    }

    // Skip very short slices (less than 10ms)
    if (sliceDuration < 0.01) {
      console.warn(
        `Skipping very short slice ${sliceNumber} (${sliceDuration * 1000}ms)`
      );
      continue;
    }

    try {
      console.log(
        `Exporting slice ${sliceNumber}/${totalSlices}: ${startTime.toFixed(3)}s - ${endTime.toFixed(3)}s (${sliceDuration.toFixed(3)}s)`
      );

      // Extract slice from audio buffer
      const sliceBuffer = extractSliceFromBuffer(
        audioBuffer,
        startTime,
        endTime
      );

      // Convert to WAV format (no cue points needed for individual slices)
      const wav = audioBufferToWavFormat(sliceBuffer, exportFormat, []);

      // Generate filename
      const filename = generateSliceFilename(
        sliceNumber,
        totalSlices,
        exportFormat,
        baseFilename
      );

      // Download the slice
      downloadWav(wav, filename);

      results.push({
        sliceNumber,
        startTime,
        endTime,
        duration: sliceDuration,
        filename,
        success: true,
      });

      // Add small delay between downloads to avoid browser issues
      if (i < uniqueBoundaries.length - 2) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch (error) {
      console.error(`Error exporting slice ${sliceNumber}:`, error);
      results.push({
        sliceNumber,
        startTime,
        endTime,
        duration: sliceDuration,
        filename: generateSliceFilename(
          sliceNumber,
          totalSlices,
          exportFormat,
          baseFilename
        ),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
};

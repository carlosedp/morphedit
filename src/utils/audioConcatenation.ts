// Audio concatenation utilities for handling multiple files

import { copyAudioData } from "./audioBufferUtils";
import { concatenationLogger } from "./logger";
import { deduplicateAndSortMarkers } from "./regionHelpers";

export interface ConcatenationResult {
  concatenatedBuffer: AudioBuffer;
  spliceMarkerPositions: number[];
  boundaryMarkerPositions: number[];
  totalDuration: number;
}

/**
 * Get the duration of multiple audio files
 */
export const getMultipleAudioFilesDuration = async (
  files: File[],
): Promise<number> => {
  let totalDuration = 0;

  for (const file of files) {
    const duration = await new Promise<number>((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);

      audio.addEventListener("loadedmetadata", () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      });

      audio.addEventListener("error", () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load audio metadata"));
      });

      audio.src = url;
    });

    totalDuration += duration;
  }

  return totalDuration;
};

/**
 * Decode multiple audio files to AudioBuffers and extract existing cue points
 */
const decodeAudioFilesWithCuePoints = async (
  files: File[],
): Promise<{
  buffers: AudioBuffer[];
  allCuePoints: { fileIndex: number; cuePoints: number[] }[];
}> => {
  const audioContext = new (window.AudioContext ||
    (
      window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext)();

  const buffers: AudioBuffer[] = [];
  const allCuePoints: { fileIndex: number; cuePoints: number[] }[] = [];

  // Import the parseWavCuePoints function
  const { parseWavCuePoints } = await import("./audioProcessing");

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    buffers.push(audioBuffer);

    // Extract existing cue points from the file
    try {
      const fileUrl = URL.createObjectURL(file);
      const cuePoints = await parseWavCuePoints(fileUrl);
      URL.revokeObjectURL(fileUrl);

      if (cuePoints.length > 0) {
        allCuePoints.push({ fileIndex: i, cuePoints });
        console.log(
          `File ${i} (${file.name}) has ${cuePoints.length} existing cue points:`,
          cuePoints,
        );
      }
    } catch (error) {
      console.warn(
        `Could not extract cue points from file ${i} (${file.name}):`,
        error,
      );
    }
  }

  return { buffers, allCuePoints };
};

/**
 * Concatenate multiple audio files into a single AudioBuffer with splice markers
 */
export const concatenateAudioFiles = async (
  files: File[],
  shouldTruncate: boolean = false,
  maxDuration?: number,
): Promise<ConcatenationResult> => {
  if (files.length === 0) {
    throw new Error("No files provided for concatenation");
  }

  // Decode all audio files and extract their cue points
  const { buffers, allCuePoints } = await decodeAudioFilesWithCuePoints(files);

  // Ensure all buffers have the same sample rate
  const targetSampleRate = buffers[0].sampleRate;
  const mismatchedSampleRates = buffers.some(
    (buffer) => buffer.sampleRate !== targetSampleRate,
  );

  if (mismatchedSampleRates) {
    console.warn(
      "Sample rate mismatch detected. All files should have the same sample rate for best results.",
    );
  }

  // Calculate total length and collect all splice marker positions
  let totalLength = 0;
  const spliceMarkerPositions: number[] = [];
  const boundaryMarkerPositions: number[] = [];
  let currentTimeOffset = 0;

  for (let i = 0; i < buffers.length; i++) {
    const buffer = buffers[i];
    const bufferDuration = buffer.length / targetSampleRate;

    // Add existing cue points from this file, adjusted for their position in the concatenated audio
    const fileCuePoints = allCuePoints.find((cp) => cp.fileIndex === i);
    if (fileCuePoints && fileCuePoints.cuePoints.length > 0) {
      for (const cuePoint of fileCuePoints.cuePoints) {
        // Only include cue points that are within the buffer duration
        if (cuePoint < bufferDuration) {
          spliceMarkerPositions.push(currentTimeOffset + cuePoint);
        }
      }
      concatenationLogger.markerOperation(
        `Added existing cue points from file ${i}`,
        fileCuePoints.cuePoints.length,
      );
    }

    // Add splice marker at the beginning of each new file (except the first)
    if (i > 0) {
      const boundaryMarker = currentTimeOffset;
      spliceMarkerPositions.push(boundaryMarker);
      boundaryMarkerPositions.push(boundaryMarker);
    }

    currentTimeOffset += bufferDuration;
    totalLength += buffer.length;
  }

  // Handle truncation if needed
  if (shouldTruncate && maxDuration) {
    const maxSamples = Math.floor(maxDuration * targetSampleRate);
    if (totalLength > maxSamples) {
      totalLength = maxSamples;
      // Remove splice markers that would be beyond the truncated length
      const truncatedDuration = maxDuration;
      const filteredMarkers = spliceMarkerPositions.filter(
        (pos) => pos < truncatedDuration,
      );
      spliceMarkerPositions.length = 0;
      spliceMarkerPositions.push(...filteredMarkers);
    }
  }

  // Remove duplicate markers and sort
  const uniqueSortedMarkers = deduplicateAndSortMarkers(spliceMarkerPositions);
  console.log(
    `Total splice markers after concatenation: ${uniqueSortedMarkers.length}`,
  );
  console.log("Splice marker positions:", uniqueSortedMarkers);

  // Create the concatenated buffer
  const audioContext = new (window.AudioContext ||
    (
      window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext)();

  const numberOfChannels = Math.max(
    ...buffers.map((buffer) => buffer.numberOfChannels),
  );
  const concatenatedBuffer = audioContext.createBuffer(
    numberOfChannels,
    totalLength,
    targetSampleRate,
  );

  // Copy data from all buffers
  let currentOffset = 0;

  for (const buffer of buffers) {
    // Check if we've reached the truncation limit
    if (shouldTruncate && maxDuration && currentOffset >= totalLength) {
      break;
    }

    const copyLength =
      shouldTruncate && maxDuration
        ? Math.min(buffer.length, totalLength - currentOffset)
        : buffer.length;

    // Use the utility function to copy audio data
    copyAudioData(buffer, concatenatedBuffer, 0, currentOffset, copyLength);

    currentOffset += copyLength;
  }

  const totalDuration =
    concatenatedBuffer.length / concatenatedBuffer.sampleRate;

  return {
    concatenatedBuffer,
    spliceMarkerPositions: uniqueSortedMarkers,
    boundaryMarkerPositions: boundaryMarkerPositions
      .filter((marker) => {
        const maxTime =
          concatenatedBuffer.length / concatenatedBuffer.sampleRate;
        return marker >= 0 && marker < maxTime;
      })
      .sort((a, b) => a - b),
    totalDuration,
  };
};

/**
 * Filter audio files from a FileList or File array
 */
export const filterAudioFiles = (files: FileList | File[]): File[] => {
  const fileArray = Array.from(files);
  return fileArray.filter((file) => file.type.startsWith("audio/"));
};

/**
 * Sort audio files by name for consistent concatenation order
 */
export const sortAudioFilesByName = (files: File[]): File[] => {
  return [...files].sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Convert an AudioBuffer to a WAV Blob with cue points
 */
export const audioBufferToWavBlob = async (
  buffer: AudioBuffer,
  cuePoints: number[] = [],
): Promise<Blob> => {
  // Import the audioBufferToWavWithCues function
  const { audioBufferToWavWithCues } = await import("./audioProcessing");

  const wavArrayBuffer = audioBufferToWavWithCues(buffer, cuePoints);
  return new Blob([wavArrayBuffer], { type: "audio/wav" });
};

/**
 * Append audio files to an existing audio buffer while preserving existing splice markers
 */
export const appendAudioToExisting = async (
  existingBuffer: AudioBuffer,
  existingSpliceMarkers: number[],
  newFiles: File[],
  shouldTruncate: boolean = false,
  maxDuration?: number,
): Promise<ConcatenationResult> => {
  if (newFiles.length === 0) {
    throw new Error("No files provided for appending");
  }

  // Decode the new audio files and extract their cue points
  const { buffers: newBuffers, allCuePoints } =
    await decodeAudioFilesWithCuePoints(newFiles);

  const targetSampleRate = existingBuffer.sampleRate;

  // Check for sample rate mismatches
  const mismatchedSampleRates = newBuffers.some(
    (buffer) => buffer.sampleRate !== targetSampleRate,
  );

  if (mismatchedSampleRates) {
    console.warn(
      "Sample rate mismatch detected between existing audio and new files. Results may be unexpected.",
    );
  }

  // Calculate total length and collect all splice marker positions
  let totalLength = existingBuffer.length;
  const spliceMarkerPositions: number[] = [...existingSpliceMarkers]; // Start with existing markers
  const boundaryMarkerPositions: number[] = [];
  let currentTimeOffset = existingBuffer.length / targetSampleRate; // Start after existing audio

  // Add a splice marker at the boundary between existing and new audio
  const firstBoundaryMarker = currentTimeOffset;
  spliceMarkerPositions.push(firstBoundaryMarker);
  boundaryMarkerPositions.push(firstBoundaryMarker);

  // Process each new buffer
  for (let i = 0; i < newBuffers.length; i++) {
    const buffer = newBuffers[i];
    const bufferDuration = buffer.length / targetSampleRate;

    // Add existing cue points from this new file, adjusted for their position
    const fileCuePoints = allCuePoints.find((cp) => cp.fileIndex === i);
    if (fileCuePoints && fileCuePoints.cuePoints.length > 0) {
      for (const cuePoint of fileCuePoints.cuePoints) {
        if (cuePoint < bufferDuration) {
          spliceMarkerPositions.push(currentTimeOffset + cuePoint);
        }
      }
      console.log(
        `Added ${fileCuePoints.cuePoints.length} existing cue points from appended file ${i}`,
      );
    }

    // Add splice marker at the beginning of each additional new file (not the first new file)
    if (i > 0) {
      const boundaryMarker = currentTimeOffset;
      spliceMarkerPositions.push(boundaryMarker);
      boundaryMarkerPositions.push(boundaryMarker);
    }

    currentTimeOffset += bufferDuration;
    totalLength += buffer.length;
  }

  // Handle truncation if needed
  const maxLengthInSamples = maxDuration
    ? Math.floor(maxDuration * targetSampleRate)
    : totalLength;

  if (shouldTruncate && maxDuration && totalLength > maxLengthInSamples) {
    totalLength = maxLengthInSamples;
    console.log(`Truncating appended audio to ${maxDuration} seconds`);
  }

  // Determine the number of channels (use the maximum from all buffers)
  const numberOfChannels = Math.max(
    existingBuffer.numberOfChannels,
    ...newBuffers.map((buffer) => buffer.numberOfChannels),
  );

  // Create the concatenated buffer
  const audioContext = new (window.AudioContext ||
    (
      window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext)();
  const concatenatedBuffer = audioContext.createBuffer(
    numberOfChannels,
    totalLength,
    targetSampleRate,
  );

  // Copy audio data
  let currentOffset = 0;

  // Copy existing audio first
  const existingCopyLength = Math.min(
    existingBuffer.length,
    totalLength - currentOffset,
  );
  copyAudioData(
    existingBuffer,
    concatenatedBuffer,
    0,
    currentOffset,
    existingCopyLength,
  );
  currentOffset += existingCopyLength;

  // Copy new audio files
  for (const buffer of newBuffers) {
    const copyLength =
      shouldTruncate && maxDuration
        ? Math.min(buffer.length, totalLength - currentOffset)
        : buffer.length;

    // Use utility function to copy audio data
    copyAudioData(buffer, concatenatedBuffer, 0, currentOffset, copyLength);

    currentOffset += copyLength;
  }

  // Remove duplicate markers and sort
  const uniqueSortedMarkers = deduplicateAndSortMarkers(
    spliceMarkerPositions,
  ).filter((marker) => {
    const maxTime = concatenatedBuffer.length / concatenatedBuffer.sampleRate;
    return marker >= 0 && marker < maxTime;
  });

  const totalDuration =
    concatenatedBuffer.length / concatenatedBuffer.sampleRate;

  return {
    concatenatedBuffer,
    spliceMarkerPositions: uniqueSortedMarkers,
    boundaryMarkerPositions: boundaryMarkerPositions
      .filter((marker) => {
        const maxTime =
          concatenatedBuffer.length / concatenatedBuffer.sampleRate;
        return marker >= 0 && marker < maxTime;
      })
      .sort((a, b) => a - b),
    totalDuration,
  };
};

/**
 * Truncate a concatenation result to a maximum duration
 */
export const truncateConcatenationResult = async (
  result: ConcatenationResult,
  maxDuration: number,
): Promise<ConcatenationResult> => {
  const { concatenatedBuffer, spliceMarkerPositions, boundaryMarkerPositions } =
    result;

  const originalDuration =
    concatenatedBuffer.length / concatenatedBuffer.sampleRate;

  if (originalDuration <= maxDuration) {
    // No truncation needed
    return result;
  }

  concatenationLogger.debug(
    `Truncating concatenated audio from ${originalDuration}s to ${maxDuration}s`,
  );

  // Calculate truncated buffer length
  const sampleRate = concatenatedBuffer.sampleRate;
  const numberOfChannels = concatenatedBuffer.numberOfChannels;
  const truncatedLength = Math.floor(maxDuration * sampleRate);

  // Create truncated buffer
  const audioContext = new (window.AudioContext ||
    (
      window as Window &
        typeof globalThis & {
          webkitAudioContext?: typeof AudioContext;
        }
    ).webkitAudioContext)();
  const truncatedBuffer = audioContext.createBuffer(
    numberOfChannels,
    truncatedLength,
    sampleRate,
  );

  // Copy audio data using utility function
  copyAudioData(concatenatedBuffer, truncatedBuffer, 0, 0, truncatedLength);

  // Filter markers to only include those within the truncated duration
  const truncatedSpliceMarkers = spliceMarkerPositions.filter(
    (marker) => marker <= maxDuration,
  );
  const truncatedBoundaryMarkers = boundaryMarkerPositions.filter(
    (marker) => marker <= maxDuration,
  );

  concatenationLogger.markerOperation(
    "Filtered markers after truncation",
    truncatedSpliceMarkers.length,
    `(from ${spliceMarkerPositions.length})`,
  );

  return {
    concatenatedBuffer: truncatedBuffer,
    spliceMarkerPositions: truncatedSpliceMarkers,
    boundaryMarkerPositions: truncatedBoundaryMarkers,
    totalDuration: maxDuration,
  };
};

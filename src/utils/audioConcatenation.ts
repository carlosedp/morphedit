// Audio concatenation utilities for handling multiple files

export interface ConcatenationResult {
  concatenatedBuffer: AudioBuffer;
  spliceMarkerPositions: number[];
  totalDuration: number;
}

/**
 * Get the duration of multiple audio files
 */
export const getMultipleAudioFilesDuration = async (
  files: File[]
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
  files: File[]
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
          cuePoints
        );
      }
    } catch (error) {
      console.warn(
        `Could not extract cue points from file ${i} (${file.name}):`,
        error
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
  maxDuration?: number
): Promise<ConcatenationResult> => {
  if (files.length === 0) {
    throw new Error("No files provided for concatenation");
  }

  // Decode all audio files and extract their cue points
  const { buffers, allCuePoints } = await decodeAudioFilesWithCuePoints(files);

  // Ensure all buffers have the same sample rate
  const targetSampleRate = buffers[0].sampleRate;
  const mismatchedSampleRates = buffers.some(
    (buffer) => buffer.sampleRate !== targetSampleRate
  );

  if (mismatchedSampleRates) {
    console.warn(
      "Sample rate mismatch detected. All files should have the same sample rate for best results."
    );
  }

  // Calculate total length and collect all splice marker positions
  let totalLength = 0;
  const spliceMarkerPositions: number[] = [];
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
      console.log(
        `Added ${fileCuePoints.cuePoints.length} existing cue points from file ${i}`
      );
    }

    // Add splice marker at the beginning of each new file (except the first)
    if (i > 0) {
      spliceMarkerPositions.push(currentTimeOffset);
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
        (pos) => pos < truncatedDuration
      );
      spliceMarkerPositions.length = 0;
      spliceMarkerPositions.push(...filteredMarkers);
    }
  }

  // Sort and deduplicate splice markers
  const uniqueSortedMarkers = [...new Set(spliceMarkerPositions)].sort(
    (a, b) => a - b
  );
  console.log(
    `Total splice markers after concatenation: ${uniqueSortedMarkers.length}`
  );
  console.log("Splice marker positions:", uniqueSortedMarkers);

  // Create the concatenated buffer
  const audioContext = new (window.AudioContext ||
    (
      window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext)();

  const numberOfChannels = Math.max(
    ...buffers.map((buffer) => buffer.numberOfChannels)
  );
  const concatenatedBuffer = audioContext.createBuffer(
    numberOfChannels,
    totalLength,
    targetSampleRate
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

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sourceData =
        buffer.numberOfChannels > channel
          ? buffer.getChannelData(channel)
          : new Float32Array(buffer.length); // Silent channel if source doesn't have it

      const destData = concatenatedBuffer.getChannelData(channel);

      for (let i = 0; i < copyLength; i++) {
        destData[currentOffset + i] = sourceData[i];
      }
    }

    currentOffset += copyLength;
  }

  const totalDuration =
    concatenatedBuffer.length / concatenatedBuffer.sampleRate;

  return {
    concatenatedBuffer,
    spliceMarkerPositions: uniqueSortedMarkers,
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
  cuePoints: number[] = []
): Promise<Blob> => {
  // Import the audioBufferToWavWithCues function
  const { audioBufferToWavWithCues } = await import("./audioProcessing");

  const wavArrayBuffer = audioBufferToWavWithCues(buffer, cuePoints);
  return new Blob([wavArrayBuffer], { type: "audio/wav" });
};

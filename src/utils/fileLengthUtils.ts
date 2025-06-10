// File length detection utilities

export const MORPHAGENE_MAX_DURATION = 174; // seconds

/**
 * Get the duration of an audio file without fully loading it
 * Uses a temporary Audio element to quickly detect duration
 */
export const getAudioFileDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
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
};

/**
 * Check if an audio file exceeds the Morphagene maximum duration
 */
export const isFileTooLong = (duration: number): boolean => {
  return duration > MORPHAGENE_MAX_DURATION;
};

/**
 * Truncate an audio buffer to the specified duration
 */
export const truncateAudioBuffer = (
  buffer: AudioBuffer,
  maxDuration: number,
): AudioBuffer => {
  const sampleRate = buffer.sampleRate;
  const maxSamples = Math.floor(maxDuration * sampleRate);

  if (buffer.length <= maxSamples) {
    return buffer; // No truncation needed
  }

  const audioContext = new (window.AudioContext ||
    (
      window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext)();
  const truncatedBuffer = audioContext.createBuffer(
    buffer.numberOfChannels,
    maxSamples,
    sampleRate,
  );

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const originalData = buffer.getChannelData(channel);
    const truncatedData = truncatedBuffer.getChannelData(channel);

    for (let i = 0; i < maxSamples; i++) {
      truncatedData[i] = originalData[i];
    }
  }

  return truncatedBuffer;
};

/**
 * Convert seconds to MM:SS format
 */
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

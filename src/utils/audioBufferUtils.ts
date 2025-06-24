// Audio buffer manipulation utilities to reduce code duplication

// Copy audio data from source buffer to destination buffer
export const copyAudioData = (
  sourceBuffer: AudioBuffer,
  destBuffer: AudioBuffer,
  sourceOffset: number = 0,
  destOffset: number = 0,
  length?: number
): void => {
  const copyLength =
    length ??
    Math.min(
      sourceBuffer.length - sourceOffset,
      destBuffer.length - destOffset
    );

  const numberOfChannels = Math.min(
    sourceBuffer.numberOfChannels,
    destBuffer.numberOfChannels
  );

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const sourceData = sourceBuffer.getChannelData(channel);
    const destData = destBuffer.getChannelData(channel);

    for (let i = 0; i < copyLength; i++) {
      if (
        destOffset + i < destData.length &&
        sourceOffset + i < sourceData.length
      ) {
        destData[destOffset + i] = sourceData[sourceOffset + i];
      }
    }
  }
};

// Copy audio data to a Float32Array for WAV export
export const copyAudioToFloat32Array = (
  buffer: AudioBuffer,
  outputArray: Float32Array,
  outputOffset: number = 0
): void => {
  const numberOfChannels = buffer.numberOfChannels;
  const frameCount = buffer.length;

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);

    for (let i = 0; i < frameCount; i++) {
      const outputIndex = outputOffset + i * numberOfChannels + channel;
      if (outputIndex < outputArray.length) {
        outputArray[outputIndex] = channelData[i];
      }
    }
  }
};

// Create a buffer with silence (for padding)
export const createSilentBuffer = (
  audioContext: AudioContext,
  numberOfChannels: number,
  length: number,
  sampleRate: number
): AudioBuffer => {
  const buffer = audioContext.createBuffer(
    numberOfChannels,
    length,
    sampleRate
  );

  // Data is already initialized to zeros, so we don't need to explicitly set silence
  return buffer;
};

// Mix multiple buffers into one (simple addition)
export const mixAudioBuffers = (
  audioContext: AudioContext,
  buffers: AudioBuffer[],
  weights?: number[]
): AudioBuffer => {
  if (buffers.length === 0) {
    throw new Error('Cannot mix empty buffer array');
  }

  const maxLength = Math.max(...buffers.map((b) => b.length));
  const maxChannels = Math.max(...buffers.map((b) => b.numberOfChannels));
  const sampleRate = buffers[0].sampleRate;

  const mixedBuffer = audioContext.createBuffer(
    maxChannels,
    maxLength,
    sampleRate
  );

  for (let channel = 0; channel < maxChannels; channel++) {
    const mixedData = mixedBuffer.getChannelData(channel);

    buffers.forEach((buffer, bufferIndex) => {
      if (buffer.numberOfChannels > channel) {
        const sourceData = buffer.getChannelData(channel);
        const weight = weights?.[bufferIndex] ?? 1.0;

        for (let i = 0; i < sourceData.length && i < mixedData.length; i++) {
          mixedData[i] += sourceData[i] * weight;
        }
      }
    });
  }

  return mixedBuffer;
};

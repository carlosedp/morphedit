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

// Test utilities for audio processing
export const createMockAudioBuffer = (
  length = 44100,
  sampleRate = 44100,
  numberOfChannels = 2
): AudioBuffer => {
  // Create separate channel data arrays
  const channels: Float32Array[] = [];
  for (let i = 0; i < numberOfChannels; i++) {
    const channelData = new Float32Array(length);
    // Fill with some test data (sine wave at different frequencies per channel)
    for (let j = 0; j < length; j++) {
      channelData[j] =
        Math.sin((2 * Math.PI * (440 + i * 220) * j) / sampleRate) * 0.5;
    }
    channels.push(channelData);
  }

  const mockBuffer = {
    length,
    sampleRate,
    numberOfChannels,
    duration: length / sampleRate,
    getChannelData: (channel: number) =>
      channels[channel] || new Float32Array(length),
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as AudioBuffer;

  return mockBuffer;
};

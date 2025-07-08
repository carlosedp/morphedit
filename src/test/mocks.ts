// Test utilities for audio processing
export const createMockAudioBuffer = (
  length = 44100,
  sampleRate = 44100,
  numberOfChannels = 2
): AudioBuffer => {
  const mockBuffer = {
    length,
    sampleRate,
    numberOfChannels,
    duration: length / sampleRate,
    getChannelData: () => new Float32Array(length),
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as AudioBuffer;

  return mockBuffer;
};

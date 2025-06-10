// Export format configuration and handlers

export interface ExportFormat {
  label: string;
  sampleRate: number;
  bitDepth: 16 | 32;
  channels: "stereo" | "mono";
  format: "int" | "float";
}

// Available export formats
export const exportFormats: ExportFormat[] = [
  {
    label: "48kHz 32-bit Float Stereo",
    sampleRate: 48000,
    bitDepth: 32,
    channels: "stereo",
    format: "float",
  },
  {
    label: "44.1kHz 32-bit Float Stereo",
    sampleRate: 44100,
    bitDepth: 32,
    channels: "stereo",
    format: "float",
  },
  {
    label: "48kHz 16-bit Stereo",
    sampleRate: 48000,
    bitDepth: 16,
    channels: "stereo",
    format: "int",
  },
  {
    label: "44.1kHz 16-bit Stereo",
    sampleRate: 44100,
    bitDepth: 16,
    channels: "stereo",
    format: "int",
  },
  {
    label: "44.1kHz 16-bit Mono",
    sampleRate: 44100,
    bitDepth: 16,
    channels: "mono",
    format: "int",
  },
  {
    label: "22.05kHz 16-bit Mono",
    sampleRate: 22050,
    bitDepth: 16,
    channels: "mono",
    format: "int",
  },
];

// Helper function to convert AudioBuffer to WAV with specific format options
export const audioBufferToWavFormat = (
  buffer: AudioBuffer,
  format: ExportFormat,
  spliceMarkersStore: number[]
): ArrayBuffer => {
  const originalSampleRate = buffer.sampleRate;
  const originalChannels = buffer.numberOfChannels;
  let processedBuffer = buffer;

  // Handle sample rate conversion
  if (originalSampleRate !== format.sampleRate) {
    const audioContext = new (window.AudioContext ||
      (
        window as Window &
          typeof globalThis & { webkitAudioContext?: typeof AudioContext }
      ).webkitAudioContext)();
    const resampleRatio = format.sampleRate / originalSampleRate;
    const newLength = Math.round(buffer.length * resampleRatio);

    processedBuffer = audioContext.createBuffer(
      originalChannels,
      newLength,
      format.sampleRate
    );

    for (let channel = 0; channel < originalChannels; channel++) {
      const originalData = buffer.getChannelData(channel);
      const newData = processedBuffer.getChannelData(channel);

      // Simple linear interpolation resampling
      for (let i = 0; i < newLength; i++) {
        const originalIndex = i / resampleRatio;
        const index = Math.floor(originalIndex);
        const fraction = originalIndex - index;

        if (index < originalData.length - 1) {
          newData[i] =
            originalData[index] * (1 - fraction) +
            originalData[index + 1] * fraction;
        } else if (index < originalData.length) {
          newData[i] = originalData[index];
        } else {
          newData[i] = 0;
        }
      }
    }
  }

  // Handle channel conversion (stereo to mono if needed)
  let finalBuffer = processedBuffer;
  const targetChannels =
    format.channels === "mono"
      ? 1
      : Math.min(processedBuffer.numberOfChannels, 2);

  if (format.channels === "mono" && processedBuffer.numberOfChannels > 1) {
    const audioContext = new (window.AudioContext ||
      (
        window as Window &
          typeof globalThis & { webkitAudioContext?: typeof AudioContext }
      ).webkitAudioContext)();
    finalBuffer = audioContext.createBuffer(
      1,
      processedBuffer.length,
      format.sampleRate
    );

    const monoData = finalBuffer.getChannelData(0);
    const leftData = processedBuffer.getChannelData(0);
    const rightData =
      processedBuffer.numberOfChannels > 1
        ? processedBuffer.getChannelData(1)
        : leftData;

    // Mix down to mono by averaging left and right channels
    for (let i = 0; i < processedBuffer.length; i++) {
      monoData[i] = (leftData[i] + rightData[i]) * 0.5;
    }
  }

  // Now convert to WAV format with the specified bit depth
  const length = finalBuffer.length;
  const numberOfChannels = targetChannels;
  const sampleRate = format.sampleRate;
  const bitsPerSample = format.bitDepth;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;

  // Calculate cue chunk size if we have splice markers
  const hasCues = spliceMarkersStore.length > 0;
  const cueChunkSize = hasCues ? 12 + spliceMarkersStore.length * 24 : 0;
  const bufferSize = 44 + dataSize + cueChunkSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format.format === "float" ? 3 : 1, true); // 3 for float, 1 for int
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Convert samples based on format
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelIndex = Math.min(channel, finalBuffer.numberOfChannels - 1);
      const sample = finalBuffer.getChannelData(channelIndex)[i];

      if (format.format === "float" && format.bitDepth === 32) {
        view.setFloat32(offset, sample, true);
        offset += 4;
      } else if (format.bitDepth === 16) {
        const intSample = Math.max(-1, Math.min(1, sample)) * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
  }

  // Add cue points if any
  if (hasCues) {
    writeString(offset, "cue ");
    offset += 4;
    view.setUint32(offset, cueChunkSize - 8, true);
    offset += 4;
    view.setUint32(offset, spliceMarkersStore.length, true);
    offset += 4;

    // Convert splice marker times to sample positions in the exported format
    for (let i = 0; i < spliceMarkersStore.length; i++) {
      const cueTime = spliceMarkersStore[i];
      const resampleRatio = format.sampleRate / originalSampleRate;
      const cueSample = Math.floor(
        cueTime * originalSampleRate * resampleRatio
      );

      view.setUint32(offset, i, true); // Cue point ID
      view.setUint32(offset + 4, cueSample, true); // Play order position
      writeString(offset + 8, "data"); // Data chunk ID
      view.setUint32(offset + 12, 0, true); // Chunk start
      view.setUint32(offset + 16, 0, true); // Block start
      view.setUint32(offset + 20, cueSample, true); // Sample offset
      offset += 24;
    }
  }

  return arrayBuffer;
};

// Export handlers
export const downloadWav = (
  arrayBuffer: ArrayBuffer,
  filename: string = "morphedit-export.wav"
) => {
  const blob = new Blob([arrayBuffer], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

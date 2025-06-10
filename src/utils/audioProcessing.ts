// Audio processing utilities for WAV conversion and cue point parsing

// Helper function to convert AudioBuffer to WAV with cue points
export const audioBufferToWavWithCues = (
  buffer: AudioBuffer,
  cuePoints: number[],
): ArrayBuffer => {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;

  // Calculate cue chunk size if we have cue points
  const hasCues = cuePoints.length > 0;
  const cueChunkSize = hasCues ? 12 + cuePoints.length * 24 : 0; // 'cue ' + size + count + (24 bytes per cue point)
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
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Convert float samples to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i];
      const intSample = Math.max(-1, Math.min(1, sample)) * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  // Add cue points if any
  if (hasCues) {
    writeString(offset, "cue ");
    offset += 4;
    view.setUint32(offset, cueChunkSize - 8, true); // Size of cue chunk minus 'cue ' and size fields
    offset += 4;
    view.setUint32(offset, cuePoints.length, true); // Number of cue points
    offset += 4;

    // Write each cue point
    for (let i = 0; i < cuePoints.length; i++) {
      const cueTime = cuePoints[i];
      const cueSample = Math.floor(cueTime * sampleRate);

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

// Helper function to parse WAV file for existing cue points
export const parseWavCuePoints = async (
  audioUrl: string,
): Promise<number[]> => {
  try {
    console.log("Parsing WAV file for cue points:", audioUrl);
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const view = new DataView(arrayBuffer);

    // Check if it's a valid WAV file
    const riffHeader = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3),
    );
    const waveHeader = String.fromCharCode(
      view.getUint8(8),
      view.getUint8(9),
      view.getUint8(10),
      view.getUint8(11),
    );

    if (riffHeader !== "RIFF" || waveHeader !== "WAVE") {
      console.log("Not a valid WAV file");
      return [];
    }

    const cuePoints: number[] = [];
    let offset = 12; // Start after RIFF header and WAVE format
    let sampleRate = 44100; // Default sample rate

    // Parse chunks to find fmt and cue chunks
    while (offset < arrayBuffer.byteLength - 8) {
      const chunkId = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3),
      );
      const chunkSize = view.getUint32(offset + 4, true);

      console.log(`Found chunk: ${chunkId}, size: ${chunkSize}`);

      if (chunkId === "fmt ") {
        // Read sample rate from fmt chunk
        sampleRate = view.getUint32(offset + 12, true);
        console.log("Sample rate:", sampleRate);
      } else if (chunkId === "cue ") {
        // Parse cue chunk
        const numCuePoints = view.getUint32(offset + 8, true);
        console.log("Number of cue points:", numCuePoints);

        let cueOffset = offset + 12; // Start after chunk header and cue count

        for (let i = 0; i < numCuePoints; i++) {
          const cueId = view.getUint32(cueOffset, true); // Cue point ID
          const playOrder = view.getUint32(cueOffset + 4, true); // Play order position
          const sampleOffset = view.getUint32(cueOffset + 20, true); // Sample offset is at byte 20

          // Convert sample offset to time in seconds
          const timeInSeconds = sampleOffset / sampleRate;
          cuePoints.push(timeInSeconds);

          console.log(
            `Cue point ${i}: ID=${cueId}, PlayOrder=${playOrder}, Sample=${sampleOffset}, Time=${timeInSeconds}s`,
          );
          cueOffset += 24;
        }
      }

      // Move to next chunk
      offset += 8 + chunkSize;
      // Ensure even byte alignment
      if (chunkSize % 2 === 1) {
        offset += 1;
      }
    }

    console.log("Parsed cue points:", cuePoints);
    return cuePoints.sort((a, b) => a - b);
  } catch (error) {
    console.error("Error parsing WAV cue points:", error);
    return [];
  }
};

// Helper function to format time for display
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
};

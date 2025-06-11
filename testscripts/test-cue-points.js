// Test script to create a WAV file with cue points for testing
// This script can be run in the browser console to test cue point functionality

// Function to create a simple test WAV file with cue points
function createTestWavWithCuePoints() {
  // Create a simple audio buffer (1 second of 440Hz sine wave)
  const sampleRate = 44100;
  const duration = 1; // 1 second
  const frequency = 440; // A4
  const length = sampleRate * duration;

  // Create audio buffer
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const channelData = buffer.getChannelData(0);

  // Generate sine wave
  for (let i = 0; i < length; i++) {
    channelData[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.3;
  }

  // Convert to WAV with cue points
  const cuePoints = [0.25, 0.5, 0.75]; // Cue points at 0.25s, 0.5s, 0.75s
  const wavData = audioBufferToWavWithCues(buffer, cuePoints);

  // Create blob and download
  const blob = new Blob([wavData], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);

  // Create download link
  const a = document.createElement("a");
  a.href = url;
  a.download = "test-with-cue-points.wav";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log("Test WAV file with cue points created and downloaded");
  return url;
}

// Helper function to convert AudioBuffer to WAV with cue points (simplified version)
function audioBufferToWavWithCues(buffer, cuePoints) {
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
  const cueChunkSize = hasCues ? 12 + cuePoints.length * 24 : 0;
  const bufferSize = 44 + dataSize + cueChunkSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // Helper function to write string to buffer
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // WAV header
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
    view.setUint32(offset, cueChunkSize - 8, true);
    offset += 4;
    view.setUint32(offset, cuePoints.length, true);
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
}

console.log(
  "Test function loaded. Run createTestWavWithCuePoints() to create a test file.",
);

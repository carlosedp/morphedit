// Audio normalization utilities for peak normalization

import type WaveSurfer from 'wavesurfer.js';

import { useAudioStore } from '../audioStore';
import { audioBufferToWavWithCues } from './audioProcessing';

/**
 * Find the peak amplitude in an AudioBuffer
 */
export const findPeakAmplitude = (audioBuffer: AudioBuffer): number => {
  let peak = 0;

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);

    for (let i = 0; i < channelData.length; i++) {
      const absoluteValue = Math.abs(channelData[i]);
      if (absoluteValue > peak) {
        peak = absoluteValue;
      }
    }
  }

  return peak;
};

/**
 * Normalize audio to a target peak level (in dB)
 * @param audioBuffer - The audio buffer to normalize
 * @param targetPeakDb - Target peak level in dB (e.g., -1 for -1dB)
 * @returns Normalized audio buffer
 */
export const normalizeAudioBuffer = (
  audioBuffer: AudioBuffer,
  targetPeakDb: number = -1
): AudioBuffer => {
  // Find current peak amplitude
  const currentPeak = findPeakAmplitude(audioBuffer);

  // If audio is already silent or at very low levels, don't normalize
  if (currentPeak < 0.000001) {
    console.log('Audio is too quiet to normalize effectively');
    return audioBuffer;
  }

  // Convert target dB to linear scale
  // -1dB = 10^(-1/20) ≈ 0.8913
  const targetPeakLinear = Math.pow(10, targetPeakDb / 20);

  // Calculate gain needed
  const gain = targetPeakLinear / currentPeak;

  console.log(
    `Normalizing audio: current peak ${currentPeak.toFixed(
      4
    )}, target peak ${targetPeakLinear.toFixed(4)}, gain ${gain.toFixed(4)}`
  );

  // Create new normalized buffer
  const audioContext = new (window.AudioContext ||
    (
      window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext)();

  const normalizedBuffer = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  // Apply gain to all channels
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const inputData = audioBuffer.getChannelData(channel);
    const outputData = normalizedBuffer.getChannelData(channel);

    for (let i = 0; i < inputData.length; i++) {
      outputData[i] = inputData[i] * gain;
    }
  }

  return normalizedBuffer;
};

/**
 * Apply normalization to the current audio and reload it in WaveSurfer
 */
export const applyNormalization = async (
  ws: WaveSurfer,
  targetPeakDb: number = -1,
  currentAudioUrl: string | null,
  spliceMarkersStore: number[],
  lockedSpliceMarkersStore: number[],
  callbacks: {
    setPreviousAudioUrl: (url: string | null) => void;
    setCanUndo: (canUndo: boolean) => void;
    setAudioBuffer: (buffer: AudioBuffer) => void;
    setCurrentAudioUrl: (url: string | null) => void;
    setSpliceMarkersStore: (markers: number[]) => void;
    setPreviousSpliceMarkers: (markers: number[]) => void;
    setPreviousLockedSpliceMarkers: (markers: number[]) => void;
    resetZoom?: () => void;
    setResetZoom?: (zoom: number) => void;
  }
): Promise<void> => {
  // Get the audio buffer from the audio store
  const audioBuffer = useAudioStore.getState().audioBuffer;
  console.log(
    'applyNormalization - checking audio buffer in store:',
    !!audioBuffer
  );

  if (!audioBuffer) {
    console.log('No audio buffer found in store for normalization operation');
    return;
  }

  if (!ws.getDuration() || ws.getDuration() === 0) {
    console.log('Cannot normalize: no audio loaded or duration is 0');
    return;
  }

  console.log('Applying normalization...');
  console.log(
    'Current audio URL passed to applyNormalization:',
    currentAudioUrl
  );
  console.log('Audio buffer found:', audioBuffer.length, 'samples');
  console.log(
    'Audio buffer duration:',
    audioBuffer.length / audioBuffer.sampleRate,
    'seconds'
  );

  // Normalize the audio buffer
  const normalizedBuffer = normalizeAudioBuffer(audioBuffer, targetPeakDb);

  console.log('Normalization applied, converting to WAV...');

  // Convert to WAV blob and create new URL
  const wav = audioBufferToWavWithCues(normalizedBuffer, spliceMarkersStore);
  const blob = new Blob([wav], { type: 'audio/wav' });
  const newUrl = URL.createObjectURL(blob) + '#morphedit-normalized';

  console.log('Loading new normalized URL:', newUrl);
  console.log('Saving for undo - currentAudioUrl:', currentAudioUrl);

  // Save current audio URL and splice markers for undo before loading new one
  callbacks.setPreviousAudioUrl(currentAudioUrl);
  callbacks.setPreviousSpliceMarkers([...spliceMarkersStore]);
  callbacks.setPreviousLockedSpliceMarkers([...lockedSpliceMarkersStore]);
  callbacks.setCanUndo(true);

  // Set processing flag to prevent buffer overrides
  const store = useAudioStore.getState();
  store.setIsProcessingAudio(true);

  // Update splice markers store BEFORE loading to ensure ready event sees them
  callbacks.setSpliceMarkersStore([...spliceMarkersStore]);

  // Load the new normalized audio
  try {
    // Set the audio buffer BEFORE loading to ensure it's in the store
    console.log('Setting normalized buffer in store BEFORE WS load');
    callbacks.setAudioBuffer(normalizedBuffer);

    await ws.load(newUrl);
    console.log('Normalization applied successfully');
    console.log(
      'New audio duration after normalization:',
      ws.getDuration(),
      'seconds'
    );

    // Update the current audio URL to the new normalized version
    callbacks.setCurrentAudioUrl(newUrl);

    // Set the audio buffer AGAIN after loading to ensure it's correct
    console.log('Setting normalized buffer in store AFTER WS load');
    callbacks.setAudioBuffer(normalizedBuffer);
    console.log(
      'Updated audio buffer in store with normalized version - duration:',
      normalizedBuffer.length / normalizedBuffer.sampleRate,
      'seconds'
    );

    // Reset the stored resetZoom value to force recalculation for new duration
    console.log('Resetting zoom after normalization for proper display');
    if (callbacks.setResetZoom) {
      callbacks.setResetZoom(2); // Reset to default value to force recalculation
      console.log(
        'Reset stored resetZoom value to force recalculation after normalization'
      );
    }

    // Clear processing flag
    console.log('Clearing processing flag (success)');
    store.setIsProcessingAudio(false);

    // Apply zoom reset after a brief delay to ensure everything is loaded
    if (callbacks.resetZoom) {
      setTimeout(() => {
        console.log('Applying zoom reset after normalization');
        callbacks.resetZoom!();
      }, 150);
    }
  } catch (error) {
    console.error('Error loading normalized audio:', error);
    // Clear processing flag on error too
    console.log('Clearing processing flag (error)');
    store.setIsProcessingAudio(false);
  }
};

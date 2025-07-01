// Audio reversal utilities for reversing audio buffers

import type WaveSurfer from 'wavesurfer.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { useAudioStore } from '../audioStore';
import { audioBufferToWavWithCues } from './audioProcessing';

/**
 * Reverse an AudioBuffer either entirely or within a specific region
 * @param audioBuffer - The audio buffer to reverse
 * @param cropRegion - Optional crop region to reverse only that portion
 * @returns Reversed audio buffer
 */
const reverseAudioBuffer = (
  audioBuffer: AudioBuffer,
  cropRegion?: { start: number; end: number }
): AudioBuffer => {
  const audioContext = new (window.AudioContext ||
    (
      window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext)();

  const reversedBuffer = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  const sampleRate = audioBuffer.sampleRate;

  // Calculate the region to reverse
  let startSample = 0;
  let endSample = audioBuffer.length;

  if (cropRegion) {
    startSample = Math.floor(cropRegion.start * sampleRate);
    endSample = Math.floor(cropRegion.end * sampleRate);
    startSample = Math.max(0, startSample);
    endSample = Math.min(audioBuffer.length, endSample);
  }

  console.log(`Reversing audio from sample ${startSample} to ${endSample}`);

  // Process each channel
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const inputData = audioBuffer.getChannelData(channel);
    const outputData = reversedBuffer.getChannelData(channel);

    // Copy original data first
    for (let i = 0; i < audioBuffer.length; i++) {
      outputData[i] = inputData[i];
    }

    // Reverse only the specified region
    for (let i = startSample; i < endSample; i++) {
      const reverseIndex = endSample - 1 - (i - startSample);
      outputData[i] = inputData[reverseIndex];
    }
  }

  return reversedBuffer;
};

/**
 * Apply audio reversal to the current audio and reload it in WaveSurfer
 */
export const applyReversal = async (
  ws: WaveSurfer,
  regions: RegionsPlugin,
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
  }
): Promise<void> => {
  // Get the audio buffer from the audio store
  const audioBuffer = useAudioStore.getState().audioBuffer;
  console.log('applyReversal - checking audio buffer in store:', !!audioBuffer);

  if (!audioBuffer) {
    console.log('No audio buffer found in store for reversal operation');
    return;
  }

  if (!ws.getDuration() || ws.getDuration() === 0) {
    console.log('Cannot reverse: no audio loaded or duration is 0');
    return;
  }

  console.log('Applying audio reversal...');
  console.log('Current audio URL passed to applyReversal:', currentAudioUrl);
  console.log('Audio buffer found:', audioBuffer.length, 'samples');
  console.log(
    'Audio buffer duration:',
    audioBuffer.length / audioBuffer.sampleRate,
    'seconds'
  );

  // Check if there's an active crop/loop region
  const cropRegion = regions
    ?.getRegions()
    .find((r: Region) => r.id === 'crop-loop');
  let cropRegionData: { start: number; end: number } | undefined;

  if (cropRegion) {
    cropRegionData = {
      start: cropRegion.start,
      end: cropRegion.end,
    };
    console.log(
      `Reversing crop/loop region from ${cropRegionData.start}s to ${cropRegionData.end}s`
    );
  } else {
    console.log('Reversing entire audio');
  }

  // Reverse the audio buffer
  const reversedBuffer = reverseAudioBuffer(audioBuffer, cropRegionData);

  console.log('Reversal applied, converting to WAV...');

  // If we reversed a crop region, we need to adjust splice markers within that region
  let adjustedSpliceMarkers = [...spliceMarkersStore];
  let adjustedLockedMarkers = [...lockedSpliceMarkersStore];

  if (cropRegionData) {
    // Reverse splice markers within the crop region
    adjustedSpliceMarkers = spliceMarkersStore.map((marker) => {
      if (marker >= cropRegionData!.start && marker <= cropRegionData!.end) {
        // Reverse the marker position within the crop region
        const relativePosition = marker - cropRegionData!.start;
        const regionDuration = cropRegionData!.end - cropRegionData!.start;
        const reversedRelativePosition = regionDuration - relativePosition;
        return cropRegionData!.start + reversedRelativePosition;
      }
      return marker;
    });

    adjustedLockedMarkers = lockedSpliceMarkersStore.map((marker) => {
      if (marker >= cropRegionData!.start && marker <= cropRegionData!.end) {
        // Reverse the marker position within the crop region
        const relativePosition = marker - cropRegionData!.start;
        const regionDuration = cropRegionData!.end - cropRegionData!.start;
        const reversedRelativePosition = regionDuration - relativePosition;
        return cropRegionData!.start + reversedRelativePosition;
      }
      return marker;
    });
  } else {
    // Reverse all markers for full audio reversal
    const totalDuration = audioBuffer.length / audioBuffer.sampleRate;
    adjustedSpliceMarkers = spliceMarkersStore.map(
      (marker) => totalDuration - marker
    );
    adjustedLockedMarkers = lockedSpliceMarkersStore.map(
      (marker) => totalDuration - marker
    );
  }

  // Convert to WAV blob and create new URL
  const wav = audioBufferToWavWithCues(reversedBuffer, adjustedSpliceMarkers);
  const blob = new Blob([wav], { type: 'audio/wav' });
  const newUrl = URL.createObjectURL(blob) + '#morphedit-reversed';

  console.log('Loading new reversed URL:', newUrl);
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
  callbacks.setSpliceMarkersStore(adjustedSpliceMarkers);

  // Also update locked markers for the audio store context
  const { setLockedSpliceMarkers } = useAudioStore.getState();
  setLockedSpliceMarkers(adjustedLockedMarkers);

  // Load the new reversed audio
  try {
    // Set the audio buffer BEFORE loading to ensure it's in the store
    console.log('Setting reversed buffer in store BEFORE WS load');
    callbacks.setAudioBuffer(reversedBuffer);

    await ws.load(newUrl);
    console.log('Reversal applied successfully');
    console.log(
      'New audio duration after reversal:',
      ws.getDuration(),
      'seconds'
    );

    // Update the current audio URL to the new reversed version
    callbacks.setCurrentAudioUrl(newUrl);

    // Set the audio buffer AGAIN after loading to ensure it's correct
    console.log('Setting reversed buffer in store AFTER WS load');
    callbacks.setAudioBuffer(reversedBuffer);
    console.log(
      'Updated audio buffer in store with reversed version - duration:',
      reversedBuffer.length / reversedBuffer.sampleRate,
      'seconds'
    );

    // Clear processing flag
    console.log('Clearing processing flag (success)');
    store.setIsProcessingAudio(false);
  } catch (error) {
    console.error('Error loading reversed audio:', error);
    // Clear processing flag on error too
    console.log('Clearing processing flag (error)');
    store.setIsProcessingAudio(false);
  }
};

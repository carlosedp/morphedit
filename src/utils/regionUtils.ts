// Region utilities for crop, fade, and other region operations
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type WaveSurfer from 'wavesurfer.js';
import { audioBufferToWavWithCues } from './audioProcessing';
import { copyAudioData } from './audioBufferUtils';
import { regionLogger } from './logger';
import { getSpliceMarkerRegions } from './regionHelpers';
import { REGION_COLORS, REGION_POSITIONING } from '../constants';
import { useAudioStore } from '../audioStore';
import { findNearestZeroCrossing } from './transientDetection';
import { calculateFadeGain } from './fadeCurves';

// Type for region info display
export interface RegionInfo {
  cropRegion?: { start: number; end: number; duration: number };
  fadeInRegion?: { start: number; end: number; duration: number };
  fadeOutRegion?: { start: number; end: number; duration: number };
}

// Utility function to get current region information for display
export const getRegionInfo = (regions: RegionsPlugin | null): RegionInfo => {
  if (!regions) return {};

  const allRegions = regions.getRegions();
  const info: RegionInfo = {};

  // Find crop region
  const cropRegion = allRegions.find((r: Region) => r.id === 'crop-loop');
  if (cropRegion) {
    info.cropRegion = {
      start: cropRegion.start,
      end: cropRegion.end,
      duration: cropRegion.end - cropRegion.start,
    };
  }

  // Find fade-in region
  const fadeInRegion = allRegions.find((r: Region) => r.id === 'fade-in');
  if (fadeInRegion) {
    info.fadeInRegion = {
      start: fadeInRegion.start,
      end: fadeInRegion.end,
      duration: fadeInRegion.end - fadeInRegion.start,
    };
  }

  // Find fade-out region
  const fadeOutRegion = allRegions.find((r: Region) => r.id === 'fade-out');
  if (fadeOutRegion) {
    info.fadeOutRegion = {
      start: fadeOutRegion.start,
      end: fadeOutRegion.end,
      duration: fadeOutRegion.end - fadeOutRegion.start,
    };
  }

  return info;
};

export const createCropRegion = (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  setCropRegion: (region: Region | null) => void,
  setCropMode: (mode: boolean) => void
) => {
  if (!ws || !regions) return null;

  // Check if crop region already exists by looking for existing region
  const existingRegion = regions
    .getRegions()
    .find((r: Region) => r.id === 'crop-loop');

  if (!existingRegion) {
    // Create new crop region
    const duration = ws.getDuration();
    const region = regions.addRegion({
      start: duration * REGION_POSITIONING.DEFAULT_START_RATIO,
      end: duration * REGION_POSITIONING.DEFAULT_END_RATIO,
      color: REGION_COLORS.CROP_REGION,
      drag: true,
      resize: true,
      id: 'crop-loop',
    });
    setCropRegion(region);
    setCropMode(true);
    return region;
  } else {
    // Remove the existing crop-loop region
    existingRegion.remove();
    setCropRegion(null);
    setCropMode(false);
    return null;
  }
};

export const createFadeInRegion = (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  setFadeInMode: (mode: boolean) => void
) => {
  if (!ws || !regions) return null;

  // Check if fade-in region already exists
  const existingRegion = regions
    .getRegions()
    .find((r: Region) => r.id === 'fade-in');

  if (!existingRegion) {
    // Check if there's a crop region that should constrain the fade
    const cropRegion = regions
      .getRegions()
      .find((r: Region) => r.id === 'crop-loop');

    let fadeStart: number, fadeEnd: number;

    if (cropRegion) {
      // Create fade-in region within the crop region (first 10% of crop region duration)
      const cropDuration = cropRegion.end - cropRegion.start;
      fadeStart = cropRegion.start;
      fadeEnd = cropRegion.start + cropDuration * REGION_POSITIONING.FADE_RATIO;
    } else {
      // Create fade-in region for entire audio (first 10% of total duration)
      const duration = ws.getDuration();
      fadeStart = 0;
      fadeEnd = duration * REGION_POSITIONING.FADE_RATIO;
    }

    const region = regions.addRegion({
      start: fadeStart,
      end: fadeEnd,
      color: REGION_COLORS.FADE_IN,
      drag: true,
      resize: true,
      id: 'fade-in',
    });
    setFadeInMode(true);
    return region;
  } else {
    // Remove the existing fade-in region
    existingRegion.remove();
    setFadeInMode(false);
    return null;
  }
};

export const createFadeOutRegion = (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  setFadeOutMode: (mode: boolean) => void
) => {
  if (!ws || !regions) return null;

  // Check if fade-out region already exists
  const existingRegion = regions
    .getRegions()
    .find((r: Region) => r.id === 'fade-out');

  if (!existingRegion) {
    // Check if there's a crop region that should constrain the fade
    const cropRegion = regions
      .getRegions()
      .find((r: Region) => r.id === 'crop-loop');

    let fadeStart: number, fadeEnd: number;

    if (cropRegion) {
      // Create fade-out region within the crop region (last 10% of crop region duration)
      const cropDuration = cropRegion.end - cropRegion.start;
      fadeStart = cropRegion.end - cropDuration * REGION_POSITIONING.FADE_RATIO;
      fadeEnd = cropRegion.end;
    } else {
      // Create fade-out region for entire audio (last 10% of total duration)
      const duration = ws.getDuration();
      fadeStart = duration * (1 - REGION_POSITIONING.FADE_RATIO);
      fadeEnd = duration;
    }

    const region = regions.addRegion({
      start: fadeStart,
      end: fadeEnd,
      color: REGION_COLORS.FADE_OUT,
      drag: true,
      resize: true,
      id: 'fade-out',
    });
    setFadeOutMode(true);
    return region;
  } else {
    // Remove the existing fade-out region
    existingRegion.remove();
    setFadeOutMode(false);
    return null;
  }
};

export const applyCrop = async (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  cropRegion: Region | null,
  currentAudioUrl: string | null,
  spliceMarkersStore: number[],
  lockedSpliceMarkersStore: number[],
  callbacks: {
    setPreviousAudioUrl: (url: string | null) => void;
    setCanUndo: (canUndo: boolean) => void;
    setAudioBuffer: (buffer: AudioBuffer | null) => void;
    setCropMode: (mode: boolean) => void;
    setCropRegion: (region: Region | null) => void;
    setCurrentAudioUrl: (url: string | null) => void;
    setFadeInMode: (mode: boolean) => void;
    setFadeOutMode: (mode: boolean) => void;
    setSpliceMarkersStore: (markers: number[]) => void;
    setLockedSpliceMarkersStore: (markers: number[]) => void;
    setPreviousSpliceMarkers: (markers: number[]) => void;
    setPreviousLockedSpliceMarkers: (markers: number[]) => void;
    setZoom?: (zoom: number) => void;
  }
): Promise<void> => {
  if (!ws || !regions || !cropRegion) {
    console.log(
      'Cannot apply crop: missing wavesurfer, regions, or crop region'
    );
    return;
  }

  if (!ws.getDuration() || ws.getDuration() === 0) {
    regionLogger.warn('Cannot apply crop: no audio loaded or duration is 0');
    return;
  }

  regionLogger.debug('Applying crop...');

  const cropRegionData = regions
    .getRegions()
    .find((r: Region) => r.id === 'crop-loop');
  if (!cropRegionData) {
    console.log('No crop region found');
    return;
  }

  console.log('Crop region:', cropRegionData.start, 'to', cropRegionData.end);

  // Get the audio buffer from the audio store instead of wavesurfer backend
  const audioBuffer = useAudioStore.getState().audioBuffer;
  console.log('applyCrop - checking audio buffer in store:', !!audioBuffer);
  if (!audioBuffer) {
    console.log('No audio buffer found in store for crop operation');
    console.log('Current store state:', useAudioStore.getState());
    return;
  }

  console.log('Audio buffer found:', audioBuffer.length, 'samples');
  console.log(
    'Audio buffer duration:',
    audioBuffer.length / audioBuffer.sampleRate,
    'seconds'
  );
  console.log(
    'Current audio duration from wavesurfer:',
    ws.getDuration(),
    'seconds'
  );

  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;

  // Snap crop boundaries to nearest zero crossings to avoid audio artifacts
  const adjustedStartTime = findNearestZeroCrossing(
    audioBuffer,
    cropRegionData.start
  );
  const adjustedEndTime = findNearestZeroCrossing(
    audioBuffer,
    cropRegionData.end
  );

  const startSample = Math.floor(adjustedStartTime * sampleRate);
  const endSample = Math.floor(adjustedEndTime * sampleRate);
  const newLength = endSample - startSample;

  console.log(
    'Zero-crossing adjusted crop region:',
    `${cropRegionData.start} -> ${adjustedStartTime}`,
    `to ${cropRegionData.end} -> ${adjustedEndTime}`
  );

  console.log(
    'Cropping from sample',
    startSample,
    'to',
    endSample,
    'new length:',
    newLength
  );

  // Create new audio buffer with cropped data
  const audioContext = new (window.AudioContext ||
    (
      window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext)();
  const newBuffer = audioContext.createBuffer(
    numberOfChannels,
    newLength,
    sampleRate
  );

  // Use utility function to copy the cropped portion
  copyAudioData(audioBuffer, newBuffer, startSample, 0, newLength);

  regionLogger.processingState('New buffer created, converting to WAV');

  // Get current splice markers from store
  regionLogger.debug('Current splice markers from store:', spliceMarkersStore);
  regionLogger.debug(
    'Current locked splice markers from store:',
    lockedSpliceMarkersStore
  );

  // Also check visual markers for comparison
  const visualSpliceMarkers = getSpliceMarkerRegions(regions);
  console.log('Visual splice markers count:', visualSpliceMarkers.length);

  // Filter and adjust splice markers to only include those within the cropped region
  const filteredSpliceMarkers = spliceMarkersStore.filter(
    (markerTime) =>
      markerTime >= adjustedStartTime && markerTime <= adjustedEndTime
  );

  // Filter and adjust locked splice markers to only include those within the cropped region
  const filteredLockedSpliceMarkers = lockedSpliceMarkersStore.filter(
    (markerTime) =>
      markerTime >= adjustedStartTime && markerTime <= adjustedEndTime
  );

  // Adjust marker times relative to the new start time (subtract crop start)
  const adjustedSpliceMarkers = filteredSpliceMarkers.map(
    (markerTime) => markerTime - adjustedStartTime
  );

  // Adjust locked marker times relative to the new start time (subtract crop start)
  const adjustedLockedSpliceMarkers = filteredLockedSpliceMarkers.map(
    (markerTime) => markerTime - adjustedStartTime
  );

  console.log('=== CROP MARKER ADJUSTMENT DEBUG ===');
  console.log(
    'Original crop region:',
    cropRegionData.start,
    'to',
    cropRegionData.end
  );
  console.log(
    'Zero-crossing adjusted crop region:',
    adjustedStartTime,
    'to',
    adjustedEndTime
  );
  console.log('Original splice markers:', spliceMarkersStore);
  console.log('Filtered splice markers (within crop):', filteredSpliceMarkers);
  console.log(
    'Adjusted splice markers (relative to crop start):',
    adjustedSpliceMarkers
  );
  console.log('Original locked markers:', lockedSpliceMarkersStore);
  console.log(
    'Filtered locked markers (within crop):',
    filteredLockedSpliceMarkers
  );
  console.log(
    'Adjusted locked markers (relative to crop start):',
    adjustedLockedSpliceMarkers
  );
  console.log('=== END CROP MARKER DEBUG ===');

  console.log(
    `Crop markers: ${spliceMarkersStore.length} -> ${filteredSpliceMarkers.length} (filtered) -> ${adjustedSpliceMarkers.length} (adjusted)`
  );
  console.log(
    `Crop locked markers: ${lockedSpliceMarkersStore.length} -> ${filteredLockedSpliceMarkers.length} (filtered) -> ${adjustedLockedSpliceMarkers.length} (adjusted)`
  );

  // Convert to WAV blob and create new URL
  const wav = audioBufferToWavWithCues(newBuffer, adjustedSpliceMarkers);
  const blob = new Blob([wav], { type: 'audio/wav' });

  // Preserve existing URL flags and add cropped flag
  let newUrl = URL.createObjectURL(blob);
  if (currentAudioUrl?.includes('#morphedit-concatenated')) {
    newUrl += '#morphedit-concatenated#morphedit-cropped';
  } else {
    newUrl += '#morphedit-cropped';
  }

  console.log('Loading cropped audio...');

  // Set processing flag to prevent buffer overrides
  const store = useAudioStore.getState();
  store.setIsProcessingAudio(true);

  // Update splice markers store with filtered and adjusted markers BEFORE loading
  // This ensures the ready event sees the correct markers
  console.log('Updating store with adjusted markers before loading');
  callbacks.setSpliceMarkersStore(adjustedSpliceMarkers);
  callbacks.setLockedSpliceMarkersStore(adjustedLockedSpliceMarkers);
  console.log(
    `Updated splice markers store: ${adjustedSpliceMarkers.length} markers for cropped audio`
  );
  console.log(
    `Updated locked splice markers store: ${adjustedLockedSpliceMarkers.length} locked markers for cropped audio`
  );

  // Save current audio URL and splice markers for undo before loading new one
  callbacks.setPreviousAudioUrl(currentAudioUrl);
  callbacks.setPreviousSpliceMarkers([...spliceMarkersStore]);
  callbacks.setPreviousLockedSpliceMarkers([...lockedSpliceMarkersStore]);
  callbacks.setCanUndo(true);

  // Load the new cropped audio
  try {
    // Set the audio buffer BEFORE loading to ensure it's in the store
    console.log('CROP DEBUG - Setting cropped buffer in store BEFORE WS load');
    callbacks.setAudioBuffer(newBuffer);

    await ws.load(newUrl);
    console.log('Crop applied successfully');
    console.log(
      'CROP DEBUG - New buffer details:',
      `Duration: ${newBuffer.length / newBuffer.sampleRate}s`,
      `Length: ${newBuffer.length} samples`,
      `Sample rate: ${newBuffer.sampleRate}Hz`
    );
    console.log(
      'CROP DEBUG - WaveSurfer duration after load:',
      ws.getDuration()
    );

    // Update the current audio URL to the new cropped version
    callbacks.setCurrentAudioUrl(newUrl);

    // Set the audio buffer AGAIN after loading to ensure it's correct
    console.log('CROP DEBUG - Setting cropped buffer in store AFTER WS load');
    callbacks.setAudioBuffer(newBuffer);
    console.log('Updated audio buffer with cropped version');

    // Verify the buffer in store is correct
    const storeBuffer = useAudioStore.getState().audioBuffer;
    if (storeBuffer) {
      console.log(
        'CROP DEBUG - Verification - Buffer in store:',
        `Duration: ${storeBuffer.length / storeBuffer.sampleRate}s`,
        `Length: ${storeBuffer.length} samples`
      );
    } else {
      console.error(
        'CROP DEBUG - ERROR: No buffer found in store after setting!'
      );
    }

    // Clear crop region after applying
    callbacks.setCropMode(false);
    callbacks.setCropRegion(null);
    cropRegionData.remove();

    // Visual markers will be automatically created by the ready event from the WAV cue points
    // No need to manually create them here since we embedded them in the WAV file
    console.log(
      `🔍 MARKER DEBUGGING - Skipping manual marker creation, ready event will load from WAV cue points`
    );

    // Also remove any existing fade regions since crop was applied
    const existingFadeInRegion = regions
      .getRegions()
      .find((r: Region) => r.id === 'fade-in');
    const existingFadeOutRegion = regions
      .getRegions()
      .find((r: Region) => r.id === 'fade-out');

    if (existingFadeInRegion) {
      callbacks.setFadeInMode(false);
      existingFadeInRegion.remove();
      console.log('Removed fade-in region after crop application');
    }

    if (existingFadeOutRegion) {
      callbacks.setFadeOutMode(false);
      existingFadeOutRegion.remove();
      console.log('Removed fade-out region after crop application');
    }

    // Recalculate zoom to fit the new cropped audio
    if (callbacks.setZoom) {
      const container = document.getElementById('waveform-container');
      let containerWidth = 800;

      if (container) {
        const rect = container.getBoundingClientRect();
        containerWidth =
          rect.width > 0 ? rect.width : container.clientWidth || 800;
      }

      const newDuration = ws.getDuration();
      if (newDuration > 0) {
        const minPxPerSec = containerWidth / newDuration;
        // Allow very low zoom values for long audio files, but ensure minimum usability
        const resetZoom = Math.min(1000, Math.max(1, minPxPerSec));
        console.log('Recalculating zoom after crop:', {
          newDuration,
          containerWidth,
          resetZoom,
        });
        callbacks.setZoom(resetZoom);
        ws.zoom(resetZoom);
      }
    }

    // Clear processing flag
    console.log('CROP DEBUG - Clearing processing flag (success)');
    store.setIsProcessingAudio(false);
  } catch (error) {
    console.error('Error loading cropped audio:', error);
    // Clear processing flag on error too
    console.log('CROP DEBUG - Clearing processing flag (error)');
    const store = useAudioStore.getState();
    store.setIsProcessingAudio(false);
  }
};

export const applyFades = async (
  ws: WaveSurfer,
  regions: RegionsPlugin,
  fadeInMode: boolean,
  fadeOutMode: boolean,
  fadeInCurveType: string,
  fadeOutCurveType: string,
  currentAudioUrl: string | null,
  spliceMarkersStore: number[],
  lockedSpliceMarkersStore: number[],
  callbacks: {
    setPreviousAudioUrl: (url: string | null) => void;
    setCanUndo: (canUndo: boolean) => void;
    setAudioBuffer: (buffer: AudioBuffer | null) => void;
    setFadeInMode: (mode: boolean) => void;
    setFadeOutMode: (mode: boolean) => void;
    setCurrentAudioUrl: (url: string | null) => void;
    setCropMode: (mode: boolean) => void;
    setCropRegion: (region: Region | null) => void;
    setSpliceMarkersStore: (markers: number[]) => void;
    setPreviousSpliceMarkers: (markers: number[]) => void;
    setPreviousLockedSpliceMarkers: (markers: number[]) => void;
    setZoom?: (zoom: number) => void;
  }
): Promise<void> => {
  if (!ws || !regions || (!fadeInMode && !fadeOutMode)) {
    console.log(
      'Cannot apply fades: missing wavesurfer, regions, or no fade modes active'
    );
    return;
  }

  if (!ws.getDuration() || ws.getDuration() === 0) {
    console.log('Cannot apply fades: no audio loaded or duration is 0');
    return;
  }

  console.log('Applying fades...');
  console.log('Current audio URL passed to applyFades:', currentAudioUrl);

  const fadeInRegionData = regions
    .getRegions()
    .find((r: Region) => r.id === 'fade-in');
  const fadeOutRegionData = regions
    .getRegions()
    .find((r: Region) => r.id === 'fade-out');

  // Get the audio buffer from the audio store instead of wavesurfer backend
  const audioBuffer = useAudioStore.getState().audioBuffer;
  console.log('applyFades - checking audio buffer in store:', !!audioBuffer);
  if (!audioBuffer) {
    console.log('No audio buffer found in store for fade operation');
    console.log('Current store state:', useAudioStore.getState());
    return;
  }

  console.log('Audio buffer found:', audioBuffer.length, 'samples');
  console.log(
    'Audio buffer duration:',
    audioBuffer.length / audioBuffer.sampleRate,
    'seconds'
  );
  console.log('Current WaveSurfer duration:', ws.getDuration(), 'seconds');
  console.log('Audio buffer sample rate:', audioBuffer.sampleRate);
  console.log(
    'Fade-in region:',
    fadeInRegionData
      ? `${fadeInRegionData.start} to ${fadeInRegionData.end}`
      : 'none'
  );
  console.log(
    'Fade-out region:',
    fadeOutRegionData
      ? `${fadeOutRegionData.start} to ${fadeOutRegionData.end}`
      : 'none'
  );

  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const bufferLength = audioBuffer.length;

  // Create new audio buffer with fade effects
  const audioContext = new (window.AudioContext ||
    (
      window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext)();
  const newBuffer = audioContext.createBuffer(
    numberOfChannels,
    bufferLength,
    sampleRate
  );

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    const newChannelData = newBuffer.getChannelData(channel);

    // Copy original data
    for (let i = 0; i < bufferLength; i++) {
      newChannelData[i] = channelData[i];
    }

    // Apply fade-in if exists
    if (fadeInRegionData) {
      // Snap fade-in boundaries to nearest zero crossings to avoid audio artifacts
      const adjustedFadeInStart = findNearestZeroCrossing(
        audioBuffer,
        fadeInRegionData.start
      );
      const adjustedFadeInEnd = findNearestZeroCrossing(
        audioBuffer,
        fadeInRegionData.end
      );
      const fadeInStartSample = Math.floor(adjustedFadeInStart * sampleRate);
      const fadeInEndSample = Math.floor(adjustedFadeInEnd * sampleRate);
      const fadeInLength = fadeInEndSample - fadeInStartSample;

      console.log(
        'Zero-crossing adjusted fade-in:',
        `${fadeInRegionData.start} -> ${adjustedFadeInStart} to ${fadeInRegionData.end} -> ${adjustedFadeInEnd}`,
        `(samples ${fadeInStartSample} to ${fadeInEndSample})`
      );

      for (let i = fadeInStartSample; i < fadeInEndSample; i++) {
        const normalizedPosition = (i - fadeInStartSample) / fadeInLength; // Position from 0 to 1
        const gain = calculateFadeGain(
          normalizedPosition,
          fadeInCurveType,
          false
        ); // Fade-in
        newChannelData[i] *= gain;
      }
    }

    // Apply fade-out if exists
    if (fadeOutRegionData) {
      // Snap fade-out boundaries to nearest zero crossings to avoid audio artifacts
      const adjustedFadeOutStart = findNearestZeroCrossing(
        audioBuffer,
        fadeOutRegionData.start
      );
      const adjustedFadeOutEnd = findNearestZeroCrossing(
        audioBuffer,
        fadeOutRegionData.end
      );
      const fadeOutStartSample = Math.floor(adjustedFadeOutStart * sampleRate);
      const fadeOutEndSample = Math.floor(adjustedFadeOutEnd * sampleRate);
      const fadeOutLength = fadeOutEndSample - fadeOutStartSample;

      console.log(
        'Zero-crossing adjusted fade-out:',
        `${fadeOutRegionData.start} -> ${adjustedFadeOutStart} to ${fadeOutRegionData.end} -> ${adjustedFadeOutEnd}`,
        `(samples ${fadeOutStartSample} to ${fadeOutEndSample})`
      );

      for (let i = fadeOutStartSample; i < fadeOutEndSample; i++) {
        const normalizedPosition = (i - fadeOutStartSample) / fadeOutLength; // Position from 0 to 1
        const gain = calculateFadeGain(
          normalizedPosition,
          fadeOutCurveType,
          true
        ); // Fade-out
        newChannelData[i] *= gain;
      }
    }
  }

  console.log('Fades applied, converting to WAV...');

  // Convert to WAV blob and create new URL
  const wav = audioBufferToWavWithCues(newBuffer, spliceMarkersStore);
  const blob = new Blob([wav], { type: 'audio/wav' });
  const newUrl = URL.createObjectURL(blob) + '#morphedit-faded';

  console.log('Loading new faded URL:', newUrl);
  console.log('Saving for undo - currentAudioUrl:', currentAudioUrl);

  // Save current audio URL and splice markers for undo before loading new one
  callbacks.setPreviousAudioUrl(currentAudioUrl);
  callbacks.setPreviousSpliceMarkers([...spliceMarkersStore]);
  callbacks.setPreviousLockedSpliceMarkers([...lockedSpliceMarkersStore]);
  callbacks.setCanUndo(true);

  // Load the new faded audio
  try {
    await ws.load(newUrl);
    console.log('Fades applied successfully');
    console.log('New audio duration after fades:', ws.getDuration(), 'seconds');
    // Update the current audio URL to the new faded version
    callbacks.setCurrentAudioUrl(newUrl);
    // Update the audio buffer in the store with the new faded buffer
    callbacks.setAudioBuffer(newBuffer);
    console.log(
      'Updated audio buffer in store with faded version - duration:',
      newBuffer.length / newBuffer.sampleRate,
      'seconds'
    );
    // Clear fade regions after applying
    if (fadeInRegionData) {
      callbacks.setFadeInMode(false);
      fadeInRegionData.remove();
    }
    if (fadeOutRegionData) {
      callbacks.setFadeOutMode(false);
      fadeOutRegionData.remove();
    }

    // Also remove any existing crop region since fades were applied
    const existingCropRegion = regions
      .getRegions()
      .find((r: Region) => r.id === 'crop-loop');

    if (existingCropRegion) {
      callbacks.setCropMode(false);
      callbacks.setCropRegion(null);
      existingCropRegion.remove();
      console.log('Removed crop region after fade application');
    }

    // Recalculate zoom to fit the faded audio properly
    if (callbacks.setZoom) {
      const container = document.getElementById('waveform-container');
      let containerWidth = 800;

      if (container) {
        const rect = container.getBoundingClientRect();
        containerWidth =
          rect.width > 0 ? rect.width : container.clientWidth || 800;
      }

      const duration = ws.getDuration();
      if (duration > 0) {
        const minPxPerSec = containerWidth / duration;
        // Allow very low zoom values for long audio files, but ensure minimum usability
        const resetZoom = Math.min(1000, Math.max(1, minPxPerSec));
        console.log('Recalculating zoom after fades:', {
          duration,
          containerWidth,
          resetZoom,
        });
        callbacks.setZoom(resetZoom);
        ws.zoom(resetZoom);
      }
    }
  } catch (error) {
    console.error('Error loading faded audio:', error);
  }
};

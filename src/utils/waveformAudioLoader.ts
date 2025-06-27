import WaveSurfer from 'wavesurfer.js';

import { parseWavCuePoints } from '../utils/audioProcessing';
import { truncateAudioBuffer } from '../utils/fileLengthUtils.ts';

import { AUDIO_MAX_DURATION } from '../constants';

// Helper function to handle audio loading and preprocessing
export async function loadAudioIntoWaveform(
  ws: WaveSurfer,
  audioUrl: string,
  shouldTruncate: boolean,
  state: { currentAudioUrl: string | null },
  actions: { setCurrentAudioUrl: (url: string | null) => void },
  setAudioBuffer: (buffer: AudioBuffer) => void
): Promise<void> {
  // Strip URL fragments early to ensure all operations use clean URLs
  let urlToLoad = audioUrl.split('#')[0];

  console.log('=== loadAudio called ===');
  console.log('shouldTruncate:', shouldTruncate);
  console.log('Original audioUrl:', audioUrl);
  console.log('Cleaned audioUrl:', urlToLoad);
  console.log('state.currentAudioUrl:', state.currentAudioUrl);

  // Check if we already have a truncated URL for this audio file to prevent loops
  const currentUrl = state.currentAudioUrl;
  const isAlreadyTruncated =
    currentUrl &&
    currentUrl.startsWith('blob:') &&
    currentUrl !== urlToLoad && // Compare with clean URL
    !audioUrl.includes('#morphedit-appended') && // Don't reuse URLs for appended audio
    !audioUrl.includes('#morphedit-concatenated') && // Don't reuse URLs for concatenated audio
    !audioUrl.includes('#morphedit-tempo-pitch'); // Don't reuse URLs for tempo/pitch processed audio

  if (shouldTruncate && !isAlreadyTruncated) {
    console.log('🔄 Preprocessing audio for truncation before loading...');
    try {
      // Parse cue points from original file BEFORE truncation
      let originalCuePoints: number[] = [];
      try {
        console.log(
          '🔍 Parsing cue points from original file before truncation...'
        );
        originalCuePoints = await parseWavCuePoints(urlToLoad);
        console.log('🔍 Found cue points in original file:', originalCuePoints);
      } catch (error) {
        console.warn('Could not parse cue points from original file:', error);
      }

      // Fetch and decode the original audio to check if truncation is needed
      const response = await fetch(urlToLoad);
      const arrayBuffer = await response.arrayBuffer();

      const audioContext = new (window.AudioContext ||
        (
          window as Window &
            typeof globalThis & {
              webkitAudioContext?: typeof AudioContext;
            }
        ).webkitAudioContext)();

      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const originalDuration = audioBuffer.length / audioBuffer.sampleRate;

      console.log('Original audio duration:', originalDuration, 'seconds');

      if (originalDuration > AUDIO_MAX_DURATION) {
        console.log(
          '✂️ Audio exceeds max duration, creating truncated version'
        );

        // Filter cue points to only include those within the truncated range
        const filteredCuePoints = originalCuePoints.filter(
          (cueTime) => cueTime <= AUDIO_MAX_DURATION
        );
        console.log(
          '🔍 Filtered cue points for truncated audio:',
          filteredCuePoints
        );

        // Truncate the buffer
        const truncatedBuffer = truncateAudioBuffer(
          audioBuffer,
          AUDIO_MAX_DURATION
        );
        const truncatedDuration =
          truncatedBuffer.length / truncatedBuffer.sampleRate;
        console.log('Truncated duration:', truncatedDuration, 'seconds');

        // Convert to WAV blob
        const { audioBufferToWavFormat } = await import('../utils/exportUtils');
        const { EXPORT_FORMATS: exportFormats } = await import('../constants');
        const defaultFormat = exportFormats[0];

        const wavArrayBuffer = audioBufferToWavFormat(
          truncatedBuffer,
          defaultFormat,
          filteredCuePoints // Include the filtered cue points in the truncated file
        );
        const wavBlob = new Blob([wavArrayBuffer], {
          type: 'audio/wav',
        });
        urlToLoad = URL.createObjectURL(wavBlob);

        console.log('Created truncated URL for loading:', urlToLoad);

        // Store the truncated buffer in the store immediately
        setAudioBuffer(truncatedBuffer);

        // Update current audio URL
        actions.setCurrentAudioUrl(urlToLoad);
      } else {
        console.log('✅ Audio is within limits, no truncation needed');
      }
    } catch (error) {
      console.error('❌ Error preprocessing audio for truncation:', error);
      // If preprocessing fails, use original URL
    }
  } else if (
    isAlreadyTruncated &&
    !audioUrl.includes('#morphedit-tempo-pitch')
  ) {
    console.log('🔄 Using already truncated URL:', currentUrl);
    urlToLoad = currentUrl;
  }

  console.log('Loading URL into WaveSurfer:', urlToLoad);
  // Update current audio URL with the clean URL
  actions.setCurrentAudioUrl(urlToLoad);

  try {
    ws.load(urlToLoad);
  } catch (error) {
    console.error('Error loading URL into WaveSurfer:', error);
    // Continue anyway as WaveSurfer might still work
  }
}

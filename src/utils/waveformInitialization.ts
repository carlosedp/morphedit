// WaveformInitialization.ts - Handles WaveSurfer initialization logic
import type { Theme } from '@mui/material/styles';
import WaveSurfer from 'wavesurfer.js';
import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js';
import Minimap from 'wavesurfer.js/dist/plugins/minimap.esm.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';

import { MINIMAP_ENABLED, UI_COLORS, WAVEFORM_RENDERING } from '../constants';

interface DebugWindow extends Window {
  morpheditRegions?: RegionsPlugin;
}

// Helper function to create WaveSurfer instance
export function createWaveSurferInstance(theme: Theme) {
  // Create regions plugin instance
  const regions = RegionsPlugin.create();

  // Expose regions plugin to global window for debug function
  (window as DebugWindow).morpheditRegions = regions;

  const minimap = Minimap.create({
    height: 20,
    waveColor: theme.palette.primary.main,
    progressColor: theme.palette.primary.light,
    overlayColor: theme.palette.primary.dark,
    dragToSeek: true,
  });

  // Create wavesurfer instance
  const ws = WaveSurfer.create({
    container: '#waveform-container',
    waveColor: theme.palette.primary.main,
    // Use the primary main color but lightened for better contrast
    progressColor: theme.palette.primary.light,
    cursorColor: theme.palette.primary.main,
    normalize: true,
    cursorWidth: WAVEFORM_RENDERING.CURSOR_WIDTH,
    minPxPerSec: 1, // Allow very low zoom levels to show entire long audio files
    plugins: [
      regions,
      TimelinePlugin.create({}),
      Hover.create({
        lineColor: theme.palette.secondary.main,
        lineWidth: WAVEFORM_RENDERING.GRID_LINE_WIDTH,
        labelBackground: UI_COLORS.LABEL_BACKGROUND,
        labelColor: UI_COLORS.LABEL_TEXT,
        labelSize: '11px',
        formatTimeCallback: (seconds: number) => {
          const minutes = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          const millis = Math.floor((seconds % 1) * 1000);
          return `${minutes}:${secs < 10 ? '0' : ''}${secs}.${millis}`;
        },
      }),
    ],
  });

  if (MINIMAP_ENABLED) {
    // Add minimap plugin if enabled
    ws.registerPlugin(minimap);
  }

  return { wavesurfer: ws, regions };
}

// Helper function to calculate perfect fit zoom (replaces calculateInitialZoom)
export function calculatePerfectFitZoom(duration: number): number {
  // Get container width with multiple fallbacks for stability
  const container = document.getElementById('waveform-container');
  let containerWidth = 800; // Default fallback

  if (container) {
    const rect = container.getBoundingClientRect();
    const clientWidth = container.clientWidth;
    const offsetWidth = container.offsetWidth;

    // Use the most reliable width measurement available
    if (rect.width > 0) {
      containerWidth = rect.width;
    } else if (clientWidth > 0) {
      containerWidth = clientWidth;
    } else if (offsetWidth > 0) {
      containerWidth = offsetWidth;
    }

    // For very small containers, use a reasonable minimum
    if (containerWidth < 200) {
      containerWidth = 800;
    }
  }

  // Calculate appropriate zoom to fill the container (pixels per second)
  // Account for WaveSurfer's internal padding/margins (subtract fixed amount)
  const usableWidth = containerWidth; // Subtract ~60px for WaveSurfer margins
  const pxPerSec = usableWidth / duration;

  // Always use the calculated zoom that fits the entire waveform
  // This ensures zoom reset shows the complete audio file
  const finalZoom = Math.min(1000, pxPerSec);

  console.log('🔍 calculatePerfectFitZoom:', {
    duration,
    containerWidth,
    usableWidth,
    pxPerSec,
    finalZoom,
  });

  return finalZoom;
}

// Legacy function - kept for compatibility but will be removed
export function calculateInitialZoom(duration: number): number {
  // Get container width with multiple fallbacks and retries for stability
  const container = document.getElementById('waveform-container');
  let containerWidth = 800; // Default fallback

  if (container) {
    const rect = container.getBoundingClientRect();
    const clientWidth = container.clientWidth;
    const offsetWidth = container.offsetWidth;

    // Use the most reliable width measurement available
    if (rect.width > 0) {
      containerWidth = rect.width;
    } else if (clientWidth > 0) {
      containerWidth = clientWidth;
    } else if (offsetWidth > 0) {
      containerWidth = offsetWidth;
    }

    // For very small containers, use a reasonable minimum
    if (containerWidth < 200) {
      containerWidth = 800;
    }
  }

  // Calculate appropriate zoom to fill the container
  const minPxPerSec = containerWidth / duration;

  // For longer audio files, ensure minimum zoom level for visibility
  const calculatedZoom = Math.round(minPxPerSec);
  const minZoomForLongAudio =
    duration > 60 ? Math.max(1, containerWidth / 300) : 1;

  return Math.min(1000, Math.max(minZoomForLongAudio, calculatedZoom));
}

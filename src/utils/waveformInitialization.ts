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
    minPxPerSec: 20, // Ensure waveform fills container initially
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

// Helper function to calculate initial zoom
export function calculateInitialZoom(duration: number): number {
  // Get container width with multiple fallbacks
  const container = document.getElementById('waveform-container');
  let containerWidth = 800; // Default fallback

  if (container) {
    const rect = container.getBoundingClientRect();
    containerWidth = rect.width > 0 ? rect.width : container.clientWidth || 800;
  }

  // Calculate appropriate zoom to fill the container
  const minPxPerSec = containerWidth / duration;
  // Remove the 0.99 multiplier to avoid cumulative rounding errors
  // Use a more stable calculation that provides consistent results
  return Math.min(1000, Math.max(1, Math.round(minPxPerSec)));
}

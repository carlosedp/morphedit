// Debug utilities for WaveSurfer regions and splice markers
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';

import { useAudioStore } from '../audioStore';
import { MARKER_ICONS } from '../constants';

// Debug function to inspect regions from browser console
// Using proper types and accessing the global window object
interface DebugWindow extends Window {
  debugListRegions?: () => void;
  morpheditRegions?: {
    getRegions: () => Region[];
  };
}

export const setupWaveformDebugUtils = () => {
  (window as DebugWindow).debugListRegions = () => {
    const regions = (window as DebugWindow).morpheditRegions;
    if (!regions) {
      console.log(
        '🚫 No regions plugin found. Make sure an audio file is loaded.'
      );
      return;
    }

    const allRegions: Region[] = regions.getRegions();
    console.log(`📊 Found ${allRegions.length} total regions:`);
    console.log('=====================================');

    // Separate splice markers from other regions
    const spliceMarkers = allRegions.filter((r: Region) =>
      r.id.startsWith('splice-marker-')
    );
    const otherRegions = allRegions.filter(
      (r: Region) => !r.id.startsWith('splice-marker-')
    );

    // Display splice markers
    if (spliceMarkers.length > 0) {
      console.log(`🔷 SPLICE MARKERS (${spliceMarkers.length}):`);
      spliceMarkers
        .sort((a: Region, b: Region) => a.start - b.start)
        .forEach((region: Region, index: number) => {
          // Check if region content indicates it's locked (based on how markers are created)
          const contentText = region.content?.textContent || '';
          const isLocked = contentText === MARKER_ICONS.LOCKED;
          console.log(`  ${index + 1}. ID: ${region.id}`);
          console.log(`     Time: ${region.start.toFixed(3)}s`);
          console.log(
            `     Content: ${contentText} ${
              isLocked ? '(LOCKED)' : '(UNLOCKED)'
            }`
          );
          console.log(`     Draggable: ${region.drag}`);
          console.log('');
        });
    } else {
      console.log('🔷 SPLICE MARKERS: None');
    }

    // Display other regions
    if (otherRegions.length > 0) {
      console.log(
        ` ${MARKER_ICONS.UNLOCKED} OTHER REGIONS (${otherRegions.length}):`
      );
      otherRegions.forEach((region: Region, index: number) => {
        console.log(`  ${index + 1}. ID: ${region.id}`);
        console.log(`     Start: ${region.start.toFixed(3)}s`);
        console.log(`     End: ${region.end.toFixed(3)}s`);
        console.log(
          `     Duration: ${(region.end - region.start).toFixed(3)}s`
        );
        console.log('');
      });
    } else {
      console.log(MARKER_ICONS.UNLOCKED, ' OTHER REGIONS: None');
    }

    // Display store information
    const store = useAudioStore.getState();
    console.log('📦 STORE INFORMATION:');
    console.log(`     Splice markers in store: ${store.spliceMarkers.length}`);
    console.log(
      `     Store marker times: [${store.spliceMarkers
        .map((m) => m.toFixed(3))
        .join(', ')}]`
    );
    console.log(`     Locked markers: ${store.lockedSpliceMarkers.length}`);
    console.log(
      `     Locked marker times: [${store.lockedSpliceMarkers
        .map((m) => m.toFixed(3))
        .join(', ')}]`
    );
    console.log('=====================================');
  };

  console.log('🛠️  Debug function available: debugListRegions()');
};

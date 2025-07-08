// Custom hook for managing waveform state
import { useMemo, useRef, useState } from 'react';
import type WaveSurfer from 'wavesurfer.js';
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

import { useAppSettings } from '../settingsStore';
import type { ExportFormat } from '../utils/exportUtils';

interface WaveformState {
  // Playback state
  isPlaying: boolean;
  isLooping: boolean;
  currentTime: number;
  duration: number;

  // Region states
  cropMode: boolean;
  cropRegion: Region | null;
  fadeInMode: boolean;
  fadeOutMode: boolean;
  fadeInCurveType: string;
  fadeOutCurveType: string;

  // Crossfade state
  crossfadeMode: boolean;
  crossfadeRegion: Region | null;
  crossfadeCurveType: string;

  // Splice marker state
  selectedSpliceMarker: Region | null;
  numberOfSlices: number;

  // Transient detection state
  transientSensitivity: number;
  transientFrameSize: number; // Frame size in milliseconds (5-50ms)
  transientOverlap: number; // Overlap percentage (50-90%)

  // Navigation state
  zoom: number;
  resetZoom: number;
  skipIncrement: number;

  // Audio URL state
  currentAudioUrl: string | null;

  // Export state
  exportAnchorEl: HTMLElement | null;
  fadeInAnchorEl: HTMLElement | null;
  fadeOutAnchorEl: HTMLElement | null;
  crossfadeAnchorEl: HTMLElement | null;
  selectedExportFormat: ExportFormat;
}

interface WaveformActions {
  setIsPlaying: (playing: boolean) => void;
  setIsLooping: (looping: boolean | ((prev: boolean) => boolean)) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setCropMode: (mode: boolean) => void;
  setCropRegion: (region: Region | null) => void;
  setFadeInMode: (mode: boolean) => void;
  setFadeOutMode: (mode: boolean) => void;
  setFadeInCurveType: (curveType: string) => void;
  setFadeOutCurveType: (curveType: string) => void;
  setCrossfadeMode: (mode: boolean) => void;
  setCrossfadeRegion: (region: Region | null) => void;
  setCrossfadeCurveType: (curveType: string) => void;
  setSelectedSpliceMarker: (marker: Region | null) => void;
  setNumberOfSlices: (slices: number) => void;
  setTransientSensitivity: (sensitivity: number) => void;
  setTransientFrameSize: (frameSize: number) => void;
  setTransientOverlap: (overlap: number) => void;
  setZoom: (zoom: number) => void;
  setResetZoom: (resetZoom: number) => void;
  setSkipIncrement: (increment: number) => void;
  setCurrentAudioUrl: (url: string | null) => void;
  setExportAnchorEl: (element: HTMLElement | null) => void;
  setFadeInAnchorEl: (element: HTMLElement | null) => void;
  setFadeOutAnchorEl: (element: HTMLElement | null) => void;
  setCrossfadeAnchorEl: (element: HTMLElement | null) => void;
  setSelectedExportFormat: (format: ExportFormat) => void;
}

export const useWaveformState = (
  initialAudioUrl: string
): [WaveformState, WaveformActions] => {
  // Get settings
  const { settings } = useAppSettings();

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Region states
  const [cropMode, setCropMode] = useState(false);
  const [cropRegion, setCropRegion] = useState<Region | null>(null);
  const [fadeInMode, setFadeInMode] = useState(false);
  const [fadeOutMode, setFadeOutMode] = useState(false);
  const [fadeInCurveType, setFadeInCurveType] = useState<string>(
    settings.fadeInCurveType
  );
  const [fadeOutCurveType, setFadeOutCurveType] = useState<string>(
    settings.fadeOutCurveType
  );

  // Crossfade state
  const [crossfadeMode, setCrossfadeMode] = useState(false);
  const [crossfadeRegion, setCrossfadeRegion] = useState<Region | null>(null);
  const [crossfadeCurveType, setCrossfadeCurveType] = useState<string>(
    settings.crossfadeCurveType
  );

  // Splice marker state
  const [selectedSpliceMarker, setSelectedSpliceMarker] =
    useState<Region | null>(null);
  const [numberOfSlices, setNumberOfSlices] = useState(
    settings.defaultAutoSliceAmount
  );

  // Transient detection state
  const [transientSensitivity, setTransientSensitivity] = useState(
    settings.transientThreshold
  );
  const [transientFrameSize, setTransientFrameSize] = useState(
    settings.transientFrameSizeMs
  );
  const [transientOverlap, setTransientOverlap] = useState(
    settings.transientOverlapPercent
  );

  // Navigation state
  const [zoom, setZoom] = useState(0);
  const [resetZoom, setResetZoom] = useState(2); // Default to ZOOM_LEVELS.MIN
  const [skipIncrement, setSkipIncrement] = useState(1.0);

  // Audio URL state
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(
    initialAudioUrl
  );

  // Export state
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLElement | null>(
    null
  );
  const [fadeInAnchorEl, setFadeInAnchorEl] = useState<HTMLElement | null>(
    null
  );
  const [fadeOutAnchorEl, setFadeOutAnchorEl] = useState<HTMLElement | null>(
    null
  );
  const [crossfadeAnchorEl, setCrossfadeAnchorEl] =
    useState<HTMLElement | null>(null);
  const [selectedExportFormat, setSelectedExportFormat] =
    useState<ExportFormat>(settings.defaultExportFormat);

  const state: WaveformState = {
    isPlaying,
    isLooping,
    currentTime,
    duration,
    cropMode,
    cropRegion,
    fadeInMode,
    fadeOutMode,
    fadeInCurveType,
    fadeOutCurveType,
    crossfadeMode,
    crossfadeRegion,
    crossfadeCurveType,
    selectedSpliceMarker,
    numberOfSlices,
    transientSensitivity,
    transientFrameSize,
    transientOverlap,
    zoom,
    resetZoom,
    skipIncrement,
    currentAudioUrl,
    exportAnchorEl,
    fadeInAnchorEl,
    fadeOutAnchorEl,
    crossfadeAnchorEl,
    selectedExportFormat,
  };

  const actions: WaveformActions = useMemo(
    () => ({
      setIsPlaying,
      setIsLooping,
      setCurrentTime,
      setDuration,
      setCropMode,
      setCropRegion,
      setFadeInMode,
      setFadeOutMode,
      setFadeInCurveType,
      setFadeOutCurveType,
      setCrossfadeMode,
      setCrossfadeRegion,
      setCrossfadeCurveType,
      setSelectedSpliceMarker,
      setNumberOfSlices,
      setTransientSensitivity,
      setTransientFrameSize,
      setTransientOverlap,
      setZoom,
      setResetZoom,
      setSkipIncrement,
      setCurrentAudioUrl,
      setExportAnchorEl,
      setFadeInAnchorEl,
      setFadeOutAnchorEl,
      setCrossfadeAnchorEl,
      setSelectedExportFormat,
    }),
    [
      setIsPlaying,
      setIsLooping,
      setCurrentTime,
      setDuration,
      setCropMode,
      setCropRegion,
      setFadeInMode,
      setFadeOutMode,
      setFadeInCurveType,
      setFadeOutCurveType,
      setCrossfadeMode,
      setCrossfadeRegion,
      setCrossfadeCurveType,
      setSelectedSpliceMarker,
      setNumberOfSlices,
      setTransientSensitivity,
      setTransientFrameSize,
      setTransientOverlap,
      setZoom,
      setResetZoom,
      setSkipIncrement,
      setCurrentAudioUrl,
      setExportAnchorEl,
      setFadeInAnchorEl,
      setFadeOutAnchorEl,
      setCrossfadeAnchorEl,
      setSelectedExportFormat,
    ]
  );

  return [state, actions];
};

// Custom hook for managing wavesurfer refs
export const useWaveformRefs = () => {
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const isLoopingRef = useRef<boolean>(false);
  const cropRegionRef = useRef<Region | null>(null);

  return {
    wavesurferRef,
    regionsRef,
    isLoopingRef,
    cropRegionRef,
  };
};

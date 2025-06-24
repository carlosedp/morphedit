// Custom hook for managing waveform state
import { useState, useRef, useMemo } from 'react';
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type WaveSurfer from 'wavesurfer.js';
import { FADE_CURVE_TYPES } from '../constants';
import type { ExportFormat } from '../utils/exportUtils';
import { EXPORT_FORMATS } from '../constants';

export interface WaveformState {
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
  selectedExportFormat: ExportFormat;
}

export interface WaveformActions {
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
  setSelectedExportFormat: (format: ExportFormat) => void;
}

export const useWaveformState = (
  initialAudioUrl: string
): [WaveformState, WaveformActions] => {
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
    FADE_CURVE_TYPES.LINEAR
  );
  const [fadeOutCurveType, setFadeOutCurveType] = useState<string>(
    FADE_CURVE_TYPES.LINEAR
  );

  // Splice marker state
  const [selectedSpliceMarker, setSelectedSpliceMarker] =
    useState<Region | null>(null);
  const [numberOfSlices, setNumberOfSlices] = useState(8);

  // Transient detection state
  const [transientSensitivity, setTransientSensitivity] = useState(50);
  const [transientFrameSize, setTransientFrameSize] = useState(20); // 20ms default
  const [transientOverlap, setTransientOverlap] = useState(75); // 75% overlap default

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
  const [selectedExportFormat, setSelectedExportFormat] =
    useState<ExportFormat>(
      EXPORT_FORMATS[0] // Default to first format (48kHz 32-bit Float Stereo)
    );

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

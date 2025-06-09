// Custom hook for managing waveform state
import { useState, useRef, useMemo } from "react";
import type { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import type RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type WaveSurfer from "wavesurfer.js";

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

  // Splice marker state
  selectedSpliceMarker: Region | null;
  numberOfSlices: number;

  // Navigation state
  zoom: number;
  skipIncrement: number;

  // Audio URL state
  currentAudioUrl: string | null;

  // Export state
  exportAnchorEl: HTMLElement | null;
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
  setSelectedSpliceMarker: (marker: Region | null) => void;
  setNumberOfSlices: (slices: number) => void;
  setZoom: (zoom: number) => void;
  setSkipIncrement: (increment: number) => void;
  setCurrentAudioUrl: (url: string | null) => void;
  setExportAnchorEl: (element: HTMLElement | null) => void;
}

export const useWaveformState = (initialAudioUrl: string): [WaveformState, WaveformActions] => {
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

  // Splice marker state
  const [selectedSpliceMarker, setSelectedSpliceMarker] = useState<Region | null>(null);
  const [numberOfSlices, setNumberOfSlices] = useState(8);

  // Navigation state
  const [zoom, setZoom] = useState(0);
  const [skipIncrement, setSkipIncrement] = useState(1.0);

  // Audio URL state
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(initialAudioUrl);

  // Export state
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLElement | null>(null);

  const state: WaveformState = {
    isPlaying,
    isLooping,
    currentTime,
    duration,
    cropMode,
    cropRegion,
    fadeInMode,
    fadeOutMode,
    selectedSpliceMarker,
    numberOfSlices,
    zoom,
    skipIncrement,
    currentAudioUrl,
    exportAnchorEl,
  };

  const actions: WaveformActions = useMemo(() => ({
    setIsPlaying,
    setIsLooping,
    setCurrentTime,
    setDuration,
    setCropMode,
    setCropRegion,
    setFadeInMode,
    setFadeOutMode,
    setSelectedSpliceMarker,
    setNumberOfSlices,
    setZoom,
    setSkipIncrement,
    setCurrentAudioUrl,
    setExportAnchorEl,
  }), [
    setIsPlaying,
    setIsLooping,
    setCurrentTime,
    setDuration,
    setCropMode,
    setCropRegion,
    setFadeInMode,
    setFadeOutMode,
    setSelectedSpliceMarker,
    setNumberOfSlices,
    setZoom,
    setSkipIncrement,
    setCurrentAudioUrl,
    setExportAnchorEl,
  ]);

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

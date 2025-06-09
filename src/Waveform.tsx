// filepath: /home/carlosedp/repos/morphedit/src/Waveform.tsx
import {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { useTheme } from "@mui/material/styles";

import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";
import Hover from "wavesurfer.js/dist/plugins/hover.esm.js";

import { useAudioStore } from "./audioStore";
import type { AudioState } from "./audioStore";
import "./App.css";
import { IconButton, Slider, Stack, Typography, Button, Tooltip, Container, Menu, MenuItem, ButtonGroup, TextField } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RepeatIcon from "@mui/icons-material/Repeat";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import UndoIcon from "@mui/icons-material/Undo";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import FilterListIcon from "@mui/icons-material/FilterList";
import AddIcon from "@mui/icons-material/Create";
import DeleteIcon from "@mui/icons-material/Delete";
import ClearIcon from "@mui/icons-material/Clear";

// Export format interface
interface ExportFormat {
  label: string;
  sampleRate: number;
  bitDepth: 16 | 32;
  channels: 'stereo' | 'mono';
  format: 'int' | 'float';
}

// Available export formats
const exportFormats: ExportFormat[] = [
  { label: "48kHz 32-bit Float Stereo", sampleRate: 48000, bitDepth: 32, channels: 'stereo', format: 'float' },
  { label: "44.1kHz 32-bit Float Stereo", sampleRate: 44100, bitDepth: 32, channels: 'stereo', format: 'float' },
  { label: "44.1kHz 16-bit Stereo", sampleRate: 44100, bitDepth: 16, channels: 'stereo', format: 'int' },
  { label: "44.1kHz 16-bit Mono", sampleRate: 44100, bitDepth: 16, channels: 'mono', format: 'int' },
  { label: "48kHz 16-bit Stereo", sampleRate: 48000, bitDepth: 16, channels: 'stereo', format: 'int' },
  { label: "22.05kHz 16-bit Mono", sampleRate: 22050, bitDepth: 16, channels: 'mono', format: 'int' },
];

interface WaveformProps {
  audioUrl: string;
}

export interface WaveformRef {
  handlePlayPause: () => void;
  handleCropRegion: () => void;
  handleLoop: () => void;
  handleZoom: (value: number) => void;
  getCurrentZoom: () => number;
  handleSkipForward: () => void;
  handleSkipBackward: () => void;
  handleIncreaseSkipIncrement: () => void;
  handleDecreaseSkipIncrement: () => void;
  handleFadeInRegion: () => void;
  handleFadeOutRegion: () => void;
  handleApplyCrop: () => void;
  handleApplyFades: () => void;
  handleUndo: () => void;
  handleExportWav: () => void;
  handleAddSpliceMarker: () => void;
  handleRemoveSpliceMarker: () => void;
  handleAutoSlice: () => void;
  handleHalfMarkers: () => void;
}

const Waveform = forwardRef<WaveformRef, WaveformProps>(({ audioUrl }, ref) => {
  const theme = useTheme();
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const isLoopingRef = useRef<boolean>(false);
  const cropRegionRef = useRef<Region | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [cropRegion, setCropRegion] = useState<Region | null>(null);
  // Fade regions state
  const [fadeInMode, setFadeInMode] = useState(false);
  const [fadeOutMode, setFadeOutMode] = useState(false);
  // Splice markers state
  const [selectedSpliceMarker, setSelectedSpliceMarker] = useState<Region | null>(null);
  // Auto-slice state
  const [numberOfSlices, setNumberOfSlices] = useState(8);
  // Zoom state
  const [zoom, setZoom] = useState(0);
  // Skip navigation state
  const [skipIncrement, setSkipIncrement] = useState(1.0); // Default 1 second
  // Audio info state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Current audio URL state (tracks the actual URL being used, including after operations)
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(audioUrl);
  const setAudioBuffer = useAudioStore((s: AudioState) => s.setAudioBuffer);
  const setMarkers = useAudioStore((s: AudioState) => s.setMarkers);
  const setRegions = useAudioStore((s: AudioState) => s.setRegions);
  const setSpliceMarkersStore = useAudioStore((s: AudioState) => s.setSpliceMarkers);
  const spliceMarkersStore = useAudioStore((s: AudioState) => s.spliceMarkers);
  const setPreviousAudioUrl = useAudioStore((s: AudioState) => s.setPreviousAudioUrl);
  const setCanUndo = useAudioStore((s: AudioState) => s.setCanUndo);
  const previousAudioUrl = useAudioStore((s: AudioState) => s.previousAudioUrl);
  const canUndo = useAudioStore((s: AudioState) => s.canUndo);

  // Export dropdown state
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const exportMenuOpen = Boolean(exportAnchorEl);

  // Sync currentAudioUrl with audioUrl prop
  useEffect(() => {
    setCurrentAudioUrl(audioUrl);
  }, [audioUrl]);

  // Keep refs in sync with state
  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    cropRegionRef.current = cropRegion;
  }, [cropRegion]);

  // Update current time periodically when playing
  useEffect(() => {
    let interval: number;

    if (isPlaying && wavesurferRef.current) {
      interval = setInterval(() => {
        if (wavesurferRef.current) {
          setCurrentTime(wavesurferRef.current.getCurrentTime());
        }
      }, 100); // Update every 100ms
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying]);

  // Helper function to parse WAV file for existing cue points
  const parseWavCuePoints = useCallback(async (audioUrl: string): Promise<number[]> => {
    try {
      console.log("Parsing WAV file for cue points:", audioUrl);
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const view = new DataView(arrayBuffer);

      // Check if it's a valid WAV file
      const riffHeader = String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3)
      );
      if (riffHeader !== 'RIFF') {
        console.log("Not a WAV file or unsupported format");
        return [];
      }

      const waveHeader = String.fromCharCode(
        view.getUint8(8),
        view.getUint8(9),
        view.getUint8(10),
        view.getUint8(11)
      );
      if (waveHeader !== 'WAVE') {
        console.log("Not a WAV file");
        return [];
      }

      // Parse chunks to find cue points
      let offset = 12; // Skip RIFF header
      const cuePoints: number[] = [];
      let sampleRate = 44100; // Default sample rate

      while (offset < arrayBuffer.byteLength - 8) {
        const chunkId = String.fromCharCode(
          view.getUint8(offset),
          view.getUint8(offset + 1),
          view.getUint8(offset + 2),
          view.getUint8(offset + 3)
        );
        const chunkSize = view.getUint32(offset + 4, true);

        if (chunkId === 'fmt ') {
          // Extract sample rate from format chunk
          sampleRate = view.getUint32(offset + 12, true);
          console.log("Found sample rate:", sampleRate);
        } else if (chunkId === 'cue ') {
          // Parse cue chunk
          console.log("Found cue chunk of size:", chunkSize);
          const numCuePoints = view.getUint32(offset + 8, true);
          console.log("Number of cue points:", numCuePoints);

          let cueOffset = offset + 12; // Start of cue point data
          for (let i = 0; i < numCuePoints; i++) {
            // Each cue point is 24 bytes
            const cueId = view.getUint32(cueOffset, true);
            const playOrder = view.getUint32(cueOffset + 4, true);
            const sampleOffset = view.getUint32(cueOffset + 20, true); // Sample offset is at byte 20

            // Convert sample offset to time in seconds
            const timeInSeconds = sampleOffset / sampleRate;
            cuePoints.push(timeInSeconds);

            console.log(`Cue point ${i}: ID=${cueId}, PlayOrder=${playOrder}, Sample=${sampleOffset}, Time=${timeInSeconds}s`);
            cueOffset += 24;
          }
        }

        // Move to next chunk
        offset += 8 + chunkSize;
        // Ensure even byte alignment
        if (chunkSize % 2 === 1) {
          offset += 1;
        }
      }

      console.log("Parsed cue points:", cuePoints);
      return cuePoints.sort((a, b) => a - b);
    } catch (error) {
      console.error("Error parsing WAV cue points:", error);
      return [];
    }
  }, []);

  // Update splice marker colors based on selection
  const updateSpliceMarkerColors = useCallback((selectedMarker: Region | null) => {
    const regions = regionsRef.current;
    if (!regions) return;

    console.log("Updating splice marker colors, selected marker:", selectedMarker?.id);

    const allRegions = regions.getRegions();
    const spliceRegions = allRegions.filter((r: Region) => r.id.startsWith("splice-marker-"));

    console.log("Found splice regions:", spliceRegions.map(r => r.id));

    spliceRegions.forEach((region: Region) => {
      if (selectedMarker && region.id === selectedMarker.id) {
        // Selected marker: use orange/yellow color for selection
        // console.log("Setting orange color for selected marker:", region.id);
        // region.setOptions({ color: "rgba(255, 165, 0, 0.8)" });
        // set region part id to the border-left color:
        region.element.style.borderLeft = `2px solid ${theme.palette.primary.main}`;
      } else {
        // Unselected markers: use default cyan color
        // console.log("Setting cyan color for unselected marker:", region.id);
        // region.setOptions({ color: "rgba(0, 255, 255, 0.8)" });
        // reset region ::part(id) to the border-left color:
        region.element.style.borderLeft = `2px solid rgba(0, 255, 255, 0.8)`;

      }
    });
  }, [theme]);

  useEffect(() => {
    if (!audioUrl) {
      // If no audioUrl, clean up the wavesurfer instance
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch {
          // Ignore DOMException: The operation was aborted
        }
        wavesurferRef.current = null;
        regionsRef.current = null;
      }
      // Reset component state
      setIsPlaying(false);
      setIsLooping(false);
      setCropMode(false);
      setCropRegion(null);
      setFadeInMode(false);
      setFadeOutMode(false);
      setZoom(0);
      setCurrentTime(0);
      setDuration(0);
      setCurrentAudioUrl(null); // Reset current audio URL too
      return;
    }

    // Create regions plugin instance
    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    // Get colors from MUI theme
    const ws = WaveSurfer.create({
      container: "#waveform-container",
      waveColor: theme.palette.primary.main,
      progressColor: "white",
      cursorColor: theme.palette.primary.main,
      cursorWidth: 2,
      plugins: [
        regions,
        TimelinePlugin.create({}),
        Hover.create({
          lineColor: theme.palette.secondary.main,
          lineWidth: 1,
          labelBackground: "#555",
          labelColor: "#fff",
          labelSize: "11px",
          formatTimeCallback: (seconds: number) => {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            const millis = Math.floor((seconds % 1) * 1000);
            return `${minutes}:${secs < 10 ? "0" : ""}${secs}.${millis}`;
          },
        }),
      ],
    });

    wavesurferRef.current = ws;

    ws.on("ready", async () => {
      // Set duration when audio is ready
      setDuration(ws.getDuration());

      // Parse WAV file for existing cue points and load them as splice markers
      const urlToLoad = currentAudioUrl || audioUrl;
      try {
        const existingCuePoints = await parseWavCuePoints(urlToLoad);
        if (existingCuePoints.length > 0) {
          console.log("Loading existing cue points as splice markers:", existingCuePoints);
          setSpliceMarkersStore(existingCuePoints);

          // Create visual splice marker regions for each cue point
          existingCuePoints.forEach((cueTime, index) => {
            regions.addRegion({
              start: cueTime,
              end: cueTime,
              color: "rgba(0, 255, 255, 0.8)",
              drag: true,
              resize: false,
              id: `splice-marker-cue-${index}-${Date.now()}`,
              content: "⚡",
            });
          });
        }
      } catch (error) {
        console.error("Error loading cue points:", error);
      }

      // Always update the audio buffer from the currently loaded audio
      // This ensures the store has the most current audio buffer
      const backend = (ws as unknown as { backend?: { buffer?: AudioBuffer } })
        .backend;
      if (backend && backend.buffer) {
        console.log("Using backend buffer for current audio");
        setAudioBuffer(backend.buffer);
      } else {
        // Fallback: load and decode the current audio file manually
        console.log("Backend buffer not available, loading current audio manually");
        fetch(urlToLoad)
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => {
            const audioContext = new (window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
            return audioContext.decodeAudioData(arrayBuffer);
          })
          .then(decodedBuffer => {
            console.log("Audio buffer decoded successfully:", decodedBuffer.length, "samples");
            setAudioBuffer(decodedBuffer);
          })
          .catch(error => {
            console.error("Error decoding audio:", error);
          });
      }
    });
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => {
      console.log("Playback finished");
      setIsPlaying(false);
      // Handle whole-audio looping (when no crop region exists)
      if (isLoopingRef.current && !cropRegionRef.current) {
        ws.seekTo(0);
        ws.play();
      }
    });

    // Update current time during playback
    ws.on("timeupdate", (time: number) => {
      setCurrentTime(time);
    });

    // Update current time when interacting with the waveform
    ws.on("interaction", () => {
      setCurrentTime(ws.getCurrentTime());
    });

    // Update current time when clicking on the waveform
    ws.on("click", () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.load(currentAudioUrl || audioUrl);

    // Set up region event listeners
    regions.on("region-out", (region: Region) => {
      // console.log("Region out:", region);
      // When a region finishes playing, loop it if looping is enabled
      if (region.id === "crop-loop" && isLoopingRef.current) {
        // console.log("Looping region:", region);
        region.play();
      } else if (region.id === "crop-loop") {
        // console.log("Region ended, not looping:", region);
        ws.pause();
      }
    });

    const updateRegionsAndMarkers = () => {
      // @ts-expect-error: regions is not typed in wavesurfer.js yet
      const regionList: Region[] = Object.values(ws.regions?.list ?? {});
      setRegions(
        regionList
          .filter((r) => r.end > r.start)
          .map((r) => ({ start: r.start, end: r.end })),
      );
      setMarkers(
        regionList.filter((r) => r.end === r.start).map((r) => r.start),
      );
    };
    // @ts-expect-error: event types are not complete in wavesurfer.js
    ws.on("region-updated", updateRegionsAndMarkers);
    // @ts-expect-error: event types are not complete in wavesurfer.js
    ws.on("region-created", updateRegionsAndMarkers);
    // @ts-expect-error: event types are not complete in wavesurfer.js
    ws.on("region-removed", updateRegionsAndMarkers);

    // Handle splice marker selection
    regions.on("region-clicked", (region: Region) => {
      console.log("Region clicked:", region.id, "starts with splice-marker:", region.id.startsWith("splice-marker-"));
      if (region.id.startsWith("splice-marker-")) {
        console.log("Splice marker selected:", region.id);
        // For splice markers, we want to select them but not seek to their position
        setSelectedSpliceMarker(region);
        updateSpliceMarkerColors(region);

        // Store current position to restore it after the region click
        const currentPosition = ws.getCurrentTime();

        // Use a timeout to restore the position after the region click processing
        setTimeout(() => {
          if (wavesurferRef.current) {
            const duration = wavesurferRef.current.getDuration();
            if (duration > 0) {
              wavesurferRef.current.seekTo(currentPosition / duration);
            }
          }
        }, 0);
      } else {
        console.log("Non-splice marker clicked, clearing selection");
        setSelectedSpliceMarker(null);
        updateSpliceMarkerColors(null);
      }
    });

    return () => {
      // Only destroy if not already destroyed
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch {
          // Ignore DOMException: The operation was aborted
        }
        wavesurferRef.current = null;
        regionsRef.current = null;
      }
    };
  }, [audioUrl, currentAudioUrl, setAudioBuffer, setMarkers, setRegions, theme, parseWavCuePoints, setSpliceMarkersStore, updateSpliceMarkerColors]);

  // Playback controls
  const handlePlayPause = useCallback(() => {
    const ws = wavesurferRef.current;
    const regions = regionsRef.current;
    if (!ws) return;

    // Check if we have a crop region
    const region = regions
      ?.getRegions()
      .find((r: Region) => r.id === "crop-loop");

    if (region && cropRegion) {
      // If we have a crop region, play/pause the region
      if (isPlaying) {
        ws.pause();
      } else {
        region.play();
      }
    } else {
      // No crop region, play/pause normally
      ws.playPause();
    }
  }, [isPlaying, cropRegion]);

  const handleRewind = () => {
    const ws = wavesurferRef.current;
    const regions = regionsRef.current;
    if (!ws) return;

    // Check if we have a crop region
    const region = regions
      ?.getRegions()
      .find((r: Region) => r.id === "crop-loop");

    if (region && cropRegion) {
      // If we have a crop region, rewind to the start of the region
      ws.seekTo(region.start / ws.getDuration());
    } else {
      // No crop region, rewind to the start of the audio
      ws.seekTo(0);
    }
  }

  // Zoom controls
  const handleZoom = useCallback((value: number) => {
    setZoom(value);
    const ws = wavesurferRef.current;
    if (ws) ws.zoom(value);
  }, []);

  // Add region button handler
  const handleCropRegion = useCallback(() => {
    const ws = wavesurferRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions) return;

    // Check if crop region already exists by looking for existing region
    const existingRegion = regions
      .getRegions()
      .find((r: Region) => r.id === "crop-loop");

    if (!existingRegion) {
      // Create new crop region
      const duration = ws.getDuration();
      const region = regions.addRegion({
        start: duration * 0.25,
        end: duration * 0.75,
        color: "rgba(255, 208, 0, 0.2)",
        drag: true,
        resize: true,
        id: "crop-loop",
      });
      setCropRegion(region);
      cropRegionRef.current = region;
      setCropMode(true);
    } else {
      // Remove the existing crop-loop region
      existingRegion.remove();
      setCropRegion(null);
      cropRegionRef.current = null;
      setCropMode(false);
    }
  }, []);

  const handleLoop = useCallback(() => {
    // This function will toggle looping for the current region
    const ws = wavesurferRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions) return;

    setIsLooping((prev) => !prev);
  }, []);

  // Fade region handlers
  const handleFadeInRegion = useCallback(() => {
    const ws = wavesurferRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions) return;

    // Check if fade-in region already exists
    const existingRegion = regions
      .getRegions()
      .find((r: Region) => r.id === "fade-in");

    if (!existingRegion) {
      // Create new fade-in region (first 10% of duration)
      const duration = ws.getDuration();
      regions.addRegion({
        start: 0,
        end: duration * 0.1,
        color: "rgba(0, 255, 0, 0.2)",
        drag: true,
        resize: true,
        id: "fade-in",
      });
      setFadeInMode(true);
    } else {
      // Remove the existing fade-in region
      existingRegion.remove();
      setFadeInMode(false);
    }
  }, []);

  const handleFadeOutRegion = useCallback(() => {
    const ws = wavesurferRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions) return;

    // Check if fade-out region already exists
    const existingRegion = regions
      .getRegions()
      .find((r: Region) => r.id === "fade-out");

    if (!existingRegion) {
      // Create new fade-out region (last 10% of duration)
      const duration = ws.getDuration();
      regions.addRegion({
        start: duration * 0.9,
        end: duration,
        color: "rgba(255, 0, 0, 0.2)",
        drag: true,
        resize: true,
        id: "fade-out",
      });
      setFadeOutMode(true);
    } else {
      // Remove the existing fade-out region
      existingRegion.remove();
      setFadeOutMode(false);
    }
  }, []);

  // Splice marker handlers
  const handleAddSpliceMarker = useCallback(() => {
    const ws = wavesurferRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions) return;

    const currentTime = ws.getCurrentTime();
    console.log("Adding splice marker at time:", currentTime);

    // Create a zero-width region (start === end) for the splice marker
    regions.addRegion({
      start: currentTime,
      end: currentTime,
      color: "rgba(0, 255, 255, 0.8)",
      drag: true,
      resize: false,
      id: `splice-marker-${Date.now()}`,
      content: "⚡",
    });

    // Update store with splice marker times
    const allSpliceMarkers = [...spliceMarkersStore, currentTime].sort((a, b) => a - b);
    setSpliceMarkersStore(allSpliceMarkers);

    console.log("Splice marker added. Total markers:", allSpliceMarkers.length);
  }, [spliceMarkersStore, setSpliceMarkersStore]);

  const handleRemoveSpliceMarker = useCallback(() => {
    const ws = wavesurferRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions) return;

    if (selectedSpliceMarker) {
      console.log("Removing selected splice marker");
      const markerTime = selectedSpliceMarker.start;

      // Remove from regions
      selectedSpliceMarker.remove();

      setSelectedSpliceMarker(null);
      updateSpliceMarkerColors(null);

      // Update store
      const updatedMarkers = spliceMarkersStore.filter(time => Math.abs(time - markerTime) > 0.001);
      setSpliceMarkersStore(updatedMarkers);

      console.log("Splice marker removed. Remaining markers:", updatedMarkers.length);
    } else {
      // If no marker is selected, try to remove the closest one to cursor
      const currentTime = ws.getCurrentTime();
      const allRegions = regions.getRegions();
      const spliceRegions = allRegions.filter((r: Region) => r.id.startsWith("splice-marker-"));

      if (spliceRegions.length === 0) {
        console.log("No splice markers to remove");
        return;
      }

      // Find the closest splice marker to current cursor position
      let closestMarker = spliceRegions[0];
      let closestDistance = Math.abs(closestMarker.start - currentTime);

      for (const marker of spliceRegions) {
        const distance = Math.abs(marker.start - currentTime);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestMarker = marker;
        }
      }

      console.log("Removing closest splice marker at time:", closestMarker.start);
      const markerTime = closestMarker.start;

      // Remove from regions
      closestMarker.remove();

      // Reset selection and update colors
      setSelectedSpliceMarker(null);
      updateSpliceMarkerColors(null);

      // Update store
      const updatedMarkers = spliceMarkersStore.filter(time => Math.abs(time - markerTime) > 0.001);
      setSpliceMarkersStore(updatedMarkers);

      console.log("Closest splice marker removed. Remaining markers:", updatedMarkers.length);
    }
  }, [selectedSpliceMarker, spliceMarkersStore, setSpliceMarkersStore, updateSpliceMarkerColors]);

  // Auto-slice function to create equally distributed splice markers
  const handleAutoSlice = useCallback(() => {
    const ws = wavesurferRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions || numberOfSlices < 2) return;

    const duration = ws.getDuration();
    if (duration <= 0) {
      console.log("Audio duration not available");
      return;
    }

    console.log(`Creating ${numberOfSlices} equally distributed splice markers`);

    // Clear existing splice markers first
    const allRegions = regions.getRegions();
    const existingSpliceRegions = allRegions.filter((r: Region) => r.id.startsWith("splice-marker-"));
    existingSpliceRegions.forEach(region => region.remove());

    // Create new equally distributed splice markers
    const newSpliceMarkers: number[] = [];
    const sliceInterval = duration / numberOfSlices;

    // Add splice marker at time 0 (start)
    newSpliceMarkers.push(0);
    regions.addRegion({
      start: 0,
      end: 0,
      color: "rgba(0, 255, 255, 0.8)",
      drag: true,
      resize: false,
      id: `splice-marker-auto-0-${Date.now()}`,
      content: "⚡",
    });

    // Create splice markers at the boundaries between slices (excluding end)
    for (let i = 1; i < numberOfSlices; i++) {
      const markerTime = i * sliceInterval;
      newSpliceMarkers.push(markerTime);

      // Create visual splice marker region
      regions.addRegion({
        start: markerTime,
        end: markerTime,
        color: "rgba(0, 255, 255, 0.8)",
        drag: true,
        resize: false,
        id: `splice-marker-auto-${i}-${Date.now()}`,
        content: "⚡",
      });
    }

    // Update store with new splice marker times
    setSpliceMarkersStore(newSpliceMarkers.sort((a, b) => a - b));

    // Clear any selection
    setSelectedSpliceMarker(null);
    updateSpliceMarkerColors(null);

    console.log(`Auto-slice complete. Created ${newSpliceMarkers.length} splice markers`);
  }, [numberOfSlices, setSpliceMarkersStore, updateSpliceMarkerColors]);

  // Half markers function to remove every other splice marker starting from the second one
  // When there's only one marker, it clears all markers instead
  const handleHalfMarkers = useCallback(() => {
    const regions = regionsRef.current;
    if (!regions) return;

    const allRegions = regions.getRegions();
    const spliceRegions = allRegions.filter((r: Region) => r.id.startsWith("splice-marker-"));

    if (spliceRegions.length === 0) {
      console.log("No splice markers to process");
      return;
    }

    if (spliceRegions.length === 1) {
      // When there's only one marker, clear all markers
      console.log("Clearing single splice marker");
      spliceRegions[0].remove();
      setSpliceMarkersStore([]);
      setSelectedSpliceMarker(null);
      updateSpliceMarkerColors(null);
      console.log("Single splice marker cleared");
      return;
    }

    console.log(`Halving splice markers. Current count: ${spliceRegions.length}`);

    // Sort splice regions by their time position
    const sortedSpliceRegions = spliceRegions.sort((a, b) => a.start - b.start);

    // Remove every other marker starting from index 1 (second marker)
    const markersToRemove: Region[] = [];
    const remainingMarkerTimes: number[] = [];

    sortedSpliceRegions.forEach((region, index) => {
      if (index % 2 === 1) {
        // Remove every second marker (index 1, 3, 5, etc.)
        markersToRemove.push(region);
      } else {
        // Keep every first marker (index 0, 2, 4, etc.)
        remainingMarkerTimes.push(region.start);
      }
    });

    // Remove the selected markers from the visual display
    markersToRemove.forEach(region => region.remove());

    // Update store with remaining splice marker times
    setSpliceMarkersStore(remainingMarkerTimes.sort((a, b) => a - b));

    // Clear any selection
    setSelectedSpliceMarker(null);
    updateSpliceMarkerColors(null);

    console.log(`Half markers complete. Removed ${markersToRemove.length} markers, ${remainingMarkerTimes.length} remaining`);
  }, [setSpliceMarkersStore, updateSpliceMarkerColors]);

  // Helper function to convert AudioBuffer to WAV with cue points
  const audioBufferToWavWithCues = useCallback((buffer: AudioBuffer, cuePoints: number[]): ArrayBuffer => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;

    // Calculate cue chunk size if we have cue points
    const hasCues = cuePoints.length > 0;
    const cueChunkSize = hasCues ? 12 + (cuePoints.length * 24) : 0; // 'cue ' + size + count + (24 bytes per cue point)
    const bufferSize = 44 + dataSize + cueChunkSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i];
        const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    // Add cue points if any
    if (hasCues) {
      writeString(offset, 'cue ');
      offset += 4;
      view.setUint32(offset, cueChunkSize - 8, true); // Size of cue chunk minus 'cue ' and size fields
      offset += 4;
      view.setUint32(offset, cuePoints.length, true); // Number of cue points
      offset += 4;

      // Write each cue point
      for (let i = 0; i < cuePoints.length; i++) {
        const cueTime = cuePoints[i];
        const cueSample = Math.floor(cueTime * sampleRate);

        view.setUint32(offset, i, true); // Cue point ID
        view.setUint32(offset + 4, cueSample, true); // Play order position
        writeString(offset + 8, 'data'); // Data chunk ID
        view.setUint32(offset + 12, 0, true); // Chunk start
        view.setUint32(offset + 16, 0, true); // Block start
        view.setUint32(offset + 20, cueSample, true); // Sample offset
        offset += 24;
      }
    }

    return arrayBuffer;
  }, []);

  // Helper function to convert AudioBuffer to WAV
  const audioBufferToWav = useCallback((buffer: AudioBuffer): ArrayBuffer => {
    return audioBufferToWavWithCues(buffer, spliceMarkersStore);
  }, [audioBufferToWavWithCues, spliceMarkersStore]);

  // Helper function to convert AudioBuffer to WAV with specific format options
  const audioBufferToWavFormat = useCallback((buffer: AudioBuffer, format: ExportFormat): ArrayBuffer => {
    const originalSampleRate = buffer.sampleRate;
    const originalChannels = buffer.numberOfChannels;
    let processedBuffer = buffer;

    // Handle sample rate conversion
    if (originalSampleRate !== format.sampleRate) {
      const audioContext = new (window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      const resampleRatio = format.sampleRate / originalSampleRate;
      const newLength = Math.round(buffer.length * resampleRatio);

      processedBuffer = audioContext.createBuffer(originalChannels, newLength, format.sampleRate);

      for (let channel = 0; channel < originalChannels; channel++) {
        const originalData = buffer.getChannelData(channel);
        const newData = processedBuffer.getChannelData(channel);

        // Simple linear interpolation resampling
        for (let i = 0; i < newLength; i++) {
          const originalIndex = i / resampleRatio;
          const index = Math.floor(originalIndex);
          const fraction = originalIndex - index;

          if (index < originalData.length - 1) {
            newData[i] = originalData[index] * (1 - fraction) + originalData[index + 1] * fraction;
          } else if (index < originalData.length) {
            newData[i] = originalData[index];
          } else {
            newData[i] = 0;
          }
        }
      }
    }

    // Handle channel conversion (stereo to mono if needed)
    let finalBuffer = processedBuffer;
    const targetChannels = format.channels === 'mono' ? 1 : Math.min(processedBuffer.numberOfChannels, 2);

    if (format.channels === 'mono' && processedBuffer.numberOfChannels > 1) {
      const audioContext = new (window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      finalBuffer = audioContext.createBuffer(1, processedBuffer.length, format.sampleRate);

      const monoData = finalBuffer.getChannelData(0);
      const leftData = processedBuffer.getChannelData(0);
      const rightData = processedBuffer.numberOfChannels > 1 ? processedBuffer.getChannelData(1) : leftData;

      // Mix down to mono by averaging left and right channels
      for (let i = 0; i < processedBuffer.length; i++) {
        monoData[i] = (leftData[i] + rightData[i]) * 0.5;
      }
    }

    // Now convert to WAV format with the specified bit depth
    const length = finalBuffer.length;
    const numberOfChannels = targetChannels;
    const sampleRate = format.sampleRate;
    const bitsPerSample = format.bitDepth;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;

    // Calculate cue chunk size if we have splice markers
    const hasCues = spliceMarkersStore.length > 0;
    const cueChunkSize = hasCues ? 12 + (spliceMarkersStore.length * 24) : 0;
    const bufferSize = 44 + dataSize + cueChunkSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format.format === 'float' ? 3 : 1, true); // 3 for float, 1 for int
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Convert samples based on format
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelIndex = Math.min(channel, finalBuffer.numberOfChannels - 1);
        const sample = finalBuffer.getChannelData(channelIndex)[i];

        if (format.format === 'float' && format.bitDepth === 32) {
          view.setFloat32(offset, sample, true);
          offset += 4;
        } else if (format.bitDepth === 16) {
          const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
          view.setInt16(offset, intSample, true);
          offset += 2;
        }
      }
    }

    // Add cue points if any
    if (hasCues) {
      writeString(offset, 'cue ');
      offset += 4;
      view.setUint32(offset, cueChunkSize - 8, true);
      offset += 4;
      view.setUint32(offset, spliceMarkersStore.length, true);
      offset += 4;

      // Convert splice marker times to sample positions in the exported format
      for (let i = 0; i < spliceMarkersStore.length; i++) {
        const cueTime = spliceMarkersStore[i];
        const resampleRatio = format.sampleRate / originalSampleRate;
        const cueSample = Math.floor(cueTime * originalSampleRate * resampleRatio);

        view.setUint32(offset, i, true); // Cue point ID
        view.setUint32(offset + 4, cueSample, true); // Play order position
        writeString(offset + 8, 'data'); // Data chunk ID
        view.setUint32(offset + 12, 0, true); // Chunk start
        view.setUint32(offset + 16, 0, true); // Block start
        view.setUint32(offset + 20, cueSample, true); // Sample offset
        offset += 24;
      }
    }

    return arrayBuffer;
  }, [spliceMarkersStore]);

  // Apply audio effects handlers
  const handleApplyCrop = useCallback(() => {
    const ws = wavesurferRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions || !cropRegion) return;

    console.log("Applying crop...");

    const cropRegionData = regions.getRegions().find((r: Region) => r.id === "crop-loop");
    if (!cropRegionData) {
      console.log("No crop region found");
      return;
    }

    console.log("Crop region:", cropRegionData.start, "to", cropRegionData.end);

    // Get the audio buffer from the audio store instead of wavesurfer backend
    const audioBuffer = useAudioStore.getState().audioBuffer;
    if (!audioBuffer) {
      console.log("No audio buffer found in store");
      return;
    }

    console.log("Audio buffer found:", audioBuffer.length, "samples");

    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const startSample = Math.floor(cropRegionData.start * sampleRate);
    const endSample = Math.floor(cropRegionData.end * sampleRate);
    const newLength = endSample - startSample;

    console.log("Cropping from sample", startSample, "to", endSample, "new length:", newLength);

    // Create new audio buffer with cropped data
    const audioContext = new (window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    const newBuffer = audioContext.createBuffer(numberOfChannels, newLength, sampleRate);

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const newChannelData = newBuffer.getChannelData(channel);

      for (let i = 0; i < newLength; i++) {
        newChannelData[i] = channelData[startSample + i];
      }
    }

    console.log("New buffer created, converting to WAV...");

    // Convert to WAV blob and create new URL
    const wav = audioBufferToWav(newBuffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const newUrl = URL.createObjectURL(blob);

    console.log("Loading new URL:", newUrl);

    // Save current audio URL for undo before loading new one
    setPreviousAudioUrl(currentAudioUrl);
    setCanUndo(true);

    // Load the new cropped audio
    ws.load(newUrl).then(() => {
      console.log("Crop applied successfully");
      // Update the current audio URL to the new cropped version
      setCurrentAudioUrl(newUrl);
      // Update the audio buffer in the store with the new cropped buffer
      setAudioBuffer(newBuffer);
      // Clear crop region after applying
      setCropMode(false);
      setCropRegion(null);
      cropRegionRef.current = null;
      cropRegionData.remove();
    }).catch((error) => {
      console.error("Error loading cropped audio:", error);
    });
  }, [cropRegion, currentAudioUrl, setPreviousAudioUrl, setCanUndo, setAudioBuffer, audioBufferToWav]);

  const handleApplyFades = useCallback(() => {
    const ws = wavesurferRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions || (!fadeInMode && !fadeOutMode)) return;

    console.log("Applying fades...");

    const fadeInRegionData = regions.getRegions().find((r: Region) => r.id === "fade-in");
    const fadeOutRegionData = regions.getRegions().find((r: Region) => r.id === "fade-out");

    // Get the audio buffer from the audio store instead of wavesurfer backend
    const audioBuffer = useAudioStore.getState().audioBuffer;
    if (!audioBuffer) {
      console.log("No audio buffer found in store");
      return;
    }

    console.log("Audio buffer found:", audioBuffer.length, "samples");
    console.log("Fade-in region:", fadeInRegionData ? `0 to ${fadeInRegionData.end}` : "none");
    console.log("Fade-out region:", fadeOutRegionData ? `${fadeOutRegionData.start} to end` : "none");

    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const bufferLength = audioBuffer.length;

    // Create new audio buffer with fade effects
    const audioContext = new (window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    const newBuffer = audioContext.createBuffer(numberOfChannels, bufferLength, sampleRate);

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const newChannelData = newBuffer.getChannelData(channel);

      // Copy original data
      for (let i = 0; i < bufferLength; i++) {
        newChannelData[i] = channelData[i];
      }

      // Apply fade-in if exists
      if (fadeInRegionData) {
        const fadeInEndSample = Math.floor(fadeInRegionData.end * sampleRate);
        console.log("Applying fade-in to sample", fadeInEndSample);
        for (let i = 0; i < fadeInEndSample; i++) {
          const gain = i / fadeInEndSample; // Linear fade from 0 to 1
          newChannelData[i] *= gain;
        }
      }

      // Apply fade-out if exists
      if (fadeOutRegionData) {
        const fadeOutStartSample = Math.floor(fadeOutRegionData.start * sampleRate);
        console.log("Applying fade-out from sample", fadeOutStartSample);
        for (let i = fadeOutStartSample; i < bufferLength; i++) {
          const gain = (bufferLength - i) / (bufferLength - fadeOutStartSample); // Linear fade from 1 to 0
          newChannelData[i] *= gain;
        }
      }
    }

    console.log("Fades applied, converting to WAV...");

    // Convert to WAV blob and create new URL
    const wav = audioBufferToWav(newBuffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const newUrl = URL.createObjectURL(blob);

    console.log("Loading new URL:", newUrl);

    // Save current audio URL for undo before loading new one
    setPreviousAudioUrl(currentAudioUrl);
    setCanUndo(true);

    // Load the new faded audio
    ws.load(newUrl).then(() => {
      console.log("Fades applied successfully");
      // Update the current audio URL to the new faded version
      setCurrentAudioUrl(newUrl);
      // Update the audio buffer in the store with the new faded buffer
      setAudioBuffer(newBuffer);
      // Clear fade regions after applying
      if (fadeInRegionData) {
        setFadeInMode(false);
        fadeInRegionData.remove();
      }
      if (fadeOutRegionData) {
        setFadeOutMode(false);
        fadeOutRegionData.remove();
      }
    }).catch((error) => {
      console.error("Error loading faded audio:", error);
    });
  }, [fadeInMode, fadeOutMode, currentAudioUrl, setPreviousAudioUrl, setCanUndo, setAudioBuffer, audioBufferToWav]);

  // Undo function to restore previous audio state
  const handleUndo = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws || !canUndo || !previousAudioUrl) {
      console.log("Cannot undo: no wavesurfer, undo not available, or no previous URL");
      return;
    }

    console.log("Undoing to previous audio URL:", previousAudioUrl);

    // Load the previous audio URL
    ws.load(previousAudioUrl).then(() => {
      console.log("Undo successful");
      // Update the current audio URL to the restored version
      setCurrentAudioUrl(previousAudioUrl);
      // Clear undo state after restoring
      setPreviousAudioUrl(null);
      setCanUndo(false);
      // Clear any active regions
      setCropMode(false);
      setCropRegion(null);
      setFadeInMode(false);
      setFadeOutMode(false);
    }).catch((error) => {
      console.error("Error during undo:", error);
    });
  }, [canUndo, previousAudioUrl, setPreviousAudioUrl, setCanUndo]);

  // Export handlers
  const handleExportWav = useCallback(() => {
    const audioBuffer = useAudioStore.getState().audioBuffer;
    if (!audioBuffer) {
      console.log("No audio buffer found");
      return;
    }

    console.log("Exporting WAV with splice markers as cue points:", spliceMarkersStore);

    const wav = audioBufferToWav(audioBuffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'morphedit-export.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [spliceMarkersStore, audioBufferToWav]);

  const handleExportWavFormat = useCallback((format: ExportFormat) => {
    const audioBuffer = useAudioStore.getState().audioBuffer;
    if (!audioBuffer) {
      console.log("No audio buffer found");
      return;
    }

    console.log("Exporting WAV in format:", format, "with splice markers:", spliceMarkersStore);

    const wav = audioBufferToWavFormat(audioBuffer, format);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `morphedit-export-${format.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Close the export menu
    setExportAnchorEl(null);
  }, [spliceMarkersStore, audioBufferToWavFormat]);

  // Navigation controls
  const handleSkipForward = useCallback(() => {
    const ws = wavesurferRef.current;
    if (ws) {
      const currentTime = ws.getCurrentTime();
      const newTime = Math.min(currentTime + skipIncrement, ws.getDuration());
      ws.seekTo(newTime / ws.getDuration());
    }
  }, [skipIncrement]);

  const handleSkipBackward = useCallback(() => {
    const ws = wavesurferRef.current;
    if (ws) {
      const currentTime = ws.getCurrentTime();
      const newTime = Math.max(currentTime - skipIncrement, 0);
      ws.seekTo(newTime / ws.getDuration());
    }
  }, [skipIncrement]);

  const handleIncreaseSkipIncrement = useCallback(() => {
    setSkipIncrement((prev: number) => {
      if (prev < 0.1) return prev + 0.01; // 0.01s increments for very small values
      if (prev < 1) return prev + 0.1; // 0.1s increments for small values
      if (prev < 10) return prev + 1; // 1s increments for medium values
      if (prev < 60) return prev + 10; // 10s increments for large values
      return prev + 30; // 30s increments for very large values
    });
  }, []);

  const handleDecreaseSkipIncrement = useCallback(() => {
    setSkipIncrement((prev: number) => {
      if (prev > 60) return prev - 30; // 30s decrements for very large values
      if (prev > 10) return prev - 10; // 10s decrements for large values
      if (prev > 1) return prev - 1; // 1s decrements for medium values
      if (prev > 0.1) return prev - 0.1; // 0.1s decrements for small values
      if (prev > 0.01) return prev - 0.01; // 0.01s decrements for very small values
      return 0.01; // Minimum value
    });
  }, []);

  // Expose methods to parent component via ref
  useImperativeHandle(
    ref,
    () => ({
      handlePlayPause,
      handleCropRegion,
      handleLoop,
      handleZoom,
      getCurrentZoom: () => zoom,
      handleSkipForward,
      handleSkipBackward,
      handleIncreaseSkipIncrement,
      handleDecreaseSkipIncrement,
      handleFadeInRegion,
      handleFadeOutRegion,
      handleApplyCrop,
      handleApplyFades,
      handleUndo,
      handleExportWav,
      handleAddSpliceMarker,
      handleRemoveSpliceMarker,
      handleAutoSlice,
      handleHalfMarkers,
    }),
    [
      handlePlayPause,
      handleCropRegion,
      handleLoop,
      handleZoom,
      handleSkipForward,
      handleSkipBackward,
      handleIncreaseSkipIncrement,
      handleDecreaseSkipIncrement,
      handleFadeInRegion,
      handleFadeOutRegion,
      handleApplyCrop,
      handleApplyFades,
      handleUndo,
      handleExportWav,
      handleAddSpliceMarker,
      handleRemoveSpliceMarker,
      handleAutoSlice,
      handleHalfMarkers,
      zoom,
    ],
  );

  // Format time for display
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
      {/* Playback controls */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
        <Tooltip title="Play/Pause" enterDelay={500} leaveDelay={200}>
          <IconButton
            onClick={handlePlayPause}
            color="primary"
            size="large"
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Loop region" enterDelay={500} leaveDelay={200}>
          <IconButton
            onClick={handleLoop}
            color={isLooping ? "primary" : "default"}
          >
            <RepeatIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Rewind to start" enterDelay={500} leaveDelay={200}>
          <IconButton onClick={handleRewind} color="primary">
            <FirstPageIcon />
          </IconButton>
        </Tooltip>

        {/* Zoom controls */}
        <Tooltip title="Zoom" enterDelay={500} leaveDelay={200}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 2 }}>
            <ZoomOutIcon color="action" />
            <Slider
              value={zoom}
              onChange={(_, value) => handleZoom(value as number)}
              min={0}
              max={500}
              step={10}
              sx={{ width: 100 }}
              size="small"
            />
            <ZoomInIcon color="action" />
          </Stack>
        </Tooltip>
        {/* Times */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 2 }}>
          <Typography variant="body2">
            {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>
          <Typography variant="body2">
            Skip: {skipIncrement}s
          </Typography>
          {spliceMarkersStore.length > 0 && (
            <Typography variant="body2" color="primary">
              Splice markers: {spliceMarkersStore.length}
            </Typography>
          )}
        </Stack>
      </Stack>
      {/* Export controls */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
        <Tooltip title="Export audio" enterDelay={500} leaveDelay={200}>
          <ButtonGroup variant="outlined" sx={{ ml: 2 }}>
            <Button
              onClick={handleExportWav}
              startIcon={<DownloadIcon />}
            >
              Export WAV
            </Button>
            <Button
              size="small"
              onClick={(event) => setExportAnchorEl(event.currentTarget)}
              sx={{ px: 1 }}
            >
              <ArrowDropDownIcon />
            </Button>
          </ButtonGroup>
        </Tooltip>
        <Menu
          anchorEl={exportAnchorEl}
          open={exportMenuOpen}
          onClose={() => setExportAnchorEl(null)}
          MenuListProps={{
            'aria-labelledby': 'export-split-button',
          }}
        >
          {exportFormats.map((format, index) => (
            <MenuItem
              key={index}
              onClick={() => handleExportWavFormat(format)}
              sx={{ minWidth: 250 }}
            >
              {format.label}
            </MenuItem>
          ))}
        </Menu>
        {/* Region Controls */}
        <Tooltip title="Create crop/loop region" enterDelay={500} leaveDelay={200}>
          <Button
            variant={cropMode ? "contained" : "outlined"}
            color="primary"
            onClick={handleCropRegion}
            sx={{ ml: 2 }}
          >
            Crop/Loop Region
          </Button>
        </Tooltip>
        <Tooltip title="Create a fade-in region" enterDelay={500} leaveDelay={200}>
          <Button
            variant={fadeInMode ? "contained" : "outlined"}
            color="primary"
            onClick={handleFadeInRegion}
            sx={{ ml: 2 }}
            startIcon={<TrendingUpIcon />}
          >
            Fade In
          </Button>
        </Tooltip>
        <Tooltip title="Create fade-out region" enterDelay={500} leaveDelay={200}>
          <Button
            variant={fadeOutMode ? "contained" : "outlined"}
            color="primary"
            onClick={handleFadeOutRegion}
            sx={{ ml: 2 }}
            startIcon={<TrendingDownIcon />}
          >
            Fade Out
          </Button>
        </Tooltip>
        <Tooltip title="Apply crop to current audio" enterDelay={500} leaveDelay={200}>
          <Button
            variant="contained"
            color="success"
            onClick={handleApplyCrop}
            sx={{ ml: 2 }}
            disabled={!cropMode}
          >
            Apply Crop
          </Button>
        </Tooltip>
        <Tooltip title="Apply fade regions to current audio" enterDelay={500} leaveDelay={200}>
          <Button
            variant="contained"
            color="success"
            onClick={handleApplyFades}
            sx={{ ml: 2 }}
            disabled={!fadeInMode && !fadeOutMode}
          >
            Apply Fades
          </Button>
        </Tooltip>
        <Tooltip title="Undo last edit" enterDelay={500} leaveDelay={200}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleUndo}
            sx={{ ml: 2 }}
            disabled={!canUndo}
            startIcon={<UndoIcon />}
          >
            Undo
          </Button>
        </Tooltip>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
        <Tooltip title="Add splice marker at current time" enterDelay={500} leaveDelay={200}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleAddSpliceMarker}
          >
            <AddIcon />
          </Button>
        </Tooltip>
        <Tooltip title="Remove selected splice marker" enterDelay={500} leaveDelay={200}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleRemoveSpliceMarker}
            disabled={!selectedSpliceMarker}
          >
            <DeleteIcon />
          </Button>
        </Tooltip>
        {/* Auto-slice controls */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 3 }}>
          <Tooltip title="Number of equal slices to create" enterDelay={500} leaveDelay={200}>
            <TextField
              label="Slices"
              type="number"
              value={numberOfSlices}
              onChange={(e) => setNumberOfSlices(Math.max(2, parseInt(e.target.value) || 2))}
              size="small"
              inputProps={{ min: 2, max: 100 }}
              sx={{ width: 80 }}
            />
          </Tooltip>
          <Tooltip title="Create equally distributed splice markers" enterDelay={500} leaveDelay={200}>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleAutoSlice}
              startIcon={<ContentCutIcon />}
              disabled={!duration || duration <= 0}
            >
              Auto Slice
            </Button>
          </Tooltip>
          <Tooltip title={spliceMarkersStore.length === 1 ? "Clear the single splice marker" : "Remove every other splice marker (keep 1st, 3rd, 5th...)"} enterDelay={500} leaveDelay={200}>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleHalfMarkers}
              startIcon={spliceMarkersStore.length === 1 ? <ClearIcon /> : <FilterListIcon />}
              disabled={spliceMarkersStore.length === 0}
            >
              {spliceMarkersStore.length === 1 ? "Clear Markers" : "Half Markers"}
            </Button>
          </Tooltip>
        </Stack>
      </Stack>
    </Container >
  );
});

Waveform.displayName = "Waveform";

export default Waveform;

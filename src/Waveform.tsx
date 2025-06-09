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
import { IconButton, Slider, Stack, Typography, Button, Tooltip, Container, Menu, MenuItem, ButtonGroup } from "@mui/material";
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
      cursorWidth: 1,
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

    ws.on("ready", () => {
      // Set duration when audio is ready
      setDuration(ws.getDuration());

      // Always update the audio buffer from the currently loaded audio
      // This ensures the store has the most current audio buffer
      const backend = (ws as unknown as { backend?: { buffer?: AudioBuffer } })
        .backend;
      if (backend && backend.buffer) {
        console.log("Using backend buffer for current audio");
        setAudioBuffer(backend.buffer);
      } else {
        // Fallback: load and decode the current audio file manually
        const urlToLoad = currentAudioUrl || audioUrl;
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
  }, [audioUrl, currentAudioUrl, setAudioBuffer, setMarkers, setRegions, theme]);

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
  const handleZoom = (value: number) => {
    setZoom(value);
    const ws = wavesurferRef.current;
    if (ws) ws.zoom(value);
  };

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
  }, []);  // Apply audio effects handlers
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
  }, [cropRegion, currentAudioUrl, setPreviousAudioUrl, setCanUndo, setAudioBuffer]); const handleApplyFades = useCallback(() => {
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
  }, [fadeInMode, fadeOutMode, currentAudioUrl, setPreviousAudioUrl, setCanUndo, setAudioBuffer]);

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

  // Helper function to convert AudioBuffer to WAV
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;

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

    return arrayBuffer;
  };  // Helper function to convert AudioBuffer to WAV with specific format options
  const audioBufferToWavFormat = (buffer: AudioBuffer, format: ExportFormat): ArrayBuffer => {
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

    const length = finalBuffer.length;
    const numberOfChannels = targetChannels;
    const sampleRate = format.sampleRate;
    const bitsPerSample = format.bitDepth;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;

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

    // Format code: 1 = PCM integer, 3 = IEEE float
    const formatCode = format.format === 'float' ? 3 : 1;
    view.setUint16(20, formatCode, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelIndex = Math.min(channel, finalBuffer.numberOfChannels - 1);
        const sample = finalBuffer.getChannelData(channelIndex)[i];

        if (format.format === 'float' && format.bitDepth === 32) {
          // 32-bit float
          view.setFloat32(offset, sample, true);
          offset += 4;
        } else if (format.bitDepth === 16) {
          // 16-bit integer
          const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
          view.setInt16(offset, intSample, true);
          offset += 2;
        }
      }
    }

    return arrayBuffer;
  };

  // Export format interface
  interface ExportFormat {
    label: string;
    sampleRate: number;
    bitDepth: 16 | 32;
    channels: 'stereo' | 'mono';
    format: 'int' | 'float';
  }

  // Generalized export function
  const handleExportWavFormat = useCallback((format: ExportFormat) => {
    const audioBuffer = useAudioStore.getState().audioBuffer;
    if (!audioBuffer) {
      console.log("No audio buffer available for export");
      return;
    }

    console.log(`Exporting audio as ${format.label}...`);

    // Convert to the specified format
    const wav = audioBufferToWavFormat(audioBuffer, format);
    const blob = new Blob([wav], { type: 'audio/wav' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Generate filename with timestamp and format info
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const formatSuffix = `${format.sampleRate}Hz-${format.bitDepth}bit-${format.channels}`;
    link.download = `morphedit-export-${timestamp}-${formatSuffix}.wav`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);

    console.log("Export completed successfully");

    // Close the dropdown menu
    setExportAnchorEl(null);
  }, [audioBufferToWavFormat]);

  // Export current audio as default 32-bit float WAV at 48kHz (for the main button)
  const handleExportWav = useCallback(() => {
    handleExportWavFormat(exportFormats[0]); // Default to first format
  }, [handleExportWavFormat]);

  // Skip navigation functions
  const handleSkipForward = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    const currentTime = ws.getCurrentTime();
    const duration = ws.getDuration();
    const newTime = Math.min(currentTime + skipIncrement, duration);
    ws.seekTo(newTime / duration);
  }, [skipIncrement]);

  const handleSkipBackward = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    const currentTime = ws.getCurrentTime();
    const duration = ws.getDuration();
    const newTime = Math.max(currentTime - skipIncrement, 0);
    ws.seekTo(newTime / duration);
  }, [skipIncrement]);

  const handleIncreaseSkipIncrement = useCallback(() => {
    setSkipIncrement((prev) => {
      // Logarithmic increase: small increments get smaller increases, large increments get larger increases
      if (prev < 0.1) return prev + 0.01; // 0.01s increments for very small values
      if (prev < 1) return prev + 0.1; // 0.1s increments for small values
      if (prev < 10) return prev + 1; // 1s increments for medium values
      if (prev < 60) return prev + 5; // 5s increments for large values
      return Math.min(prev + 30, 300); // 30s increments for very large values, max 5 minutes
    });
  }, []);

  const handleDecreaseSkipIncrement = useCallback(() => {
    setSkipIncrement((prev) => {
      // Logarithmic decrease: reverse of the increase logic
      if (prev > 60) return prev - 30; // 30s decrements for very large values
      if (prev > 10) return prev - 5; // 5s decrements for large values
      if (prev > 1) return prev - 1; // 1s decrements for medium values
      if (prev > 0.1) return prev - 0.1; // 0.1s decrements for small values
      return Math.max(prev - 0.01, 0.01); // 0.01s decrements for very small values, min 0.01s
    });
  }, []);

  // Expose functions to parent component via ref
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
    }),
    [
      handlePlayPause,
      handleCropRegion,
      handleLoop,
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
      zoom,
    ],
  );

  return (
    <Container>
      <Container className="info-container">
        <Container className="info-item">
          <Typography variant="body2" color="primary">
            Duration: {duration.toFixed(2)}s
          </Typography>
        </Container>
        <Container className="info-item">
          <Typography variant="body2" color="primary">
            Position: {currentTime.toFixed(2)}s
          </Typography>
        </Container>
        <Container className="info-item">
          <Typography variant="body2" color="primary">
            Skip:{" "}
            {skipIncrement < 1
              ? `${(skipIncrement * 1000).toFixed(0)}ms`
              : `${skipIncrement.toFixed(1)}s`}
          </Typography>
        </Container>
        <Container className="info-item-zoom">
          <Typography variant="body2" color="primary">
            Zoom
          </Typography>
          <Container className="zoom-controls">
            <IconButton
              onClick={() => handleZoom(Math.max(zoom - 20, 0))}
              size="small"
              color="primary"
            >
              <ZoomOutIcon fontSize="small" />
            </IconButton>
            <Slider
              min={0}
              max={500}
              step={10}
              value={zoom}
              onChange={(_, value) => handleZoom(value as number)}
              sx={{ width: 80 }}
              size="small"
            />
            <IconButton
              onClick={() => handleZoom(Math.min(zoom + 20, 500))}
              size="small"
              color="primary"
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Container>
        </Container >
      </Container >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="center"
        mb={2}
      >
        {/* <Container id="transport-controls"> */}
        <Tooltip title="Rewind to beginning" enterDelay={500} leaveDelay={200}>
          <Button
            variant="outlined"
            color="primary"
            sx={{ ml: 2 }}
            onClick={handleRewind}
          >
            <FirstPageIcon />
          </Button>
        </Tooltip>
        <Tooltip title="Play/Pause" enterDelay={500} leaveDelay={200}>
          <Button
            variant="outlined"
            color="primary"
            sx={{ ml: 2 }}
            onClick={handlePlayPause}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </Button>
        </Tooltip>
        <Tooltip title="Loop thru the audio or loop region if enabled" enterDelay={500} leaveDelay={200}>
          <Button
            variant={isLooping ? "contained" : "outlined"}
            color="primary"
            onClick={handleLoop}
            sx={{ ml: 2 }}
          >
            <RepeatIcon />
          </Button>
        </Tooltip>
        <Tooltip title="Export current audio as 32-bit float WAV at 48kHz" enterDelay={500} leaveDelay={200}>
          <ButtonGroup variant="contained" color="secondary" sx={{ ml: 2 }}>
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
        {/* </Container> */}
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
    </Container>
  );
});

Waveform.displayName = "Waveform";

export default Waveform;

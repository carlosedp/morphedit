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
import { IconButton, Slider, Stack, Typography, Button } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RepeatIcon from "@mui/icons-material/Repeat";

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
  // Zoom state
  const [zoom, setZoom] = useState(0);
  // Skip navigation state
  const [skipIncrement, setSkipIncrement] = useState(1.0); // Default 1 second
  // Audio info state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const setAudioBuffer = useAudioStore((s: AudioState) => s.setAudioBuffer);
  const setMarkers = useAudioStore((s: AudioState) => s.setMarkers);
  const setRegions = useAudioStore((s: AudioState) => s.setRegions);

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
      setZoom(0);
      setCurrentTime(0);
      setDuration(0);
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
      const backend = (ws as unknown as { backend?: { buffer?: AudioBuffer } })
        .backend;
      if (backend && backend.buffer) {
        setAudioBuffer(backend.buffer);
      }
      // Set duration when audio is ready
      setDuration(ws.getDuration());
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

    ws.load(audioUrl);

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
  }, [audioUrl, setAudioBuffer, setMarkers, setRegions, theme]);

  // Playback controls
  const handlePlayPause = () => {
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
  };

  // Zoom controls
  const handleZoom = (value: number) => {
    setZoom(value);
    const ws = wavesurferRef.current;
    if (ws) ws.zoom(value);
  };

  // Add region button handler
  const handleCropRegion = () => {
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
  };

  const handleLoop = useCallback(() => {
    // This function will toggle looping for the current region
    const ws = wavesurferRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions) return;

    setIsLooping((prev) => !prev);
  }, []);

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
    }),
    [
      handleLoop,
      handleSkipForward,
      handleSkipBackward,
      handleIncreaseSkipIncrement,
      handleDecreaseSkipIncrement,
      zoom,
      isPlaying,
      cropRegion,
    ],
  );

  return (
    <div>
      <div className="info-container">
        <div className="info-item">
          <Typography variant="body2" color="primary">
            Duration: {duration.toFixed(2)}s
          </Typography>
        </div>
        <div className="info-item">
          <Typography variant="body2" color="primary">
            Position: {currentTime.toFixed(2)}s
          </Typography>
        </div>
        <div className="info-item">
          <Typography variant="body2" color="primary">
            Skip:{" "}
            {skipIncrement < 1
              ? `${(skipIncrement * 1000).toFixed(0)}ms`
              : `${skipIncrement.toFixed(1)}s`}
          </Typography>
        </div>
        <div className="info-item-zoom">
          <Typography variant="body2" color="primary">
            Zoom
          </Typography>
          <div className="zoom-controls">
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
          </div>
        </div>
      </div>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="center"
        mb={2}
      >
        <Button
          variant="outlined"
          color="primary"
          sx={{ ml: 2 }}
          onClick={handlePlayPause}
        >
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </Button>
        <Button
          variant={cropMode ? "contained" : "outlined"}
          color="primary"
          onClick={handleCropRegion}
          sx={{ ml: 2 }}
        >
          Crop/Loop Region
        </Button>
        <Button
          variant={isLooping ? "contained" : "outlined"}
          color="primary"
          onClick={handleLoop}
          sx={{ ml: 2 }}
        >
          <RepeatIcon />
        </Button>
      </Stack>
    </div>
  );
});

Waveform.displayName = "Waveform";

export default Waveform;

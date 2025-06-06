import React, { useRef, useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";

import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";
import Hover from "wavesurfer.js/dist/plugins/hover.esm.js";

import { useAudioStore } from "./audioStore";
import type { AudioState } from "./audioStore";
import {
  Box,
  IconButton,
  Slider,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RepeatIcon from "@mui/icons-material/Repeat";

interface WaveformProps {
  audioUrl: string;
}

const Waveform: React.FC<WaveformProps> = ({ audioUrl }) => {
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
          .map((r) => ({ start: r.start, end: r.end }))
      );
      setMarkers(
        regionList.filter((r) => r.end === r.start).map((r) => r.start)
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

    if (!cropMode) {
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
      // Remove the crop-loop region
      if (cropRegion) {
        cropRegion.remove();
        setCropRegion(null);
        cropRegionRef.current = null;
      }
      setCropMode(false);
    }
  };

  const handleLoop = () => {
    // This function will toggle looping for the current region
    const ws = wavesurferRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions) return;

    const newLoopingState = !isLooping;
    setIsLooping(newLoopingState);
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="center"
        mb={2}
      >
        <IconButton onClick={handlePlayPause} color="primary">
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <Typography variant="body2">Zoom</Typography>
        <IconButton onClick={() => handleZoom(Math.max(zoom - 20, 0))}>
          <ZoomOutIcon />
        </IconButton>
        <Slider
          min={0}
          max={500}
          step={10}
          value={zoom}
          onChange={(_, value) => handleZoom(value as number)}
          sx={{ width: 120 }}
        />
        <IconButton onClick={() => handleZoom(Math.min(zoom + 20, 500))}>
          <ZoomInIcon />
        </IconButton>
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
    </Box>
  );
};

export default Waveform;

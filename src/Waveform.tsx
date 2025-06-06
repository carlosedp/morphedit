import React, { useRef, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { useAudioStore } from './audioStore';
import type { AudioState } from './audioStore';
import { Box, IconButton, Slider, Stack, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

interface WaveformProps {
  audioUrl: string;
}

const Waveform: React.FC<WaveformProps> = ({ audioUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(0);
  const setAudioBuffer = useAudioStore((s: AudioState) => s.setAudioBuffer);
  const setMarkers = useAudioStore((s: AudioState) => s.setMarkers);
  const setRegions = useAudioStore((s: AudioState) => s.setRegions);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';
    const ws = WaveSurfer.create({
      container,
      waveColor: '#90caf9',
      progressColor: '#1976d2',
      // height: 128,
      plugins: [
        RegionsPlugin.create(),
      ],
    });
    wavesurferRef.current = ws;
    ws.on('ready', () => {
      const backend = (ws as unknown as { backend?: { buffer?: AudioBuffer } }).backend;
      if (backend && backend.buffer) {
        setAudioBuffer(backend.buffer);
      }
    });
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.load(audioUrl);

    const updateRegionsAndMarkers = () => {
      // @ts-expect-error: regions is not typed in wavesurfer.js yet
      const regionList: Region[] = Object.values(ws.regions?.list ?? {});
      setRegions(regionList.filter(r => r.end > r.start).map(r => ({ start: r.start, end: r.end })));
      setMarkers(regionList.filter(r => r.end === r.start).map(r => r.start));
    };
    // @ts-expect-error: event types are not complete in wavesurfer.js
    ws.on('region-updated', updateRegionsAndMarkers);
    // @ts-expect-error: event types are not complete in wavesurfer.js
    ws.on('region-created', updateRegionsAndMarkers);
    // @ts-expect-error: event types are not complete in wavesurfer.js
    ws.on('region-removed', updateRegionsAndMarkers);

    return () => {
      ws.destroy();
      container.innerHTML = '';
      wavesurferRef.current = null;
    };
  }, [audioUrl, setAudioBuffer, setMarkers, setRegions]);

  // Playback controls
  const handlePlayPause = () => {
    const ws = wavesurferRef.current;
    if (ws) ws.playPause();
  };

  // Zoom controls
  const handleZoom = (value: number) => {
    setZoom(value);
    const ws = wavesurferRef.current;
    if (ws) ws.zoom(value);
  };

  return (
    <Box>
      <Box ref={containerRef} sx={{ width: '100%', minHeight: 140, border: '1px solid #ccc', borderRadius: 2, mb: 2 }} />
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" mb={2}>
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
      </Stack>
      {/* Add more controls here as needed */}
    </Box>
  );
};

export default Waveform;

# Morphedit Audio Editor

Morphedit is a browser-based audio editor built with React, TypeScript, Vite, and wavesurfer.js. It supports waveform visualization, zoom, markers, and regions. State management is handled by Zustand, and the UI uses Material-UI (MUI).

## Features

- Drag or open audio files
- Waveform visualization (mono)
- Zoom, markers, and region selection
- State management with Zustand
- Modern UI with MUI
- Placeholders for beat detection and audio export (coming soon)
- All processing in the browser
- Ready for future Electron packaging

## Getting Started

```sh
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

## Project Structure

- `src/Waveform.tsx`: Waveform visualization and controls
- `src/audioStore.ts`: Zustand state management
- `src/App.tsx`: Main app UI

## Roadmap

- Beat/transient detection with sensitivity
- Export WAV with configurable sample rate/bit depth
- Fade-in/out, cropping, and more tools

---

This project was bootstrapped with Vite + React + TypeScript.

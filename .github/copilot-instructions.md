# Copilot Instructions for MorphEdit

## Project Overview

- **MorphEdit** is a cross-platform audio editor for preparing audio files for samplers and hardware instruments, with a focus on MakeNoise Morphagene workflows.
- Built with **React 19**, **TypeScript**, **Vite**, and **Material-UI** for the frontend; **Electron** for desktop; **WaveSurfer.js** and **RubberBand WASM** for audio processing; **Zustand** for state management.
- Supports both web (PWA) and desktop (Electron) builds. All audio processing is local—no server-side processing.

## Key Architecture & Patterns

- **src/** contains all main application code. Major files:
- **Data Flow**: React components interact with Zustand stores for state. Audio processing is handled in-browser using WASM and Web Audio API.
- **Keyboard Shortcuts**: Centralized in `keyboardShortcuts.ts` and `useKeyboardShortcuts.ts`.
- **Constants**: Defined in `constants.ts` for easy reference (e.g., audio formats, default settings).
- **Settings**: Persisted locally (see `settingsStore.ts`).

## Developer Workflows

- **Install dependencies**: `bun install` (Bun is required, not npm/yarn)
- **Start dev server**: `bun run dev` (web, hot reload)
- **Build (web/PWA)**: `bun run build` or `bun run build:pwa`
- **Build (Electron desktop)**: `bun run electron:dist` (full package), `bun run electron:dev` (dev mode)
- **Run tests**:
  - Unit: `bun run test` (Vitest)
  - E2E: `bun run test:e2e` (Playwright)
- **Lint/Format**: `bun run lint`, `bun run format`
- **Service Worker**: Generated via `bun run generate-sw`

## Project-Specific Conventions

- **Bun** is the only supported package manager/runtime.
- **TypeScript** is used throughout; strict type checking is enforced.
- **Material-UI** for all UI components; custom styles in `src/styles/`.
- **Keyboard shortcuts** and UI actions are documented in `public/USER_MANUAL.md`.
- **No server-side code**: All processing is client-side.
- **Electron** entry: `electron-main.cjs`, preload: `preload.js`.
- **Build outputs**: Web in `dist/`, Electron in `electron-dist/`.

## References

- User manual: `public/USER_MANUAL.md`
- Feature list: `docs/FeatureList.md`
- PWA deployment: `docs/PWA_DEPLOYMENT.md`
- Auto-update: `docs/AUTO_UPDATE_SETUP.md`

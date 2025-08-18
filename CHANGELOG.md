# Changelog

All notable changes to MorphEdit from a user perspective are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.0.0]

- Some improvements on UI for keyboard shortcuts and added a new auto-splice dialog adding splices by timing subdivisions based on detected BPM (which could also be overridden).

## [5.7.0]

### Fixed

- Fixed issues with zoom reset functionality
- Use Bun as Javascript runtime and package manager for better performance

### Added

- Improved test coverage for better reliability
- Updated dependencies for enhanced performance and security

## [5.6.1]

### Fixed

- **PWA File Caching**: Fixed Progressive Web App file caching issues for better offline performance
- Enhanced PWA support with improved service worker caching strategy

### Changed

- Improved README documentation
- Enhanced service worker generation script with prettier formatting

## [5.6.0]

### Added

- **Progressive Web App (PWA) Support**: MorphEdit can now be installed as a local app from your browser
  - Install MorphEdit directly from your browser's address bar
  - Works offline once installed
  - Native app-like experience on desktop and mobile devices
  - Includes proper app manifest and service worker for caching

### Changed

- Enhanced web app capabilities for standalone usage

## [5.5.1]

### Fixed

- **Browser Compatibility**: Improved zoom handling and file opening on Chromium-based browsers
- Enhanced file loading specifically for Chrome, Edge, and other Chromium browsers
- Better zoom reset functionality across all browsers
- Improved footer component separation for better code organization

### Changed

- Increased Vite chunk size warning limit for better build performance

## [5.5.0]

### Added

- **Settings Persistence**: App settings are now saved and restored between sessions
  - Fade curve preferences
  - Export format defaults
  - Recording duration settings
  - Transient detection parameters
  - All settings persist automatically when you close and reopen the app

- **Audio Reversal**: New feature to reverse audio
  - Reverse entire audio file
  - Reverse only the crop/loop region
  - Accessible through the main interface

- **Zero-Crossing Snapping**: Enhanced precision for audio editing
  - Crop regions automatically snap to zero-crossings to prevent audio artifacts
  - Fade regions also snap to zero-crossings for cleaner transitions
  - Splice markers maintain zero-crossing alignment when moved or locked

### Improved

- Better snapping functionality across all region types
- Enhanced manual documentation with color improvements and feature explanations

## [5.4.0]

### Added

- **Crossfade to Selected Marker**: New crossfade functionality
  - Apply crossfades directly to selected splice markers
  - Customizable crossfade length and curve types
  - Seamless transitions between audio segments

### Improved

- **Enhanced Information Bar**: Better layout and more detailed information display
  - Clearer presentation of audio file details
  - Improved visual organization of controls
  - Better responsive design for different screen sizes

### Fixed

- Fade regions no longer incorrectly created inside crop regions
- Enhanced user manual with detailed crossfade processing instructions

### Changed

- Updated library dependencies for improved performance

## [5.3.0]

### Improved

- **User Interface Enhancements**: Better GUI organization and layout
  - Improved information line layout and spacing
  - Better button and text positioning to prevent UI jumping
  - Enhanced marker deselection by clicking on waveform
  - More intuitive control placement and behavior

### Fixed

- Fixed marker deselection functionality when clicking elsewhere on the waveform

## [5.2.1]

### Fixed

- **Audio Visualization**: Normalized audio visualization in the editor
  - Consistent waveform display across different audio files
  - Better visual representation of audio levels

### Changed

- Reverted browser-specific recording changes that were causing issues with certain browsers

## [5.2.0]

### Added

- **Mobile Browser Support**: Enhanced support for mobile devices
  - Improved audio recording functionality on mobile browsers
  - iOS-specific optimizations for better recording experience
  - Better dropdown menu functionality on mobile devices

### Improved

- **Browser Detection**: Enhanced browser-specific optimizations
  - Better handling of different browser capabilities
  - Improved recording functionality across various browsers

### Fixed

- Fixed dropdown curve selection menus for fade controls
- Added region length display for crop and fade regions
- Enhanced build optimization and dependency handling

## [5.1.0]

### Added

- **Audio Recording**: New built-in audio recording functionality
  - Record audio directly into MorphEdit using your microphone
  - Stereo recording support for high-quality capture
  - Preview recorded audio before adding to your project
  - Configurable recording duration settings

### Improved

- **Splice Playback**: Enhanced splice marker playback functionality
  - Better handling of playback boundaries
  - Prevents audio playback from overshooting splice endpoints
  - Improved stop conditions for more precise playback control

### Fixed

- Enhanced auto-update dialog functionality
- Better debug logging for splice marker operations

## [5.0.0] 🎉 **Major Release**

### Added

- **Tempo and Pitch Processing**: Professional-grade audio manipulation powered by RubberBand
  - Independent tempo and pitch adjustment
  - Real-time preview of changes before applying
  - High-quality time-stretching algorithms
  - Perfect for preparing samples at different tempos

- **Enhanced BPM Detection**: Improved automatic tempo detection
  - More accurate BPM analysis
  - Display detected tempo in the information panel
  - Better integration with tempo processing features

### Improved

- **Audio Processing Pipeline**: Enhanced underlying audio processing
- **Zoom Handling**: Better zoom reset functionality after audio modifications
- **WebAssembly Integration**: Optimized WASM module loading for better performance

### Technical

- Dynamic bundling of RubberBand WebAssembly module for efficient loading
- Enhanced Vite plugin configuration for better WASM handling

## [4.8.1]

### Fixed

- **Audio Context Management**: Improved memory management
  - Proper cleanup of audio contexts after slice extraction
  - Better resource management to prevent memory leaks

### Technical

- Enhanced Electron publishing workflow
- Better build artifact management

## [4.8.0]

### Added

- **Slice Export**: Export individual audio slices
  - Export each splice segment as separate audio files
  - Batch processing for multiple slices
  - Maintains audio quality and format preferences
  - Perfect for creating sample libraries from long audio files

## [4.7.0]

### Added

- **Clear All Markers**: New button to remove all splice markers at once
  - Quick way to start fresh with marker placement
  - Streamlined workflow for iterative editing

### Improved

- **Visual Enhancements**: New playhead marker design
  - More visible and precise playhead indicator
  - Better visual feedback during playback
  - Enhanced marker position accuracy after cropping operations

### Fixed

- **Marker Persistence**: Fixed issues with markers persisting after clear and crop operations
- **Marker Positioning**: Corrected marker positions when audio is cropped
- **Playback Performance**: Reduced audio playback choppiness with updated Wavesurfer

### Technical

- Optimized font loading (Latin variant only) for better performance
- Universal DMG generation for macOS
- Improved build process to avoid duplicate file publishing

## [4.6.0]

### Added

- **Auto-Update Functionality**: Automatic updates for desktop app
  - Seamless updates when new versions are available
  - Background downloading of updates
  - User notification when updates are ready to install

### Improved

- **User Interface**: Consolidated and streamlined controls
  - Merged Export and Region controls into unified WaveformActionControls
  - Cleaner interface with better organization
  - Removed redundant components for better performance

### Enhanced

- **Documentation**: Comprehensive user manual updates
  - Added details about audio normalization features
  - BPM detection documentation
  - Auto-update setup instructions

## [4.5.0]

### Major Improvements

- **Code Quality**: Massive dependency cleanup and modernization
  - Removed unused dependencies
  - Updated to latest versions of key libraries
  - Improved build performance and bundle size
  - Enhanced CI/CD workflows

### Added

- **Styled Components**: Modern theming system
  - Consistent color themes throughout the app
  - Better responsive design
  - Improved layout on different screen sizes

### Technical

- Enhanced formatting with Prettier configuration
- Better code organization with separated style files
- Improved string padding in audio processing utilities

## [4.3.0]

### Improved

- **User Interface**: Enhanced dropdown menus and controls
  - Better visual design for dropdown selections
  - More intuitive control layouts
  - Improved accessibility

### Technical

- Production build optimizations
- Enhanced release workflow

---

## Earlier Version Ranges

### [4.0.0 - 4.2.0] - Foundation Enhancements

This range focused on solidifying the core application architecture:

- **Improved User Interface**: Major UI/UX improvements and modernization
- **Enhanced Build System**: Better development and production build processes
- **Code Organization**: Refactored codebase for better maintainability
- **Performance Optimizations**: Faster loading and better resource management
- **Cross-Platform Support**: Enhanced compatibility across different operating systems

### [3.0.0 - 3.2.0] - Feature Expansion

Major feature additions and workflow improvements:

- **Advanced Splice Controls**: Enhanced splice marker management and precision
- **Multiple Export Formats**: Support for various audio formats and quality settings
- **Keyboard Shortcuts**: Comprehensive keyboard navigation and shortcuts
- **File Handling**: Improved drag-and-drop support and file management
- **Workflow Enhancements**: Streamlined editing workflow for better productivity

### [2.0.0 - 2.2.0] - Core Audio Engine

Fundamental audio processing capabilities:

- **Professional Audio Processing**: High-quality audio manipulation algorithms
- **Fade Controls**: Comprehensive fade in/out controls with multiple curve types
- **Crop Functionality**: Precise audio cropping with sample-accurate positioning
- **Waveform Visualization**: Enhanced waveform display with zoom and navigation
- **Export System**: Basic audio export functionality with format options

### [1.0.0 - 2.0.0] - Initial Release and Foundation

The foundational release that established MorphEdit as an audio editor:

- **Core Audio Editing**: Basic audio loading, playback, and editing capabilities
- **Splice Marker System**: Initial implementation of splice point management
- **Web-Based Architecture**: Browser-based audio editor with no installation required
- **Basic User Interface**: Clean, intuitive interface for audio editing tasks
- **File Support**: Support for common audio file formats (WAV, MP3, etc.)
- **Local Processing**: All audio processing happening locally in the browser
- **Morphagene Focus**: Initial features targeted at MakeNoise Morphagene users

---

## Legend

### 🎉 Major Release

Indicates significant new features or major architectural changes

### Categories

- **Added**: New features for users
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Features removed in this version
- **Fixed**: Bug fixes
- **Security**: Vulnerability fixes
- **Improved**: Enhancements to existing features
- **Technical**: Behind-the-scenes improvements that may not be directly visible to users

---

*For technical details and full commit history, visit the [GitHub repository](https://github.com/carlosedp/morphedit).*

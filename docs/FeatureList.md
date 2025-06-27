# Features to Add to the Editor

- [x] Export audio to WAV with multiple formats
- [x] Refactor code into multiple files
- [x] Show Fade In/Out and Crop region times in info panel
- [x] Detect if file is longer than 174 seconds and show warning if user wants to truncate it or not
- [x] Drop file to open when no audio is loaded
- [x] Indicate if file is being processed (loading, truncating, etc.)
- [x] Drop file to open (when an audio is open) (ask to replace current or append)
- [x] When appending audio, splice points should be appended to the end of the existing audio
- [x] Fixed critical loading dialog stuck issue during append operations
- [x] Drop multiple files to open and create splice points for each file
- [x] Add/remove splice points to audio using regions
- [x] Add equal-spaced splice points to audio
- [x] Play each splice point in the audio with keyboard shortcuts
- [x] Add splice point locking to avoid accidental deletion and moving
- [x] Export audio with splice points
- [x] Transient detection with sensitivity setting and advanced controls (frame size & overlap)
- [x] Detect zero-crossing on splice points, crop regions, and fade in/out regions
- [x] Add mobile layout
- [x] Redo layout so controls are more intuitive
- [x] Have different fade curves for fade in and fade out (linear, exponential, etc.)
- [ ] Settings menu for:
  - [ ]  Fade in/out curve type (linear, exponential, etc.)
  - [ ]  Truncate lenght (174 seconds by default)
  - [ ]  Default export format
- [ ] Improve splice detection with maybe a different algorithm or more advanced settings
- [ ] Add detection preset slots to save sensitivity, frame size, and overlap settings
- [x] Use mouse scroll to zoom in/out on the waveform
- [x] Add tooltip to append audio button
- [x] Detect if audio has more than 300 splice points and show warning if user wants to truncate it or not. Make this number a constant.
- [x] BPM detection and display it in the info panel
- [ ] Multi-level undo/redo functionality
- [x] Time stretching and pitch shifting
- [x] Audio effects (normalization, add/remove gain)
- [ ] Crossfade between splice points with defined length and curve type

## Bugs

- [x] Fix bug where splice points are not detected correctly when audio is appended
- [x] Fix bug where splice points are not correctly placed after the audio is cropped
- [x] Fix bug where audio files with existing splice markers (cue points) are not being imported/loaded
- [x] Concatenated audio when cropped, exports as full file and not cropped audio length
- [x] Contatenated audio when cropped, have splice points duplicated
- [x] Fix bug where splice markers appear at wrong visual positions after crop operations (while maintaining correct times in export and debug)
- [x] Locking splice markers are not working after refactor
- [x] Selecting a locked marker should keep the lock icon visible
- [x] Truncation seems to not work after refactor

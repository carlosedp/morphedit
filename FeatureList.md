# Features to Add to the Editor

- [x] Export audio to WAV with multiple formats
- [x] Refactor code into multiple files
- [x] Show Fade In/Out and Crop region times in info panel
- [x] Detect if file is longer than 174 seconds and show warning if user wants to truncate it or not
- [x] Drop file to open when no audio is loaded
- [x] Indicate if file is being processed (loading, truncating, etc.)
- [ ] Drop file to open (when an audio is open) (left 2/3s of the waveform view, ask to replace)
- [ ] Append audio to existing file by dropping to the right 1/3 of the waveform view (add splice point to it's start)
- [x] Add/remove splice points to audio using regions
- [x] Add equal-spaced splice points to audio
- [ ] Play each splice point in the audio with keyboard shortcuts
- [x] Export audio with splice points
- [x] Transient detection with sensitivity setting and advanced controls (frame size & overlap)
- [x] Detect zero-crossing on splice points, crop regions, and fade in/out regions
- [ ] Redo layout so controls are more intuitive
- [ ] Replace truncation with a truncate button that truncates the audio to 174 seconds
- [ ] Settings menu for:
  - [ ]  Fade in/out curve type (linear, exponential, etc.)
  - [ ]  Truncate size


## To Test

- [ ] Check if splice points are detected correctly when audio is truncated
- [ ] Fix bug where splice points are not detected correctly when audio is appended

## Bugs

- [x] Fix bug where splice points are not correctly placed after the audio is cropped
- [x] Fix bug where audio files with existing splice markers (cue points) are not being imported/loaded

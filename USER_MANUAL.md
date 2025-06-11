# MorphEdit Audio Editor - User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Interface Overview](#interface-overview)
4. [Loading Audio Files](#loading-audio-files)
5. [Waveform Navigation](#waveform-navigation)
6. [Splice Markers](#splice-markers)
7. [Regions and Processing](#regions-and-processing)
8. [Exporting Audio](#exporting-audio)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Advanced Features](#advanced-features)
11. [Troubleshooting](#troubleshooting)

---

## Introduction

**MorphEdit** is a browser-based audio editor specifically designed for preparing audio files for the **MakeNoise Morphagene** granular synthesis module. It provides powerful tools for adding splice markers, cropping audio, applying fades, and exporting in the optimal format for the Morphagene.

### Key Features

- **Splice Marker Management**: Add, remove, lock, and automatically detect splice points
- **Audio Processing**: Crop, fade in/out, and concatenate multiple files
- **Transient Detection**: Automatically detect audio transients for splice placement
- **Zero-Crossing Snap**: Align markers to zero crossings to prevent audio artifacts
- **Multiple Export Formats**: Export to various sample rates and bit depths
- **Concatenation Support**: Combine multiple audio files with preserved splice markers
- **Undo Functionality**: Easily revert processing operations
- **Keyboard Shortcuts**: Fast workflow with comprehensive keyboard support

---

## Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- No installation required - runs entirely in the browser
- Audio files in common formats (WAV, MP3, FLAC, etc.)

### Opening the Application

1. Navigate to the MorphEdit URL in your web browser
2. The application loads with an empty waveform display
3. You can immediately start by loading an audio file

---

## Interface Overview

The MorphEdit interface consists of several main sections:

### 1. Waveform Display

- **Main Canvas**: Shows the audio waveform with time ruler
- **Timeline**: Displays time markers and current position
- **Hover Information**: Shows precise time information when hovering

### 2. Playback Controls (Top Section)

- **Play/Pause Button**: Start/stop audio playback
- **Loop Toggle**: Enable/disable loop mode
- **Rewind Button**: Return to beginning of audio or crop region
- **Zoom Controls**: Adjust waveform zoom level and reset zoom
- **Skip Controls**: Navigate forward/backward with adjustable increments
- **Time Display**: Shows current time, duration, and zoom level
- **Region Information**: Displays active crop and fade region details

### 3. Export and Region Controls (Middle Section)

- **Export Button**: Quick export in default Morphagene format
- **Export Menu**: Access to multiple export formats
- **Crop Region**: Create and apply crop regions
- **Fade Regions**: Create fade-in and fade-out regions
- **Apply/Undo Buttons**: Process audio and revert changes

### 4. Splice Marker Controls (Bottom Section)

- **Manual Controls**: Add, remove, and lock splice markers
- **Auto-Slice**: Create equally distributed markers
- **Transient Detection**: Automatically detect splice points
- **Marker Management**: Half markers, clear all, snap to zero crossings

---

## Loading Audio Files

### Single File Loading

1. **Drag and Drop**: Simply drag an audio file onto the waveform area
2. **File Menu**: Use browser file selection (if available)
3. **Supported Formats**: WAV, MP3, FLAC, M4A, and other common audio formats

### Multiple File Loading (Concatenation)

1. **Drag Multiple Files**: Select and drag multiple audio files at once
2. **Automatic Processing**: Files are automatically concatenated in the order selected
3. **Splice Marker Placement**: Markers are automatically placed at file boundaries
4. **Existing Markers**: Any existing splice markers (cue points) in the files are preserved

### File Length Handling

- **Morphagene Limit**: The Morphagene has a maximum duration of 174 seconds
- **Automatic Warning**: Files longer than 174 seconds trigger a truncation dialog
- **Truncation Options**: Choose to truncate or keep the full length for other uses

---

## Waveform Navigation

### Zoom Controls

- **Zoom In/Out**: Use the zoom slider or keyboard shortcuts (=/-)
- **Zoom Reset**: Double-click zoom slider or use reset button to fit audio to window
- **Auto-Zoom**: New audio files automatically zoom to fit the container

### Playback Navigation

- **Click to Seek**: Click anywhere on the waveform to jump to that position
- **Skip Forward/Backward**: Use arrow keys or buttons to navigate precisely
- **Skip Increment**: Adjustable skip amount (0.1s to 10s) using up/down arrows
- **Loop Mode**: Toggle to continuously loop playback

### Visual Feedback

- **Current Time Cursor**: White vertical line shows current playback position
- **Hover Timeline**: Displays precise time information while hovering
- **Progress Color**: Waveform shows progress with contrasting colors

---

## Splice Markers

Splice markers are the core feature for preparing audio for the Morphagene. They define where the audio can be "sliced" for granular playback.

### Manual Marker Management

#### Adding Markers

1. **Position Cursor**: Click or seek to desired position
2. **Add Marker**: Press 'J' or click the "Add" button (Create icon)
3. **Zero-Crossing Snap**: Markers automatically snap to nearest zero crossing to prevent clicks

#### Removing Markers

1. **Select Marker**: Click on a splice marker (turns blue when selected)
2. **Remove Selected**: Press 'K' or click the "Remove" button (Delete icon)
3. **Remove Closest**: If no marker selected, removes closest unlocked marker to cursor

#### Locking Markers

1. **Select Marker**: Click on the marker you want to lock
2. **Toggle Lock**: Press 'M' or click the lock button
3. **Visual Indication**: Locked markers show a lock icon (🔒) and cannot be moved or deleted
4. **Protection**: Locked markers are preserved during auto-slice and clear operations

### Automatic Marker Generation

#### Auto-Slice

1. **Set Number**: Choose how many equal sections to create (2-100)
2. **Generate**: Press 'S' or click "Auto Slice"
3. **Locked Preservation**: Existing locked markers are preserved
4. **Zero-Crossing**: New markers automatically snap to zero crossings

#### Transient Detection

1. **Configure Sensitivity**: Adjust detection sensitivity (0-100)
   - **Low (0-30)**: Detects only strong transients
   - **Medium (30-70)**: Balanced detection
   - **High (70-100)**: Detects subtle changes
2. **Advanced Settings**:
   - **Frame Size**: Analysis window duration (5-50ms)
   - **Overlap**: Window overlap percentage (50-90%)
3. **Detect**: Click "Detect" to automatically find transients
4. **Results**: Markers placed at detected transient positions

### Marker Management Tools

#### Half Markers

- **Function**: Removes every other unlocked marker (keeps 1st, 3rd, 5th, etc.)
- **Use Case**: Reduce marker density while maintaining timing
- **Shortcut**: Press 'H'

#### Clear All Markers

- **Function**: Removes all unlocked markers
- **Protection**: Locked markers are preserved
- **Shortcut**: Press 'X'

#### Snap to Zero Crossings

- **Function**: Moves all existing markers to nearest zero crossings
- **Purpose**: Eliminates audio artifacts (clicks/pops)
- **Recommended**: Use before final export

---

## Regions and Processing

### Crop Regions

#### Creating Crop Regions

1. **Toggle Mode**: Press 'C' or click "Crop Region" button
2. **Position Region**: Drag the handles to set start and end points
3. **Visual Feedback**: Yellow highlighted area shows crop region
4. **Loop Playback**: When loop is enabled, plays only the crop region

#### Applying Crop

1. **Review Region**: Ensure crop boundaries are correct
2. **Apply**: Click "Apply Crop" button
3. **Processing**: Audio is cropped to the selected region
4. **Marker Adjustment**: Splice markers within the region are automatically adjusted
5. **Undo Available**: Previous state is saved for undo operation

### Fade Regions

#### Fade-In

1. **Create**: Press 'I' or click "Fade In" button
2. **Adjust**: Drag handles to set fade duration (default: 10% of audio length)
3. **Preview**: Green highlighted area shows fade-in region

#### Fade-Out

1. **Create**: Press 'O' or click "Fade Out" button
2. **Adjust**: Drag handles to set fade duration (default: last 10% of audio)
3. **Preview**: Red highlighted area shows fade-out region

#### Applying Fades

1. **Multiple Fades**: Can apply both fade-in and fade-out simultaneously
2. **Apply**: Click "Apply Fades" button
3. **Linear Fade**: Uses linear gain reduction/increase
4. **Zero-Crossing**: Fade boundaries snap to zero crossings

### Undo Functionality

- **Single Level**: Can undo the last processing operation (crop or fade)
- **Keyboard**: Press Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
- **Button**: Click the "Undo" button
- **Limitations**: Only one level of undo is available

---

## Exporting Audio

### Quick Export (Default)

1. **Format**: 48kHz, 32-bit Float, Stereo (optimal for Morphagene)
2. **Export**: Click "Export WAV" button
3. **Filename**: Automatically named "morphedit-export.wav"
4. **Splice Markers**: Embedded as WAV cue points for compatibility

### Custom Format Export

1. **Open Menu**: Click the dropdown arrow next to "Export WAV"
2. **Select Format**: Choose from available formats:
   - **48kHz 32-bit Float Stereo** (Morphagene optimal)
   - **44.1kHz 32-bit Float Stereo**
   - **48kHz 16-bit Stereo**
   - **44.1kHz 16-bit Stereo**
   - **44.1kHz 16-bit Mono**
   - **22.05kHz 16-bit Mono**
3. **Download**: File downloads with format-specific filename

### Export Features

- **Cue Point Embedding**: Splice markers are saved as WAV cue points
- **Sample Rate Conversion**: Automatic resampling to target format
- **Bit Depth Conversion**: Automatic conversion between 16-bit and 32-bit
- **Channel Conversion**: Automatic mono/stereo conversion
- **Filename Convention**: Includes format details in filename

---

## Keyboard Shortcuts

### Playback Controls

| Key       | Action        | Description                          |
| --------- | ------------- | ------------------------------------ |
| **Space** | Play/Pause    | Start or stop audio playback         |
| **L**     | Toggle Loop   | Enable/disable loop mode             |
| **←**     | Skip Backward | Move backward by skip increment      |
| **→**     | Skip Forward  | Move forward by skip increment       |
| **↑**     | Increase Skip | Increase skip increment (0.1s → 10s) |
| **↓**     | Decrease Skip | Decrease skip increment (10s → 0.1s) |

### Zoom Controls

| Key   | Action   | Description                  |
| ----- | -------- | ---------------------------- |
| **=** | Zoom In  | Increase waveform zoom level |
| **-** | Zoom Out | Decrease waveform zoom level |

### Splice Markers

| Key   | Action        | Description                           |
| ----- | ------------- | ------------------------------------- |
| **J** | Add Marker    | Add splice marker at cursor position  |
| **K** | Remove Marker | Remove selected/closest splice marker |
| **M** | Lock/Unlock   | Toggle lock status of selected marker |
| **S** | Auto-Slice    | Create equally distributed markers    |
| **H** | Half Markers  | Remove every other unlocked marker    |
| **X** | Clear All     | Remove all unlocked markers           |

### Regions

| Key   | Action      | Description                 |
| ----- | ----------- | --------------------------- |
| **C** | Crop Region | Toggle crop region creation |
| **I** | Fade-In     | Toggle fade-in region       |
| **O** | Fade-Out    | Toggle fade-out region      |

### System

| Key                | Action | Description                          |
| ------------------ | ------ | ------------------------------------ |
| **Ctrl+Z / Cmd+Z** | Undo   | Undo last processing operation       |
| **\\**             | Reset  | Clear all data and reset application |

---

## Advanced Features

### Zero-Crossing Detection

- **Purpose**: Prevents audio artifacts (clicks/pops) when markers are placed
- **Automatic**: All marker placement automatically snaps to zero crossings
- **Manual Tool**: "Snap All to Zero" button adjusts existing markers
- **Algorithm**: Finds nearest point where waveform crosses zero amplitude

### Concatenation Support

- **Multiple Files**: Load multiple audio files simultaneously
- **Automatic Markers**: Splice markers placed at file boundaries
- **Cue Point Preservation**: Existing cue points in files are maintained
- **Time Adjustment**: All markers adjusted for concatenated timeline

### Sample Rate Handling

- **Mixed Rates**: Handles files with different sample rates
- **Automatic Resampling**: Converts to common rate for processing
- **Export Flexibility**: Can export to different rates than source

### Processing Indicators

- **Loading States**: Visual feedback during file loading
- **Processing States**: Shows progress for crop and fade operations
- **Error Handling**: Clear feedback for any processing errors

### Debug Tools

- **Browser Console**: Access to debug functions for troubleshooting
- **Region Inspector**: Use `debugListRegions()` in browser console
- **Marker Validation**: Shows marker counts and positions

---

## Troubleshooting

### Common Issues

#### Audio Not Loading

1. **Check Format**: Ensure file is in supported format (WAV, MP3, FLAC)
2. **File Size**: Very large files may take time to load
3. **Browser Compatibility**: Try a different browser if issues persist
4. **File Corruption**: Try loading a different audio file

#### Markers Not Appearing

1. **Zoom Level**: Zoom in to see markers more clearly
2. **File Compatibility**: Some files may not have readable cue points
3. **Processing State**: Wait for any ongoing processing to complete

#### Export Issues

1. **Browser Downloads**: Check browser download settings
2. **File Size**: Large files may take time to process
3. **Format Support**: Try different export formats if issues occur

#### Performance Issues

1. **File Length**: Very long files may impact performance
2. **Browser Memory**: Close other tabs to free up memory
3. **Zoom Level**: High zoom levels may slow interaction

### Browser Console Debug

For advanced troubleshooting, open browser developer tools (F12) and use:

```javascript
// List all regions and markers
debugListRegions()
```

This provides detailed information about:

- All splice markers with positions and lock status
- Region information (crop, fade-in, fade-out)
- Store synchronization status
- Visual marker count vs. stored marker count

### File Compatibility

#### Supported Input Formats

- **WAV**: Full support including existing cue points
- **MP3**: Good support, no cue point reading
- **FLAC**: Good support, no cue point reading
- **M4A/AAC**: Basic support
- **OGG**: Basic support

#### Recommended Workflow

1. **Source Format**: Use WAV files when possible for best compatibility
2. **Cue Points**: WAV files with existing cue points are automatically loaded
3. **Sample Rate**: 48kHz or 44.1kHz recommended for best results
4. **File Length**: Keep under 174 seconds for Morphagene compatibility

---

## Tips and Best Practices

### Workflow Recommendations

#### For Morphagene Users

1. **Start with Quality Source**: Use high-quality WAV files when possible
2. **Length Management**: Keep files under 174 seconds or use truncation
3. **Marker Strategy**: Place markers at musically relevant points (beats, phrases)
4. **Zero-Crossing**: Always use "Snap All to Zero" before final export
5. **Export Format**: Use default 48kHz 32-bit Float Stereo format

#### General Audio Editing

1. **Backup Originals**: Keep original files safe before processing
2. **Incremental Edits**: Make small changes and test frequently
3. **Undo Usage**: Remember only one level of undo is available
4. **Preview Regions**: Use loop mode to preview crop regions before applying

### Marker Placement Strategy

#### Musical Content

- **Beats**: Place markers on strong beats for rhythmic slicing
- **Phrases**: Mark beginnings of musical phrases
- **Texture Changes**: Mark where timbre or dynamics change significantly

#### Transient Detection Tips

- **Sensitivity Tuning**: Start with medium (50) and adjust based on results
- **Frame Size**: Smaller frames (5-10ms) for percussive content, larger (20-50ms) for sustained sounds
- **Manual Refinement**: Use automatic detection as starting point, then manually adjust

### Performance Optimization

- **File Preparation**: Pre-process very long files in external editors if needed
- **Marker Density**: Use reasonable marker density (not too many for short files)
- **Browser Resources**: Close unnecessary tabs and applications

---

This manual covers all the core functionality of MorphEdit. For the most current information and updates, refer to the application's built-in help or project documentation.

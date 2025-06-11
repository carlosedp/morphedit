# Test Script: Marker Duplication Issue Fix

## Test Scenario: Cropping Concatenated Audio with Splice Markers

### Steps to Test:
1. **Load Multiple Audio Files**:
   - Drop 2-3 small audio files to concatenate them
   - Choose to concatenate (not replace)
   - Verify splice markers are created at file boundaries

2. **Add Additional Markers**:
   - Add 2-3 manual splice markers using the Add button
   - Lock one of the markers using the "M" key or lock button
   - Verify locked marker shows lock icon (🔒)

3. **Create Crop Region**:
   - Click the "Crop Region" button
   - Select a region that includes some markers (both locked and unlocked)
   - Ensure the crop region spans across multiple original file boundaries

4. **Apply Crop**:
   - Click "Apply Crop" button
   - **Expected Result**: 
     - Markers within crop region should be preserved and adjusted
     - Locked markers should retain their lock state
     - No duplicate markers should appear
     - Visual markers should match store markers

5. **Verification**:
   - Check browser console for debugging messages
   - Look for "🔄 DEBUG: Ready event - Set processing flag to true" 
   - Look for "✅ DEBUG: Ready event - Cleared processing flag"
   - Verify no duplicate marker creation messages
   - Check that locked markers still show lock icons

### Debug Messages to Watch For:
- `🚫 DEBUG: Ready event - Markers are already being processed, skipping to prevent duplicates`
- `🔄 DEBUG: Crop operation - Set processing flag to true`
- `✅ DEBUG: Crop operation - Cleared processing flag`
- `DEBUG: Ready event - Is processed audio: true`
- `DEBUG: Ready event - Loading splice markers from store for processed audio (highest priority)`

### Expected Behavior:
- Processing flag should prevent double execution of marker creation
- Ready event should properly detect processed audio and use store markers
- No duplicate markers should appear after crop operations
- Locked state should be preserved throughout the operation

### Previous Issues (Should Not Occur):
- ❌ Duplicate markers after cropping
- ❌ Loss of locked marker state
- ❌ Incorrect marker positioning
- ❌ Race conditions between crop and ready event

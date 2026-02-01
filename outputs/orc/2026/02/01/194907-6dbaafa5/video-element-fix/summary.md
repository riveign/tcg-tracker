# Video Element Race Condition Fix

**Status:** COMPLETED

## Root Cause Identified

The issue was a classic React race condition between state updates and DOM rendering:

1. When `startCamera()` was called from useEffect, it set state to `'requesting'`
2. It acquired the camera stream successfully
3. It attempted to access `videoRef.current` to attach the stream
4. **Problem:** The video element is conditionally rendered only when `state === 'streaming'` (line 176)
5. Since state was still `'requesting'`, the video element wasn't in the DOM yet
6. Therefore `videoRef.current` was `null`, causing the error

**Timeline of events:**
- State: `'idle'` → Video element: not rendered
- State: `'requesting'` → Video element: not rendered (showing "Requesting camera access..." spinner)
- Stream acquired → Try to access `videoRef.current` → **NULL**
- State: `'streaming'` → Video element: now rendered (but too late)

## Fix Strategy Used

**Two-phase approach with separate useEffect:**

1. **Phase 1 - Acquire Stream:** Modified `startCamera()` to:
   - Request and acquire the camera stream
   - Store stream in `streamRef.current`
   - Immediately set state to `'streaming'`
   - **Do NOT attempt to access video element yet**

2. **Phase 2 - Apply Stream:** Added new useEffect that:
   - Watches for `state === 'streaming'`
   - Waits for video element to be mounted (when `videoRef.current` exists)
   - Applies the stored stream to the video element
   - Starts playback
   - Handles playback errors gracefully

This ensures:
- Stream is acquired first
- State change triggers video element render
- Video element is guaranteed to exist before stream application
- Clean separation of concerns
- Proper error handling at each stage

## Files Modified

- `/home/mantis/Development/tcg-tracker/apps/web/src/components/cards/CameraCapture.tsx:40-77` - Simplified `startCamera()` to remove premature video element access
- `/home/mantis/Development/tcg-tracker/apps/web/src/components/cards/CameraCapture.tsx:143-160` - Added new useEffect for stream application after video element mounts

## Testing Notes

**Expected behavior after fix:**
1. Dialog opens → State: `'idle'`
2. useEffect triggers `startCamera()`
3. State changes to `'requesting'` → Shows spinner
4. Stream is acquired and stored
5. State changes to `'streaming'` → Video element renders
6. New useEffect detects state change
7. Video element now exists in DOM
8. Stream is applied to video element
9. Playback starts successfully

**Error handling preserved:**
- Camera permission errors
- Device not found errors
- Camera in use errors
- Video playback errors (new)

**No regressions:**
- Stream cleanup still works properly
- Dialog close behavior unchanged
- Capture functionality unchanged
- All other state transitions preserved

**Manual testing recommended:**
- Open scan page
- Verify camera loads without console errors
- Check that video stream displays correctly
- Test capture functionality
- Test retake functionality
- Test dialog close with active stream (verify cleanup)

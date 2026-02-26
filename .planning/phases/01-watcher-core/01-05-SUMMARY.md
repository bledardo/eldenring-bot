---
phase: 01-watcher-core
plan: 05
subsystem: detection
tags: [detection-loop, watcher, pipeline, threading]

requires:
  - phase: 01-01
    provides: "Config, logging, process monitor, tray"
  - phase: 01-02
    provides: "Boss fight FSM"
  - phase: 01-03
    provides: "Screen capture, event queue, HTTP client"
  - phase: 01-04
    provides: "All four visual detectors"
provides:
  - "Core detection loop wiring all components"
  - "Updated main.py with full lifecycle management"
affects: [01-06, 01-07]

tech-stack:
  added: []
  patterns: [detection-loop-at-target-fps, alt-tab-pause-resume, ocr-once-per-encounter]

key-files:
  created:
    - watcher/watcher.py
  modified:
    - watcher/main.py

key-decisions:
  - "OCR runs once per encounter to avoid 100-500ms per-frame cost"
  - "Alt-tab detection via win32gui with graceful fallback on non-Windows"
  - "Watcher runs in daemon thread (main thread stays with process monitor)"

patterns-established:
  - "Detection loop: capture only regions needed by current FSM state"
  - "Co-op filtering at encounter callback level (not FSM level)"

requirements-completed: [DETECT-08]

duration: 2min
completed: 2026-02-26
---

# Phase 01 Plan 05: Core Detection Loop Summary

**Central detection pipeline: capture at ~10fps → detectors → FSM → events → HTTP with alt-tab pausing and once-per-encounter OCR**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T22:48:30Z
- **Completed:** 2026-02-26T22:50:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Watcher class runs full pipeline: capture → detect → FSM → event callbacks → HTTP
- Alt-tab pauses detection, resumes when game returns to foreground
- OCR cached per encounter (avoids 100-500ms per-frame cost)
- Co-op filtering prevents event emission for non-solo fights
- main.py updated: Watcher in daemon thread, queue flush thread, session events, clean shutdown

## Task Commits

1. **Task 1: Core Watcher detection loop** - `70c3cbb` (feat)
2. **Task 2: Wire Watcher into main.py** - `2aa073f` (feat)

## Files Created/Modified
- `watcher/watcher.py` - Detection loop with all component wiring (300 lines)
- `watcher/main.py` - Updated lifecycle management with Watcher integration

## Decisions Made
- OCR runs once per encounter (cached boss name for duration of fight)
- Alt-tab detection via win32gui with graceful fallback (returns True on non-Windows)
- Co-op filtering at callback level, not FSM level (cleaner separation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full detection pipeline operational
- Ready for packaging (Plan 06) and integration tests (Plan 07)

---
*Phase: 01-watcher-core*
*Completed: 2026-02-26*

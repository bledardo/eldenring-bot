---
phase: 01-watcher-core
plan: 04
subsystem: detection
tags: [opencv, easyocr, rapidfuzz, template-matching, ocr]

requires:
  - phase: 01-03
    provides: "ScreenCapture for frame capture"
provides:
  - "Four visual detectors: health bar, YOU DIED, boss name OCR, co-op"
  - "ConsecutiveConfirmer for frame-based debounce"
affects: [01-05, 01-07]

tech-stack:
  added: [opencv-python, easyocr, rapidfuzz]
  patterns: [template-matching-with-structural-fallback, ocr-preprocessing-pipeline, consecutive-frame-confirmation]

key-files:
  created:
    - watcher/detectors/__init__.py
    - watcher/detectors/health_bar.py
    - watcher/detectors/you_died.py
    - watcher/detectors/boss_name.py
    - watcher/detectors/coop.py
    - watcher/assets/templates/.gitkeep
  modified: []

key-decisions:
  - "Structural/color fallbacks for all detectors when templates unavailable"
  - "OCR preprocessing: 2x upscale + CLAHE + Otsu binary threshold"
  - "EasyOCR reader initialized once at startup (expensive ~2-3s)"

patterns-established:
  - "Template matching with structural fallback pattern"
  - "ConsecutiveConfirmer for all detector debounce"
  - "Graceful degradation when optional dependencies missing"

requirements-completed: [DETECT-04, DETECT-05, DETECT-06, DETECT-07]

duration: 2min
completed: 2026-02-26
---

# Phase 01 Plan 04: Visual Detectors Summary

**Four OpenCV detectors: health bar (structural+template), YOU DIED (color+template), boss name OCR (EasyOCR+CLAHE+rapidfuzz), co-op phantoms (structural+template)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T22:45:57Z
- **Completed:** 2026-02-26T22:48:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Health bar detector with edge detection + contour analysis fallback
- YOU DIED detector with dark-background + red-text color heuristic fallback
- Boss name OCR with 2x upscale, CLAHE contrast, Otsu threshold preprocessing
- Fuzzy matching against 190 French boss names (score 91 for "Margit l Omen Feal")
- Co-op phantom detector for solo fight filtering
- All detectors gracefully handle missing templates and optional dependencies

## Task Commits

1. **Task 1: Health bar and YOU DIED detectors** - `32548d4` (feat)
2. **Task 2: Boss name OCR and co-op detectors** - `baa59e6` (feat)

## Files Created/Modified
- `watcher/detectors/__init__.py` - ConsecutiveConfirmer + exports
- `watcher/detectors/health_bar.py` - Boss health bar presence detection
- `watcher/detectors/you_died.py` - Death screen detection
- `watcher/detectors/boss_name.py` - OCR + fuzzy matching for boss names
- `watcher/detectors/coop.py` - Co-op phantom icon detection
- `watcher/assets/templates/.gitkeep` - Placeholder for template images

## Decisions Made
- All detectors have structural/color fallbacks for pre-template operation
- EasyOCR initialized once at startup to avoid per-detection overhead
- OCR preprocessing pipeline: upscale 2x → grayscale → CLAHE → Otsu binary

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four detectors ready for Watcher integration (Plan 05)
- Template images will improve accuracy once captured from gameplay

---
*Phase: 01-watcher-core*
*Completed: 2026-02-26*

---
phase: 01-watcher-core
plan: 06
subsystem: infra
tags: [pyinstaller, auto-update, github-actions, packaging]

requires:
  - phase: 01-05
    provides: "Complete Watcher application to package"
provides:
  - "PyInstaller spec for single .exe packaging"
  - "Auto-updater via GitHub Releases"
  - "GitHub Actions workflow for automated builds"
affects: []

tech-stack:
  added: [pyinstaller, github-actions]
  patterns: [self-update-via-batch-script, github-releases-api]

key-files:
  created:
    - watcher/updater.py
    - build.spec
    - build.py
    - .github/workflows/build.yml
  modified:
    - watcher/main.py

key-decisions:
  - "Python 3.11 for build (best PyInstaller + PyTorch compatibility)"
  - "Self-update via batch script (rename current, swap new, restart)"
  - "Update check has 5-second timeout to keep startup fast"

patterns-established:
  - "GitHub Releases as distribution channel"
  - "Auto-update check at startup with graceful failure"

requirements-completed: [INTG-05]

duration: 2min
completed: 2026-02-26
---

# Phase 01 Plan 06: PyInstaller Packaging + Auto-Update Summary

**Single portable .exe via PyInstaller with EasyOCR model bundling, GitHub Releases auto-update, and CI/CD workflow for automated builds**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T22:50:30Z
- **Completed:** 2026-02-26T22:52:30Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- PyInstaller spec with all hidden imports (torch, easyocr, pystray, win32gui)
- Build helper finds and bundles EasyOCR model files
- Auto-updater checks GitHub Releases and self-updates via batch script
- GitHub Actions workflow builds on windows-latest and uploads to releases
- main.py calls updater at startup with graceful failure handling

## Task Commits

1. **Task 1: Auto-updater and PyInstaller spec** - `c803156` (feat)
2. **Task 2: GitHub Actions workflow** - `035e5d5` (feat)
3. **Task 3: Wire updater into main.py** - `d959903` (feat)

## Files Created/Modified
- `watcher/updater.py` - GitHub Releases auto-update with batch self-replace
- `build.spec` - PyInstaller spec with hidden imports and EasyOCR data
- `build.py` - Build helper for EasyOCR data location and PyInstaller invocation
- `.github/workflows/build.yml` - CI/CD for Windows builds on version tags
- `watcher/main.py` - Updated with auto-update call at startup

## Decisions Made
- Python 3.11 for CI builds (best compatibility with PyTorch + PyInstaller)
- Self-update via Windows batch script (no installer framework needed)
- 5-second timeout on update check to keep startup responsive

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - GITHUB_REPO placeholder in updater.py needs to be set by user.

## Next Phase Readiness
- Packaging infrastructure complete
- Ready for integration tests (Plan 07)

---
*Phase: 01-watcher-core*
*Completed: 2026-02-26*

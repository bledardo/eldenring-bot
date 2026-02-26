---
phase: 01-watcher-core
plan: 01
subsystem: infra
tags: [psutil, pystray, loguru, toml, config]

requires:
  - phase: none
    provides: "First plan — no dependencies"
provides:
  - "Project scaffold with config, logging, process monitor, tray icon"
  - "Canonical French boss name list (190 entries)"
  - "Full dependency manifest (requirements.txt)"
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07]

tech-stack:
  added: [loguru, tomli, tomli_w, psutil, pystray, Pillow]
  patterns: [toml-config-with-defaults, loguru-file-rotation, callback-based-process-lifecycle]

key-files:
  created:
    - watcher/__init__.py
    - watcher/config.py
    - watcher/logger.py
    - watcher/process_monitor.py
    - watcher/tray.py
    - watcher/main.py
    - watcher/assets/boss_names.json
    - requirements.txt
    - pyproject.toml
  modified: []

key-decisions:
  - "TrayApp gracefully degrades when pystray unavailable (Linux/headless)"
  - "Config auto-creates on first run at ~/.elden-watcher/config.toml"
  - "190 French boss names including base game + Shadow of the Erdtree DLC"

patterns-established:
  - "Config dataclass with TOML persistence and auto-create defaults"
  - "Loguru with console (colorized) + file (rotated) outputs"
  - "Callback-based process lifecycle (on_launch/on_close)"

requirements-completed: [DETECT-01, DETECT-02]

duration: 2min
completed: 2026-02-26
---

# Phase 01 Plan 01: Project Scaffold Summary

**Python project scaffold with TOML config, loguru logging, psutil process monitor, pystray tray icon, and 190 canonical French boss names**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T22:38:09Z
- **Completed:** 2026-02-26T22:41:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Config system loads from TOML with auto-creation of defaults at ~/.elden-watcher/
- Process monitor detects eldenring.exe via psutil polling with callbacks
- System tray icon shows color-coded status with graceful fallback on non-Windows
- 190 French boss names covering base game and DLC for fuzzy matching

## Task Commits

Each task was committed atomically:

1. **Task 1: Create project scaffold with config, logging, and dependencies** - `e0b5371` (feat)
2. **Task 2: Implement process monitor and system tray with main entry point** - `285ac4a` (feat)

## Files Created/Modified
- `pyproject.toml` - Project metadata and build config
- `requirements.txt` - All Python dependencies
- `watcher/__init__.py` - Package init with version
- `watcher/config.py` - TOML config with dataclass defaults
- `watcher/logger.py` - Loguru setup with rotation and retention
- `watcher/process_monitor.py` - Game process lifecycle via psutil
- `watcher/tray.py` - System tray with color-coded status dot
- `watcher/main.py` - Entry point wiring tray + process monitor
- `watcher/assets/boss_names.json` - 190 French boss names

## Decisions Made
- TrayApp gracefully degrades when pystray unavailable (Linux/headless environments)
- Config auto-creates on first run — no manual setup required
- 190 boss names including DLC content for comprehensive fuzzy matching

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Scaffold ready for state machine (01-02), capture (01-03), and detectors (01-04)
- main.py has AUTO-UPDATE placeholder for Plan 06 wiring

---
*Phase: 01-watcher-core*
*Completed: 2026-02-26*

---
phase: 05-fix-watcher-api-contract-breaks
plan: 01
subsystem: api
tags: [python, watcher, uuid, event-payload, session-tracking]

requires:
  - phase: 01-watcher-core
    provides: "Watcher callbacks (_on_encounter, _on_death, _on_kill, _on_abandon)"
provides:
  - "boss_canonical_name field in all Watcher event payloads"
  - "event_id UUID4 in all event payloads"
  - "session_id threaded from game launch through all events"
  - "duration_seconds computed from fight start time in death/kill/abandon"
affects: [05-02, 05-03, event-pipeline, discord-notifications]

tech-stack:
  added: []
  patterns:
    - "session_id nonlocal threading pattern in main.py"
    - "fight_start_time tracking for duration computation"

key-files:
  created:
    - "tests/test_watcher_events.py"
  modified:
    - "watcher/watcher.py"
    - "watcher/main.py"

key-decisions:
  - "Set fight_start_time in _on_encounter (confirmed encounter), not on first health bar detection"
  - "Include session_id and duration_seconds in fight_abandoned events for data consistency"

patterns-established:
  - "All Watcher events include: type, event_id, boss_canonical_name, session_id, timestamp"
  - "Death/kill/abandon events additionally include duration_seconds"

requirements-completed:
  - COMM-01
  - COMM-02
  - COMM-03
  - COMM-04
  - NOTIF-01
  - NOTIF-02
  - NOTIF-03
  - NOTIF-04
  - NOTIF-05
  - BET-03
  - STAT-01
  - STAT-02
  - STAT-03
  - STAT-05
  - STAT-07

duration: 5min
completed: 2026-02-27
---

# Plan 05-01: Fix Watcher Event Payloads Summary

**All Watcher callbacks now emit boss_canonical_name, event_id UUID4, session_id, and duration_seconds -- fixing BREAK 1-4**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-02-27
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Renamed boss_name to boss_canonical_name in all 4 event callbacks + session events
- Added uuid4 event_id generation to every send_event call (6 total)
- Threaded session_id from on_launch through Watcher.start() to all events including session_end
- Added fight_start_time tracking with duration_seconds computation in death/kill/abandon
- 18 unit tests validating all payload shapes

## Task Commits

1. **Task 1: Fix Watcher event payloads and session_id threading** - `411cc82` (fix)
2. **Task 2: Add unit tests for Watcher event payload shapes** - `411cc82` (test, same commit)

## Files Created/Modified
- `watcher/watcher.py` - Fixed all callbacks: boss_canonical_name, event_id, session_id, duration_seconds
- `watcher/main.py` - session_id generation in on_launch, threading to Watcher.start(), session_end enrichment
- `tests/test_watcher_events.py` - 18 tests covering all callback payload shapes

## Decisions Made
- Set fight_start_time in _on_encounter (post-confirmation) for accurate duration
- Include duration_seconds in fight_abandoned for data consistency
- Use nonlocal session_id pattern in main.py for on_close access

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Watcher now sends correct payloads matching API server expectations
- Plan 05-02 can proceed (JS-side fixes are independent)
- Plan 05-03 integration verification can run after both 05-01 and 05-02

---
*Phase: 05-fix-watcher-api-contract-breaks*
*Completed: 2026-02-27*

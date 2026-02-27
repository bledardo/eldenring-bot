---
phase: 05-fix-watcher-api-contract-breaks
plan: 02
subsystem: api
tags: [javascript, express, apiserver, fight-abandoned, durationSeconds]

requires:
  - phase: 02-event-pipeline
    provides: "API server event routing, storage.addEldenRingFight"
provides:
  - "fight_abandoned handler accepting abandon events with 200"
  - "durationSeconds forwarded in boss_kill emitEvent payload"
affects: [05-03, discord-notifications, stats]

tech-stack:
  added: []
  patterns:
    - "fight_abandoned handler stores with outcome 'abandon', no emitEvent"

key-files:
  created: []
  modified:
    - "delu-bot/src/apiServer.js"
    - "delu-bot/tests/apiServer.test.js"

key-decisions:
  - "handleFightAbandoned stores fight but does NOT emit Discord event (no notification for abandoned fights)"
  - "Use fight.duration_seconds (stored value) not data.duration_seconds (raw) for emitEvent consistency"

patterns-established:
  - "Abandon events stored silently -- no Discord notification"

requirements-completed:
  - COMM-05
  - STAT-04
  - STAT-06

duration: 3min
completed: 2026-02-27
---

# Plan 05-02: Fix API Server Contract Breaks Summary

**Added fight_abandoned handler (200 instead of 400) and forwarded durationSeconds in boss_kill emitEvent -- fixing BREAK 5-6**

## Performance

- **Duration:** ~3 min
- **Completed:** 2026-02-27
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added handleFightAbandoned function storing fights with outcome 'abandon'
- Added fight_abandoned to EVENT_HANDLERS map (no longer returns 400)
- Added durationSeconds: fight.duration_seconds to handleBossKill emitEvent payload
- 4 new tests: fight_abandoned acceptance, storage outcome, no emitEvent, durationSeconds forwarding

## Task Commits

1. **Task 1: Add fight_abandoned handler and fix durationSeconds** - `ba2dd2f` (fix, in delu-bot repo)
2. **Task 2: Add tests** - `ba2dd2f` (test, same commit)

## Files Created/Modified
- `delu-bot/src/apiServer.js` - handleFightAbandoned function + durationSeconds in handleBossKill emitEvent
- `delu-bot/tests/apiServer.test.js` - 4 new tests for BREAK 5 and BREAK 6 fixes

## Decisions Made
- handleFightAbandoned intentionally has no emitEvent call (correct UX: silence on abandoned fights)
- Used fight.duration_seconds from stored record for emitEvent consistency

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- API server now accepts all event types from Watcher
- Kill embeds will display fight duration correctly
- Plan 05-03 integration verification can proceed

---
*Phase: 05-fix-watcher-api-contract-breaks*
*Completed: 2026-02-27*

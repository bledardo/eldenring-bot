---
phase: 02-event-pipeline
plan: 04
subsystem: api, ui
tags: [discord-slash-command, event-emitter, api-key-provisioning]

requires:
  - phase: 02-event-pipeline
    provides: "Storage API key functions (Plan 01), API server (Plan 03)"
provides:
  - "eldenRingTracker module with start/stop lifecycle and EventEmitter"
  - "/er-setup slash command for API key generation and reset"
  - "API key provisioning via Discord DM"
affects: [03-notifications, 04-betting]

tech-stack:
  added: []
  patterns: [tracker-lifecycle, slash-command-dm-pattern]

key-files:
  created:
    - ~/delu-bot/src/eldenRingTracker.js
  modified:
    - ~/delu-bot/src/bot.js

key-decisions:
  - "API key sent via DM first, fallback to ephemeral reply if DMs disabled"
  - "generateApiKey uses crypto.randomBytes(32) for 64-char hex key"
  - "eldenRingTracker follows same start(client)/stop() pattern as tracker.js and tftTracker.js"

patterns-established:
  - "Tracker lifecycle pattern extended to Elden Ring (start/stop with feature flag check)"
  - "DM-first with ephemeral fallback for sensitive data (API keys)"

requirements-completed: [INTG-03]

duration: 15min
completed: 2026-02-27
---

# Plan 04: eldenRingTracker Module and /er-setup Command Summary

**eldenRingTracker module with API server lifecycle and /er-setup slash command for API key provisioning via DM**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3
- **Files modified:** 1 created, 1 modified

## Accomplishments
- eldenRingTracker.js with start/stop lifecycle, EventEmitter bus, API key generation
- /er-setup slash command with generate and reset actions
- API key sent securely via Discord DM (ephemeral fallback)
- Feature flag check on start (tracking_elden_ring)

## Task Commits

1. **eldenRingTracker + /er-setup command** - `bd075fd` (feat, combined with Plan 03)

## Files Created/Modified
- `~/delu-bot/src/eldenRingTracker.js` - Tracker module with lifecycle and EventEmitter
- `~/delu-bot/src/bot.js` - /er-setup slash command and handleErSetup handler

## Decisions Made
- Combined commit with Plan 03 due to cross-dependency (apiServer needs eldenRingTracker)
- DM-first pattern for API key delivery (sensitive data)
- French UI text matching existing bot language

## Deviations from Plan
None - Task 1 (eldenRingTracker.js creation) was pulled forward to Plan 03 execution to resolve circular dependency, but all plan tasks completed.

## Issues Encountered
None.

## Next Phase Readiness
- Tracker module ready for index.js wiring (Plan 05)
- EventEmitter ready for Phase 3 notification/betting subscribers

---
*Phase: 02-event-pipeline*
*Completed: 2026-02-27*

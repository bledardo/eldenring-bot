---
phase: 02-event-pipeline
plan: 05
subsystem: infra, integration
tags: [docker, lifecycle-wiring, integration]

requires:
  - phase: 02-event-pipeline
    provides: "API server (Plan 03), tracker module (Plan 04)"
provides:
  - "eldenRingTracker wired into bot startup/shutdown"
  - "Docker compose exposes API port for external Watcher connections"
  - "Environment documentation for ER_API_PORT"
affects: [03-notifications, 04-betting]

tech-stack:
  added: []
  patterns: [docker-port-mapping, lifecycle-wiring]

key-files:
  created: []
  modified:
    - ~/delu-bot/src/index.js
    - ~/delu-bot/docker-compose.yml
    - ~/delu-bot/.env.example

key-decisions:
  - "API port defaults to 3000 with ER_API_PORT override"
  - "Feature flags default to false (opt-in for Elden Ring tracking)"

patterns-established:
  - "New tracker wiring: require → start(client) → stop() in shutdown handlers"

requirements-completed: [INTG-04]

duration: 10min
completed: 2026-02-27
---

# Plan 05: Integration Wiring and Docker Config Summary

**Wired eldenRingTracker into bot lifecycle (start/stop) and exposed API port in Docker compose**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- eldenRingTracker added to index.js startup (after tftTracker) and both shutdown handlers
- Docker compose exposes ER_API_PORT with port mapping
- Elden Ring feature flags added to Docker environment
- .env.example documented with new variables
- All 66 tests still passing

## Task Commits

1. **Integration wiring + Docker config** - `cd54203` (feat)

## Files Created/Modified
- `~/delu-bot/src/index.js` - eldenRingTracker require, start, stop calls
- `~/delu-bot/docker-compose.yml` - ER_API_PORT, feature flags, port mapping
- `~/delu-bot/.env.example` - Elden Ring section with port and feature flags

## Decisions Made
- Feature flags default to false in Docker (explicit opt-in)

## Deviations from Plan
None - plan executed as written. apiServer.js emitEvent calls were already present from Plan 03.

## Issues Encountered
None.

## User Setup Required
**External services require manual configuration:**
- Set `ER_API_PORT` in `.env` (default: 3000)
- Enable `FEATURE_TRACKING_ELDEN_RING=true` when ready
- Use `/er-setup` in Discord to generate API key for Watcher

## Next Phase Readiness
- Full event pipeline complete: HTTP request -> auth -> dedup -> storage -> EventEmitter
- EventEmitter bus ready for Phase 3 notification and betting subscribers
- Human verification checkpoint recommended before Phase 3

---
*Phase: 02-event-pipeline*
*Completed: 2026-02-27*

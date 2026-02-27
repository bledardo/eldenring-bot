---
phase: 02-event-pipeline
plan: 02
subsystem: api
tags: [python, http-client, bearer-auth, watcher]

requires:
  - phase: 01-watcher-core
    provides: "HTTP client that sends events to API"
provides:
  - "Watcher HTTP client uses Authorization: Bearer header"
  - "Watcher sends to /api/events endpoint"
  - "event_id included in payloads for dedup"
affects: [03-notifications]

tech-stack:
  added: []
  patterns: [bearer-auth-header, uuid-event-dedup]

key-files:
  created:
    - ~/eldenring-bot/tests/test_http_client.py
  modified:
    - ~/eldenring-bot/watcher/http_client.py

key-decisions:
  - "Changed from X-API-Key to Authorization: Bearer for industry standard"
  - "Removed api_key from JSON body (auth only via header)"
  - "Added event_id to every payload for server-side dedup"

patterns-established:
  - "Bearer token auth pattern for Watcher-to-API communication"
  - "UUID event IDs generated client-side"

requirements-completed: [COMM-01, COMM-02]

duration: 10min
completed: 2026-02-27
---

# Plan 02: Watcher HTTP Client Update Summary

**Updated Watcher HTTP client to use Authorization: Bearer header and /api/events endpoint with event_id dedup**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2
- **Files modified:** 1 modified, 1 created

## Accomplishments
- HTTP client sends Authorization: Bearer header instead of X-API-Key
- Endpoint changed from /events to /api/events
- api_key removed from JSON body
- event_id included in all payloads
- 5 tests covering auth format, endpoint, payload structure

## Task Commits

1. **HTTP client update + tests** - `2386b26` (feat)

## Files Created/Modified
- `~/eldenring-bot/watcher/http_client.py` - Updated auth header, endpoint, payload
- `~/eldenring-bot/tests/test_http_client.py` - 5 tests for HTTP client contract

## Decisions Made
- Bearer auth is industry standard, aligns with API server expectations

## Deviations from Plan
None - plan executed as written.

## Issues Encountered
- EventQueue constructor needed pathlib.Path not string (fixed in test)

## Next Phase Readiness
- Watcher HTTP client matches API server contract exactly

---
*Phase: 02-event-pipeline*
*Completed: 2026-02-27*

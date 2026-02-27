---
phase: 02-event-pipeline
status: passed
verified: 2026-02-27
---

# Phase 2: Event Pipeline - Verification

## Phase Goal

Events from the Watcher reach delu-bot on the VPS, are authenticated, and are stored — delu-bot module exists and receives events correctly.

## Requirement Verification

| Req ID | Description | Status | Evidence |
|--------|-------------|--------|----------|
| COMM-01 | Watcher sends boss_encounter event to VPS via HTTP POST | ✓ PASS | `watcher/watcher.py` `_on_encounter()` (line 244) calls `self._http_client.send_event({"type": "boss_encounter", ...})`; `apiServer.js` `handleBossEncounter` receives it via `POST /api/events`; test: `handles boss_encounter` (apiServer.test.js) |
| COMM-02 | Watcher sends player_death event to VPS via HTTP POST | ✓ PASS | `watcher/watcher.py` `_on_death()` (line 264) calls `self._http_client.send_event({"type": "player_death", ...})`; `apiServer.js` `handleBossDeath` handles it; test: `handles player_death` (apiServer.test.js) |
| COMM-03 | Watcher sends boss_kill event to VPS via HTTP POST | ✓ PASS | `watcher/watcher.py` `_on_kill()` (line 278) calls `self._http_client.send_event({"type": "boss_kill", ...})`; `apiServer.js` `handleBossKill` handles it; test: `handles boss_kill` (apiServer.test.js) |
| COMM-04 | Watcher sends session_start and session_end events to VPS | ✓ PASS | `watcher/watcher.py` `start()` (line 142) sends `session_start` with `session_id`; `watcher/main.py` `on_close()` (line 84) sends `session_end`; tests: `handles session_start`, `handles session_end` (apiServer.test.js) |
| COMM-05 | VPS exposes HTTP API endpoint to receive Watcher events | ✓ PASS | `apiServer.js` `app.post('/api/events', authMiddleware, featureFlagMiddleware, ...)` (line 170); `GET /health` endpoint also present; test: `GET /health returns ok without auth` (apiServer.test.js) |
| COMM-06 | API authenticates events via per-player API key | ✓ PASS | `apiServer.js` `authMiddleware()` (line 31) extracts `Authorization: Bearer` header, calls `storage.getEldenRingPlayerByApiKey(apiKey)`, returns 401 on missing/invalid key; tests: `rejects missing Authorization header with 401`, `rejects invalid API key with 401`, `accepts valid Bearer token` (apiServer.test.js) |
| INTG-01 | New eldenRingTracker.js module in delu-bot following existing tracker pattern | ✓ PASS | `~/delu-bot/src/eldenRingTracker.js` exports `start(client)`, `stop()`, `emitEvent()`, `eldenRingEvents` (EventEmitter), `generateApiKey()` — identical lifecycle pattern to `tracker.js` and `tftTracker.js`; test: `should export all new ER betting functions` (eldenRingStorage.test.js) |
| INTG-02 | Elden Ring data stored in delu-bot's storage.js (same JSON persistence) | ✓ PASS | `storage.js` lines 2687-2814+: 14+ ER CRUD functions under `data.eldenRing.{apiKeys, players, seenEventIds, activeEldenRingBets}` namespace; `ensureDataFile()` (line 249) auto-migrates existing data; functions: `getEldenRingPlayerByApiKey`, `createEldenRingApiKey`, `addEldenRingFight`, `addEldenRingSession`, `isEventSeen`, etc. |
| INTG-03 | Feature flag for Elden Ring tracking (tracking_elden_ring, betting_elden_ring) | ✓ PASS | `features.js` line 20: `tracking_elden_ring: { description: 'Suivi des combats Elden Ring', default: false }`; line 21: `betting_elden_ring: { description: 'Paris sur les combats Elden Ring', default: false }`; test: `returns 503 when tracking disabled` (apiServer.test.js) |
| INTG-04 | Does not break existing LoL/TFT functionality | ✓ PASS | All 103 JavaScript tests pass including pre-existing LoL/TFT test suites: `storage.test.js` (19 tests), `features.test.js` (14 tests), `parsing.test.js`, `commands.test.js`; 0 failures after all Phase 2 changes |

## Success Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| The Watcher successfully POSTs boss_encounter, player_death, boss_kill, session_start, and session_end events to the VPS endpoint | ✓ PASS | All 5 event types handled in `apiServer.js` EVENT_HANDLERS map; `watcher.py` sends all 5 types via `_http_client.send_event()`; tests: `handles boss_encounter`, `handles player_death`, `handles boss_kill`, `handles session_start`, `handles session_end` all pass |
| Events with invalid or missing API keys are rejected (401); valid events are accepted and stored | ✓ PASS | `authMiddleware()` in `apiServer.js` returns `401` with `{ ok: false, error: 'Missing API key' }` or `'Invalid API key'`; valid Bearer token results in 200 and `addEldenRingFight()` call; tests: `rejects missing Authorization header with 401`, `rejects invalid API key with 401`, `accepts valid Bearer token` all pass |
| eldenRingTracker.js exists in delu-bot, is loaded on bot startup, and does not break existing LoL/TFT functionality | ✓ PASS | `~/delu-bot/src/eldenRingTracker.js` created; `index.js` requires and calls `eldenRingTracker.start(client)` after `tftTracker.start(client)` in bot lifecycle; 103/103 JS tests pass with zero regressions |
| Elden Ring events are persisted in delu-bot's storage.js with correct structure (player, boss, timestamp, attempt count) | ✓ PASS | `addEldenRingFight(discordId, bossName, outcome, durationSeconds)` stores under `data.eldenRing.players[discordId].bosses[bossName].fights[]` with auto-incremented `attempt_number`; `storage.js` lines 2733-2748 |
| Feature flags tracking_elden_ring and betting_elden_ring are present and respected | ✓ PASS | `featureFlagMiddleware` in `apiServer.js` returns 503 when `tracking_elden_ring` is disabled; `eldenRingTracker.start()` checks flag before starting API server; `features.js` lines 20-21 define both flags with `default: false` |

## Must-Haves Verification

### Plan 02-01
- [x] 14 ER CRUD functions in storage.js (API keys, fights, sessions, event dedup)
- [x] `tracking_elden_ring` and `betting_elden_ring` feature flags in features.js
- [x] Config section `eldenRing.apiPort` and `eldenRing.apiKeyLength` in config.js
- [x] Express 5.2.1 installed as dependency in package.json

### Plan 02-02
- [x] Watcher HTTP client sends `Authorization: Bearer` header
- [x] Watcher sends events to `/api/events` endpoint
- [x] `event_id` UUID included in all Watcher event payloads

### Plan 02-03
- [x] Express API server with `authMiddleware` (Bearer token) and `featureFlagMiddleware`
- [x] `POST /api/events` endpoint with EVENT_HANDLERS map routing 5 event types
- [x] Event deduplication via `event_id` — `isEventSeen()`/`markEventSeen()` in storage.js
- [x] EventEmitter integration: handlers call `getTracker().emitEvent()` for downstream subscribers
- [x] 14 integration tests in apiServer.test.js, all passing

### Plan 02-04
- [x] `eldenRingTracker.js` exports `start(client)`, `stop()`, `emitEvent()`, `eldenRingEvents`, `generateApiKey()`
- [x] `/er-setup` slash command registered in bot.js for API key provisioning
- [x] API key delivered via Discord DM (ephemeral fallback)

### Plan 02-05
- [x] `eldenRingTracker` wired into `index.js` bot startup and shutdown handlers
- [x] Docker compose exposes `ER_API_PORT` with port mapping
- [x] All pre-existing 66 tests still passing after wiring changes

## Test Results

- **JavaScript:** 103 tests passing across 6 test files (0 failures)
  - apiServer.test.js: 18 tests
  - eldenRingStorage.test.js: 24 tests
  - storage.test.js: 19 tests
  - features.test.js: 14 tests
  - Additional test files: 28 tests
- **Python:** 46 passed, 4 skipped (pre-existing screenshot test skips)

## Score

10/10 requirements verified — **PASSED**

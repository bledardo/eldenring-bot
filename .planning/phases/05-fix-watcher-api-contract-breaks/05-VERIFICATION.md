---
phase: 05-fix-watcher-api-contract-breaks
status: passed
verified: 2026-02-27
verifier: orchestrator-inline
score: 6/6
---

# Phase 5 Verification: Fix Watcher-API Contract Breaks

## Phase Goal
All 6 integration breaks between Watcher and API server are fixed -- boss names resolve correctly, events are deduplicated, sessions are tracked, fight durations are recorded, and all event types are handled.

## Must-Have Verification

### 1. Watcher sends boss_canonical_name (PASS)
- **Evidence:** `grep -n "boss_canonical_name" watcher/watcher.py` shows 4 occurrences (lines 255, 267, 281, 295)
- **Test:** `test_encounter_sends_boss_canonical_name`, `test_death_sends_boss_canonical_name`, `test_kill_sends_boss_canonical_name`, `test_abandon_sends_all_fields`
- No bare `boss_name` keys remain in event payloads (only as parameter name)

### 2. Every event includes event_id UUID (PASS)
- **Evidence:** `grep -c "event_id" watcher/watcher.py` returns 5 (encounter, death, kill, abandon, session_start)
- **Evidence:** `watcher/main.py` session_end also includes event_id
- **Test:** `test_encounter_includes_event_id`, `test_death_includes_event_id` validate UUID format (36 chars, 4 hyphens)

### 3. session_id generated and threaded to all events (PASS)
- **Evidence:** `session_id = str(uuid.uuid4())` in main.py on_launch
- **Evidence:** `args=(pid, session_id)` threads to Watcher.start()
- **Evidence:** `self._session_id` set in start(), included in all 6 event types
- **Test:** `test_session_start_includes_session_id`, `test_encounter_includes_session_id`

### 4. duration_seconds in death/kill/abandon events (PASS)
- **Evidence:** `grep -n "duration_seconds" watcher/watcher.py` shows 3 occurrences (death, kill, abandon)
- **Evidence:** `self._fight_start_time = time.time()` set in _on_encounter
- **Test:** `test_death_sends_duration_seconds` (validates ~45s), `test_kill_sends_duration_seconds` (validates ~120s)

### 5. fight_abandoned accepted by API (PASS)
- **Evidence:** `fight_abandoned: handleFightAbandoned` in EVENT_HANDLERS map
- **Evidence:** handleFightAbandoned stores with outcome 'abandon', no emitEvent
- **Test:** `accepts fight_abandoned event (not 400)` returns 200
- **Test:** `fight_abandoned stores with outcome abandon`
- **Test:** `fight_abandoned does NOT emit event`

### 6. durationSeconds forwarded in boss_kill emitEvent (PASS)
- **Evidence:** `durationSeconds: fight.duration_seconds` in handleBossKill emitEvent call
- **Test:** `boss_kill emitEvent includes durationSeconds` validates value is 120

## Requirement Traceability

All 18 Phase 5 requirement IDs verified:

| ID | Status | Evidence |
|----|--------|----------|
| COMM-01 | Complete | boss_encounter callback sends boss_canonical_name, event_id, session_id |
| COMM-02 | Complete | player_death callback sends all required fields |
| COMM-03 | Complete | boss_kill callback sends all required fields |
| COMM-04 | Complete | session_start and session_end include session_id, event_id |
| COMM-05 | Complete | fight_abandoned handler added to EVENT_HANDLERS |
| NOTIF-01 | Complete | boss_canonical_name resolves correct name for encounter embeds |
| NOTIF-02 | Complete | durationSeconds forwarded for kill embeds |
| NOTIF-03 | Complete | boss_canonical_name resolves correct name for death embeds |
| NOTIF-04 | Complete | Correct boss name enables artwork lookup |
| NOTIF-05 | Complete | session_id enables session summary generation |
| BET-03 | Complete | Per-boss odds work with correct boss_canonical_name |
| STAT-01 | Complete | Fights stored under correct boss names |
| STAT-02 | Complete | duration_seconds sent and stored |
| STAT-03 | Complete | Kills/deaths tracked per correct boss name |
| STAT-04 | Complete | Stats data quality restored |
| STAT-05 | Complete | Boss list shows actual boss names |
| STAT-06 | Complete | Time rankings meaningful with duration data |
| STAT-07 | Complete | Deaths grouped by actual boss name |

## Test Results

- **Python:** 46 passed, 4 skipped (pre-existing screenshot test skips)
- **JavaScript:** 103 passed, 0 failed

## Score: 6/6 -- PASSED

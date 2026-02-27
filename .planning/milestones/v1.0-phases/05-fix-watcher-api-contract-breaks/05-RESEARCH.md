# Phase 5: Fix Watcher-API Contract Breaks - Research

**Researched:** 2026-02-27
**Domain:** Cross-component contract repair — Python Watcher payload fields + JavaScript API server routing
**Confidence:** HIGH

## Summary

Phase 5 closes 6 precisely-identified integration breaks that were catalogued in the v1.0 milestone audit. Every break has a known root cause, an exact file location, and a minimal fix. No exploratory work is required — this is surgical repair of mismatched contracts between the Python Watcher (eldenring-bot) and the JavaScript API server (delu-bot).

The breaks fall into two groups. Four breaks are in `watcher/watcher.py` and `watcher/main.py` (Python): the Watcher sends wrong/missing fields that the API already expects. Two breaks are in `delu-bot/src/apiServer.js` (JavaScript): `fight_abandoned` has no handler, and `handleBossKill` omits `durationSeconds` from the `emitEvent` call. The notifier already extracts `durationSeconds` from the emitted data, so the fix is a one-field addition to the JS payload.

All fixes are additive (add fields, add a handler) with no destructive changes. The existing test suite already validates the HTTP client contract; new unit tests should cover the new watcher payload fields and the `fight_abandoned` handler.

**Primary recommendation:** Fix all 6 breaks in a single focused phase with one plan per break (or group closely related breaks into one plan). The Python side has 4 related fixes that can be grouped into 2 plans (payload fields + session/timing). The JS side has 2 independent fixes (fight_abandoned handler + emitEvent forwarding).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMM-01 | Watcher sends boss_encounter event to VPS via HTTP POST | Fix BREAK 1 (boss_canonical_name key) + BREAK 2 (event_id) — watcher.py _on_encounter() |
| COMM-02 | Watcher sends player_death event to VPS via HTTP POST | Fix BREAK 1 + BREAK 2 — watcher.py _on_death() |
| COMM-03 | Watcher sends boss_kill event to VPS via HTTP POST | Fix BREAK 1 + BREAK 2 + BREAK 4 (duration_seconds) — watcher.py _on_kill() |
| COMM-04 | Watcher sends session_start and session_end events to VPS | Fix BREAK 3 (session_id UUID) — watcher/main.py on_launch() and on_close() |
| COMM-05 | VPS exposes HTTP API endpoint to receive Watcher events | Fix BREAK 5 (fight_abandoned handler) — apiServer.js EVENT_HANDLERS map |
| NOTIF-01 | Bot sends rich embed on boss encounter (boss name, attempt #, player name) | Resolved by BREAK 1 fix — bossName will no longer be "Unknown Boss" |
| NOTIF-02 | Bot sends rich embed on boss kill (victory, time spent, attempts) | Resolved by BREAK 1 + BREAK 6 (durationSeconds forwarded in emitEvent) |
| NOTIF-03 | Bot sends rich embed on player death (attempt count increment) | Resolved by BREAK 1 fix |
| NOTIF-04 | Embeds include boss artwork/thumbnail from asset library | Resolved by BREAK 1 fix — getEldenRingBossImage() returns artwork for real boss names |
| NOTIF-05 | Bot sends session summary embed when game closes | Resolved by BREAK 3 fix — session_id will be a valid UUID |
| BET-03 | Odds are based on player's historical defeat rate for that specific boss | Resolved by BREAK 1 fix — per-boss odds instead of one aggregate "Unknown Boss" rate |
| STAT-01 | Bot tracks attempt count per boss per player (persistent) | Resolved by BREAK 1 fix — fights stored under correct boss names |
| STAT-02 | Bot tracks time spent per boss fight | Resolved by BREAK 4 fix — duration_seconds sent by Watcher |
| STAT-03 | Bot tracks total kills and deaths per player | Resolved by BREAK 1 fix — boss-level breakdown preserved |
| STAT-04 | /er-stats slash command shows player's Elden Ring stats | Data quality restored by BREAK 1 + BREAK 4 fixes |
| STAT-05 | /er-bosses slash command lists all bosses encountered with attempt counts | Resolved by BREAK 1 fix — boss list shows actual boss names |
| STAT-06 | /er-leaderboard slash command shows server-wide rankings | Resolved by BREAK 4 fix — time rankings meaningful |
| STAT-07 | Server-wide boss difficulty comparison | Resolved by BREAK 1 fix — deaths grouped by actual boss |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new dependencies)

| Component | Language | File | Role |
|-----------|----------|------|------|
| Python Watcher | Python 3.10+ | `watcher/watcher.py` | Generates and sends events |
| Python main entry | Python 3.10+ | `watcher/main.py` | Session lifecycle management |
| API server | Node.js / Express 5.x | `delu-bot/src/apiServer.js` | Receives and routes events |
| ER notifier | Node.js | `delu-bot/src/eldenRingNotifier.js` | Sends Discord embeds |
| `uuid` (Python stdlib) | Python | `import uuid` | Generate UUIDs — already available in Python stdlib |

### No New Packages Required

All fixes use Python stdlib (`uuid`, `time`) and existing Node.js modules. No `npm install` or `pip install` needed.

---

## Architecture Patterns

### Project Structure (relevant files only)

```
eldenring-bot/
├── watcher/
│   ├── watcher.py        # BREAK 1, 2, 4 fixes here
│   ├── main.py           # BREAK 3 fix here
│   └── state_machine.py  # May need fight_start_time tracking for BREAK 4
delu-bot/
└── src/
    ├── apiServer.js       # BREAK 5, 6 fixes here
    └── eldenRingNotifier.js  # Already correct — consumes durationSeconds
```

### Pattern: Enqueue-First Event Delivery

The HTTP client always writes events to disk queue before attempting HTTP POST. This means fixing the payload fields in `watcher.py` callbacks automatically fixes both the live send path and the disk-queue retry path — the queue stores the enriched event dict.

```python
# Source: watcher/http_client.py (already implemented)
def send_event(self, event: dict) -> bool:
    path = self._queue.enqueue(event)   # disk-first
    payload = {
        "type": event.get("type", "unknown"),
        "event_id": event.get("event_id", ""),  # needs to be populated
        "data": event,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    # ...POST to /api/events
```

The `event_id` is already extracted from `event.get("event_id", "")` — the watcher just needs to include it in the event dict.

### Pattern: API Server Event Routing

```javascript
// Source: delu-bot/src/apiServer.js (already implemented)
const EVENT_HANDLERS = {
  boss_encounter: handleBossEncounter,
  player_death: handlePlayerDeath,
  boss_kill: handleBossKill,
  session_start: handleSessionStart,
  session_end: handleSessionEnd,
  // fight_abandoned: MISSING — causes 400 (BREAK 5)
};
```

Adding `fight_abandoned` to this map closes BREAK 5. Handler options: (a) store it as a fight outcome like `abandon`, (b) silently accept with `ok: true` and no storage side-effect, (c) remove the `_on_abandon` callback entirely. The simplest correct fix is adding a handler that stores the fight as outcome `'abandon'` and emits an event for any downstream listener.

---

## Break-by-Break Fix Specifications

### BREAK 1: Boss Name Key Mismatch (CRITICAL)

**Root cause:** `watcher.py` sends `boss_name` key. API server reads `data.boss_canonical_name || data.boss`. Neither matches `boss_name`.

**Evidence from apiServer.js line 64:**
```javascript
const bossName = data.boss_canonical_name || data.boss || 'Unknown Boss';
```

**Evidence from watcher.py line 244-248:**
```python
self._http_client.send_event({
    "type": "boss_encounter",
    "boss_name": boss_name,          # <-- wrong key
    "timestamp": datetime.now(timezone.utc).isoformat(),
})
```

**Fix:** Rename `boss_name` to `boss_canonical_name` in all three event-emitting callbacks in `watcher.py`:
- `_on_encounter()` — line 244
- `_on_death()` — line 253
- `_on_kill()` — line 263
- `_on_abandon()` — line 272

**Affected requirements:** COMM-01, COMM-02, COMM-03, NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, STAT-01, STAT-03, STAT-05, STAT-07, BET-03

**Confidence:** HIGH — direct field name mismatch confirmed by reading both files.

---

### BREAK 2: event_id Never Generated

**Root cause:** Watcher event dicts never include `event_id`. HTTP client falls back to empty string `""`. API server dedup check `if (event_id && ...)` is falsy for empty string — dedup silently disabled.

**Evidence from http_client.py line 72:**
```python
"event_id": event.get("event_id", ""),  # defaults to "" when not in dict
```

**Evidence from apiServer.js line 164:**
```javascript
if (event_id && storage.isEldenRingEventSeen(event_id)) {
    return res.json({ ok: true, duplicate: true });
}
```

**Fix:** Generate `uuid4()` in each `_on_*` callback before calling `send_event`:
```python
import uuid

def _on_encounter(self, boss_name: str) -> None:
    self._http_client.send_event({
        "type": "boss_encounter",
        "event_id": str(uuid.uuid4()),
        "boss_canonical_name": boss_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
```

`uuid` is Python stdlib — no new dependency.

**Confidence:** HIGH — confirmed by tracing event dict through send_event payload construction.

---

### BREAK 3: session_id Never Generated

**Root cause:** `main.py` never generates a session UUID. Both `session_start` and `session_end` events have no `session_id` field. API server stores sessions with `id: undefined`.

**Evidence from main.py line 137-141 (session_start in watcher.py.start()):**
```python
self._http_client.send_event({
    "type": "session_start",
    "timestamp": datetime.now(timezone.utc).isoformat(),
    # session_id missing
})
```

**Evidence from main.py line 80-85 (session_end in on_close()):**
```python
http_client.send_event({
    "type": "session_end",
    "timestamp": ...,
    # session_id missing
})
```

**Fix:** Generate session UUID in `main.py`'s `on_launch()` callback and thread it through to `Watcher.start()`:
1. In `on_launch(pid)`: `session_id = str(uuid.uuid4())`
2. Pass `session_id` to `watcher_instance.start(pid, session_id)`
3. `Watcher.start()` stores it as `self._session_id`
4. Include `session_id` in all events (encounter, death, kill, abandon, session_start, session_end)
5. `on_close()` uses the stored session_id or reads it from a shared variable

**Design decision:** Session ID must be generated at game launch and passed to all events during that session. The simplest approach: generate in `on_launch`, pass to `Watcher.start()`, store as `self._session_id` on the Watcher, include in every event payload.

**Confidence:** HIGH — flow is clear from reading main.py and watcher.py.

---

### BREAK 4: duration_seconds Never Sent

**Root cause:** Watcher does not track fight start time. Death and kill event dicts have no `duration_seconds` field. API stores `duration_seconds: 0` for all fights.

**State machine observation:** The FSM tracks `_resolution_start` (when bar disappears for kill resolution) but not fight start time. Fight start time = moment encounter is confirmed = when `_on_encounter` is called.

**Fix:** Track fight start time in `Watcher`:
```python
# In __init__:
self._fight_start_time: float | None = None

# In _on_encounter:
self._fight_start_time = time.time()

# In _on_death and _on_kill:
duration = int(time.time() - self._fight_start_time) if self._fight_start_time else 0
self._http_client.send_event({
    "type": "player_death",
    "event_id": str(uuid.uuid4()),
    "boss_canonical_name": boss_name,
    "session_id": self._session_id,
    "duration_seconds": duration,
    "timestamp": datetime.now(timezone.utc).isoformat(),
})

# In _reset_fight_state():
self._fight_start_time = None
```

**Note:** `fight_abandoned` does NOT need `duration_seconds` — the API has no handler for it yet (BREAK 5), and the notifier has no embed for it. Include it for data consistency but not strictly required.

**Confidence:** HIGH — tracking wall time from encounter confirmation is straightforward. The FSM already has the right callback hooks.

---

### BREAK 5: fight_abandoned Returns 400

**Root cause:** `fight_abandoned` is in `EVENT_HANDLERS` nowhere. When Watcher sends it, API hits `if (!handler)` branch and returns `400`.

**Evidence from apiServer.js line 168-170:**
```javascript
const handler = EVENT_HANDLERS[type];
if (!handler) {
    return res.status(400).json({ ok: false, error: `Unknown event type: ${type}` });
}
```

**Options:**
- A: Add `fight_abandoned: handleFightAbandoned` with a storage write (outcome: 'abandon')
- B: Add `fight_abandoned: (_, __) => {}` (no-op handler — accept and discard)
- C: Remove `_on_abandon` from the Watcher FSM wiring to stop sending this event

Option A is cleanest for data completeness. Option B is minimal. Option C removes capability.

**Recommended fix (Option A):** Add a handler in `apiServer.js`:
```javascript
function handleFightAbandoned(discordUserId, data) {
  const bossName = data.boss_canonical_name || data.boss || 'Unknown Boss';
  storage.addEldenRingFight(discordUserId, bossName, {
    timestamp: data.timestamp || new Date().toISOString(),
    outcome: 'abandon',
    duration_seconds: data.duration_seconds || 0,
    boss_canonical_name: bossName,
    session_id: data.session_id || null,
  });
  // No emitEvent — no Discord notification for abandoned fights (player left area)
}

const EVENT_HANDLERS = {
  boss_encounter: handleBossEncounter,
  player_death: handlePlayerDeath,
  boss_kill: handleBossKill,
  session_start: handleSessionStart,
  session_end: handleSessionEnd,
  fight_abandoned: handleFightAbandoned,  // ADD THIS
};
```

**Confidence:** HIGH — fix location and approach are unambiguous.

---

### BREAK 6: durationSeconds Not Forwarded in emitEvent

**Root cause:** `handleBossKill` in `apiServer.js` builds the `emitEvent` payload without `durationSeconds`. `eldenRingNotifier.js` destructures `durationSeconds` from the emitted data.

**Evidence from apiServer.js lines 110-116:**
```javascript
getTracker().emitEvent('boss_kill', {
    discordUserId,
    bossName,
    attemptNumber: fight.attempt_number,
    sessionId: data.session_id,
    timestamp: data.timestamp,
    // durationSeconds missing here
});
```

**Evidence from eldenRingNotifier.js line 133:**
```javascript
async function handleKill(client, { discordUserId, bossName, attemptNumber, timestamp, durationSeconds }) {
    // uses durationSeconds for embed field
}
```

**Fix:** Add `durationSeconds` to the `emitEvent` call in `handleBossKill`:
```javascript
getTracker().emitEvent('boss_kill', {
    discordUserId,
    bossName,
    attemptNumber: fight.attempt_number,
    sessionId: data.session_id,
    timestamp: data.timestamp,
    durationSeconds: fight.duration_seconds,  // ADD THIS
});
```

Note: Use `fight.duration_seconds` (from the stored fight record) rather than `data.duration_seconds` directly — this ensures the embed value matches what was persisted.

**Confidence:** HIGH — one field addition, chain confirmed by reading both files.

---

## Architecture Patterns

### Pattern 1: Centralized Event Enrichment

All Watcher callbacks (`_on_encounter`, `_on_death`, `_on_kill`, `_on_abandon`) should be updated simultaneously. They share the same field pattern: `event_id` (uuid4), `boss_canonical_name`, `session_id`, `timestamp`. Death and kill also add `duration_seconds`. This avoids partial fixes that leave some events still broken.

### Pattern 2: Session ID Threading

Session ID must be generated once per game session and passed to every subsequent event. The natural threading path:

```
on_launch(pid) generates session_id
    → watcher_instance.start(pid, session_id)
        → self._session_id = session_id
        → sent in session_start event
        → sent in all _on_encounter, _on_death, _on_kill, _on_abandon events
on_close() uses same session_id
    → sent in session_end event
```

The `on_close()` callback currently has no reference to `session_id` generated in `on_launch()`. The cleanest fix: store it in a `nonlocal session_id` variable in `main()`, or store it on the Watcher instance after `start()` is called.

### Anti-Patterns to Avoid

- **Partial key fix:** Do not rename `boss_name` in only some callbacks — leave others unchanged. All four callbacks must be updated in the same commit.
- **Generating session_id inside Watcher.start():** This would make it inaccessible to `on_close()` in `main.py`. Generate in `on_launch()` and thread it through.
- **Using `data.duration_seconds` instead of `fight.duration_seconds` in BREAK 6 fix:** The fight record is already stored at this point; use the stored value for consistency.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom random ID generator | `import uuid; str(uuid.uuid4())` | stdlib, RFC 4122, already pattern-matched by apiServer.js dedup |
| Time duration | Custom timer class | `time.time()` float subtraction | stdlib, already used in state_machine.py for phase window tracking |

---

## Common Pitfalls

### Pitfall 1: Fixing watcher.py But Not main.py (session_id gap)

**What goes wrong:** Developer renames `boss_name` to `boss_canonical_name` and adds `event_id` in `watcher.py`, but misses that `session_id` is generated in `main.py`. Session events still lack `session_id`.
**Why it happens:** The session_start/session_end events are sent from `watcher.py` (in `Watcher.start()`) and from `main.py` (in `on_close()`). They're in different files.
**How to avoid:** Fix both files in a single plan. Look for every `send_event({...})` call and verify it includes `session_id`.
**Warning signs:** `session_end` still has no `session_id` after fixes.

### Pitfall 2: session_id Scope Problem in main.py

**What goes wrong:** `session_id` is generated in `on_launch()` but `on_close()` is a separate closure — it cannot see `session_id` without sharing state.
**Why it happens:** Both are nested functions in `main()`. `on_launch()` creates the session_id as a local variable, but `on_close()` is a separate closure.
**How to avoid:** Use `nonlocal session_id` pattern in `main()`:
```python
session_id: str | None = None

def on_launch(pid: int) -> None:
    nonlocal session_id
    session_id = str(uuid.uuid4())
    # ...start watcher with session_id

def on_close() -> None:
    http_client.send_event({
        "type": "session_end",
        "session_id": session_id,
        # ...
    })
```

### Pitfall 3: fight_abandoned Handler Creates Discord Notification

**What goes wrong:** Copy-pasting `handleBossKill` creates a handler that calls `emitEvent`, which triggers `eldenRingNotifier`. No embed handler exists for `fight_abandoned` in notifier — uncaught event.
**Why it happens:** Reflexive copy of existing handler pattern.
**How to avoid:** `handleFightAbandoned` should NOT call `emitEvent`. Log-and-store only. No Discord notification for abandoned fights is the correct UX.

### Pitfall 4: Tests Validate Old Payload Shape

**What goes wrong:** Existing `test_http_client.py` tests send events with `event_id` pre-set — they do not test that watcher.py *generates* `event_id`. After the fix, new unit tests for `watcher.py` callbacks are needed to confirm the generated fields.
**Why it happens:** The http_client tests were written for the HTTP transport layer, not the event generation layer.
**How to avoid:** Add tests in `test_integration.py` or a new `test_watcher_events.py` that mock `http_client.send_event` and assert the called payload contains `boss_canonical_name`, `event_id` (non-empty), `session_id`, and `duration_seconds`.

### Pitfall 5: Duration Calculation on First Frame vs Encounter Confirmation

**What goes wrong:** Fight start time is set when health bar is first detected (ENCOUNTER_PENDING) rather than when encounter is confirmed (ACTIVE_FIGHT). This inflates duration by the confirmation window (~3 frames at 10fps = ~0.3s). Acceptable but inconsistent.
**Why it happens:** `_on_encounter` is called from the FSM after confirmation.
**How to avoid:** Set `self._fight_start_time = time.time()` inside `_on_encounter()` — this is called exactly when the encounter is confirmed. No ambiguity.

---

## Code Examples

### Complete Fixed _on_encounter (watcher.py)

```python
# Fixes BREAK 1 (boss_canonical_name), BREAK 2 (event_id), uses session_id (BREAK 3)
import uuid

def _on_encounter(self, boss_name: str) -> None:
    """FSM callback: boss encounter confirmed."""
    if self._coop_detected:
        logger.info("Co-op detected — skipping encounter event for {}", boss_name)
        return

    self._fight_start_time = time.time()  # BREAK 4: track fight start
    logger.info("Boss encounter: {}", boss_name)
    self._http_client.send_event({
        "type": "boss_encounter",
        "event_id": str(uuid.uuid4()),          # BREAK 2 fix
        "boss_canonical_name": boss_name,        # BREAK 1 fix
        "session_id": self._session_id,          # BREAK 3 fix
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
```

### Complete Fixed _on_death (watcher.py)

```python
# Fixes BREAK 1, 2, 4 (duration)
def _on_death(self, boss_name: str) -> None:
    """FSM callback: player death."""
    duration = int(time.time() - self._fight_start_time) if self._fight_start_time else 0
    logger.info("Player death vs {} ({}s)", boss_name, duration)
    self._http_client.send_event({
        "type": "player_death",
        "event_id": str(uuid.uuid4()),
        "boss_canonical_name": boss_name,
        "session_id": self._session_id,
        "duration_seconds": duration,           # BREAK 4 fix
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    self._reset_fight_state()
```

### Complete Fixed _on_kill (watcher.py)

```python
# Fixes BREAK 1, 2, 4
def _on_kill(self, boss_name: str) -> None:
    """FSM callback: boss killed."""
    duration = int(time.time() - self._fight_start_time) if self._fight_start_time else 0
    logger.info("Boss killed: {} ({}s)", boss_name, duration)
    self._http_client.send_event({
        "type": "boss_kill",
        "event_id": str(uuid.uuid4()),
        "boss_canonical_name": boss_name,
        "session_id": self._session_id,
        "duration_seconds": duration,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    self._reset_fight_state()
```

### Fixed handleBossKill emitEvent call (apiServer.js)

```javascript
// BREAK 6 fix: add durationSeconds to emitEvent payload
getTracker().emitEvent('boss_kill', {
    discordUserId,
    bossName,
    attemptNumber: fight.attempt_number,
    sessionId: data.session_id,
    timestamp: data.timestamp,
    durationSeconds: fight.duration_seconds,  // ADD THIS LINE
});
```

### New fight_abandoned handler (apiServer.js)

```javascript
// BREAK 5 fix: handle fight_abandoned without emitting Discord event
function handleFightAbandoned(discordUserId, data) {
  const bossName = data.boss_canonical_name || data.boss || 'Unknown Boss';
  storage.addEldenRingFight(discordUserId, bossName, {
    timestamp: data.timestamp || new Date().toISOString(),
    outcome: 'abandon',
    duration_seconds: data.duration_seconds || 0,
    boss_canonical_name: bossName,
    session_id: data.session_id || null,
  });
  // Intentionally no emitEvent call — no Discord notification for abandoned fights
}
```

### session_id threading pattern (main.py)

```python
import uuid

def main() -> None:
    # ...existing setup...
    session_id: str | None = None    # shared across callbacks

    def on_launch(pid: int) -> None:
        nonlocal session_id, watcher_thread
        session_id = str(uuid.uuid4())    # generate fresh UUID per game session
        logger.info("Elden Ring detected (PID: {}, session: {})", pid, session_id)
        watcher_thread = threading.Thread(
            target=watcher_instance.start,
            args=(pid, session_id),       # pass to Watcher
            daemon=True,
        )
        watcher_thread.start()

    def on_close() -> None:
        nonlocal watcher_thread
        logger.info("Elden Ring closed")
        if watcher_instance is not None:
            watcher_instance.stop()
        http_client.send_event({
            "type": "session_end",
            "event_id": str(uuid.uuid4()),
            "session_id": session_id,      # uses nonlocal session_id
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        # ...rest of on_close
```

---

## Plan Structure Recommendation

The 6 breaks map naturally into 3 plans:

**Plan 05-01: Fix Watcher event payloads (Python — BREAK 1, 2, 3, 4)**
- Rename `boss_name` → `boss_canonical_name` in all watcher.py callbacks
- Add `event_id` uuid4 generation to all callbacks
- Add `session_id` threading through main.py → Watcher.start() → all callbacks
- Add `duration_seconds` tracking (fight_start_time) in encounter/death/kill
- Add `session_id` to session_start and session_end events
- Update `_reset_fight_state()` to clear `_fight_start_time`
- Add tests asserting payload shape from callbacks
- Files: `watcher/watcher.py`, `watcher/main.py`, `tests/`

**Plan 05-02: Fix API server contract (JavaScript — BREAK 5, 6)**
- Add `handleFightAbandoned` function to apiServer.js (no emitEvent)
- Add `fight_abandoned` to `EVENT_HANDLERS` map
- Add `durationSeconds: fight.duration_seconds` to `handleBossKill` emitEvent call
- Files: `delu-bot/src/apiServer.js`

**Plan 05-03: End-to-end verification**
- Confirm all 6 success criteria from phase definition
- Run full test suite on Python side
- Manual smoke test or integration test confirming API accepts all event types
- Update REQUIREMENTS.md checkboxes for COMM-01 through COMM-05

This grouping keeps Python and JavaScript changes separate (two developers or two atomic commits), and isolates the verification step.

---

## Open Questions

1. **Should `fight_abandoned` write to storage at all?**
   - What we know: The Watcher emits it when player leaves the boss arena without dying or killing. The API currently rejects it. The storage module has `addEldenRingFight()`.
   - What's unclear: Is an abandoned fight useful for stats? Is it noise?
   - Recommendation: Store it as outcome `'abandon'` — it's real data and costs nothing. Exclude it from kill/death counts by filtering `outcome !== 'abandon'` in stats queries. Do NOT emit a Discord notification.

2. **Should `session_id` be included in `boss_encounter` events?**
   - What we know: `handleBossEncounter` in apiServer.js already reads `data.session_id || null` and stores it in the fight record.
   - What's unclear: The v1 requirements only call out `session_start`/`session_end` needing session_id (COMM-04), but including it in all events enables future session-scoped queries.
   - Recommendation: Include `session_id` in ALL events — encounter, death, kill, abandon — for completeness. Cost is negligible.

3. **Does `_on_abandon` in watcher.py need `duration_seconds`?**
   - What we know: If BREAK 5 handler stores it, `duration_seconds` in abandon events is useful. If using no-op handler, irrelevant.
   - Recommendation: Include it for data consistency since BREAK 4 fix already tracks `self._fight_start_time`.

---

## Sources

### Primary (HIGH confidence)
- `watcher/watcher.py` — direct read of all `_on_*` callbacks and event dicts
- `watcher/main.py` — direct read of `on_launch()`, `on_close()`, `Watcher.start()` call
- `delu-bot/src/apiServer.js` — direct read of `EVENT_HANDLERS`, `handleBossKill`, field extraction
- `delu-bot/src/eldenRingNotifier.js` — direct read of `handleKill` destructuring `durationSeconds`
- `watcher/http_client.py` — direct read of `event_id` fallback to `""`
- `.planning/v1.0-MILESTONE-AUDIT.md` — machine-generated audit with file+line evidence

### Secondary (MEDIUM confidence)
- `.planning/phases/02-event-pipeline/02-02-SUMMARY.md` — confirms bearer auth and event_id were intended to be in payloads

### No External Sources Required
All fixes are fully specified by reading the existing codebase. No library docs, no web search needed. The audit document provides exact root causes.

---

## Metadata

**Confidence breakdown:**
- Break identification: HIGH — every break confirmed by reading two files (sender and receiver)
- Fix specifications: HIGH — each fix is a targeted field rename or addition
- Plan structure: HIGH — minimal changes, no architectural decisions required
- Test coverage gaps: HIGH — identified which existing tests cover transport vs. which new tests are needed for payload generation

**Research date:** 2026-02-27
**Valid until:** Indefinitely — this is a codebase audit, not external library research. The findings are stable until the code changes.

# Phase 2: Event Pipeline - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Events flow from the Watcher (Python, player's Windows PC) to delu-bot (Node.js, VPS). This phase delivers: an HTTP API endpoint on the VPS that accepts Watcher events, authenticates via API key, stores fight data in delu-bot's storage.js, and a new eldenRingTracker.js module inside delu-bot. Also includes the `/er-setup` slash command for key provisioning. Does NOT include Discord notifications, betting, or stats commands — those are Phase 3+.

</domain>

<decisions>
## Implementation Decisions

### API Contract & Endpoints
- Single `POST /api/events` endpoint — event type in JSON body (`{"type": "boss_encounter", ...}`)
- Minimal acknowledgment response: `{"ok": true}`
- Watcher generates a UUID per event for deduplication — server stores seen IDs and ignores duplicates (retry queue from Phase 1 means events can arrive more than once)
- Event types: `boss_encounter`, `player_death`, `boss_kill`, `session_start`, `session_end`

### Authentication Model
- API key sent via `Authorization: Bearer <key>` header
- Keys stored in storage.js alongside player data, mapped to Discord user ID
- `/er-setup` slash command generates a unique API key, DMs it to the player — player pastes it into Watcher config (`~/.elden-watcher/config.toml`)
- `/er-setup --reset` regenerates the key, invalidating the old one immediately
- Invalid or missing API keys are rejected with 401

### delu-bot Integration
- delu-bot repo is at `~/delu-bot` — Claude should inspect existing patterns (tracker modules, storage, command registration)
- Claude's Discretion: whether to add Express routes to an existing HTTP server or spin up a new one on a dedicated port
- Feature flags: `tracking_elden_ring` and `betting_elden_ring` — when `tracking_elden_ring` is off, API rejects with 503 (Watcher queues for retry)
- `/er-setup` slash command is part of Phase 2 (not deferred)
- Must not break existing LoL/TFT functionality

### Storage & Data Model
- Per-player, per-boss fight log: `players[discordId].bosses[bossName].fights[]`
- Each fight stores full context: `timestamp`, `outcome` (death/kill/abandon), `duration_seconds`, `boss_canonical_name`, `attempt_number`, `session_id`
- Separate sessions array per player: `players[discordId].sessions[]` with start/end timestamps and summary
- Internal EventEmitter pattern: eldenRingTracker emits `boss_encounter`, `player_death`, `boss_kill` events after storing — Phase 3 modules subscribe without modifying the pipeline

### Claude's Discretion
- Express server setup (new server vs existing)
- UUID generation library choice
- Exact deduplication window/TTL for seen event IDs
- Internal event naming conventions
- Error logging and monitoring approach

</decisions>

<specifics>
## Specific Ideas

- delu-bot is at `~/delu-bot` — research should inspect existing tracker patterns (LoL/TFT) and storage.js structure to match conventions
- EventEmitter pattern enables clean Phase 3 hookup without modifying Phase 2 code
- The data model must support: attempt counting per boss (Phase 4 stats), win/loss ratio per boss (Phase 3 betting odds), session summaries (Phase 3 notifications)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-event-pipeline*
*Context gathered: 2026-02-27*

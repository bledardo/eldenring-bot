# Phase 2: Event Pipeline - Research

**Researched:** 2026-02-27
**Domain:** Node.js HTTP API, Discord.js slash commands, JSON persistence
**Confidence:** HIGH

## Summary

Phase 2 bridges the Python Watcher (player's PC) and delu-bot (VPS) via an HTTP API endpoint. The Watcher already sends events to `{api_url}/events` with `X-API-Key` header authentication and JSON payloads. delu-bot currently has no HTTP server — one must be added. The existing codebase uses a tracker pattern (start/stop lifecycle, polling, Discord notifications) and JSON file persistence via storage.js.

The main implementation areas are: (1) an Express HTTP server receiving Watcher events, (2) an eldenRingTracker.js module following the tracker pattern, (3) storage extensions for Elden Ring fight data, (4) the `/er-setup` slash command for API key provisioning, and (5) feature flag registration.

**Primary recommendation:** Use Express for the HTTP server (lightweight, well-known, no existing server to conflict with). Follow the exact tracker pattern from tracker.js/tftTracker.js. Extend storage.js with Elden Ring data fields following the same readData/writeData pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Single `POST /api/events` endpoint — event type in JSON body (`{"type": "boss_encounter", ...}`)
- Minimal acknowledgment response: `{"ok": true}`
- Watcher generates a UUID per event for deduplication — server stores seen IDs and ignores duplicates
- Event types: `boss_encounter`, `player_death`, `boss_kill`, `session_start`, `session_end`
- API key sent via `Authorization: Bearer <key>` header
- Keys stored in storage.js alongside player data, mapped to Discord user ID
- `/er-setup` slash command generates a unique API key, DMs it to the player — player pastes it into Watcher config (`~/.elden-watcher/config.toml`)
- `/er-setup --reset` regenerates the key, invalidating the old one immediately
- Invalid or missing API keys are rejected with 401
- Feature flags: `tracking_elden_ring` and `betting_elden_ring` — when `tracking_elden_ring` is off, API rejects with 503
- Per-player, per-boss fight log: `players[discordId].bosses[bossName].fights[]`
- Each fight stores: `timestamp`, `outcome`, `duration_seconds`, `boss_canonical_name`, `attempt_number`, `session_id`
- Separate sessions array per player: `players[discordId].sessions[]`
- Internal EventEmitter pattern: eldenRingTracker emits events after storing — Phase 3 modules subscribe

### Claude's Discretion
- Express server setup (new server vs existing) — **Recommendation: New Express server on dedicated port** (no existing HTTP server in delu-bot)
- UUID generation library choice — **Recommendation: Node.js built-in `crypto.randomUUID()`** (available since Node 19+, no dependency needed)
- Exact deduplication window/TTL for seen event IDs — **Recommendation: 24-hour TTL with periodic cleanup**
- Internal event naming conventions — **Recommendation: Match Watcher event types exactly** (`boss_encounter`, `player_death`, `boss_kill`, `session_start`, `session_end`)
- Error logging and monitoring approach — **Recommendation: console.log with `[ER]` prefix** matching existing delu-bot logging pattern

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMM-01 | Watcher sends boss_encounter event to VPS via HTTP POST | Watcher http_client.py already POSTs to `/events`. Server must accept and route by type |
| COMM-02 | Watcher sends player_death event to VPS via HTTP POST | Same endpoint, type field distinguishes events |
| COMM-03 | Watcher sends boss_kill event to VPS via HTTP POST | Same endpoint, type field distinguishes events |
| COMM-04 | Watcher sends session_start and session_end events to VPS | Same endpoint, two additional event types |
| COMM-05 | VPS exposes HTTP API endpoint to receive Watcher events | Express server on dedicated port, `POST /api/events` |
| COMM-06 | API authenticates events via per-player API key | `Authorization: Bearer <key>` header, keys in storage.js mapped to Discord user ID |
| INTG-01 | New eldenRingTracker.js module in delu-bot following existing tracker pattern | Follow tracker.js/tftTracker.js pattern: `start(client)`/`stop()`, module-level state |
| INTG-02 | Elden Ring data stored in delu-bot's storage.js (same JSON persistence) | Extend ensureDataFile() migration, add eldenRing top-level key |
| INTG-03 | Feature flag for Elden Ring tracking (tracking_elden_ring, betting_elden_ring) | Add to FEATURES object in features.js, default false (opt-in) |
| INTG-04 | Does not break existing LoL/TFT functionality | Separate module, conditional loading, independent storage namespace |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | ^4.21 | HTTP server for API endpoint | Minimal, well-documented, no existing server to conflict with |
| discord.js | ^14.14.1 | Already installed — slash commands, DMs | Existing dependency |
| crypto (built-in) | Node.js built-in | UUID generation, API key generation | `crypto.randomUUID()` and `crypto.randomBytes()` — no extra dependency |
| events (built-in) | Node.js built-in | EventEmitter for internal event bus | Standard Node.js pattern for decoupled event propagation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | ^16.6.1 | Already installed — env var loading | Already used for all config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Express | Node.js http module | Express adds routing, middleware, error handling — worth the single dependency for cleaner code |
| Express | Fastify | Overkill for a single endpoint; Express is more familiar and lighter to add |
| crypto.randomUUID() | uuid package | Built-in is sufficient, no extra dependency |

**Installation:**
```bash
cd ~/delu-bot && npm install express
```

## Architecture Patterns

### delu-bot Module Pattern (from existing codebase)

Every tracker module in delu-bot follows this exact pattern:

```javascript
// Module-level state
const storage = require('./storage');
const config = require('./config');
const features = require('./features');

let discordClient = null;

function start(client) {
  discordClient = client;
  // Initialize module-specific resources
  console.log('[MODULE] Starting...');
}

function stop() {
  // Clean up resources
  console.log('[MODULE] Stopped');
}

module.exports = { start, stop };
```

**index.js integration:**
```javascript
const eldenRingTracker = require('./eldenRingTracker');
// In main():
eldenRingTracker.start(client);
// In SIGINT/SIGTERM:
eldenRingTracker.stop();
```

### Storage Extension Pattern

storage.js uses data migration in `ensureDataFile()`:

```javascript
// In ensureDataFile():
if (!data.eldenRing) {
  data.eldenRing = {
    apiKeys: {},      // { discordId: { key, created_at } }
    players: {},      // { discordId: { bosses: {}, sessions: [] } }
    seenEventIds: {}, // { uuid: timestamp } for dedup
  };
  needsWrite = true;
}
```

### Watcher Event Format (from http_client.py)

The Watcher sends:
```json
POST {api_url}/events
Headers: X-API-Key: {api_key}
Body: {
  "type": "boss_encounter",
  "data": { /* event-specific fields */ },
  "timestamp": "2026-02-27T12:00:00Z",
  "api_key": "{api_key}"
}
```

**IMPORTANT:** The Watcher currently sends the API key both as `X-API-Key` header AND in the body. The CONTEXT.md specifies `Authorization: Bearer <key>`. Phase 2 must update the Watcher's http_client.py to use `Authorization: Bearer <key>` header instead, and the server should read from that header. Keep backward compatibility by also checking `X-API-Key` during transition.

### Event Processing Pattern

```
HTTP Request → Auth Middleware → Dedup Check → Event Router → Storage → EventEmitter → Response
```

1. Express middleware validates `Authorization: Bearer <key>`
2. Look up Discord user ID from API key in storage
3. Check event UUID against seenEventIds (dedup)
4. Route by `type` field to handler function
5. Handler stores data in storage.js
6. EventEmitter emits typed event for Phase 3 subscribers
7. Return `{"ok": true}`

### Feature Flag Pattern

```javascript
// features.js — add to FEATURES object:
tracking_elden_ring: { description: 'Suivi des combats Elden Ring', default: false },
betting_elden_ring: { description: 'Paris sur les combats Elden Ring', default: false },
```

Feature flags control:
- `tracking_elden_ring: false` → API returns 503 (Watcher queues for retry via its retry mechanism)
- `betting_elden_ring: false` → No effect in Phase 2 (betting is Phase 3)

### Slash Command Pattern

Commands are defined in bot.js as `SlashCommandBuilder` instances in the `commands` array. Interaction handling is in the `interactionCreate` event handler with a large if/else chain.

```javascript
// Add to commands array in bot.js:
new SlashCommandBuilder()
  .setName('er-setup')
  .setDescription('Lier votre Watcher Elden Ring à Discord')
  .addStringOption(option =>
    option.setName('action')
      .setDescription('Action')
      .addChoices(
        { name: 'Générer une clé API', value: 'generate' },
        { name: 'Réinitialiser la clé', value: 'reset' }
      )
  ),
```

### Anti-Patterns to Avoid
- **Putting HTTP server logic inside bot.js:** bot.js is already 800+ lines. The Express server belongs in eldenRingTracker.js or a dedicated apiServer.js
- **Polling-based architecture for Elden Ring:** Unlike LoL/TFT trackers that poll Riot API, Elden Ring uses push-based events. Do NOT create a polling loop
- **Storing API keys in config.js:** Keys are per-player and dynamic — they belong in storage.js, not environment variables
- **Using the same port as Discord bot:** Express needs its own port (env var `ER_API_PORT`, default 3000)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP routing | Custom request parser | Express | Path matching, middleware, error handling are complex edge-case-heavy problems |
| API key generation | Math.random hex strings | crypto.randomBytes(32).toString('hex') | Cryptographically secure, proper entropy |
| UUID validation | Regex | crypto.randomUUID() format check | Standard format, avoid malformed IDs |
| JSON body parsing | Manual stream reading | express.json() middleware | Handles encoding, size limits, malformed JSON |
| CORS/security headers | Per-route headers | Middleware pattern | Consistent, can't forget a route |

## Common Pitfalls

### Pitfall 1: Breaking existing bot startup
**What goes wrong:** Adding eldenRingTracker to index.js fails if Express port is already in use or module throws during import
**Why it happens:** Eager initialization, missing error handling on server.listen()
**How to avoid:** Wrap Express listen in try/catch, log warning but don't crash the bot. Use conditional loading based on feature flag
**Warning signs:** Bot fails to start after deploy

### Pitfall 2: Race condition on storage writes
**What goes wrong:** Two near-simultaneous events both readData(), modify, writeData() — second write overwrites first
**Why it happens:** Synchronous JSON file I/O with no locking
**How to avoid:** This is an existing pattern in delu-bot (trackers already do this). For Elden Ring, events come sequentially per player. If concerned, use a write queue or simply accept the existing pattern
**Warning signs:** Missing fight records, duplicate sessions

### Pitfall 3: Deduplication map growing unbounded
**What goes wrong:** seenEventIds grows forever, consuming memory and disk
**Why it happens:** No TTL/cleanup mechanism
**How to avoid:** Periodic cleanup (every hour) removing entries older than 24 hours. Use timestamps as values
**Warning signs:** Storage file growing unusually large

### Pitfall 4: Watcher API key mismatch with CONTEXT.md spec
**What goes wrong:** Watcher sends `X-API-Key` header but CONTEXT.md says `Authorization: Bearer <key>`
**Why it happens:** Phase 1 http_client.py was built before the Phase 2 API contract was finalized
**How to avoid:** Update Watcher http_client.py to use `Authorization: Bearer <key>`. Server checks both headers during transition
**Warning signs:** 401 errors from valid Watcher instances

### Pitfall 5: Discord DM blocked
**What goes wrong:** `/er-setup` generates a key but can't DM it to the user
**Why it happens:** User has DMs disabled for server members
**How to avoid:** Try DM first, if it fails show the key in an ephemeral reply (visible only to the user)
**Warning signs:** User reports never receiving API key

## Code Examples

### Express Server Setup
```javascript
const express = require('express');
const app = express();
app.use(express.json());

const API_PORT = parseInt(process.env.ER_API_PORT, 10) || 3000;

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Fallback: check X-API-Key for backward compat
  const fallbackKey = req.headers['x-api-key'];
  const key = apiKey || fallbackKey;

  if (!key) {
    return res.status(401).json({ ok: false, error: 'Missing API key' });
  }

  const discordId = storage.getEldenRingPlayerByApiKey(key);
  if (!discordId) {
    return res.status(401).json({ ok: false, error: 'Invalid API key' });
  }

  req.discordUserId = discordId;
  next();
}

app.post('/api/events', authMiddleware, (req, res) => {
  if (!features.isEnabled('tracking_elden_ring')) {
    return res.status(503).json({ ok: false, error: 'Tracking disabled' });
  }
  // ... handle event
  res.json({ ok: true });
});
```

### API Key Generation
```javascript
const crypto = require('crypto');

function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}
```

### Storage Data Structure
```javascript
// Top-level data.eldenRing structure:
{
  apiKeys: {
    "discord_user_id_123": {
      key: "hex_api_key_64_chars",
      created_at: "2026-02-27T12:00:00Z"
    }
  },
  players: {
    "discord_user_id_123": {
      bosses: {
        "Margit the Fell Omen": {
          fights: [
            {
              timestamp: "2026-02-27T12:00:00Z",
              outcome: "death",
              duration_seconds: 45,
              boss_canonical_name: "Margit the Fell Omen",
              attempt_number: 1,
              session_id: "uuid"
            }
          ]
        }
      },
      sessions: [
        {
          id: "uuid",
          start: "2026-02-27T11:00:00Z",
          end: "2026-02-27T13:00:00Z",
          summary: { bosses_fought: 3, total_deaths: 5, total_kills: 2 }
        }
      ]
    }
  },
  seenEventIds: {
    "event-uuid-1": 1709000000000
  }
}
```

### EventEmitter Pattern
```javascript
const { EventEmitter } = require('events');
const eldenRingEvents = new EventEmitter();

// In event handler after storing:
eldenRingEvents.emit('boss_encounter', {
  discordUserId,
  bossName,
  attemptNumber,
  sessionId,
  timestamp
});

// Phase 3 will subscribe:
// eldenRingEvents.on('boss_encounter', async (data) => { /* send Discord embed */ });

module.exports = { eldenRingEvents };
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| uuid npm package | crypto.randomUUID() | Node 19+ (2022) | No dependency needed |
| body-parser npm package | express.json() | Express 4.16+ (2017) | Built into Express |
| callback-based Express | Same (Express 4.x) | Still current | Express 5 is beta; stick with 4.x |

## Open Questions

1. **Express port conflict with Docker**
   - What we know: delu-bot runs in Docker (docker-compose.yml exists)
   - What's unclear: Which ports are exposed/mapped in the Docker config
   - Recommendation: Use configurable port via `ER_API_PORT` env var, default 3000. Docker compose will need port mapping added.

2. **Node.js version on VPS**
   - What we know: `crypto.randomUUID()` requires Node 19+. delu-bot uses discord.js 14 which requires Node 16.11+
   - What's unclear: Exact Node version on the VPS
   - Recommendation: Check Node version. If < 19, use `crypto.randomBytes(16).toString('hex')` with manual UUID formatting as fallback.

3. **Attempt counting logic**
   - What we know: Each fight stores `attempt_number` per boss
   - What's unclear: Should attempt count reset per session or be cumulative across all sessions?
   - Recommendation: Cumulative across all sessions (consistent with typical Elden Ring tracking). Count = number of existing fights for that boss + 1.

## Sources

### Primary (HIGH confidence)
- delu-bot source code inspection: tracker.js, tftTracker.js, storage.js, features.js, bot.js, config.js, index.js, package.json
- Watcher source code inspection: http_client.py, config.py, state_machine.py
- Phase 2 CONTEXT.md: locked decisions and API contract

### Secondary (MEDIUM confidence)
- Express.js 4.x documentation — standard middleware and routing patterns
- Node.js crypto module documentation — randomUUID() and randomBytes()

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - inspected existing codebase, minimal new dependencies
- Architecture: HIGH - following exact patterns from existing tracker modules
- Pitfalls: HIGH - identified from actual code review of storage.js race conditions and Watcher API mismatch

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable domain, well-established patterns)

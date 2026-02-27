# Elden Ring Boss Tracker

## What This Is

A two-component system for tracking Elden Ring boss fights with Discord betting. A lightweight Python **Watcher** runs on the player's Windows PC, auto-detects Elden Ring via process monitoring, captures the screen to detect boss health bars via OpenCV and OCR, and sends events to the VPS. On the VPS, an **Elden Ring module** integrated into the existing delu-bot (Node.js Discord bot at `/home/hamza/delu-bot`) receives these events, sends rich Discord notifications with boss art, manages a betting system (victory/defeat) with dynamic odds, tracks stats, and provides slash commands for leaderboards and boss difficulty.

## Core Value

Automatically detect boss encounters in Elden Ring and let friends bet on the outcome — zero manual input from the player.

## Requirements

### Validated

- ✓ Python Watcher: auto-detect Elden Ring process launch on Windows — v1.0
- ✓ Python Watcher: screen capture and boss health bar detection (OpenCV template matching) — v1.0
- ✓ Python Watcher: OCR to identify boss name from health bar (EasyOCR + fuzzy matching) — v1.0
- ✓ Python Watcher: detect "YOU DIED" screen (death/attempt increment) — v1.0
- ✓ Python Watcher: detect boss kill (health bar disappears after fight) — v1.0
- ✓ Python Watcher: 5-state FSM prevents duplicates from flicker and phase transitions — v1.0
- ✓ Python Watcher: send events to VPS via HTTP API with retry queue — v1.0
- ✓ Python Watcher: installable as standalone .exe via PyInstaller — v1.0
- ✓ VPS API: receive and authenticate Watcher events (Bearer token per player) — v1.0
- ✓ VPS API: event deduplication via event_id UUIDs — v1.0
- ✓ VPS API: session tracking via session_id UUIDs — v1.0
- ✓ Delu-bot integration: eldenRingTracker.js module (EventEmitter pattern) — v1.0
- ✓ Delu-bot integration: storage.js with 14+ ER CRUD functions — v1.0
- ✓ Delu-bot integration: feature flags (tracking_elden_ring, betting_elden_ring) — v1.0
- ✓ Delu-bot integration: no LoL/TFT regressions (103 JS tests pass) — v1.0
- ✓ Discord notification on boss encounter with rich embed + boss art (189 bosses) — v1.0
- ✓ Discord notification on death with escalating taunts — v1.0
- ✓ Discord notification on kill with fight duration and first-try detection — v1.0
- ✓ Discord session summary on game close — v1.0
- ✓ Betting: Parier Victoire / Parier Défaite buttons (50/100/500 PC) — v1.0
- ✓ Betting: dynamic odds from per-boss defeat rate, locked at bet time — v1.0
- ✓ Betting: auto-resolve on death/kill, wallet credits/debits — v1.0
- ✓ Betting: Golden Offer (20%) and first-bettor bonus — v1.0
- ✓ Betting: orphaned bet cleanup on session end — v1.0
- ✓ Slash commands: /er-stats, /er-bosses (paginated), /er-leaderboard — v1.0
- ✓ Server-wide boss difficulty comparison — v1.0

### Active

(None — next milestone requirements TBD)

### Out of Scope

- Web dashboard — Discord-first for v1, web deferred to v2
- Other games — Elden Ring only (delu-bot already handles LoL/TFT)
- Linux/Mac Watcher — Windows only (where the game runs)
- Stream overlay / OBS integration — different product
- Game memory reading / injection — EasyAntiCheat ban risk
- Standalone bot — integrates into existing delu-bot
- Voice channel TTS — text notifications sufficient
- Public leaderboard (cross-server) — server-scoped only for privacy

## Context

- **v1.0 shipped** 2026-02-27 — full boss detection, event pipeline, Discord notifications, betting, and stats
- **Codebase**: ~3,287 LOC Python (Watcher), JS additions to delu-bot (~14,260 LOC total)
- **Tech stack**: Python (psutil, mss, OpenCV, EasyOCR, rapidfuzz, PyInstaller) + Node.js (Express, Discord.js, vitest)
- **Architecture**: Hybrid — Python Watcher on PC sends HTTP events to delu-bot on VPS
- **Testing**: 46 Python tests + 103 JS tests, all passing
- **Known limitation**: Detector accuracy thresholds (health bar >90%, YOU DIED >95%, OCR >80%) unvalidated against real game screenshots — 4 tests skipped pending real footage

## Constraints

- **Performance**: Watcher must not impact game FPS — lightweight screen capture with mss
- **Platform**: Watcher is Windows only; bot side runs on existing VPS (Linux Docker)
- **Anti-cheat**: Screen capture only, no process injection (EasyAntiCheat safe)
- **Integration**: Must not break existing delu-bot LoL/TFT functionality
- **Network**: Watcher needs internet to POST events to VPS; handles disconnects with retry queue
- **delu-bot compatibility**: Follow existing code patterns (storage.js, feature flags, config.js)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hybrid architecture (Watcher PC + Bot VPS) | Can't screen capture from VPS; reuse existing bot infra | ✓ Good — clean separation of concerns |
| Integrate into delu-bot (not standalone) | Reuse betting system, wallets, Discord bot, deployment | ✓ Good — betting, wallets, feature flags all reused |
| Python for Watcher | Best OCR/screen capture ecosystem (OpenCV, EasyOCR, mss) | ✓ Good — all libraries worked as expected |
| Push events (HTTP POST) over polling | VPS can't poll PC; Watcher pushes events when they happen | ✓ Good — low latency, simple protocol |
| Screen capture over memory reading | EasyAntiCheat safe, no ban risk | ✓ Good — no anti-cheat issues |
| No web dashboard in v1 | Discord-first, validate concept before investing in web | ✓ Good — focused scope, shipped in 2 days |
| 5-state FSM for boss fight lifecycle | Prevents duplicate/missed events from health bar flicker | ✓ Good — 12 unit tests, robust against edge cases |
| Express 5.x for API server | Stable, well-known, matches existing delu-bot patterns | ✓ Good — no issues |
| EasyOCR over Tesseract | Better accuracy on decorative game fonts | — Pending real-world validation |
| Lazy require() for circular deps | apiServer.js ↔ eldenRingTracker.js | ✓ Good — clean solution, no issues |
| Feature flags default to false | Opt-in for Elden Ring tracking per server | ✓ Good — safe rollout |

---
*Last updated: 2026-02-27 after v1.0 milestone*

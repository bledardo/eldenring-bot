# Elden Ring Boss Tracker

## What This Is

A two-component system for tracking Elden Ring boss fights with Discord betting. A lightweight Python **Watcher** runs on the player's Windows PC, auto-detects Elden Ring via Steam, captures the screen to detect boss health bars via OCR, and sends events to the VPS. On the VPS, a new **Elden Ring module** integrated into the existing delu-bot (Node.js Discord bot at `/home/hamza/delu-bot`) receives these events, sends rich Discord notifications with boss art, manages a betting system (victory/defeat) with dynamic odds, and tracks stats (attempts, time, outcomes) for multiple players on the same Discord server.

## Core Value

Automatically detect boss encounters in Elden Ring and let friends bet on the outcome — zero manual input from the player.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Python Watcher: auto-detect Elden Ring process launch on Windows
- [ ] Python Watcher: screen capture and boss health bar detection (OpenCV template matching)
- [ ] Python Watcher: OCR to identify boss name from health bar
- [ ] Python Watcher: detect "YOU DIED" screen (death/attempt increment)
- [ ] Python Watcher: detect boss kill (health bar disappears after fight)
- [ ] Python Watcher: send events to VPS via HTTP API (boss_encounter, death, kill, session_start, session_end)
- [ ] VPS API: receive and authenticate Watcher events (API key per player)
- [ ] Delu-bot integration: new eldenRingTracker module (like tracker.js / tftTracker.js)
- [ ] Discord notification on boss encounter with rich embed + boss art
- [ ] Discord betting: Parier Victoire / Parier Défaite buttons (reuse delu-bot betting system)
- [ ] Dynamic odds based on player's historical boss defeat rate
- [ ] Bet resolution on death or boss kill event
- [ ] Track attempt count per boss per player (persistent)
- [ ] Track time spent on each boss fight
- [ ] Per-player tracking: multiple players on same Discord server
- [ ] Slash commands: /er-stats, /er-bosses, /er-leaderboard
- [ ] Rich Discord embeds with boss artwork/thumbnails
- [ ] Session summary notification on game close (bosses fought, attempts, kills, time)
- [ ] Server-wide leaderboard (attempts, kills, speed)
- [ ] Boss difficulty comparison across server

### Out of Scope

- Web dashboard — Discord-first for v1, web deferred
- Other games — Elden Ring only (delu-bot already handles LoL/TFT)
- Linux/Mac Watcher — Windows only (where the game runs)
- Stream overlay / OBS integration — different product
- Game memory reading / injection — EasyAntiCheat ban risk
- Standalone bot — integrates into existing delu-bot

## Context

- **Existing delu-bot** at `/home/hamza/delu-bot`: Node.js Discord bot with full betting system (odds calculation, wallets, locked odds, Golden Offer, feature flags). Runs on VPS via Docker.
- **Architecture**: Hybrid — Python Watcher on PC sends HTTP events to delu-bot on VPS. Same pattern as Riot API polling but push-based instead of pull-based.
- **delu-bot betting system**: Parimutuel odds with seed pool, minority bonus, streak bonus, bookmaker margin. Locked odds at bet time. Wallets with virtual currency (PC). All reusable for Elden Ring.
- **delu-bot structure**: tracker.js (LoL), tftTracker.js (TFT) — new eldenRingTracker.js follows same pattern.
- Elden Ring boss health bar appears at bottom of screen with boss name in white serif font on dark gradient.
- "YOU DIED" screen is a reliable death indicator (proven by existing community projects).
- ~168 bosses in Elden Ring (base + Shadow of the Erdtree DLC).

## Constraints

- **Performance**: Watcher must not impact game FPS — lightweight screen capture with mss
- **Platform**: Watcher is Windows only; bot side runs on existing VPS (Linux Docker)
- **Anti-cheat**: Screen capture only, no process injection (EasyAntiCheat safe)
- **Integration**: Must not break existing delu-bot LoL/TFT functionality
- **Network**: Watcher needs internet to POST events to VPS; must handle disconnects gracefully
- **delu-bot compatibility**: Follow existing code patterns (storage.js, feature flags, config.js)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hybrid architecture (Watcher PC + Bot VPS) | Can't screen capture from VPS; reuse existing bot infra | — Pending |
| Integrate into delu-bot (not standalone) | Reuse betting system, wallets, Discord bot, deployment | — Pending |
| Python for Watcher | Best OCR/screen capture ecosystem (OpenCV, EasyOCR, mss) | — Pending |
| Push events (HTTP POST) over polling | VPS can't poll PC; Watcher pushes events when they happen | — Pending |
| Screen capture over memory reading | EasyAntiCheat safe, no ban risk | — Pending |
| No web dashboard in v1 | Discord-first, validate concept before investing in web | — Pending |

---
*Last updated: 2026-02-26 after initialization (revised with delu-bot integration)*

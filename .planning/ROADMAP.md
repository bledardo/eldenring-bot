# Roadmap: Elden Ring Boss Tracker

## Overview

Four phases deliver a working system from nothing to a full Discord-integrated boss tracker with betting. Phase 1 proves the hardest problem first — reliable screen detection on the player's PC. Phase 2 wires detection events through the HTTP pipeline into delu-bot. Phase 3 delivers the full Discord experience: embeds, betting buttons, bet resolution, and session summaries. Phase 4 adds the social layer: slash commands, leaderboard, and boss difficulty comparison.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Watcher Core** - Screen capture, boss detection, state machine, and packaged Watcher app
- [x] **Phase 2: Event Pipeline** - HTTP API on VPS, delu-bot module scaffold, authentication, and storage
- [ ] **Phase 3: Discord Notifications and Betting** - Rich embeds, betting buttons, bet resolution, session summary
- [ ] **Phase 4: Stats and Social** - Slash commands, per-player stats, leaderboard, boss difficulty comparison

## Phase Details

### Phase 1: Watcher Core
**Goal**: A packaged Python app on the player's Windows PC reliably detects boss encounters, deaths, and kills without false positives or missed events
**Depends on**: Nothing (first phase)
**Requirements**: DETECT-01, DETECT-02, DETECT-03, DETECT-04, DETECT-05, DETECT-06, DETECT-07, DETECT-08, DETECT-09, COMM-07, INTG-05
**Success Criteria** (what must be TRUE):
  1. The Watcher auto-starts detecting when Elden Ring opens and stops when the game closes — no manual start required
  2. A boss health bar appearing on screen triggers exactly one boss_encounter detection (no duplicates from flicker or multi-phase transitions)
  3. "YOU DIED" screen is detected reliably as a player death event
  4. Boss kill is detected when the health bar disappears after an active fight (not from leaving the area)
  5. The Watcher is installable on a Windows PC with a single command or exe — no Python expertise required
**Plans**: 7 plans
- [ ] 01-01-PLAN.md — Project scaffold, config, logging, process monitor, tray icon
- [ ] 01-02-PLAN.md — State machine (TDD) for boss fight lifecycle
- [ ] 01-03-PLAN.md — Screen capture abstraction, event queue, HTTP client
- [ ] 01-04-PLAN.md — Visual detectors: health bar, YOU DIED, boss name OCR, co-op
- [ ] 01-05-PLAN.md — Main detection loop wiring all components
- [ ] 01-06-PLAN.md — PyInstaller packaging, auto-update, GitHub Actions
- [ ] 01-07-PLAN.md — Integration tests and screenshot validation checkpoint

### Phase 2: Event Pipeline
**Goal**: Events from the Watcher reach delu-bot on the VPS, are authenticated, and are stored — delu-bot module exists and receives events correctly
**Depends on**: Phase 1
**Requirements**: COMM-01, COMM-02, COMM-03, COMM-04, COMM-05, COMM-06, INTG-01, INTG-02, INTG-03, INTG-04
**Success Criteria** (what must be TRUE):
  1. The Watcher successfully POSTs boss_encounter, player_death, boss_kill, session_start, and session_end events to the VPS endpoint
  2. Events with invalid or missing API keys are rejected (401); valid events are accepted and stored
  3. eldenRingTracker.js exists in delu-bot, is loaded on bot startup, and does not break existing LoL/TFT functionality
  4. Elden Ring events are persisted in delu-bot's storage.js with correct structure (player, boss, timestamp, attempt count)
  5. Feature flags tracking_elden_ring and betting_elden_ring are present and respected
**Plans**: 5 plans
- [x] 02-01-PLAN.md — Storage extension, feature flags, config, Express install
- [x] 02-02-PLAN.md — Watcher HTTP client update (Authorization: Bearer header)
- [x] 02-03-PLAN.md — Express API server with auth, dedup, event routing (TDD)
- [x] 02-04-PLAN.md — eldenRingTracker.js module, EventEmitter, /er-setup command
- [x] 02-05-PLAN.md — Integration wiring, Docker config, end-to-end verification

### Phase 3: Discord Notifications and Betting
**Goal**: Friends see rich Discord notifications for every boss event and can place bets on the outcome — bets resolve automatically and winnings hit their wallets
**Depends on**: Phase 2
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, BET-01, BET-02, BET-03, BET-04, BET-05, BET-06, BET-07
**Success Criteria** (what must be TRUE):
  1. A boss encounter posts a Discord embed with boss name, player name, attempt number, and boss artwork — with Parier Victoire / Parier Défaite buttons
  2. Death and boss kill events each post a follow-up embed updating attempt count or declaring victory
  3. Odds reflect the player's historical defeat rate for that specific boss, are locked at bet time, and winnings apply to delu-bot wallets
  4. Golden Offer and first-bettor bonuses apply to Elden Ring bets (reused from existing system)
  5. When the game closes, a session summary embed posts showing bosses fought, total attempts, kills, and session duration
**Plans**: TBD

### Phase 4: Stats and Social
**Goal**: Players can query their own stats and see how they compare to the rest of the server — boss difficulty emerges from collective data
**Depends on**: Phase 3
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04, STAT-05, STAT-06, STAT-07
**Success Criteria** (what must be TRUE):
  1. /er-stats shows a player's total kills, deaths, attempts per boss, and time spent
  2. /er-bosses lists every boss the player has encountered with attempt counts and outcomes
  3. /er-leaderboard shows server-wide rankings (kills, deaths, attempts)
  4. Boss difficulty comparison is visible — which boss has the highest attempt count across all server players
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Watcher Core | 7/7 | Complete | 2026-02-26 |
| 2. Event Pipeline | 5/5 | Complete | 2026-02-27 |
| 3. Discord Notifications and Betting | 0/TBD | Not started | - |
| 4. Stats and Social | 0/TBD | Not started | - |

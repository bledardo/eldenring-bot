# Requirements: Elden Ring Boss Tracker

**Defined:** 2026-02-26
**Core Value:** Automatically detect boss encounters in Elden Ring and let friends bet on the outcome — zero manual input from the player.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Game Detection

- [x] **DETECT-01**: Watcher auto-detects Elden Ring process launch on Windows without manual start
- [x] **DETECT-02**: Watcher auto-detects when Elden Ring process closes (session end)
- [x] **DETECT-03**: Watcher captures screen region where boss health bar appears using mss
- [x] **DETECT-04**: Watcher detects boss health bar appearance via OpenCV template matching
- [x] **DETECT-05**: Watcher reads boss name from health bar via OCR (EasyOCR)
- [x] **DETECT-06**: Watcher matches OCR output to canonical boss name list (~168 bosses) via fuzzy matching
- [x] **DETECT-07**: Watcher detects "YOU DIED" screen (player death)
- [x] **DETECT-08**: Watcher detects boss kill (health bar disappears after active fight)
- [x] **DETECT-09**: Watcher uses state machine to prevent duplicate events (health bar flicker, phase transitions)

### Communication

- [x] **COMM-01**: Watcher sends boss_encounter event to VPS via HTTP POST
- [x] **COMM-02**: Watcher sends player_death event to VPS via HTTP POST
- [x] **COMM-03**: Watcher sends boss_kill event to VPS via HTTP POST
- [x] **COMM-04**: Watcher sends session_start and session_end events to VPS
- [x] **COMM-05**: VPS exposes HTTP API endpoint to receive Watcher events
- [x] **COMM-06**: API authenticates events via per-player API key
- [x] **COMM-07**: Watcher handles network disconnects gracefully (retry queue)

### Discord Notifications

- [ ] **NOTIF-01**: Bot sends rich embed on boss encounter (boss name, attempt #, player name)
- [ ] **NOTIF-02**: Bot sends rich embed on boss kill (victory, time spent, attempts)
- [ ] **NOTIF-03**: Bot sends rich embed on player death (attempt count increment)
- [x] **NOTIF-04**: Embeds include boss artwork/thumbnail from asset library
- [ ] **NOTIF-05**: Bot sends session summary embed when game closes (bosses fought, total attempts, kills, session time)

### Betting

- [ ] **BET-01**: Bot displays Parier Victoire / Parier Défaite buttons on boss encounter notification
- [x] **BET-02**: Betting uses delu-bot's existing odds calculation system (seed pool, minority bonus, margin)
- [x] **BET-03**: Odds are based on player's historical defeat rate for that specific boss
- [x] **BET-04**: Odds are locked at time of bet placement
- [ ] **BET-05**: Bets resolve automatically on player death (losers: bet victoire) or boss kill (losers: bet défaite)
- [x] **BET-06**: Winnings/losses applied to existing delu-bot wallet system (shared currency)
- [x] **BET-07**: Golden Offer and first bettor bonus apply to Elden Ring bets

### Stats & Social

- [ ] **STAT-01**: Bot tracks attempt count per boss per player (persistent)
- [ ] **STAT-02**: Bot tracks time spent per boss fight
- [ ] **STAT-03**: Bot tracks total kills and deaths per player
- [ ] **STAT-04**: /er-stats slash command shows player's Elden Ring stats
- [ ] **STAT-05**: /er-bosses slash command lists all bosses encountered with attempt counts
- [ ] **STAT-06**: /er-leaderboard slash command shows server-wide rankings
- [ ] **STAT-07**: Server-wide boss difficulty comparison (which boss gave everyone the most trouble)

### Integration

- [x] **INTG-01**: New eldenRingTracker.js module in delu-bot following existing tracker pattern
- [x] **INTG-02**: Elden Ring data stored in delu-bot's storage.js (same JSON persistence)
- [x] **INTG-03**: Feature flag for Elden Ring tracking (tracking_elden_ring, betting_elden_ring)
- [x] **INTG-04**: Does not break existing LoL/TFT functionality
- [x] **INTG-05**: Watcher installable as a standalone Python app on Windows (pip install or exe)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Web Dashboard

- **WEB-01**: Web page showing boss history and stats per player
- **WEB-02**: Boss fight timeline graphs (attempts over time)
- **WEB-03**: Sortable/filterable boss encounter data

### Enhanced Detection

- **EDET-01**: Support for multiple screen resolutions without manual calibration
- **EDET-02**: Historical run comparison (NG+ vs first playthrough)
- **EDET-03**: DLC boss detection with separate tracking

### Social

- **SOC-01**: Boss art gallery in Discord (all encountered bosses)
- **SOC-02**: Achievement system (first try kills, no-hit runs)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Standalone Discord bot | Integrates into existing delu-bot |
| Game memory reading | EasyAntiCheat ban risk |
| Stream overlay / OBS | Different product, HitCounterManager exists |
| Linux/Mac Watcher | Elden Ring runs on Windows |
| Cross-game boss detection | Elden Ring only for v1 |
| Web dashboard | Discord-first, validate concept first |
| Voice channel TTS | Annoying, text notifications sufficient |
| Public leaderboard (cross-server) | Server-scoped only for privacy |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DETECT-01 | Phase 1 | Complete |
| DETECT-02 | Phase 1 | Complete |
| DETECT-03 | Phase 1 | Complete |
| DETECT-04 | Phase 1 | Complete |
| DETECT-05 | Phase 1 | Complete |
| DETECT-06 | Phase 1 | Complete |
| DETECT-07 | Phase 1 | Complete |
| DETECT-08 | Phase 1 | Complete |
| DETECT-09 | Phase 1 | Complete |
| COMM-01 | Phase 2 | Pending |
| COMM-02 | Phase 2 | Pending |
| COMM-03 | Phase 2 | Pending |
| COMM-04 | Phase 2 | Pending |
| COMM-05 | Phase 2 | Pending |
| COMM-06 | Phase 2 | Pending |
| COMM-07 | Phase 1 | Complete |
| NOTIF-01 | Phase 3 | Pending |
| NOTIF-02 | Phase 3 | Pending |
| NOTIF-03 | Phase 3 | Pending |
| NOTIF-04 | Phase 3 | Complete |
| NOTIF-05 | Phase 3 | Pending |
| BET-01 | Phase 3 | Pending |
| BET-02 | Phase 3 | Complete |
| BET-03 | Phase 3 | Complete |
| BET-04 | Phase 3 | Complete |
| BET-05 | Phase 3 | Pending |
| BET-06 | Phase 3 | Complete |
| BET-07 | Phase 3 | Complete |
| STAT-01 | Phase 4 | Pending |
| STAT-02 | Phase 4 | Pending |
| STAT-03 | Phase 4 | Pending |
| STAT-04 | Phase 4 | Pending |
| STAT-05 | Phase 4 | Pending |
| STAT-06 | Phase 4 | Pending |
| STAT-07 | Phase 4 | Pending |
| INTG-01 | Phase 2 | Pending |
| INTG-02 | Phase 2 | Pending |
| INTG-03 | Phase 2 | Pending |
| INTG-04 | Phase 2 | Pending |
| INTG-05 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 — traceability complete after roadmap creation*

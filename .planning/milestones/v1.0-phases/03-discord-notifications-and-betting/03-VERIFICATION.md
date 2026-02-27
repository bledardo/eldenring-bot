---
phase: 03-discord-notifications-and-betting
status: passed
verified: 2026-02-27
---

# Phase 3: Discord Notifications and Betting - Verification

## Phase Goal

Friends see rich Discord notifications for every boss event and can place bets on the outcome — bets resolve automatically and winnings hit their wallets.

## Requirement Verification

| Req ID | Description | Status | Evidence |
|--------|-------------|--------|----------|
| NOTIF-01 | Bot sends rich embed on boss encounter (boss name, attempt #, player name) | ✓ PASS | `eldenRingNotifier.js` `handleEncounter()` (line 19) builds gold embed (0xFFA500) with boss name, player display name, attempt number, and timestamp; wired via `eldenRingEvents.on('boss_encounter', ...)` (line 9) |
| NOTIF-02 | Bot sends rich embed on boss kill (victory, time spent, attempts) | ✓ PASS | `eldenRingNotifier.js` `handleKill()` (line 133) builds green embed (0x00CC44) with boss name, attempt count, fight duration (`durationSeconds`), and first-try detection; wired via `eldenRingEvents.on('boss_kill', ...)` (line 11) |
| NOTIF-03 | Bot sends rich embed on player death (attempt count increment) | ✓ PASS | `eldenRingNotifier.js` `handleDeath()` (line 87) builds red embed (0xFF0000) with updated attempt count and 4-tier escalating taunts (16 unique messages across tiers 1-3, 4-7, 8-14, 15+); wired via `eldenRingEvents.on('player_death', ...)` (line 10) |
| NOTIF-04 | Embeds include boss artwork/thumbnail from asset library | ✓ PASS | `eldenRingNotifier.js` calls `getEldenRingBossImage(bossName)` (line 50) → `eldenRingAssets.js` returns URL from 189-entry boss art map with fuzzy matching; `EmbedBuilder.setThumbnail(bossImage)` used if image found |
| NOTIF-05 | Bot sends session summary embed when game closes (bosses fought, total attempts, kills, session time) | ✓ PASS | `eldenRingNotifier.js` `handleSessionEnd()` (line 184) builds blurple embed (0x5865F2) with per-boss kill/death/attempt breakdown, session duration, and total stats; wired via `eldenRingEvents.on('session_end', ...)` (line 12); silently skips zero-encounter sessions |
| BET-01 | Bot displays Parier Victoire / Parier Défaite buttons on boss encounter notification | ✓ PASS | `eldenRingNotifier.js` lines 55-67: when `betting_elden_ring` feature is enabled, builds 2 `ActionRowBuilder` with 6 `ButtonBuilder` components (3 Victoire: 50/100/500 PC, 3 Defaite: 50/100/500 PC); current odds displayed in embed footer: `Cotes: Victoire x{odds} / Defaite x{odds}` (line 46) |
| BET-02 | Betting uses delu-bot's existing odds calculation system (seed pool, minority bonus, margin) | ✓ PASS | `storage.js` `calculateEldenRingOdds()` (line 2881) calls `calculateBaseOdds(1 - defeatRate)` — the same shared `calculateBaseOdds()` function (line 58) used by LoL and TFT betting; test: `should use defeat rate to calculate odds via calculateBaseOdds` (eldenRingStorage.test.js) |
| BET-03 | Odds are based on player's historical defeat rate for that specific boss | ✓ PASS | `storage.js` `getEldenRingBossDefeatRate(discordId, bossName)` (line 2874) counts deaths/total fights in `data.eldenRing.players[discordId].bosses[bossName].fights`; defaults to 0.75 (75%) for unknown boss; tests: `should return 0.75 for unknown boss`, `should compute correctly from fight history` (eldenRingStorage.test.js) |
| BET-04 | Odds are locked at time of bet placement | ✓ PASS | `storage.js` `placeEldenRingBet()` (line 2887): calls `calculateEldenRingOdds()` at placement time and stores `lockedOdds` in `bet.bets[odUserId] = { prediction, amount, lockedOdds }`; `closeEldenRingBet()` uses stored `betData.lockedOdds` for payouts; test: `should deduct amount and lock odds for victoire` (eldenRingStorage.test.js) |
| BET-05 | Bets resolve automatically on player death (losers: bet victoire) or boss kill (losers: bet défaite) | ✓ PASS | `eldenRingNotifier.js` `handleDeath()` (line 107): `storage.closeEldenRingBet(fightId, 'defaite')` — victoire bets lose on death; `handleKill()` (line 158): `storage.closeEldenRingBet(fightId, 'victoire')` — defaite bets lose on kill; results shown in embed |
| BET-06 | Winnings/losses applied to existing delu-bot wallet system (shared currency) | ✓ PASS | `storage.js` `closeEldenRingBet()` (line 2940): credits winners via `data.wallets[winner.odUserId].balance += finalReturn` (line 2988), debits losers by consuming staked amount; same `data.wallets` object used by LoL/TFT bets — fully shared currency |
| BET-07 | Golden Offer and first bettor bonus apply to Elden Ring bets | ✓ PASS | `storage.js` `createEldenRingBet()` (line 2842): `const hasGoldenOffer = Math.random() < 0.2` (20% chance), stored in bet object; `placeEldenRingBet()` (line 2931): sets `bet.firstBettorId = odUserId` for first bettor; `closeEldenRingBet()` applies both bonuses via same logic as LoL/TFT `closeBet()` |

## Success Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| A boss encounter posts a Discord embed with boss name, player name, attempt number, and boss artwork — with Parier Victoire / Parier Défaite buttons | ✓ PASS | `handleEncounter()` in `eldenRingNotifier.js`: gold embed with boss/player/attempt fields, `setThumbnail(bossImage)` from `eldenRingAssets.js` (189 entries), 6 bet buttons in 2 ActionRows when `betting_elden_ring` enabled |
| Death and boss kill events each post a follow-up embed updating attempt count or declaring victory | ✓ PASS | `handleDeath()` builds red embed with updated attempt count and taunts; `handleKill()` builds green embed with victory declaration, attempts, and fight duration |
| Odds reflect the player's historical defeat rate for that specific boss, are locked at bet time, and winnings apply to delu-bot wallets | ✓ PASS | `getEldenRingBossDefeatRate()` per player+boss; `placeEldenRingBet()` stores `lockedOdds` at placement; `closeEldenRingBet()` credits `data.wallets[odUserId].balance` |
| Golden Offer and first-bettor bonuses apply to Elden Ring bets (reused from existing system) | ✓ PASS | `createEldenRingBet()` sets `hasGoldenOffer` (20% random); `placeEldenRingBet()` sets `firstBettorId`; `closeEldenRingBet()` applies both bonuses using same `goldenOfferThreshold`/`firstBettorBonusPercent` config as LoL/TFT |
| When the game closes, a session summary embed posts showing bosses fought, total attempts, kills, and session duration | ✓ PASS | `handleSessionEnd()` aggregates fights via `getEldenRingSessionFights()`, builds blurple embed with per-boss breakdown (kills, deaths, attempts), session duration, and total stats |

## Must-Haves Verification

### Plan 03-01
- [x] `createEldenRingBet`, `getEldenRingBet`, `placeEldenRingBet`, `closeEldenRingBet`, `cancelEldenRingBet`, `getEldenRingBossDefeatRate`, `calculateEldenRingOdds`, `getActiveEldenRingFightId` — 8 ER betting functions in storage.js
- [x] Golden Offer (20% random) and first-bettor bonus integrated into `closeEldenRingBet()`
- [x] `~/delu-bot/src/eldenRingAssets.js` — Boss artwork URL map with 189 entries including DLC bosses
- [x] 24 tests in eldenRingStorage.test.js covering pure betting logic and module exports

### Plan 03-02
- [x] `eldenRingNotifier.js` `register(client)` subscribes to `boss_encounter`, `player_death`, `boss_kill`, `session_end` events
- [x] Boss encounter: gold embed with 6 bet buttons and odds in footer
- [x] Player death: red embed with 4-tier escalating taunts (16 unique messages)
- [x] Boss kill: green embed with fight duration and first-try detection
- [x] Notifier wired into `eldenRingTracker.start()` via lazy require pattern

### Plan 03-03
- [x] `er_bet_` button handler added to `bot.js` interactionCreate block
- [x] Parses prediction (v/d) and amount from `customId` format `er_bet_{v|d}_{amount}_{fightId}`
- [x] Places bet via `storage.placeEldenRingBet()` with locked odds at placement time
- [x] Ephemeral reply with bet confirmation (amount, odds, new balance)
- [x] `updateErEncounterEmbed()` helper updates "Paris" field with live bet counts

### Plan 03-04
- [x] `handleDeath()` calls `closeEldenRingBet(fightId, 'defaite')` — victoire bettors lose on death
- [x] `handleKill()` calls `closeEldenRingBet(fightId, 'victoire')` — defaite bettors lose on kill
- [x] Bet results (winners with profit, losers with loss) shown in death/kill embeds
- [x] Encounter embed buttons disabled after resolution via `disableEncounterButtons()`
- [x] `handleSessionEnd()` session summary with boss breakdown and kill/death/attempt counts
- [x] Orphaned bets force-cancelled (refunded) on session end via `forceCloseOrphanedBets()`

## Test Results

- **JavaScript:** 103 tests passing across 6 test files (0 failures)
  - eldenRingStorage.test.js: 24 tests (betting logic and module exports)
  - apiServer.test.js: 18 tests (event routing, auth, BET button interactions)
  - storage.test.js: 19 tests (no regressions in LoL/TFT storage)
  - features.test.js: 14 tests (feature flag checks)
- **Python:** 46 passed, 4 skipped (pre-existing screenshot test skips)

## Score

12/12 requirements verified — **PASSED**

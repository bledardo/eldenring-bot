---
phase: 03-discord-notifications-and-betting
plan: 04
subsystem: bet-resolution
tags: [betting, resolution, session-summary, elden-ring]

requires:
  - phase: 03-02
    provides: "eldenRingNotifier with death/kill handlers"
  - phase: 03-03
    provides: "bot.js button handler"
provides:
  - "Automatic bet resolution on death (defaite) and kill (victoire)"
  - "Bet results displayed in death/kill embeds"
  - "Encounter embed buttons disabled after resolution"
  - "Session summary embed on game close"
  - "Orphaned bet force-cancel on session end"
affects: []

tech-stack:
  added: []
  patterns:
    - "closeEldenRingBet called before embed send (results in embed)"
    - "disableEncounterButtons as fire-and-forget with .catch()"
    - "forceCloseOrphanedBets scans all active bets for player"

key-files:
  created: []
  modified:
    - "~/delu-bot/src/eldenRingNotifier.js"
    - "~/delu-bot/src/storage.js"

key-decisions:
  - "Bet results added to embed BEFORE send (not as a separate message)"
  - "Session summary: player journey only, no betting results (per user decision)"
  - "Silent skip if zero boss encounters in session"
  - "Orphaned bets cancelled (refunded) not resolved"

patterns-established:
  - "Full bet lifecycle: create -> place -> close/cancel -> disable buttons"
  - "Session summary aggregates fights by boss with kills/deaths/attempts"

requirements-completed: [NOTIF-02, NOTIF-03, NOTIF-05, BET-05]

duration: 8min
completed: 2026-02-27
---

# Phase 3 Plan 04: Bet Resolution and Session Summary

**Automatic bet resolution on death/kill with results in embeds, session summary, and orphaned bet cleanup**

## Performance

- **Duration:** 8 min
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Death handler now closes bet with 'defaite' result, credits/debits wallets
- Kill handler now closes bet with 'victoire' result, credits/debits wallets
- Bet results (winners with profit, losers with loss) shown in death/kill embeds
- Golden Offer indicator shown for winners who received the bonus
- Encounter embed buttons disabled after bet resolution
- Paris field updated to show "(ferme)" after close
- Session summary embed (blurple 0x5865F2) with boss breakdown, kill/death counts, duration
- Zero-encounter sessions silently skipped
- Orphaned bets force-cancelled and refunded on session end
- getEldenRingSessionFights added to storage.js for session fight aggregation

## Files Created/Modified
- `~/delu-bot/src/eldenRingNotifier.js` - Added bet resolution, session handler, helpers (~100 new lines)
- `~/delu-bot/src/storage.js` - Added getEldenRingSessionFights function

## Decisions Made
- Bet results in embed (not separate message) for cleaner UX
- Session summary shows only player journey (no betting results per user decision)
- Orphaned bets cancelled (refunded to all bettors) rather than force-resolved

## Deviations from Plan
None.

## Issues Encountered
None.

---
*Phase: 03-discord-notifications-and-betting*
*Completed: 2026-02-27*

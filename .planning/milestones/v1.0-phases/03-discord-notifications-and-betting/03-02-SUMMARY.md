---
phase: 03-discord-notifications-and-betting
plan: 02
subsystem: notifications
tags: [discord, embeds, betting-buttons, elden-ring]

requires:
  - phase: 03-01
    provides: "ER betting storage, boss artwork map"
provides:
  - "eldenRingNotifier.js module with event-driven Discord embeds"
  - "Boss encounter gold embed with 6 bet buttons"
  - "Death red embed with escalating taunts"
  - "Kill green embed with victory celebration"
affects: [03-03, 03-04]

tech-stack:
  added: []
  patterns:
    - "EventEmitter subscription for boss_encounter, player_death, boss_kill"
    - "Lazy require in eldenRingTracker to avoid circular deps"
    - "try/catch wrapper on all event handlers"

key-files:
  created:
    - "~/delu-bot/src/eldenRingNotifier.js"
  modified:
    - "~/delu-bot/src/eldenRingTracker.js"

key-decisions:
  - "6 predefined bet buttons (50/100/500 x Victoire/Defaite) instead of modal input"
  - "Short customId prefix (er_bet_v/d) to stay under 100-char Discord limit"
  - "Death taunts in 4 escalating tiers (1-3, 4-7, 8-14, 15+)"
  - "Cancel orphaned bets before creating new bet on re-encounter"

patterns-established:
  - "Encounter creates bet + sends embed with buttons in single handler"
  - "Golden Offer detected post-send, embed edited to show gold star"
  - "Boss artwork optional (skipped if null)"

requirements-completed: [NOTIF-01, NOTIF-02, NOTIF-03, BET-01]

duration: 8min
completed: 2026-02-27
---

# Phase 3 Plan 02: Elden Ring Notifier Module Summary

**Event-driven Discord embeds for boss encounters (gold + betting buttons), deaths (red + escalating taunts), and kills (green + victory)**

## Performance

- **Duration:** 8 min
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created eldenRingNotifier.js with register(client) subscribing to 3 combat events
- Boss encounter: gold embed (0xFFA500) with dramatic intro, 6 bet buttons, odds in footer, Golden Offer detection
- Player death: red embed (0xFF0000) with 4 tiers of escalating taunts (16 unique messages)
- Boss kill: green embed (0x00CC44) with first-try detection and fight duration
- Wired notifier into eldenRingTracker.start() with lazy require pattern

## Files Created/Modified
- `~/delu-bot/src/eldenRingNotifier.js` - Event listener module (~220 lines)
- `~/delu-bot/src/eldenRingTracker.js` - Added notifier registration in start()

## Decisions Made
- Predefined bet tiers (50/100/500 PC) rather than modal amount input for faster UX
- Short v/d prefix in customId for Discord's 100-char limit
- Death taunts escalate across 4 tiers with 3-4 random options each

## Deviations from Plan
None.

## Issues Encountered
None.

---
*Phase: 03-discord-notifications-and-betting*
*Completed: 2026-02-27*

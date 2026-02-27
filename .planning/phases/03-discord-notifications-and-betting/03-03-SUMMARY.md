---
phase: 03-discord-notifications-and-betting
plan: 03
subsystem: betting-ui
tags: [discord, buttons, betting, elden-ring]

requires:
  - phase: 03-01
    provides: "ER betting storage functions"
provides:
  - "er_bet_ button handler in bot.js"
  - "updateErEncounterEmbed helper for live bet count updates"
affects: [03-04]

tech-stack:
  added: []
  patterns:
    - "Ephemeral replies for bet confirmations"
    - "Fire-and-forget embed updates with .catch()"
    - "Paris field found by name, not index"

key-files:
  created: []
  modified:
    - "~/delu-bot/src/bot.js"

key-decisions:
  - "Placed ER bet handler after TFT bet handler, before resetwallet handler"
  - "updateErEncounterEmbed defined as standalone function above button handler block"
  - "Re-reads bet state before updating embed to get latest counts"

patterns-established:
  - "ER bet buttons use predefined amounts (no modal), direct placement"
  - "customId parse: split('_') -> [er, bet, v|d, amount, fightId]"

requirements-completed: [BET-04, BET-05]

duration: 5min
completed: 2026-02-27
---

# Phase 3 Plan 03: ER Bet Button Handler Summary

**Bot.js button handler for ER bet placement with live embed counter updates**

## Performance

- **Duration:** 5 min
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added er_bet_ button handler in bot.js interactionCreate block
- Parses prediction (v/d) and amount from customId
- Places bet via storage.placeEldenRingBet with locked odds
- Ephemeral reply with bet confirmation (amount, odds, new balance)
- updateErEncounterEmbed helper updates Paris field with live bet counts
- Error handling: closed bets, insufficient balance, fire-and-forget embed updates

## Files Created/Modified
- `~/delu-bot/src/bot.js` - Added ~70 lines (handler + helper function)

## Decisions Made
- No modal input needed (predefined amounts from buttons)
- Helper function placed outside handler block for reusability

## Deviations from Plan
None.

## Issues Encountered
None.

---
*Phase: 03-discord-notifications-and-betting*
*Completed: 2026-02-27*

---
phase: 03-discord-notifications-and-betting
plan: 01
subsystem: betting
tags: [storage, odds, wallet, assets, elden-ring]

requires:
  - phase: 02-event-pipeline
    provides: "ER storage schema, fight tracking, feature flags"
provides:
  - "8 ER betting CRUD functions in storage.js"
  - "Boss artwork URL map (189 entries) in eldenRingAssets.js"
  - "Defeat rate odds calculation via calculateBaseOdds"
affects: [03-02, 03-03, 03-04]

tech-stack:
  added: []
  patterns:
    - "ER active bets stored under data.eldenRing.activeEldenRingBets"
    - "Odds via defeat rate: calculateBaseOdds(1 - defeatRate)"
    - "Fuzzy boss name matching with accent normalization"

key-files:
  created:
    - "~/delu-bot/src/eldenRingAssets.js"
    - "~/delu-bot/tests/eldenRingStorage.test.js"
  modified:
    - "~/delu-bot/src/storage.js"

key-decisions:
  - "Pure logic test pattern for ER betting (matches existing storage.test.js approach)"
  - "189 boss entries including DLC with fuzzy matching for OCR tolerance"
  - "Default 75% defeat rate for unknown bosses (conservative odds)"

patterns-established:
  - "ER bet lifecycle: create -> place -> close/cancel"
  - "Wallet integration mirrors LoL pattern: deduct on place, credit/refund on close/cancel"

requirements-completed: [BET-02, BET-03, BET-04, BET-06, BET-07, NOTIF-04]

duration: 7min
completed: 2026-02-27
---

# Phase 3 Plan 01: ER Betting Storage and Boss Artwork Summary

**8 ER betting CRUD functions with wallet integration, odds from per-boss defeat rate, and 189-boss artwork map with fuzzy matching**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-27T00:14:54Z
- **Completed:** 2026-02-27T00:22:21Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- 8 new storage functions: create, get, place, close, cancel ER bets + defeat rate + odds + getAllActive
- Golden Offer (20% random) and first-bettor bonus integrated into closeEldenRingBet
- Boss artwork asset map covering 189 entries with exact, case-insensitive, and fuzzy matching
- 24 tests covering pure betting logic and module exports

## Task Commits

1. **Task 1: Add ER betting storage functions** - `c74e3f5` (feat)
2. **Task 2: Create boss artwork asset map** - `ed8be79` (feat)

## Files Created/Modified
- `~/delu-bot/src/storage.js` - 8 new ER betting functions + ensureDataFile migration
- `~/delu-bot/src/eldenRingAssets.js` - Boss name to artwork URL mapping (189 entries)
- `~/delu-bot/tests/eldenRingStorage.test.js` - 24 tests for pure betting logic

## Decisions Made
- Used pure function extraction pattern for tests (consistent with existing storage.test.js)
- 189 bosses mapped (exceeds 168 target due to FR/EN duplicate entries and DLC bosses)
- Default 75% defeat rate for first encounter (makes victoire bets high-reward)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Storage functions ready for Plans 02-04 (notification embeds, button handlers, bet resolution)
- Boss artwork map ready for embed image display

---
*Phase: 03-discord-notifications-and-betting*
*Completed: 2026-02-27*

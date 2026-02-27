# Phase 6: Cross-Phase Verification Sweep - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify all requirements from Phases 2-4 end-to-end with VERIFICATION.md files, update REQUIREMENTS.md traceability, AND implement remaining pending requirements: betting system (BET-01/02/04/05/06/07), delu-bot integration (INTG-01/02/03/04), and API authentication (COMM-06).

</domain>

<decisions>
## Implementation Decisions

### Betting interaction flow
- Bet buttons ("Parier Victoire (x2.5)" / "Parier Défaite (x1.3)") directly on the boss encounter embed
- Odds displayed on the buttons before clicking
- Betting open until fight resolution (death or kill) — no time window
- Ephemeral confirmation message when a user clicks a bet button (only visible to that user)
- Duplicate bets rejected with ephemeral error — buttons stay visible for other users
- On resolution: edit original embed to show results (winners, losers, payouts) — no separate results message to avoid spam (player can die 30+ times on one boss)

### Bet frequency & re-attempts
- Configurable bet frequency per bettor via slash command (e.g., /er-bet-settings frequency:5)
- Default frequency: every attempt (1) — new bet buttons on each boss encounter
- When bet refreshes at configured frequency: new buttons appear, bettor must manually place a new bet (no auto-repeat)

### Wallet & currency
- Flexible bet amounts — same system as LoL/TFT betting (player chooses amount)
- Shared wallet across all games — one delu balance per user (Elden Ring winnings fund LoL bets and vice versa)
- Golden Offer: identical logic to existing delu-bot system, no Elden Ring customization
- First bettor bonus: same as existing delu-bot system
- Insufficient funds handling: same as existing delu-bot system

### API authentication
- Per-player API key linked to Discord user ID — events automatically attributed to correct player
- 401 error returned to Watcher on invalid API key (player can debug)
- Designed for 2-5 friends (small group, doesn't need to scale)

### delu-bot integration
- Independent feature flags: tracking_elden_ring and betting_elden_ring (toggleable separately from LoL/TFT)
- Elden Ring data stored in separate file (e.g., eldenring-storage.json) — fully isolated from LoL/TFT data
- Shared wallet lives in existing storage (wallet is cross-game)
- New eldenRingTracker.js module following existing tracker pattern
- Must not break existing LoL/TFT functionality

### Claude's Discretion
- API key creation and distribution flow (best UX for small friend group)
- Exact ephemeral message wording and formatting
- Bet frequency slash command argument design
- Verification documentation structure and format
- How to handle edge cases (e.g., Watcher disconnects mid-fight, bet placed during server restart)

</decisions>

<specifics>
## Specific Ideas

- "I can die like 30 times on a boss, so it will spam the channel if a new notification spawns" — critical design constraint, update existing embed instead of sending new messages
- Bet system should mirror existing LoL/TFT patterns as closely as possible — "same as existing" was the answer for Golden Offer, first bettor bonus, insufficient funds, and bet amount flexibility
- User has delu-bot repo locally + on VPS — repo path to be provided during planning/research phase for code analysis

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-cross-phase-verification-sweep*
*Context gathered: 2026-02-27*

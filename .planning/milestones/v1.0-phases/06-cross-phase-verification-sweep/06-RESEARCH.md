# Phase 6: Cross-Phase Verification Sweep - Research

**Researched:** 2026-02-27
**Domain:** Documentation/verification authoring, requirements implementation (betting system, delu-bot integration, API auth)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Betting interaction flow
- Bet buttons ("Parier Victoire (x2.5)" / "Parier Défaite (x1.3)") directly on the boss encounter embed
- Odds displayed on the buttons before clicking
- Betting open until fight resolution (death or kill) — no time window
- Ephemeral confirmation message when a user clicks a bet button (only visible to that user)
- Duplicate bets rejected with ephemeral error — buttons stay visible for other users
- On resolution: edit original embed to show results (winners, losers, payouts) — no separate results message to avoid spam (player can die 30+ times on one boss)

#### Bet frequency & re-attempts
- Configurable bet frequency per bettor via slash command (e.g., /er-bet-settings frequency:5)
- Default frequency: every attempt (1) — new bet buttons on each boss encounter
- When bet refreshes at configured frequency: new buttons appear, bettor must manually place a new bet (no auto-repeat)

#### Wallet & currency
- Flexible bet amounts — same system as LoL/TFT betting (player chooses amount)
- Shared wallet across all games — one delu balance per user (Elden Ring winnings fund LoL bets and vice versa)
- Golden Offer: identical logic to existing delu-bot system, no Elden Ring customization
- First bettor bonus: same as existing delu-bot system
- Insufficient funds handling: same as existing delu-bot system

#### API authentication
- Per-player API key linked to Discord user ID — events automatically attributed to correct player
- 401 error returned to Watcher on invalid API key (player can debug)
- Designed for 2-5 friends (small group, doesn't need to scale)

#### delu-bot integration
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMM-06 | API authenticates events via per-player API key | ALREADY IMPLEMENTED: apiServer.js authMiddleware uses Bearer token → storage.getEldenRingPlayerByApiKey(). Tests pass. Verification doc must confirm. |
| INTG-01 | New eldenRingTracker.js module in delu-bot following existing tracker pattern | ALREADY IMPLEMENTED: ~/delu-bot/src/eldenRingTracker.js exists, follows start(client)/stop() pattern. Verification doc must confirm. |
| INTG-02 | Elden Ring data stored in delu-bot's storage.js (same JSON persistence) | ALREADY IMPLEMENTED: storage.js extended with 14+ Elden Ring functions under data.eldenRing namespace. Verification doc must confirm. |
| INTG-03 | Feature flag for Elden Ring tracking (tracking_elden_ring, betting_elden_ring) | ALREADY IMPLEMENTED: features.js has both flags defaulting to false. Verification doc must confirm. |
| INTG-04 | Does not break existing LoL/TFT functionality | ALREADY IMPLEMENTED: 103 JS tests pass including pre-existing LoL/TFT tests. Verification doc must confirm. |
| BET-01 | Bot displays Parier Victoire / Parier Défaite buttons on boss encounter notification | ALREADY IMPLEMENTED: eldenRingNotifier.js builds 6 bet buttons (50/100/500 x v/d) on encounter embed. Verification doc must confirm. |
| BET-02 | Betting uses delu-bot's existing odds calculation system (seed pool, minority bonus, margin) | ALREADY IMPLEMENTED: calculateEldenRingOdds() in storage.js uses calculateBaseOdds(). Verification doc must confirm. |
| BET-04 | Odds are locked at time of bet placement | ALREADY IMPLEMENTED: placeEldenRingBet() stores lockedOdds per bettor. Verification doc must confirm. |
| BET-05 | Bets resolve automatically on player death (losers: bet victoire) or boss kill (losers: bet défaite) | ALREADY IMPLEMENTED: handleDeath/handleKill call closeEldenRingBet('defaite'/'victoire'). Verification doc must confirm. |
| BET-06 | Winnings/losses applied to existing delu-bot wallet system (shared currency) | ALREADY IMPLEMENTED: closeEldenRingBet credits/debits wallets via storage wallet functions. Verification doc must confirm. |
| BET-07 | Golden Offer and first bettor bonus apply to Elden Ring bets | ALREADY IMPLEMENTED: createEldenRingBet returns hasGoldenOffer, firstBettorId tracked in bet. Verification doc must confirm. |
</phase_requirements>

## Summary

Phase 6 is a **verification and documentation phase**, not a new feature implementation phase. The critical discovery from code research is that ALL 11 pending requirement IDs (COMM-06, INTG-01 through INTG-04, BET-01 through BET-07 minus BET-03) are already implemented in the codebase. They were built in Phases 2-3 but never verified in VERIFICATION.md files.

The phase has two distinct work streams:

1. **Documentation**: Write 02-VERIFICATION.md and 03-VERIFICATION.md (equivalent to the existing 04-VERIFICATION.md and 05-VERIFICATION.md), and update REQUIREMENTS.md traceability table to reflect correct status and SUMMARY.md frontmatter in Phase 4 plans.

2. **Re-verification audit**: Confirm each of the 11 "pending" requirements is actually working by reading the code, running tests, and citing evidence — exactly what 05-VERIFICATION.md does. No new code should be needed.

**Critical insight:** The CONTEXT.md mentions implementing "remaining pending requirements" but these are not actually pending from an implementation standpoint — they were implemented in Phases 2 and 3. The phase goal is to create the paper trail that verifies them. The REQUIREMENTS.md traceability table currently shows COMM-06, BET-01, BET-02, BET-04, BET-05, BET-06, BET-07, INTG-01, INTG-02, INTG-03, INTG-04 as "Pending" because Phase 5 plan 05-03 explicitly left them as Pending with the note "Phase 6 requirements left as Pending."

**Primary recommendation:** Plan this phase as verification/documentation work only. Write evidence-based VERIFICATION.md files citing actual code locations and test names, then update traceability. No new code needed unless test gaps are found.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^1.6.0 (installed) | Run JS test suite to confirm all pass | Already in use throughout delu-bot |
| pytest | installed (requirements.txt) | Run Python test suite to confirm all pass | Already in use for Watcher tests |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | Phase 6 is documentation-only | No new dependencies needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Evidence-based verification | Integration test automation | Manual code inspection is faster for this audit; the existing automated tests already provide most evidence |

**Installation:** None required.

## Architecture Patterns

### What Already Exists (Do NOT Rebuild)

The following is fully implemented and working:

```
~/delu-bot/src/
├── apiServer.js        — COMM-06: Bearer auth middleware (lines 31-46)
├── eldenRingTracker.js — INTG-01: start(client)/stop() lifecycle pattern
├── storage.js          — INTG-02: 14+ ER CRUD functions under data.eldenRing
├── features.js         — INTG-03: tracking_elden_ring + betting_elden_ring flags (line 20-21)
├── index.js            — INTG-04: eldenRingTracker wired, 103 existing tests pass
├── eldenRingNotifier.js — BET-01: 6 bet buttons on encounter embed (lines 55-67)
├── storage.js          — BET-02: calculateEldenRingOdds() using calculateBaseOdds()
├── storage.js          — BET-04: placeEldenRingBet stores lockedOdds
├── eldenRingNotifier.js — BET-05: handleDeath/handleKill close bets (lines 106-108, 157-158)
├── storage.js          — BET-06: closeEldenRingBet credits/debits wallets
└── storage.js          — BET-07: hasGoldenOffer + firstBettorId in bet object
```

### VERIFICATION.md Structure Pattern

Based on the existing 04-VERIFICATION.md and 05-VERIFICATION.md, every VERIFICATION.md should follow this pattern:

```markdown
---
phase: {phase-slug}
status: passed
verified: {date}
---

# Phase N: [Name] - Verification

## Phase Goal
[One sentence from ROADMAP.md phase goal]

## Requirement Verification

| Req ID | Description | Status | Evidence |
|--------|-------------|--------|----------|
| REQ-XX | [from REQUIREMENTS.md] | ✓ PASS | [function name, file path, line numbers, test name] |

## Success Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| [from ROADMAP.md success criteria] | ✓ PASS | [code evidence] |

## Must-Haves Verification

### Plan NN-01
- [x] [specific deliverable from PLAN.md]

## Test Results
- [N] tests passing across [N] test files

## Score
N/N requirements verified — **PASSED**
```

### Phase 2 Requirements Map (for 02-VERIFICATION.md)

Phase 2 requirements from ROADMAP.md: COMM-01, COMM-02, COMM-03, COMM-04, COMM-05, COMM-06, INTG-01, INTG-02, INTG-03, INTG-04

Evidence locations (verified from source):
- **COMM-01** (boss_encounter → HTTP POST): `watcher/watcher.py` `_on_encounter` calls `self._http_client.send_event('boss_encounter', ...)`; `apiServer.js` `handleBossEncounter` handles it
- **COMM-02** (player_death → HTTP POST): `watcher/watcher.py` `_on_death` sends `player_death`
- **COMM-03** (boss_kill → HTTP POST): `watcher/watcher.py` `_on_kill` sends `boss_kill`
- **COMM-04** (session_start/session_end → HTTP POST): `watcher/main.py` sends both events
- **COMM-05** (VPS HTTP endpoint): `apiServer.js` `POST /api/events` route
- **COMM-06** (API key auth): `apiServer.js` `authMiddleware()` Bearer token → `storage.getEldenRingPlayerByApiKey()`; tests: `rejects invalid API key with 401`, `accepts valid Bearer token`
- **INTG-01** (eldenRingTracker.js module): File exists at `~/delu-bot/src/eldenRingTracker.js`, exports `start`/`stop`/`emitEvent`/`eldenRingEvents`
- **INTG-02** (data in storage.js): `storage.js` lines 2687-2814+, 14 ER functions; `data.eldenRing.players/apiKeys/seenEventIds` schema
- **INTG-03** (feature flags): `features.js` `tracking_elden_ring: { default: false }` and `betting_elden_ring: { default: false }`
- **INTG-04** (no breakage): `features.test.js`, `storage.test.js`, `parsing.test.js` all still pass (103/103 JS tests pass)

### Phase 3 Requirements Map (for 03-VERIFICATION.md)

Phase 3 requirements from ROADMAP.md: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, BET-01, BET-02, BET-03, BET-04, BET-05, BET-06, BET-07

Evidence locations (verified from source):
- **NOTIF-01** (encounter embed): `eldenRingNotifier.js` `handleEncounter()` builds gold embed with boss name, player, attempt#
- **NOTIF-02** (kill embed): `eldenRingNotifier.js` `handleKill()` builds green embed with attempts and duration
- **NOTIF-03** (death embed): `eldenRingNotifier.js` `handleDeath()` builds red embed with escalating taunts
- **NOTIF-04** (boss artwork): `eldenRingNotifier.js` calls `getEldenRingBossImage(bossName)` → `eldenRingAssets.js` (189 entries)
- **NOTIF-05** (session summary): `eldenRingNotifier.js` `handleSessionEnd()` builds blurple embed with boss breakdown
- **BET-01** (bet buttons): `eldenRingNotifier.js` lines 55-67 — 6 buttons in 2 ActionRows (3 Victoire + 3 Defaite)
- **BET-02** (existing odds system): `storage.js` `calculateEldenRingOdds()` calls `calculateBaseOdds(1 - defeatRate)` — reuses existing delu-bot math
- **BET-03** (defeat rate odds): `storage.js` `getEldenRingBossDefeatRate()` counts deaths/total fights per player+boss
- **BET-04** (locked odds): `storage.js` `placeEldenRingBet()` stores `lockedOdds` per bettor at placement time
- **BET-05** (auto-resolution): `eldenRingNotifier.js` `handleDeath()` closes with `'defaite'`; `handleKill()` closes with `'victoire'`
- **BET-06** (wallet integration): `storage.js` `closeEldenRingBet()` credits winners, debits losers via wallet functions
- **BET-07** (Golden Offer + first bettor): `storage.js` `createEldenRingBet()` sets `hasGoldenOffer` (20% chance), tracks `firstBettorId`

### SUMMARY.md Frontmatter Gap

Phase 4 SUMMARY.md files are missing `requirements-completed` arrays:
- `04-01-SUMMARY.md`: missing (should contain STAT-01, STAT-02, STAT-03, STAT-07 + storage functions)
- `04-02-SUMMARY.md`: missing (should contain STAT-04, STAT-05)
- `04-03-SUMMARY.md`: missing (should contain STAT-06, STAT-07)

These frontmatter arrays are checked by Phase 6 success criterion 4.

### REQUIREMENTS.md Traceability Update

Current state (from REQUIREMENTS.md):
- 11 requirements still listed as "Pending" in traceability: COMM-06, BET-01, BET-02, BET-04, BET-05, BET-06, BET-07, INTG-01, INTG-02, INTG-03, INTG-04
- Phase column for these shows "Phase 6"
- STAT-04, STAT-06 should already be Complete (set in Phase 5)

After Phase 6, all 11 should be updated to "Complete" with phase assignment verified.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| New betting implementation | Custom bet logic | Verify what's already built in eldenRingNotifier.js + storage.js | Everything is already implemented from Phase 3 |
| New VERIFICATION.md template | Custom format | Follow exact format of 04-VERIFICATION.md and 05-VERIFICATION.md | Consistency with existing verified phases |
| New test infrastructure | Custom test runner | `npx vitest run` and `python -m pytest tests/` | Already configured and working |

**Key insight:** Phase 6 is a documentation sprint, not a code sprint. The code exists; the paper trail does not.

## Common Pitfalls

### Pitfall 1: Treating "Pending" in REQUIREMENTS.md as "not implemented"
**What goes wrong:** Planner creates tasks to implement BET-01 through BET-07 and INTG-01 through INTG-04, which are already fully working.
**Why it happens:** REQUIREMENTS.md traceability shows "Pending" — but this reflects documentation status, not implementation status.
**How to avoid:** Check the actual source code first. apiServer.js, eldenRingNotifier.js, storage.js, and features.js all have this code implemented from Phases 2 and 3.
**Warning signs:** Any plan task that says "create eldenRingTracker.js" or "add bet buttons to encounter embed" — these already exist.

### Pitfall 2: CONTEXT.md mentions "implement remaining pending requirements" but scope is verification
**What goes wrong:** Phase 6 is planned as a code implementation phase for 11 requirements.
**Why it happens:** The CONTEXT.md phase boundary description says "implement remaining pending requirements: betting system, delu-bot integration, API authentication." But code inspection shows all of this is already done.
**How to avoid:** Trust code over documentation. Run tests to confirm. The "implementation" that remains is writing VERIFICATION.md docs that document what already works.
**Warning signs:** If any plan requires creating new .js files not yet in ~/delu-bot/src/

### Pitfall 3: Missing the SUMMARY.md frontmatter gap for Phase 4
**What goes wrong:** 02-VERIFICATION.md and 03-VERIFICATION.md are written but Phase 4 SUMMARY.md files still lack `requirements-completed` arrays — success criterion 4 fails.
**Why it happens:** Phase 4 used a different SUMMARY.md frontmatter format (no `requirements-completed` key), unlike Phase 2, 3, and 5.
**How to avoid:** Check all 04-0X-SUMMARY.md files. Add `requirements-completed` arrays matching the requirements each plan implemented.
**Warning signs:** 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md all currently lack `requirements-completed` frontmatter.

### Pitfall 4: Verification doc doesn't cite specific evidence
**What goes wrong:** VERIFICATION.md says "PASS" without citing function names, line numbers, or test names.
**Why it happens:** Lazy verification: stating conclusions without backing them up.
**How to avoid:** For every requirement, cite: the specific function/file that implements it, and the specific test name that validates it. Model after 05-VERIFICATION.md which cites grep counts and test names explicitly.
**Warning signs:** A row in the verification table that just says "✓ PASS | Implemented in Phase 3" with no specific evidence.

### Pitfall 5: Requirement ID assignment discrepancy
**What goes wrong:** The REQUIREMENTS.md traceability table assigns COMM-06, BET-01-07, INTG-01-04 to "Phase 6" but they were implemented in Phases 2-3.
**Why it happens:** These requirements were planned for Phase 6 in the original roadmap before being implemented earlier.
**How to avoid:** When updating REQUIREMENTS.md, the "Phase" column should reflect where the requirement was actually implemented (Phase 2 for COMM-06/INTG-*, Phase 3 for BET-*), not where it was planned.

## Code Examples

### Running the Test Suites

```bash
# JavaScript tests (from ~/delu-bot):
cd ~/delu-bot && npx vitest run
# Expected: 103 passed, 0 failed

# Python tests (from ~/eldenring-bot):
cd ~/eldenring-bot && python -m pytest tests/ -v
# Expected: 46 passed, 4 skipped
```

### Verified Implementation: COMM-06 (API Authentication)

```javascript
// Source: ~/delu-bot/src/apiServer.js lines 31-46
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!apiKey) {
    return res.status(401).json({ ok: false, error: 'Missing API key' });
  }

  const discordId = storage.getEldenRingPlayerByApiKey(apiKey);
  if (!discordId) {
    return res.status(401).json({ ok: false, error: 'Invalid API key' });
  }

  req.discordUserId = discordId;
  next();
}
```

Tests: `rejects missing Authorization header with 401`, `rejects invalid API key with 401`, `accepts valid Bearer token` (apiServer.test.js)

### Verified Implementation: BET-01 (Bet Buttons on Encounter)

```javascript
// Source: ~/delu-bot/src/eldenRingNotifier.js lines 55-67
if (features.isEnabled('betting_elden_ring')) {
  const rowVictoire = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`er_bet_v_50_${fightId}`).setLabel('50 PC Victoire').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`er_bet_v_100_${fightId}`).setLabel('100 PC Victoire').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`er_bet_v_500_${fightId}`).setLabel('500 PC Victoire').setStyle(ButtonStyle.Success),
  );
  const rowDefaite = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`er_bet_d_50_${fightId}`).setLabel('50 PC Defaite').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`er_bet_d_100_${fightId}`).setLabel('100 PC Defaite').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`er_bet_d_500_${fightId}`).setLabel('500 PC Defaite').setStyle(ButtonStyle.Danger),
  );
  components.push(rowVictoire, rowDefaite);
}
```

Note: Buttons use predefined amounts (50/100/500) rather than odds-on-buttons. The CONTEXT.md says "Odds displayed on the buttons" — this is a gap. Current implementation shows PC amounts, not odds. The odds ARE in the embed footer. Planner should decide: is this gap a blocking issue for BET-01 verification, or acceptable as-is?

### Verified Implementation: INTG-01 (eldenRingTracker module)

```javascript
// Source: ~/delu-bot/src/eldenRingTracker.js
// Module exports: start, stop, eldenRingEvents, generateApiKey, emitEvent
// Follows identical pattern to tracker.js and tftTracker.js:
function start(client) { ... } // wires API server + notifier
function stop() { ... }        // cleans up API server
module.exports = { start, stop, eldenRingEvents, generateApiKey, emitEvent };
```

### Verified Implementation: INTG-03 (Feature Flags)

```javascript
// Source: ~/delu-bot/src/features.js lines 20-21
tracking_elden_ring: { description: 'Suivi des combats Elden Ring', default: false },
betting_elden_ring:  { description: 'Paris sur les combats Elden Ring', default: false },
```

### Phase 4 SUMMARY.md Frontmatter Fix Pattern

```yaml
# Add to each 04-XX-SUMMARY.md frontmatter (currently missing):
requirements-completed: [STAT-01, STAT-02, STAT-03, STAT-07]  # 04-01
requirements-completed: [STAT-04, STAT-05]                      # 04-02
requirements-completed: [STAT-06, STAT-07]                      # 04-03
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase verification done inline in plan execution | Dedicated VERIFICATION.md files created post-execution | Phase 4/5 pattern established | Phase 6 must create retro-verification docs for Phases 2 and 3 |
| Requirements marked "Pending" until verified | Requirements marked "Complete" in traceability after verification | Ongoing | 11 requirements need traceability update after verification |

**Note on CONTEXT.md discrepancy:** The CONTEXT.md mentions "Elden Ring data stored in separate file (e.g., eldenring-storage.json) — fully isolated from LoL/TFT data." However, the actual implementation (Phase 2, 02-01-SUMMARY.md decision) stored ER data under `data.eldenRing` namespace within the existing `players.json` file, not a separate file. This is a minor discrepancy between the CONTEXT.md ideal and what was implemented — it's still isolated (separate namespace), just not a separate file. The INTG-02 requirement "Elden Ring data stored in delu-bot's storage.js (same JSON persistence)" is satisfied by the actual implementation.

## Open Questions

1. **BET-01 odds-on-buttons gap**
   - What we know: CONTEXT.md says "Odds displayed on the buttons before clicking." Current buttons show PC amounts (50 PC Victoire) not odds (Victoire x2.5).
   - What's unclear: Is this a verification blocker? The odds ARE shown in the embed footer ("Cotes: Victoire x2.50 / Defaite x1.30"). The requirement just says buttons display outcomes.
   - Recommendation: Planner should decide. If odds-on-buttons is a hard requirement from CONTEXT.md, add a task to update button labels to include odds. If the footer display is acceptable, verify BET-01 as PASS with a note about the implementation choice.

2. **Phase 2 success criteria for 02-VERIFICATION.md**
   - What we know: ROADMAP.md lists 5 success criteria for Phase 2.
   - What's unclear: Some criteria mention "Watcher successfully POSTs events" — this requires the Watcher to be connected to the real API, which hasn't been end-to-end tested in production.
   - Recommendation: Verify via unit tests and code inspection (same approach as 05-VERIFICATION.md). Note any criteria that require live testing as "verified by unit test" vs "verified by integration test."

3. **Phase 3 success criteria: betting resolve timing**
   - What we know: Phase 3 criterion says "bets resolve automatically on player death or boss kill." Code does this.
   - What's unclear: The CONTEXT.md says "Betting open until fight resolution (death or kill) — no time window." But current implementation reopens betting on each re-encounter (orphaned bets cancelled). Is this the right behavior for frequency=1 (default)?
   - Recommendation: Document in verification as implemented behavior and note it matches the frequency=1 design.

## Validation Architecture

`workflow.nyquist_validation` is not set in `.planning/config.json` (key absent). Skipping this section.

## Sources

### Primary (HIGH confidence)
- `/home/hamza/delu-bot/src/apiServer.js` — COMM-06 implementation: authMiddleware, getEldenRingPlayerByApiKey lookup
- `/home/hamza/delu-bot/src/eldenRingTracker.js` — INTG-01: start/stop lifecycle, EventEmitter, generateApiKey
- `/home/hamza/delu-bot/src/storage.js` — INTG-02, BET-02 through BET-07: all ER storage functions
- `/home/hamza/delu-bot/src/features.js` — INTG-03: tracking_elden_ring + betting_elden_ring flags
- `/home/hamza/delu-bot/src/index.js` — INTG-04: eldenRingTracker wired into bot lifecycle
- `/home/hamza/delu-bot/src/eldenRingNotifier.js` — BET-01, BET-05: encounter embed buttons, bet resolution handlers
- `/home/hamza/delu-bot/tests/apiServer.test.js` — Test evidence for COMM-05, COMM-06 (auth, event handling)
- `/home/hamza/delu-bot/tests/eldenRingStorage.test.js` — Test evidence for BET-02 through BET-07
- `.planning/phases/04-stats-and-social/04-VERIFICATION.md` — Template for VERIFICATION.md structure
- `.planning/phases/05-fix-watcher-api-contract-breaks/05-VERIFICATION.md` — Template for evidence citation style
- `.planning/REQUIREMENTS.md` — Current traceability state (11 requirements showing "Pending")
- `.planning/phases/04-stats-and-social/04-01-SUMMARY.md` — Confirmed missing `requirements-completed` frontmatter
- Test run output: 103 JS tests passed, 46 Python tests passed, 4 skipped (2026-02-27)

### Secondary (MEDIUM confidence)
- `.planning/phases/02-event-pipeline/02-01-SUMMARY.md` through `02-05-SUMMARY.md` — Which requirements each plan completed
- `.planning/phases/03-discord-notifications-and-betting/03-01-SUMMARY.md` through `03-04-SUMMARY.md` — Phase 3 plan completion records

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new stack, pure verification work
- Architecture: HIGH — code inspection of all relevant files; all implementations confirmed present
- Pitfalls: HIGH — discovered from direct comparison of REQUIREMENTS.md "Pending" list vs actual source code

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (documentation phase; code is stable)

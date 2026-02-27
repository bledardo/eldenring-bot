# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Elden Ring Boss Tracker

**Shipped:** 2026-02-27
**Phases:** 6 | **Plans:** 24 | **Commits:** 74

### What Was Built
- Python Watcher with 5-state FSM for boss detection (health bar, OCR, YOU DIED, kill)
- HTTP event pipeline with Bearer auth, event dedup, and feature flags
- Rich Discord embeds with boss art (189 bosses) and betting buttons
- Dynamic odds, bet resolution, wallet integration, Golden Offer
- Slash commands (/er-stats, /er-bosses, /er-leaderboard) with pagination
- Full cross-phase verification and requirements traceability

### What Worked
- TDD for the state machine (Phase 1) — caught edge cases early, FSM was rock-solid
- Phase-by-phase execution with verification at each gate — caught 6 integration breaks before they reached production
- Reusing delu-bot's existing betting system (odds, wallets, Golden Offer) — zero reimplementation
- Research phase before planning — surfaced the mss borderless-windowed requirement early
- Integration checker as final gate — traced all 5 E2E flows end-to-end

### What Was Inefficient
- Phases 1-4 were executed without `requirements-completed` in SUMMARY frontmatter — Phase 6 had to retrofit this for only Phase 4
- Phase 5 (contract breaks) existed because Watcher and API were developed with mismatched payload contracts — tighter interface contracts at Phase 1-2 boundary would have prevented this
- ROADMAP.md plan checkboxes weren't maintained consistently (Phase 1, 3, 5 have unchecked boxes despite completion)
- STATE.md fell out of sync after Phase 3 — showed "75% (3/4 phases)" even after 6 phases completed

### Patterns Established
- Phase verification (VERIFICATION.md per phase) as a quality gate
- 3-source cross-reference for requirements (VERIFICATION + SUMMARY + REQUIREMENTS.md)
- Integration checker agent for E2E flow tracing
- `boss_canonical_name` as the standard key for boss identification across Python and JS

### Key Lessons
1. Define interface contracts between components at planning time, not after integration — would have eliminated all 6 BREAK issues
2. SUMMARY.md frontmatter conventions should be established at project init, not retrofitted later
3. Audit-driven gap closure (audit → identify breaks → insert fix phase → verify) is effective but expensive — prevention is cheaper
4. 2-day turnaround for a full feature set is achievable with disciplined phase execution and plan-level granularity

### Cost Observations
- Model mix: ~60% sonnet (execution), ~30% opus (planning/audit), ~10% haiku (quick checks)
- Sessions: ~8 context windows across 2 days
- Notable: Phase execution was fast (~10-15min per plan) because research and planning frontloaded decisions

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 74 | 6 | Established phase verification, 3-source cross-reference, integration checking |

### Cumulative Quality

| Milestone | Tests | Phases Passed | Requirements Satisfied |
|-----------|-------|---------------|----------------------|
| v1.0 | 149 (46 Python + 103 JS) | 6/6 | 40/40 |

### Top Lessons (Verified Across Milestones)

1. Define interface contracts between system boundaries at planning time
2. Establish documentation conventions (SUMMARY frontmatter fields) from day one

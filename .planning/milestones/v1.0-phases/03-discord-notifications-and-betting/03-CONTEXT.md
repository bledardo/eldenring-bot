# Phase 3: Discord Notifications and Betting - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Rich Discord embeds for every boss event (encounter, death, kill) with betting integration. Friends see notifications and can wager on fight outcomes using delu-bot wallets. Session summary on game close. Stats commands and leaderboards are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Embed design & tone
- Hype/dramatic narrator energy — "A Great Enemy has appeared..." style, boss titles in full, epic language
- Event-based embed colors: gold/amber for boss encounter, red for player death, green for boss kill
- Death embeds include progressive taunts that escalate with attempt count (e.g., attempt 15 → "At this point the boss is farming YOU")
- Boss kill embeds should feel triumphant — match the dramatic tone of the encounter

### Betting interaction
- Predefined bet tiers via buttons: 50 / 100 / 500 delu-coins — no typing, quick tap
- Betting closes on first death or kill event — you can only bet during the initial encounter window
- Encounter embed updates live as bets come in — shows bet count per side ("3 Victoire / 1 Défaite")
- If nobody bets, embed is edited to say "No bets placed" when the fight resolves
- Parier Victoire / Parier Défaite buttons on encounter embed (French labels, matching existing delu-bot)
- Odds based on player's historical defeat rate per boss, locked at bet time
- Golden Offer and first-bettor bonuses apply (reuse existing delu-bot system)

### Session summary
- Full recap: every boss fought, attempts per boss, kills, deaths, total session duration
- No betting results in the session summary — keep it about the player's journey
- No individual callouts (MVP bettor, biggest loser, etc.)
- If the session had zero boss encounters, don't post a summary at all — silent skip

### Boss artwork
- All ~168 bosses should have artwork — full coverage
- Large image display (full-width at bottom of embed) for dramatic effect
- If no artwork exists for a boss, skip the image entirely — embed still works without it
- No fallback/placeholder image

### Claude's Discretion
- Information density in encounter embeds (what fields to show beyond the required boss name, player, attempt #)
- Boss artwork sourcing approach (pre-bundled vs wiki fetch vs hybrid)
- Exact death taunt messages and escalation thresholds
- Loading/transition states for embed updates
- Exact spacing, typography, and embed field layout

</decisions>

<specifics>
## Specific Ideas

- Death taunts should escalate — light at attempt 3, savage by attempt 15+
- Encounter embeds should feel like a "boss introduction cinematic" in text form
- Live bet counter on the encounter embed creates social pressure to participate
- French labels for betting buttons (Parier Victoire / Parier Défaite) — consistent with existing delu-bot

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-discord-notifications-and-betting*
*Context gathered: 2026-02-27*

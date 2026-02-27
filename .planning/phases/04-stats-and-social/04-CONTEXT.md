# Phase 4: Stats and Social - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Slash commands that let players query their personal Elden Ring stats, browse boss encounters, and view server-wide leaderboards. Collective boss difficulty emerges from aggregated data. No new event types or detection — purely reading and presenting existing data from Phase 3's storage.

</domain>

<decisions>
## Implementation Decisions

### Personal stats (/er-stats)
- Headline stat: bosses defeated out of total (e.g. "42/168 bosses defeated") — completionist feel
- Show aggregate totals: kills, deaths, bosses defeated count
- Show both total session time AND time spent fighting bosses separately
- Include "Recent Activity" section: last 3-5 boss encounters with outcomes
- Optional @user argument: /er-stats shows your own, /er-stats @player shows theirs

### Boss list (/er-bosses)
- Default sort: most recent boss encounter first
- Paginated with navigation buttons (◀ ▶), ~10 bosses per page
- Each entry shows: boss name, attempt count, outcome status (✅ Defeated / ❌ Undefeated), time spent
- Optional @user argument: same pattern as /er-stats

### Leaderboard (/er-leaderboard)
- All categories shown in a single embed with sections (most kills, most deaths, most time played)
- Always show the caller's own rank at the bottom (e.g. "Your rank: #X") even if not in top N
- Boss difficulty ranking is a section within /er-leaderboard (not a separate command)

### Boss difficulty ranking (inside /er-leaderboard)
- Difficulty measured by total deaths caused across all server players — raw body count
- Show top 10 deadliest bosses
- Each entry: boss name + total death count (e.g. "Malenia — 47 deaths")

### Claude's Discretion
- Number of players shown per leaderboard category (balance embed space vs inclusivity)
- Embed colors, formatting, and field layout
- How to handle ties in rankings
- Loading/error states for all commands
- Exact formatting of time durations (hours:minutes vs "2h 30m" etc.)

</decisions>

<specifics>
## Specific Ideas

- All three commands follow the same optional @user pattern for consistency
- The leaderboard is a dense, all-in-one embed — players see everything at a glance without subcommands
- Boss difficulty is framed as "Deadliest Bosses" by death count, not by win rate or attempts

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-stats-and-social*
*Context gathered: 2026-02-27*

# Phase 4: Stats and Social - Research

**Researched:** 2026-02-27
**Domain:** discord.js v14 slash commands, embed pagination, JSON data aggregation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Personal stats (/er-stats)
- Headline stat: bosses defeated out of total (e.g. "42/168 bosses defeated") — completionist feel
- Show aggregate totals: kills, deaths, bosses defeated count
- Show both total session time AND time spent fighting bosses separately
- Include "Recent Activity" section: last 3-5 boss encounters with outcomes
- Optional @user argument: /er-stats shows your own, /er-stats @player shows theirs

#### Boss list (/er-bosses)
- Default sort: most recent boss encounter first
- Paginated with navigation buttons (prev/next), ~10 bosses per page
- Each entry shows: boss name, attempt count, outcome status (defeated/undefeated), time spent
- Optional @user argument: same pattern as /er-stats

#### Leaderboard (/er-leaderboard)
- All categories shown in a single embed with sections (most kills, most deaths, most time played)
- Always show the caller's own rank at the bottom (e.g. "Your rank: #X") even if not in top N
- Boss difficulty ranking is a section within /er-leaderboard (not a separate command)

#### Boss difficulty ranking (inside /er-leaderboard)
- Difficulty measured by total deaths caused across all server players — raw body count
- Show top 10 deadliest bosses
- Each entry: boss name + total death count (e.g. "Malenia — 47 deaths")

### Claude's Discretion
- Number of players shown per leaderboard category (balance embed space vs inclusivity)
- Embed colors, formatting, and field layout
- How to handle ties in rankings
- Exact formatting of time durations (hours:minutes vs "2h 30m" etc.)
- Loading/error states for all commands

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STAT-01 | Bot tracks attempt count per boss per player (persistent) | Already tracked by `addEldenRingFight()` — fight.attempt_number auto-increments; `getEldenRingBossFights()` returns fight array with counts |
| STAT-02 | Bot tracks time spent per boss fight | Already tracked — each fight has `duration_seconds` field stored by `addEldenRingFight()` |
| STAT-03 | Bot tracks total kills and deaths per player | Derivable from existing data — iterate `player.bosses[*].fights[*].outcome` counting 'kill' vs 'death' |
| STAT-04 | /er-stats slash command shows player's Elden Ring stats | New slash command + handler; aggregates from `getEldenRingPlayer()` data |
| STAT-05 | /er-bosses slash command lists all bosses encountered with attempt counts | New slash command + handler with pagination; reads from `player.bosses` object |
| STAT-06 | /er-leaderboard slash command shows server-wide rankings | New slash command + handler; iterates all `data.eldenRing.players` to rank |
| STAT-07 | Server-wide boss difficulty comparison (which boss gave everyone the most trouble) | Aggregate deaths per boss across all players; sort descending |
</phase_requirements>

---

## Summary

Phase 4 is purely a read layer — three new slash commands (`/er-stats`, `/er-bosses`, `/er-leaderboard`) that query existing data from Phase 2-3's storage. No new events, no new detection, no new storage writes. All data needed (fight history, session times, kill/death outcomes) is already persisted by `addEldenRingFight()` and `startEldenRingSession()`/`endEldenRingSession()`.

The main work is: (1) new storage aggregation functions that compute stats from existing fight data, (2) three slash command definitions in the `commands` array, (3) three handler functions that build Discord embeds, and (4) pagination via button interactions for `/er-bosses`.

STAT-01, STAT-02, and STAT-03 are already implicitly satisfied — the data is tracked. Phase 4 makes it visible. The new functions are purely read-only aggregations of `data.eldenRing.players`.

**Primary recommendation:** Add aggregation functions to `storage.js` (e.g., `getEldenRingStats(discordId)`, `getEldenRingAllPlayers()`, `getEldenRingLeaderboard()`), then create handler functions in `bot.js` following the existing `handleMyStats()`/`handleLeaderboard()` patterns. Use the established pagination button pattern (button customId scheme + `interactionCreate` handler) for `/er-bosses`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| discord.js | 14.25.1 (installed) | EmbedBuilder, SlashCommandBuilder, ButtonBuilder, pagination | Already in use throughout bot.js |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^1.6.0 (installed) | Unit tests for aggregation functions | Test new storage aggregation logic |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

```
/home/hamza/delu-bot/src/
├── storage.js             # Modify: add ER stats aggregation functions
├── bot.js                 # Modify: add 3 slash commands + 3 handlers + pagination button handler
├── eldenRingTracker.js    # No changes needed
├── eldenRingNotifier.js   # No changes needed
├── eldenRingAssets.js     # No changes needed
```

### Pattern 1: Stats Aggregation in storage.js

**What:** Read-only functions that compute stats from existing `data.eldenRing.players` structure.

**Data structure available:**
```javascript
// data.eldenRing.players[discordId] = {
//   bosses: {
//     "Margit, the Fell Omen": {
//       fights: [
//         { timestamp, outcome: 'death'|'kill', duration_seconds, boss_canonical_name, attempt_number, session_id }
//       ]
//     }
//   },
//   sessions: [
//     { id, start, end, summary }
//   ]
// }
```

**Example aggregation:**
```javascript
function getEldenRingPlayerStats(discordId) {
  const data = readData();
  const player = data.eldenRing?.players?.[discordId];
  if (!player) return null;

  let totalKills = 0, totalDeaths = 0, totalFightTime = 0, totalSessionTime = 0;
  const bossEntries = [];

  for (const [bossName, bossData] of Object.entries(player.bosses || {})) {
    const fights = bossData.fights || [];
    const kills = fights.filter(f => f.outcome === 'kill').length;
    const deaths = fights.filter(f => f.outcome === 'death').length;
    const fightTime = fights.reduce((sum, f) => sum + (f.duration_seconds || 0), 0);
    totalKills += kills;
    totalDeaths += deaths;
    totalFightTime += fightTime;

    bossEntries.push({
      bossName,
      attempts: fights.length,
      kills,
      deaths,
      defeated: kills > 0,
      fightTime,
      lastFight: fights.length > 0 ? fights[fights.length - 1] : null,
    });
  }

  // Session time
  for (const session of (player.sessions || [])) {
    if (session.start && session.end) {
      totalSessionTime += (new Date(session.end) - new Date(session.start)) / 1000;
    }
  }

  return {
    totalKills,
    totalDeaths,
    bossesDefeated: bossEntries.filter(b => b.defeated).length,
    bossesEncountered: bossEntries.length,
    totalFightTime,
    totalSessionTime,
    bosses: bossEntries,
  };
}
```

### Pattern 2: Slash Command with Optional @user

**What:** All three commands accept an optional `user` parameter. If not provided, use the caller.

```javascript
new SlashCommandBuilder()
  .setName('er-stats')
  .setDescription('Voir vos statistiques Elden Ring')
  .addUserOption(option =>
    option.setName('joueur')
      .setDescription('Voir les stats d\'un autre joueur')
      .setRequired(false)
  ),
```

In the handler:
```javascript
async function handleErStats(interaction) {
  const targetUser = interaction.options.getUser('joueur') || interaction.user;
  const stats = storage.getEldenRingPlayerStats(targetUser.id);
  if (!stats) {
    return interaction.reply({ content: '❌ Aucune donnée Elden Ring pour ce joueur.', ephemeral: true });
  }
  // Build embed...
}
```

### Pattern 3: Pagination with Buttons

**What:** `/er-bosses` shows ~10 bosses per page with prev/next navigation buttons. Follow the existing leaderboard button pattern.

```javascript
// Button customId scheme for pagination:
// er_bosses_<targetUserId>_<page>
// e.g., er_bosses_123456789_0, er_bosses_123456789_1

const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`er_bosses_${targetUser.id}_${page - 1}`)
    .setLabel('◀')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page === 0),
  new ButtonBuilder()
    .setCustomId(`er_bosses_${targetUser.id}_${page + 1}`)
    .setLabel('▶')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page >= totalPages - 1),
);
```

Button handler in `interactionCreate`:
```javascript
if (customId.startsWith('er_bosses_')) {
  const parts = customId.split('_');
  const targetUserId = parts[2];
  const page = parseInt(parts[3], 10);
  // Rebuild embed for that page, interaction.update()
}
```

### Pattern 4: Leaderboard Aggregation (Cross-Player)

**What:** Iterate all `data.eldenRing.players` to build rankings. For boss difficulty, iterate all players' bosses and sum deaths per boss name.

```javascript
function getEldenRingLeaderboard() {
  const data = readData();
  const players = data.eldenRing?.players || {};
  const entries = [];

  for (const [discordId, player] of Object.entries(players)) {
    let kills = 0, deaths = 0, totalTime = 0;
    for (const bossData of Object.values(player.bosses || {})) {
      for (const fight of (bossData.fights || [])) {
        if (fight.outcome === 'kill') kills++;
        if (fight.outcome === 'death') deaths++;
        totalTime += (fight.duration_seconds || 0);
      }
    }
    entries.push({ discordId, kills, deaths, totalTime });
  }

  return {
    byKills: [...entries].sort((a, b) => b.kills - a.kills),
    byDeaths: [...entries].sort((a, b) => b.deaths - a.deaths),
    byTime: [...entries].sort((a, b) => b.totalTime - a.totalTime),
  };
}

function getEldenRingBossDifficulty() {
  const data = readData();
  const players = data.eldenRing?.players || {};
  const bossDeaths = {};

  for (const player of Object.values(players)) {
    for (const [bossName, bossData] of Object.entries(player.bosses || {})) {
      const deaths = (bossData.fights || []).filter(f => f.outcome === 'death').length;
      bossDeaths[bossName] = (bossDeaths[bossName] || 0) + deaths;
    }
  }

  return Object.entries(bossDeaths)
    .map(([bossName, deaths]) => ({ bossName, deaths }))
    .sort((a, b) => b.deaths - a.deaths);
}
```

### Anti-Patterns to Avoid

- **Reading data multiple times:** Each `readData()` call reads from disk. For the leaderboard which iterates all players, call `readData()` once and pass the data object to helper functions.
- **Exposing `data.eldenRing.players` directly:** Keep the abstraction — return computed stats objects, not raw data references.
- **Hardcoding boss total (168):** The total boss count for the "X/168 defeated" display should be derived from the canonical boss list or a constant, not hardcoded inline.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time formatting | Custom duration formatter | Simple helper: `Math.floor(s/3600) + 'h ' + Math.floor((s%3600)/60) + 'm'` | Consistent across all three commands |
| Pagination state | Server-side page tracking | Encode page in button customId | Stateless, survives bot restarts |
| Ranking ties | Complex tie-breaking algorithm | Same rank for ties (dense ranking) | Simple, fair, expected behavior |

---

## Common Pitfalls

### Pitfall 1: No ER Data for Player
**What goes wrong:** Player runs `/er-stats` before ever playing — crash on null player data.
**How to avoid:** All handlers check `getEldenRingPlayer(discordId)` for null and return a friendly "no data" message.

### Pitfall 2: Embed Field Length Limits
**What goes wrong:** Discord embed fields have a 1024-character value limit. If a player has 50+ bosses, the boss list overflows.
**How to avoid:** Pagination (already planned for /er-bosses). For /er-stats "Recent Activity", limit to 3-5 entries. For /er-leaderboard, limit to top 10 per category.

### Pitfall 3: Empty Leaderboard
**What goes wrong:** No players have ER data yet — leaderboard crashes or shows empty embed.
**How to avoid:** Check if any players exist before building leaderboard. Show "No data yet" message if empty.

### Pitfall 4: Duration Overflow
**What goes wrong:** Very long sessions or accumulated fight time shows as huge numbers of seconds.
**How to avoid:** Format durations as `Xh Ym` consistently. Use a shared formatter function.

### Pitfall 5: Button customId Length
**What goes wrong:** Discord's 100-char limit on customId.
**How to avoid:** `er_bosses_<userId>_<page>` is well under 100 chars (Discord user IDs are 17-20 digits, page is 1-2 digits).

---

## Code Examples

### Stats Embed (Verified Pattern from handleMyStats)

```javascript
// Source: bot.js handleMyStats() lines 933-1020
const embed = new EmbedBuilder()
  .setColor(0xC8A200)  // gold for ER theme
  .setTitle(`⚔️ Stats Elden Ring — ${targetUser.displayName}`)
  .setThumbnail(targetUser.displayAvatarURL())
  .addFields(
    { name: '🏆 Boss vaincus', value: `${stats.bossesDefeated}/168`, inline: true },
    { name: '💀 Morts totales', value: String(stats.totalDeaths), inline: true },
    { name: '⚔️ Kills totaux', value: String(stats.totalKills), inline: true },
    { name: '⏱️ Temps de jeu', value: formatDuration(stats.totalSessionTime), inline: true },
    { name: '⚔️ Temps en combat', value: formatDuration(stats.totalFightTime), inline: true },
  );

// Recent Activity
if (recentFights.length > 0) {
  const recentText = recentFights.map(f =>
    `${f.outcome === 'kill' ? '✅' : '❌'} **${f.bossName}** — Tentative #${f.attempt_number}`
  ).join('\n');
  embed.addFields({ name: '📋 Activité récente', value: recentText });
}
```

### Slash Command Registration Pattern

```javascript
// Source: bot.js commands array, line 39-609
new SlashCommandBuilder()
  .setName('er-stats')
  .setDescription('Voir vos statistiques Elden Ring')
  .addUserOption(option =>
    option.setName('joueur')
      .setDescription('Voir les stats d\'un autre joueur')
      .setRequired(false)
  ),
```

---

## Open Questions

1. **Total boss count constant**
   - What we know: The Watcher has `watcher/data/boss_names.json` with the canonical boss list
   - What's unclear: Should the bot duplicate this number or derive it?
   - Recommendation: Use a constant `TOTAL_BOSSES = 168` in the stats handler. Simpler than loading the Watcher's file at runtime (different machine). If the list changes, update the constant.

---

## Sources

### Primary (HIGH confidence)

- `/home/hamza/delu-bot/src/storage.js` — all existing ER storage functions, data structure, readData/writeData pattern
- `/home/hamza/delu-bot/src/bot.js` — slash command registration pattern, handleMyStats/handleLeaderboard patterns, button interaction handler, er-setup command
- `.planning/phases/03-discord-notifications-and-betting/03-RESEARCH.md` — Phase 3 architecture, betting storage, event patterns
- `.planning/phases/04-stats-and-social/04-CONTEXT.md` — User decisions for all three commands

### Secondary (MEDIUM confidence)

- discord.js v14 EmbedBuilder field limits (1024 chars per field value, 25 fields max, 6000 chars total) — well-documented in discord.js docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries needed, all existing
- Architecture: HIGH — follows established patterns from bot.js (handleMyStats, handleLeaderboard)
- Pitfalls: HIGH — standard Discord embed/pagination concerns, well understood

**Research date:** 2026-02-27
**Valid until:** 2026-03-27

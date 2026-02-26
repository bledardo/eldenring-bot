# Feature Research

**Domain:** Game event detection + Discord notification + stats tracking bot (Elden Ring)
**Researched:** 2026-02-26
**Confidence:** MEDIUM — core feature categorization is well-grounded; specific user demand signals drawn from ecosystem analogues (existing Souls trackers, Discord gaming bots), not direct user surveys

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Boss encounter detection | Core product promise — zero manual input | HIGH | Screen capture + OCR/image matching on health bar. Existing tools (Death_Counter, Boss Checklist Overlay) prove feasibility via screen capture with OpenCV/MSS. Must handle loading screens, menus, false positives. |
| Discord notification on boss encounter | The primary social action — sharing the moment | LOW | Webhook or bot message to a configured channel. Embed format expected (rich media, colored, timestamped). |
| Discord notification on boss kill (victory) | Completing the loop — "they finally did it" | LOW | Requires detecting health bar reaching zero + victory screen / area transition. Depends on encounter detection. |
| Discord notification on player death (attempt) | Death is the drama in Souls games — users want to see attempts pile up | LOW | Depends on "YOU DIED" screen detection, already proven by jogeuncheol/Death_Counter and DSDeaths tools. |
| Attempt count per boss | Single most-requested Souls tracking metric (community confirmed via Steam discussions, Bandai Namco stats reveal) | LOW | Counter incremented per death during active encounter. Persisted to DB. |
| Session time tracking | How long did they fight? Core context for notifications ("45 minutes, attempt 12") | LOW | Timer from first encounter detection to kill/session end. Stored per session. |
| Persistent storage of encounter history | Users expect to look back at past runs, compare progress | MEDIUM | SQLite or Postgres. Schema: player, boss_name, attempts, time, outcome, timestamp. |
| Per-player tracking in shared server | Multiple friends on same Discord — must not mix up stats | MEDIUM | Players link their Discord user ID to their local bot instance. Server must disambiguate notifications by player. |
| Basic Discord commands for stats | Users expect !stats or /stats to query their own data without leaving Discord | LOW | Slash commands (required by Discord in 2025+). At minimum: /stats, /bosses, /leaderboard. |
| Bot setup command / onboarding | Users need a way to register their player and configure their channel | LOW | /setup or !setup command to link player identity to a Discord channel. Documented clearly. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Rich Discord embeds with boss image/art | Notifications feel like game announcements, not raw text — community engagement jumps | MEDIUM | Boss name → lookup table for boss art/thumbnail. Embed color could reflect difficulty tier. Could use static asset bundle. |
| Server-wide leaderboard (attempts, kills, time) | Turns solo tracking into social competition — "who took the most tries on Malenia?" | LOW | Simple aggregation query. /leaderboard command. Group by boss or by player. |
| Boss fight timeline (attempt graph) | Visual story of a struggle — shows improvement over time, first attempt spike vs later fast kills | MEDIUM | Charted on web dashboard. Per-boss attempt timeline over sessions. |
| Web dashboard with full history and graphs | Deep-dive stats beyond what Discord embeds can show — sortable, filterable, visualized | HIGH | React + chart library (Recharts or Tremor recommended). Public URL per player or server. Requires backend API. |
| Session summary notification | End-of-session recap: bosses encountered, total attempts, total time, kills — shareable context for friends | LOW | Triggered on game close detection. Aggregates session data into one Discord embed. |
| Boss difficulty comparison across server | "Radahn gave everyone the most trouble" — aggregate all players' attempt counts for each boss | MEDIUM | Requires multi-player data. Query avg/max attempts per boss across all tracked players in server. |
| Auto game launch detection (Steam) | Zero-friction start — bot activates when Elden Ring launches, no manual start needed | LOW | Windows process watch or Steam API. Already in project scope. |
| Historical run comparison | "Compare my current NG+ run vs my first playthrough" — lets players see growth | MEDIUM | Requires run/playthrough segmentation in the data model. Per-run stats grouping. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Live stream overlay (OBS integration) | Streamers want on-screen death count | Completely different product — requires OBS integration, latency sensitivity, visual design, separate use case from Discord notifications. Splits focus. Tools like HitCounterManager already own this space. | Defer to v2+ if streamers adopt the tool. Don't block MVP for it. |
| Memory reading / process injection for detection | More accurate boss detection, exact HP values | Violates EasyAntiCheat (EAC) — confirmed ban risk. Screen capture is the safe path, as documented in PROJECT.md. No exceptions. | Use screen capture + OCR exclusively. Boss health bar is visually identifiable at 1080p+. |
| Cross-game support (Dark Souls, Sekiro, etc.) | Natural extension request from Souls community | Massively increases scope — each game has different UI, boss names, health bar positions, death screens. Validation not done. Feature detection would need per-game profiles. | Elden Ring only for v1. Architecture can support per-game profiles later if validated. |
| Push notifications / mobile app | Users want phone alerts when their friend kills a boss | Discord already handles mobile notifications natively. Building a separate push system duplicates Discord's job. | Rely on Discord's mobile app notification system — zero additional work needed. |
| Twitch chat integration | Streamers want viewers to interact with death count | Different audience (streamers vs friend groups). Adds OAuth complexity, rate limiting concerns, and scope bloat. Not in core use case. | Out of scope. HitCounterManager serves this use case already. |
| Voice channel announcements (TTS on boss events) | "Wouldn't it be cool if the bot spoke in voice chat?" | Requires voice channel permissions, audio streaming, adds significant complexity. Most servers find TTS bots annoying. | Rich text embed notifications in a dedicated text channel are sufficient and preferred. |
| Automatic game spoiler protection | Hiding boss names for players who haven't reached them | Requires knowing player progression state — OCR can detect boss name on screen but tracking "player has seen this boss" is complex. High complexity, low value for friend groups (they expect spoilers). | Document as out of scope. Target audience is friends playing together who share progress. |
| Public leaderboard website (all servers) | "Make it a public site so all Elden Ring players can compare" | Completely changes product from a private friend-group tool to a public platform. Scale, moderation, spam, cheating, multi-server data governance all become concerns. | Server-scoped leaderboard only. Each Discord server sees only its own players' data. |

## Feature Dependencies

```
[Auto game launch detection]
    └──enables──> [Boss encounter detection]
                      └──enables──> [Discord notification on encounter]
                      └──enables──> [Discord notification on boss kill]
                      └──enables──> [Discord notification on death/attempt]
                                        └──enables──> [Attempt count per boss]
                                        └──enables──> [Session time tracking]
                                                           └──enables──> [Session summary notification]

[Persistent storage]
    └──required by──> [Attempt count per boss]
    └──required by──> [Session time tracking]
    └──required by──> [Boss encounter history]
    └──required by──> [Server-wide leaderboard]
    └──required by──> [Web dashboard]

[Per-player tracking / player registration]
    └──required by──> [Discord commands for stats]
    └──required by──> [Per-player notifications in shared server]
    └──required by──> [Leaderboard]
    └──required by──> [Web dashboard]

[Web dashboard]
    └──requires──> [Persistent storage]
    └──requires──> [Backend API]
    └──enhances──> [Boss fight timeline]
    └──enhances──> [Historical run comparison]

[Server-wide leaderboard] ──enhances──> [Boss difficulty comparison across server]

[Rich Discord embeds] ──enhances──> [Discord notification on encounter]
[Rich Discord embeds] ──enhances──> [Discord notification on boss kill]
```

### Dependency Notes

- **Boss encounter detection requires auto game launch detection:** The bot needs to know the game is running before it starts screen capture. Could be manual-start as fallback, but auto-detection is the core UX promise.
- **All stats features require persistent storage:** No storage = no history, no leaderboard, no dashboard. Storage must be implemented before any per-boss stat features.
- **Per-player tracking requires bot setup/registration:** Each user running the local client must be linked to a Discord user ID and server. Without this, multi-player notifications are ambiguous.
- **Web dashboard requires backend API:** The dashboard cannot read the database directly from a browser. A REST or GraphQL API layer is needed between DB and frontend.
- **Session summary conflicts with always-on detection:** If the bot misses the game close event, session summary never fires. Needs a fallback (e.g., timeout-based session end after 30 min of no events).

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Auto game launch detection (Steam / Windows process watch) — without this, users must remember to start the bot manually, breaking the "zero input" promise
- [ ] Boss encounter detection via screen capture (health bar appearance + OCR for name) — the entire product depends on this
- [ ] Discord notification on boss encounter — the primary output, must work reliably
- [ ] Discord notification on player death / attempt increment — the drama signal, highly engaging for friend groups
- [ ] Discord notification on boss kill — closes the loop, most celebratory moment
- [ ] Attempt count per boss (persisted) — single most-requested Souls tracking metric
- [ ] Session time tracking (persisted) — adds context to all notifications
- [ ] Persistent storage (SQLite for single-machine v1) — required foundation for all stats
- [ ] Per-player registration linking Discord user to local bot — required for multi-player support
- [ ] Basic slash commands: /stats, /bosses, /leaderboard — expected by any Discord community

### Add After Validation (v1.x)

Features to add once core is working and friends are actively using it.

- [ ] Rich Discord embeds with boss art — add once core detection and notifications are stable; significant UX upgrade
- [ ] Session summary notification — add once session detection is reliable; high engagement value
- [ ] Server-wide leaderboard and boss difficulty comparison — add once multiple players are tracked; depends on real multi-user data
- [ ] Boss fight timeline chart on web dashboard — add once data accumulates enough to be meaningful

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Full web dashboard (React + API) — high build cost; validate Discord-first experience before investing in web frontend
- [ ] Historical run comparison (NG+ vs first playthrough) — requires run segmentation in data model; redesign of storage schema
- [ ] Cross-game support (Dark Souls, Sekiro) — validate demand from actual users before expanding detection profiles
- [ ] Stream overlay / OBS integration — only relevant if streamers adopt the tool; different audience segment

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Boss encounter detection (screen capture + OCR) | HIGH | HIGH | P1 |
| Discord notification on encounter/kill/death | HIGH | LOW | P1 |
| Attempt count per boss (persisted) | HIGH | LOW | P1 |
| Session time tracking | HIGH | LOW | P1 |
| Persistent storage foundation | HIGH | MEDIUM | P1 |
| Per-player registration / multi-player support | HIGH | MEDIUM | P1 |
| Auto game launch detection | HIGH | LOW | P1 |
| Basic slash commands (/stats, /bosses) | MEDIUM | LOW | P1 |
| Rich Discord embeds with boss art | MEDIUM | MEDIUM | P2 |
| Session summary notification | MEDIUM | LOW | P2 |
| Server-wide leaderboard | MEDIUM | LOW | P2 |
| Boss difficulty comparison across server | MEDIUM | LOW | P2 |
| Boss fight timeline / graphs | MEDIUM | MEDIUM | P2 |
| Web dashboard (full) | HIGH | HIGH | P3 |
| Historical run comparison | MEDIUM | HIGH | P3 |
| Cross-game support | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | HitCounterManager (streaming tool) | BossTrackER (web tracker) | Tarnished Chronicle (save file app) | Our Approach |
|---------|-------------------------------------|---------------------------|--------------------------------------|--------------|
| Auto boss detection | No — manual counter | No — manual check | Yes — save file monitoring | Yes — screen capture + OCR |
| Death/attempt counting | Yes — OBS overlay | No | Yes — save file death count | Yes — screen capture death screen detection |
| Discord notifications | No | No | No | Yes — core feature |
| Multi-player / social | No | No | No | Yes — Discord server context |
| Stats history | No | Yes — per boss | Yes — deaths + playtime | Yes — full encounter history |
| Web dashboard | No | Yes — basic | No | v1.x target |
| Anti-cheat safe | Yes (external) | Yes (external) | Yes (save file read-only) | Yes (screen capture only) |
| Session summary | No | No | No | Yes — v1.x |
| Leaderboard | No | No | No | Yes — Discord command |

The gap this project fills: **automated detection + Discord social layer + multi-player context**. Every existing tool is either solo-only, requires manual input, or lacks Discord integration. No tool combines all three.

## Sources

- [HitCounterManager (GitHub)](https://github.com/topeterk/HitCounterManager) — Souls death counter for streaming, features list
- [Death_Counter by jogeuncheol (GitHub)](https://github.com/jogeuncheol/Death_Counter) — screen capture detection via OpenCV/MSS, proves feasibility
- [BossTrackER (GitHub)](https://github.com/LucaFraMacera/BossTrackER) — web-based Elden Ring boss tracker features
- [The Tarnished Chronicle (Nexus Mods)](https://www.nexusmods.com/eldenring/mods/8650) — save-file-based auto boss checklist
- [Boss Checklist Overlay (Nexus Mods)](https://www.nexusmods.com/eldenring/mods/3859) — overlay detection, DLC support, loading screen avoidance
- [Elden Ring Death Counter Steam discussion](https://steamcommunity.com/app/1245620/discussions/0/4526764654807944776/) — community demand signal for death tracking
- [Bandai Namco Elden Ring Stats Reveal](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-stats-reveal-the-games-most-attempted-bosses-most-popular-spells-and-more) — confirms "most attempted bosses" is a community-level interest
- [Discord Slash Commands FAQ](https://support-apps.discord.com/hc/en-us/articles/26501837786775-Slash-Commands-FAQ) — slash commands required as of 2025
- [discord.js Guide — Slash Commands](https://discordjs.guide/creating-your-bot/slash-commands.html) — implementation reference, scope requirements
- [FromSoftware Boss Death Counter web app](https://ds3-boss-death-counter.web.app/) — validates demand for per-boss death tracking as a standalone feature

---
*Feature research for: Elden Ring Boss Tracker (game event detection + Discord notifications + stats tracking)*
*Researched: 2026-02-26*

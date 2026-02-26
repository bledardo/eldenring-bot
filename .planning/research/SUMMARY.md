# Project Research Summary

**Project:** Elden Ring Boss Tracker
**Domain:** Windows game event detection bot + Discord notifications + stats web dashboard
**Researched:** 2026-02-26
**Confidence:** MEDIUM (stack is HIGH; features, architecture, and pitfalls are MEDIUM)

## Executive Summary

The Elden Ring Boss Tracker is a Windows desktop tool that monitors an active game session through screen capture, automatically detects boss encounters, deaths, and kills, and broadcasts them to a Discord channel — with persistent stats storage and an optional web dashboard. Experts in this space build it as three separated processes: a screen watcher (capture + detection + event classification), a Discord bot (interactive slash commands), and a web dashboard (read-only stats UI). All three communicate through a shared SQLite database — no sockets, no message brokers, just clean read/write boundaries. The watcher is the sole writer; bot and dashboard are read-only. This is the correct architecture for a 1–10 player friend-group tool.

The recommended implementation path is Python 3.11 throughout, using `mss` (not DXcam) for screen capture due to anti-cheat safety, OpenCV for boss health bar template matching, EasyOCR for boss name recognition, discord.py 2.6.4 for slash command support, FastAPI for the dashboard API, and SQLite with async SQLAlchemy 2.0 for storage. The frontend (v2+) is React + Vite + Recharts + TailwindCSS. The biggest technical decision point is the OCR pipeline: Elden Ring's stylized golden/white text on gradient backgrounds requires either aggressive preprocessing before Tesseract, or switching to EasyOCR (recommended) which handles non-standard fonts better out of the box.

The top risks are: (1) screen capture returning black on fullscreen exclusive mode — use mss and document "Borderless Windowed" as required, (2) detection events firing repeatedly without debounce — a state machine is non-negotiable and must be built before any notifications are wired up, and (3) OCR accuracy degrading for users with non-1080p or HDR displays — detection must be resolution-relative and structure-based rather than color-based from day one. None of these are impossible problems, but retrofitting them after the fact is expensive. All three must be addressed in Phase 1 and Phase 2 before any Discord or dashboard work begins.

---

## Key Findings

### Recommended Stack

The stack is a pure Python backend with a React frontend (deferred to v2+). All components — screen watcher, Discord bot, and web API — run as separate Python processes sharing one SQLite file. The key opinionated choices: `mss` over DXcam (EasyAntiCheat safety), EasyOCR over Tesseract (stylized game font handling), SQLAlchemy 2.0 async over raw aiosqlite (schema evolution support), FastAPI over Flask (asyncio-native, required to share event loop cleanly), and `uv` over pip for package management. See [STACK.md](.planning/research/STACK.md) for full version table.

**Core technologies:**
- Python 3.11: Runtime for all backend components — 3.11 is the performance/compatibility sweet spot
- discord.py 2.6.4: Discord bot — actively maintained, slash command native, asyncio-native
- mss 10.1.0: Screen capture — pure ctypes, safe for EasyAntiCheat environments, ~3ms capture
- OpenCV 4.13.0: Boss health bar detection — template matching as fast gate before OCR
- EasyOCR 1.7.2: Boss name OCR — CRNN architecture handles stylized fonts Tesseract cannot
- SQLAlchemy 2.0.47 + aiosqlite 0.22.1: Async ORM + SQLite driver — clean async API with Alembic migrations
- FastAPI 0.133.1: Dashboard REST API — asyncio-native, shares event loop with bot process
- psutil 7.2.2: Game process detection — detect `eldenring.exe` without memory access
- React 18 + Vite 6 + Recharts 3 + TailwindCSS 4: Web dashboard (v2+)

### Expected Features

The competitive gap this project fills is: **automated detection + Discord social layer + multi-player context**. Every existing tool (HitCounterManager, BossTrackER, Tarnished Chronicle) is either solo-only, requires manual input, or lacks Discord integration. See [FEATURES.md](.planning/research/FEATURES.md) for full analysis.

**Must have (table stakes):**
- Auto game launch detection — psutil process watch on `eldenring.exe`; without it users must manually start the bot, breaking the zero-input promise
- Boss encounter detection — screen capture + OpenCV template match + EasyOCR; the entire product depends on this
- Discord notifications for encounter, death, and boss kill — core social output; all three event types needed to close the loop
- Attempt count per boss, persisted — the most-requested Souls tracking metric
- Session time tracking — adds context to all notifications
- Per-player registration linking Discord user ID to local bot — required for multi-player disambiguation
- Slash commands: /stats, /bosses, /leaderboard — Discord requires slash commands as of 2025; prefix commands require privileged intent

**Should have (competitive):**
- Rich Discord embeds with boss art — turns notifications from raw text into "game announcements"; add once detection is stable
- Session summary notification — end-of-session recap; high engagement, low build cost
- Server-wide leaderboard and boss difficulty comparison — social competition layer; depends on real multi-player data

**Defer (v2+):**
- Full React web dashboard — validate Discord-first experience before investing in web frontend
- Historical run comparison (NG+ vs first playthrough) — requires run segmentation schema redesign
- Cross-game support (Dark Souls, Sekiro) — validate demand before expanding detection profiles
- OBS stream overlay — different audience (streamers), tools like HitCounterManager already own this space

### Architecture Approach

Three independent processes communicate exclusively through a shared SQLite database. The screen watcher is the sole writer; the Discord bot and web dashboard are read-only. Within the watcher, fast template matching gates slow OCR (100–200ms vs ~1ms), and a state machine converts continuous detection signals into discrete events before they hit the event queue. This prevents duplicate notifications and corrupt attempt counts. Cross-process communication flows through SQLite only — no sockets, no shared memory, no message brokers. See [ARCHITECTURE.md](.planning/research/ARCHITECTURE.md) for full patterns and data flow diagrams.

**Major components:**
1. Process Monitor — detects `eldenring.exe` launch/exit via psutil; gates the capture loop
2. Capture + Detector — mss ROI capture at 1–2 FPS, OpenCV template match (fast gate), EasyOCR for name (slow, gated)
3. Event Classifier — state machine: `IDLE → ENCOUNTER_ACTIVE → FIGHT_ENDED`; emits discrete events only on state transitions
4. DB Writer + Discord Notifier — sole writer to SQLite; sends Discord webhook/bot message on event
5. Discord Bot — read-only slash command handler; serves /stats, /bosses, /leaderboard
6. Web Dashboard (v2+) — FastAPI read-only API + React frontend; 5-second JS polling for "live" updates

### Critical Pitfalls

See [PITFALLS.md](.planning/research/PITFALLS.md) for the full list including recovery costs.

1. **BitBlt returns black on fullscreen exclusive** — use mss (Desktop Duplication API) exclusively; document Borderless Windowed as required game setting; validate against live game in Phase 1 before writing any detection logic
2. **Hard-coded 1080p coordinates break on all other resolutions** — calculate capture regions as screen-percentage at initialization; handle ultrawide black bars; never acceptable to defer (30-minute fix upfront vs full rewrite later)
3. **No debounce produces duplicate events and corrupted data** — state machine must be designed before detection is wired to any I/O; multi-phase bosses (Maliketh, Radagon/Elden Beast) make this mandatory, not optional
4. **OCR fails on raw game screenshots without preprocessing** — apply grayscale + adaptive threshold + crop pipeline before EasyOCR; after OCR, fuzzy-match result against canonical boss name list (rapidfuzz) and store canonical name only, not raw OCR output
5. **Discord bot token committed to git** — `.gitignore` and `.env` must exist before the first commit, before a token is ever generated; use python-dotenv; treat webhook URLs as secrets with equal severity

---

## Implications for Roadmap

Based on the dependency graph from FEATURES.md and the build order from ARCHITECTURE.md, this is the recommended 5-phase structure. All pitfall prevention maps cleanly onto this order.

### Phase 1: Foundation and Screen Capture

**Rationale:** Everything downstream depends on reliable screen capture and a working database schema. These have no dependencies themselves and the most expensive pitfalls (black screen, resolution, token security) must be caught here before any code builds on top of them.

**Delivers:** Verified screen capture of Elden Ring boss bar region at multiple resolutions; SQLite schema with Alembic migrations; project scaffolding with secrets management in place.

**Addresses:** Auto game launch detection (psutil), resolution-relative region capture, database schema (boss_events, sessions, players tables), `.gitignore` + `.env` secrets baseline.

**Avoids:** BitBlt black screen (validate mss Desktop Duplication on live game), hard-coded 1080p coordinates (resolution-percentage calculation from day one), token leak (gitignore before first commit).

**Research flag:** Standard patterns — no deeper research needed; mss and psutil are well-documented.

### Phase 2: Boss Detection and Event Classification

**Rationale:** This is the hardest technical problem in the project. Detection accuracy must be validated before building any notification delivery. If detection is unreliable, notifications are useless and attempt counts are corrupted.

**Delivers:** Two-stage detection pipeline (OpenCV template match gate + EasyOCR name recognition with preprocessing); state machine classifier with debounce; accurate attempt counting per boss.

**Uses:** OpenCV 4.13, EasyOCR 1.7.2, numpy 2.x, rapidfuzz for boss name fuzzy matching.

**Implements:** Capture loop, Detector, BossClassifier state machine, calibration script for region tuning.

**Avoids:** OCR garbage output (preprocessing pipeline + EasyOCR over Tesseract), duplicate notifications (state machine built before any I/O), HDR color detection failure (structural/shape detection, not color-based), non-boss deaths incrementing boss attempt counter.

**Research flag:** Needs validation — EasyOCR accuracy on Elden Ring's specific font/gradient has no formal benchmark; build a test screenshot library and validate before Phase 3 integration. Consider template matching as pure fallback if OCR accuracy is insufficient.

### Phase 3: Discord Notifications and Bot Commands

**Rationale:** First end-to-end user value. Detection is proven in Phase 2; now wire it to the social output. Discord bot slash commands are read-only queries against the DB — no new architecture risk.

**Delivers:** Discord webhook notifications on boss encounter, death, and kill; slash commands /stats, /bosses, /leaderboard; per-player registration flow; rich embeds.

**Uses:** discord.py 2.6.4, slash commands (Application Commands API, no MessageContent intent needed).

**Implements:** Discord Notifier (watcher side), Discord Bot process (command side), rich embed builders.

**Avoids:** Prefix commands requiring privileged MessageContent intent (slash commands from day one), single webhook rate limit saturation (per-guild webhook design), notification latency over 3 seconds (async sending).

**Research flag:** Standard patterns — discord.py 2.6.4 slash command patterns are well-documented.

### Phase 4: Multi-Player and Social Features

**Rationale:** Once a single player's tracking is solid, expand to friend-group use cases. Multi-player requires concurrent write safety and per-player disambiguation that are meaningless to validate with one player.

**Delivers:** Server-wide leaderboard, boss difficulty comparison across players, session summary notification, SQLite WAL mode for concurrent writes.

**Implements:** Multi-player data model validation, per-player notification disambiguation, leaderboard aggregation queries.

**Avoids:** SQLite write lock errors (WAL mode enabled at DB init — one line), webhook saturation with multiple simultaneous players (per-guild webhook architecture), player-to-boss notification mixup.

**Research flag:** Standard patterns for WAL mode and leaderboard queries. May need research on SQLite limits if player count exceeds 10+ simultaneous writers — at that point evaluate migration to PostgreSQL.

### Phase 5: Web Dashboard

**Rationale:** Deferred until Discord-first experience is validated with real users. High build cost (React + API); only justified once it's confirmed that friends are actively using Discord commands and want deeper stats.

**Delivers:** FastAPI REST API for stats data; React + Recharts dashboard with boss attempt timelines, session history, sortable/filterable stats.

**Uses:** FastAPI 0.133.1, React 18, Vite 6, Recharts 3, TailwindCSS 4, uvicorn 0.41.0.

**Implements:** Web Dashboard process (read-only), API routes for /players, /bosses, /stats, 5-second JS polling for live updates.

**Avoids:** Storing DB in web root (API-only access), no rate limiting on stat endpoints (add slowapi), no auth flow (either public per-player URLs or clear signup linked from bot commands).

**Research flag:** Needs research during planning — React dashboard patterns are standard, but the specific data visualization choices (which chart types, what stats to surface first) should be informed by actual usage data from Phases 1–4.

### Phase Ordering Rationale

- DB schema before all other code — all three processes depend on it; schema changes after data exists are painful
- Detection before notifications — unreliable detection makes all downstream features worse than useless; invest in accuracy first
- Single-player before multi-player — multi-player assumptions (concurrent writes, per-player disambiguation) can't be validated without a working single-player loop
- Discord before web dashboard — validates product value at lowest build cost; web dashboard is the highest-cost component
- The state machine must be designed in Phase 2, not bolted on in Phase 3 — corrupted attempt data cannot be recovered cleanly

### Research Flags

Phases needing deeper research during planning:
- **Phase 2:** EasyOCR accuracy validation on Elden Ring-specific boss name font/background. Build a test screenshot library from actual gameplay before committing to EasyOCR vs template-matching-only approach. This is the highest uncertainty in the project.
- **Phase 5:** Web dashboard UX decisions (which stats to surface, chart types) should be data-driven from real usage. Defer detailed planning until Phase 3–4 usage data is available.

Phases with standard patterns (skip research-phase):
- **Phase 1:** mss, psutil, SQLAlchemy 2.0 async + Alembic patterns are well-documented. No research needed.
- **Phase 3:** discord.py 2.6.4 slash commands and embed patterns are well-documented. No research needed.
- **Phase 4:** SQLite WAL mode and multi-player query patterns are well-documented. No research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified against PyPI as of Feb 2026. Version compatibility table provided. mss vs DXcam decision is well-reasoned. EasyOCR vs Tesseract accuracy advantage confirmed in principle but not benchmarked on Elden Ring specifically. |
| Features | MEDIUM | Feature categorization grounded in ecosystem analogue analysis (existing Souls trackers, Discord gaming bots) and community signals (Steam discussions, Bandai Namco stats reveal). Not from direct user surveys. The gap vs. existing tools is clear and well-documented. |
| Architecture | MEDIUM | Three-process separation via shared SQLite is the right pattern for 1–10 players and confirmed across multiple reference implementations. The specific choice of Jinja2 vs React for web was not fully resolved (STACK.md recommends React; ARCHITECTURE.md mentions Jinja2). Recommend React per STACK.md. |
| Pitfalls | MEDIUM | Core pitfalls confirmed across multiple sources. Elden Ring-specific OCR accuracy and HDR behavior partially inferred from general screen capture community knowledge, not Elden Ring-specific testing. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **EasyOCR vs template matching for boss name identification:** No formal accuracy benchmark exists for Elden Ring's specific font. Phase 2 must include a structured test against a screenshot library before committing to the approach. Build the template matching fallback regardless, since it is faster and more reliable for games with a fixed boss set.
- **Jinja2 vs React for web dashboard:** ARCHITECTURE.md proposes Jinja2; STACK.md recommends React. These are different tradeoffs (Jinja2 = simpler, no build step; React = richer interactivity). Given the web dashboard is deferred to Phase 5, resolve this during Phase 5 planning based on actual requirements at that time. Default recommendation: React per STACK.md for richer chart support.
- **HDR display behavior:** No first-hand testing data on mss capture output on Windows 11 HDR. The mitigation (structure-based detection, not color-based) is correct regardless. Document HDR as a known limitation until validated.
- **SQLite write scalability ceiling:** The architecture is correct for 1–5 players. If the tool gains traction beyond a single friend group, the write architecture needs reconsideration. The v2 migration path (SQLite → PostgreSQL, local writes → remote API POSTs) is documented in STACK.md and is a clean upgrade.

---

## Sources

### Primary (HIGH confidence)
- PyPI package pages — discord.py 2.6.4, mss 10.1.0, opencv-python 4.13.0.92, EasyOCR 1.7.2, FastAPI 0.133.1, SQLAlchemy 2.0.47, aiosqlite 0.22.1, psutil 7.2.2, Pillow 12.1.1, uvicorn 0.41.0 (all verified Feb 2026)
- SQLAlchemy async docs — https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- OpenCV template matching docs — https://docs.opencv.org/4.x/d4/dc6/tutorial_py_template_matching.html
- Discord rate limits — https://docs.discord.com/developers/topics/rate-limits
- Message Content privileged intent — https://github.com/discord/discord-api-docs/discussions/5412
- SQLite WAL mode docs — https://sqlite.org/lockingv3.html
- DXcam GitHub — https://github.com/ra1nty/DXcam
- GitGuardian Discord token remediation — https://www.gitguardian.com/remediation/discord-bot-token

### Secondary (MEDIUM confidence)
- Elden Ring death counter reference architecture — https://github.com/Jan-9C/deathcounter_ocr
- Death Counter (MSS + OpenCV, confirms approach viability) — https://github.com/jogeuncheol/Death_Counter
- BossTrackER (web-based Elden Ring tracker) — https://github.com/LucaFraMacera/BossTrackER
- HitCounterManager (streaming tool) — https://github.com/topeterk/HitCounterManager
- Bandai Namco Elden Ring stats reveal (community demand signal) — https://en.bandainamcoent.eu/elden-ring/news/elden-ring-stats-reveal-the-games-most-attempted-bosses-most-popular-spells-and-more
- Recharts 3.0 release confirmation — multiple web sources, mid-2025
- Screen capture and HDR — https://www.containsmoderateperil.com/blog/2025/11/17/screen-capture-software-and-hdr
- Elden Ring ultrawide UI coordinate data — https://www.nexusmods.com/eldenring/mods/3405

### Tertiary (LOW confidence)
- EasyOCR vs Tesseract accuracy advantage for Elden Ring boss names — inferred from general font complexity analysis; no Elden Ring-specific benchmark found; validate in Phase 2

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*

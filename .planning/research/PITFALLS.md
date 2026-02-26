# Pitfalls Research

**Domain:** Game screen capture / OCR detection + Discord bot (Elden Ring Boss Tracker)
**Researched:** 2026-02-26
**Confidence:** MEDIUM — core pitfalls confirmed across multiple sources; Elden Ring-specific items partially inferred from existing community projects and general screen capture patterns

---

## Critical Pitfalls

### Pitfall 1: BitBlt Screen Capture Fails on Fullscreen Exclusive Mode

**What goes wrong:**
The simplest Windows screen capture API (BitBlt/GDI) produces a black screen when Elden Ring runs in fullscreen exclusive mode. Developers using `pyautogui`, `PIL.ImageGrab`, or raw BitBlt will see a black image — the OCR pipeline receives nothing, boss detection never fires, and the bug is confusing because it works fine on the developer's windowed test setup.

**Why it happens:**
In fullscreen exclusive mode, the game takes direct GPU control of the framebuffer. BitBlt cannot read from a GPU-owned surface. This is a Windows display architecture constraint, not a game-specific restriction. It has been documented since DirectX 11 and remains true in 2026.

**How to avoid:**
Use the Windows Desktop Duplication API exclusively. In Python, use `dxcam` or `mss` (which wraps Desktop Duplication API on Windows). DXcam specifically documents support for "Direct3D exclusive full-screen application" capture. Require users to run Elden Ring in "Borderless Windowed" mode as an alternative fallback — this is also the safer default since many players already use it.

**Warning signs:**
- Screen captures return solid black images
- Detection never triggers during testing in fullscreen mode
- Works in windowed/borderless but breaks in fullscreen

**Phase to address:**
Phase 1 (Screen Capture Foundation) — must be the first thing validated with the actual game running.

---

### Pitfall 2: Hard-coded Screen Region Coordinates Break on Non-1080p Resolutions

**What goes wrong:**
The boss health bar appears at a fixed UI position (bottom-center of screen), but its pixel coordinates vary by resolution. If the detection region is hard-coded for 1920x1080, users on 1440p, 4K, or ultrawide (21:9, 32:9) displays will never get detections — the capture region misses the health bar entirely.

**Why it happens:**
Developers test on their own machine. It works. They ship pixel coordinates. Community projects like Death Counter explicitly state "optimized for 1920x1080 resolution" as a known limitation. Elden Ring's UI scales with resolution, so a health bar that appears at Y=881 in 1080p appears at a different absolute pixel position at 1440p even though it is still at the same relative position (~81% down the screen).

**How to avoid:**
Calculate capture regions as percentages of screen resolution, not absolute pixels. For the boss health bar, it occupies roughly the bottom 10-15% of the vertical screen and center horizontal. At initialization, detect the player's screen resolution and compute capture coordinates dynamically. Also handle ultrawide (21:9+) screens where Elden Ring adds black bars — the active game area is narrower than the desktop resolution.

**Warning signs:**
- Detection works for one developer but not others
- Users report zero detections
- Never tested at more than one resolution during development

**Phase to address:**
Phase 1 (Screen Capture Foundation) — resolution normalization must be built in from day one, not retrofitted.

---

### Pitfall 3: OCR on Game UI Text Without Preprocessing Produces Garbage Output

**What goes wrong:**
Raw Tesseract OCR on a game screenshot without preprocessing returns garbled or empty text for boss names. Game UI uses stylized fonts, color gradients, and semi-transparent backgrounds — none of which Tesseract was designed for. Accuracy on raw game screenshots is often below 50%, making boss name identification unreliable.

**Why it happens:**
Tesseract requires high-contrast black-on-white text with at least 20px character height. Elden Ring boss names appear in golden/white text on a dark gradient background, with decorative font styling. Developers assume OCR "just works" and don't build the image preprocessing pipeline.

**How to avoid:**
Before OCR, apply a preprocessing pipeline using OpenCV:
1. Crop to the exact health bar name region (not the full screen)
2. Convert to grayscale
3. Threshold to binary (adaptive thresholding handles gradient backgrounds)
4. Optionally upscale to at least 3x if text height is below 30px
5. Remove non-text UI artifacts

Alternatively, skip OCR entirely for MVP: use template matching against a pre-built library of boss health bar reference images. Elden Ring has 168 bosses (base + Shadow of the Erdtree DLC) — a template library is feasible and more reliable than OCR for this use case.

**Warning signs:**
- OCR returning empty strings or garbled characters during testing
- Boss names containing random special characters or partial words
- Accuracy varies wildly between screenshots of the same boss

**Phase to address:**
Phase 2 (Boss Detection) — OCR strategy and preprocessing pipeline must be defined before building detection logic.

---

### Pitfall 4: No Debounce on Boss Detection Causes Duplicate Notifications

**What goes wrong:**
The boss health bar flickers or reappears multiple times during a single encounter (e.g., multi-phase bosses, loading screen artifacts, brief UI state changes). Without debounce logic, the bot fires multiple Discord notifications for the "boss encounter started" event within seconds, spamming the Discord channel and incrementing the attempt counter incorrectly.

**Why it happens:**
Screen capture-based detection is stateless by default — it sees a boss bar, fires the event. It sees the bar again 0.5s later, fires again. Developers build detection first and treat deduplication as "polish" to add later, but it fundamentally corrupts the attempt tracking data.

**How to avoid:**
Implement a state machine for boss encounter tracking:
- States: `IDLE → ENCOUNTER_ACTIVE → FIGHT_ENDED`
- Only transition from `IDLE` to `ENCOUNTER_ACTIVE` once per boss (with a minimum duration gate, e.g., bar must be visible for 2+ consecutive seconds)
- Do not re-fire the encounter event until returning to `IDLE` state
- Use a cooldown after a fight ends (death or victory) before accepting new detections

**Warning signs:**
- Multiple "Boss encounter started" notifications within seconds
- Attempt counts that are 2-5x higher than actual attempts
- Discord channel flooded during testing

**Phase to address:**
Phase 2 (Boss Detection) — state machine must be designed alongside detection, not after.

---

### Pitfall 5: Discord Bot Token Committed to Git Repository

**What goes wrong:**
The Discord bot token is hardcoded in source code and accidentally committed to a public or private GitHub repository. Bots scrape public repositories for tokens and can compromise the bot within seconds. GitGuardian and similar tools monitor public repos continuously. Even private repos are risky if access controls are misconfigured.

**Why it happens:**
New developers don't know about environment variables. Or they know but commit `.env` by accident before adding it to `.gitignore`. The `.gitignore` is often added after the first commit, which already contains the token.

**How to avoid:**
- Create `.gitignore` before the first commit, including `.env` and any `config.json` with secrets
- Store the token in an environment variable (`DISCORD_BOT_TOKEN`)
- Use `python-dotenv` or equivalent to load from `.env` locally
- Add a pre-commit hook or `detect-secrets` to scan for credentials before commit

**Warning signs:**
- Bot stops responding and gets unusual activity (someone else is using it)
- Discord developer portal shows unexpected login locations
- GitHub security alerts about exposed secrets

**Phase to address:**
Phase 1 (Project Setup) — `.gitignore` and `.env` pattern must be established before any code is written.

---

### Pitfall 6: HDR Display Support Breaks Color-Based Detection

**What goes wrong:**
Players using Windows 11 HDR mode (increasingly common with modern monitors) see their captured screenshots appear washed out, overexposed, or with completely different color values. Detection logic based on "looking for a specific orange/white color range" in the boss health bar fails entirely on HDR displays.

**Why it happens:**
Windows Desktop Duplication API captures raw HDR content as 10-bit RGBA, but most Python image processing pipelines (OpenCV, Pillow) operate in 8-bit SDR color space. The conversion is not automatically handled. Screenshots taken from HDR displays show colors as washed out because only 25% of 10-bit color values fit in 8-bit representation.

**How to avoid:**
Do not rely on absolute color values for detection. Use relative detection:
- Template matching against reference images (scale-invariant)
- Detect the structural presence of the health bar UI element (shape/position) rather than color
- If color is used, work in normalized/relative color space, not absolute RGB values
- Document HDR as a known limitation in v1 and add explicit detection for HDR mode to warn users

**Warning signs:**
- Detection works on developer machine but not on tester's machine with HDR
- Screenshots from testers show washed-out or overexposed colors
- Color threshold values that "should" match don't

**Phase to address:**
Phase 2 (Boss Detection) — detection approach must be HDR-agnostic from design.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-code 1080p screen coordinates | Faster initial development | Breaks for any user not on 1080p, requires rewrite | Never — resolution scaling takes 30 minutes to do right |
| Use MSS instead of DXcam | Simpler API, cross-platform | ~8x slower capture rate; can impact game performance at high poll rates | Acceptable if poll rate is kept at 2-3 FPS (for this use case, yes) |
| SQLite without WAL mode for multi-player | Zero config | "database is locked" errors when 2+ players simultaneously write boss events | Never — WAL mode is one line of code (`PRAGMA journal_mode=WAL`) |
| Polling for game process detection | Easy to implement | Wastes CPU checking even when game not running | Acceptable if using 5+ second poll interval and backing off exponentially |
| No debounce on detection events | Faster to ship | Corrupts all attempt counting data; requires full data migration to fix | Never — debounce is ~10 lines |
| Store boss images as file paths in DB | Simple schema | Breaks on server restarts if paths change, platform issues | Never for v1 — use blob or URL to hosted image |
| Regex-based prefix commands (`!stats`) | Familiar pattern | Requires MessageContent privileged intent; fails at 100+ servers without Discord approval | Never for new bots — use slash commands from day one |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Discord Bot Token | Hardcoded in source or `.env` committed to git | `.gitignore` before first commit, environment variable only |
| Discord Rate Limits | Not handling 429 responses, hardcoding retry delays | Use `discord.py` / `discord.js` which handle rate limits automatically; do not override with custom retry logic |
| Discord Webhooks (per-channel notifications) | Reusing a single webhook for all players | Create per-player or per-guild webhook; single webhook at 30 req/min can get saturated with multiple active players |
| Discord MessageContent Intent | Using `!prefix` commands requiring message content | Use slash commands (Application Commands) — no privileged intent needed |
| Steam process detection | Polling `tasklist` every second | Use WMI process event subscriptions for instant detection without polling overhead |
| DXcam / Desktop Duplication | Assuming it works for all capture modes | Verify at initialization that capture returns non-null/non-black frame; surface error clearly to user |
| Elden Ring game window | Assuming window title is always "ELDEN RING" | Window title can change with game version updates; use process name (`eldenring.exe`) as the primary detection signal |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Capturing at 60+ FPS for detection | High CPU usage during gameplay, FPS drops in game | Cap detection poll rate to 2-5 FPS — boss bars appear slowly, no need for high frame rate | Immediately on mid-range hardware when capturing full 1080p+ at 60 FPS |
| Running OCR on full screenshots | Very slow (500ms+ per frame), misses rapid events | Crop to boss health bar region only (~5% of screen area) before any processing | Constant, from first frame |
| Synchronous screen capture in main thread | UI freezes, event loop blocking in Discord bot | Run screen capture in a separate thread/process; use async queue to pass events to bot | Immediately |
| Keeping all boss attempt rows in memory | Memory grows unbounded over long sessions | Query database on demand; don't cache full history in RAM | After ~100+ attempts per session |
| Full-table scans for player stats | Slow as data grows | Index on `player_id`, `boss_name`, `session_id` from the start | At ~10,000+ rows (easily hit by active players) |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Bot token in source code | Full bot compromise, server spam | Environment variables + `.gitignore` enforced before first commit |
| No input validation on Discord commands | SQL injection via `!stats <payload>` if using raw string queries | Use parameterized queries (SQLAlchemy / sqlite3 with `?` placeholders) |
| Webhook URLs committed to repo | Anyone can spam the Discord channel | Treat webhook URLs as secrets same as tokens |
| Exposing database file in web dashboard static directory | Any user can download the full database | Store DB outside web root; web dashboard accesses via API only |
| No rate limit on web dashboard API | Bot can be abused to spam database reads | Add basic rate limiting (e.g., `slowapi` for FastAPI) on stat endpoints |
| Running screen capture process with unnecessary privileges | Elevated attack surface | Run capture process as normal user; do not request admin privileges |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Bot detects boss but sends notification 30+ seconds late | Players think bot is broken; defeats purpose | Use async Discord sending; notification should arrive within 3 seconds of detection |
| No feedback when bot starts / stops tracking | Users don't know if bot is working | Send a "Now tracking [PlayerName] - Elden Ring detected" message on game launch |
| Discord channel flooded with attempt notifications | Users mute/leave channel | Send one "Boss encountered" notification; update same message on attempts, not new messages per attempt |
| Stats command returns wall of text | Unreadable on mobile Discord | Use Discord embeds with structured fields and inline formatting |
| No way to distinguish which player is fighting which boss | Confusing in multi-player servers | Every notification must clearly show `[PlayerName] encountered [BossName]` |
| Boss detected as "Unknown" because OCR failed | Useless notification | Fall back to "Unknown Boss" with a screenshot attachment so users can identify and report it |
| Web dashboard requires login but no signup flow | New users can't access their stats | Either make stats public per-player URL, or provide clear signup flow linked from bot commands |

---

## "Looks Done But Isn't" Checklist

- [ ] **Boss Detection:** Works on developer's 1080p SDR monitor — verify on 1440p, 4K, and ultrawide resolutions
- [ ] **Boss Detection:** Works on developer's windowed mode — verify on fullscreen exclusive (should fail gracefully with a clear error message)
- [ ] **HDR:** Tested on a machine with Windows HDR enabled — capture may return washed-out colors that break color-based detection
- [ ] **Multi-phase bosses:** Maliketh, Radagon/Elden Beast, Fire Giant all have phase transitions where the health bar briefly disappears — verify debounce prevents duplicate "encounter started" events
- [ ] **Death detection:** Player deaths that occur outside a boss fight (falling, poison, etc.) should not increment boss attempt counter — verify fight state machine excludes non-boss deaths
- [ ] **Victory detection:** Boss kill must be confirmed by boss health bar disappearing AND "GREAT ENEMY FELLED" / "REMEMBRANCE" screen — relying on health bar hitting zero alone may false-positive on large regular enemies
- [ ] **Multi-player:** Two players fighting different bosses simultaneously — verify notifications don't mix up player-to-boss associations
- [ ] **SQLite concurrency:** Two players submit data at the same moment — verify WAL mode is enabled and no "database is locked" errors
- [ ] **Discord token rotation:** Bot works after token is regenerated — verify token is loaded from environment at startup, not cached at build time
- [ ] **Discord slash commands registered:** Commands work in all servers (global registration can take up to 1 hour to propagate) — test guild-specific registration during development for instant updates
- [ ] **Game not running:** Bot handles the case where Elden Ring closes mid-fight (crash) without corrupting the attempt data

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| BitBlt capture used, black screens in prod | HIGH | Swap to DXcam/Desktop Duplication API; retest all detection logic; may require user reinstall |
| Hard-coded 1080p coordinates | MEDIUM | Add resolution detection and scaling factor; no data migration needed |
| No debounce, corrupted attempt counts | HIGH | Add debounce; write migration script to remove duplicate attempt records; no way to fully recover historical data |
| Token leaked to GitHub | LOW | Immediately regenerate token in Discord Developer Portal; rotate within 5 minutes; audit server for unauthorized actions |
| SQLite without WAL, locked errors in prod | LOW | Run `PRAGMA journal_mode=WAL` on existing database; no data loss, immediate fix |
| Prefix commands blocked by privileged intent requirement | HIGH | Rewrite all commands as slash commands; user re-registration required; UX disruption |
| OCR too inaccurate in prod | MEDIUM | Switch to template matching approach; requires building reference image library but no data schema changes |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| BitBlt black screen in fullscreen exclusive | Phase 1: Screen Capture Foundation | Test against live Elden Ring in fullscreen exclusive mode before writing any detection logic |
| Hard-coded 1080p coordinates | Phase 1: Screen Capture Foundation | Test screen region calculation at 1080p, 1440p, and 4K before any further development |
| OCR without preprocessing fails | Phase 2: Boss Detection | Validate OCR/template matching accuracy against test screenshot library before integrating with bot |
| No debounce on detection events | Phase 2: Boss Detection | Include state machine design in phase definition; do not ship detection without it |
| Token committed to git | Phase 1: Project Setup | `.gitignore` and `.env` must be committed before bot token is ever generated |
| HDR display breaks color detection | Phase 2: Boss Detection | Choose structural/shape detection over color-based detection; HDR test in detection validation |
| Discord prefix commands requiring privileged intent | Phase 3: Discord Bot | Use slash commands from day one; never build prefix commands |
| SQLite write locks with multiple players | Phase 4: Multi-player Support | Enable WAL mode in database initialization; load test with concurrent writes |
| Single webhook rate limit saturation | Phase 4: Multi-player Support | Design notification architecture for per-guild or per-player webhooks before multi-player |
| No game state machine / corrupted attempt data | Phase 2: Boss Detection | State machine must be the first thing designed in the detection phase; acceptance test is accurate attempt counts |

---

## Sources

- [Discord Rate Limits — Official Discord Documentation](https://docs.discord.com/developers/topics/rate-limits) — HIGH confidence
- [My Bot is Being Rate Limited — Discord Developer Support](https://support-dev.discord.com/hc/en-us/articles/6223003921559-My-Bot-is-Being-Rate-Limited) — HIGH confidence
- [Discord Bot Security Best Practices 2025](https://friendify.net/blog/discord-bot-security-best-practices-2025.html) — MEDIUM confidence
- [Discord Bot Permissions and Intents Explained 2025](https://friendify.net/blog/discord-bot-permissions-and-intents-explained-2025.html) — MEDIUM confidence
- [Message Content is Now a Privileged Intent — Discord API Docs Discussion](https://github.com/discord/discord-api-docs/discussions/5412) — HIGH confidence
- [DXcam — Python Desktop Duplication API Library](https://github.com/ra1nty/DXcam) — HIGH confidence (official GitHub)
- [Screen Capture with DXGI — GameDev.net](https://www.gamedev.net/forums/topic/642194-screen-capture-with-dxgi/5056204/) — MEDIUM confidence
- [SQLite Concurrent Writes and "database is locked" errors](https://tenthousandmeters.com/blog/sqlite-concurrent-writes-and-database-is-locked-errors/) — HIGH confidence
- [SQLite WAL mode official documentation](https://sqlite.org/lockingv3.html) — HIGH confidence
- [Death Counter for Elden Ring — community project (MSS + OpenCV)](https://github.com/jogeuncheol/Death_Counter) — MEDIUM confidence (demonstrates resolution limitation)
- [Screen Capture Software and HDR — Contains Moderate Peril (2025)](https://www.containsmoderateperil.com/blog/2025/11/17/screen-capture-software-and-hdr) — MEDIUM confidence
- [Advanced Discord Bot Development Strategies](https://arnauld-alex.com/building-a-production-ready-discord-bot-architecture-beyond-discordjs) — MEDIUM confidence
- [Remediating Discord Bot Token leaks — GitGuardian](https://www.gitguardian.com/remediation/discord-bot-token) — HIGH confidence
- [Tesseract OCR preprocessing requirements — MDPI research](https://www.mdpi.com/2073-8994/12/5/715) — HIGH confidence
- [Elden Ring ultrawide UI coordinate data — NexusMods community](https://www.nexusmods.com/eldenring/mods/3405) — MEDIUM confidence (confirms position is resolution-dependent)

---
*Pitfalls research for: Game screen capture / OCR + Discord Bot (Elden Ring Boss Tracker)*
*Researched: 2026-02-26*

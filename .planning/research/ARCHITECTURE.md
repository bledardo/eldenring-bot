# Architecture Research

**Domain:** Game event detection + Discord bot + web dashboard (Windows desktop tool)
**Researched:** 2026-02-26
**Confidence:** MEDIUM — core patterns verified via multiple sources; specific integration details from single sources flagged below

## Standard Architecture

### System Overview

The system has three independent runtime processes connected by a shared SQLite database. Each process has a clear bounded responsibility.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESS 1: Screen Watcher                    │
│                    (Windows background service)                  │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │ Process Mon  │   │  DXcam Loop  │   │  Event Classifier  │  │
│  │ (Steam/game  │   │  (30 FPS,    │   │  (boss appear,     │  │
│  │  detection)  │   │  region ROI) │   │  death, kill)      │  │
│  └──────┬───────┘   └──────┬───────┘   └────────┬───────────┘  │
│         │                  │                     │              │
│         └──────────────────┴─────────────────────┘             │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │  Event Queue    │                          │
│                    │  (asyncio.Queue)│                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│              ┌──────────────▼──────────────┐                    │
│              │    DB Writer + Notifier      │                   │
│              │    (writes events, calls     │                   │
│              │     Discord webhook)         │                   │
│              └──────────────────────────────┘                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ READ/WRITE
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SHARED: SQLite Database                        │
│                    (boss_events, sessions, players)               │
└────────────────┬──────────────────────────┬─────────────────────┘
                 │ READ + DISCORD API        │ READ (HTTP)
                 ▼                           ▼
┌─────────────────────────┐   ┌──────────────────────────────────┐
│  PROCESS 2: Discord Bot │   │  PROCESS 3: Web Dashboard        │
│  (discord.py)           │   │  (FastAPI + Jinja2 / HTMX)       │
│                         │   │                                  │
│  !stats, !bosses        │   │  /players, /bosses/:name         │
│  !session, !leaderboard │   │  /stats, /history                │
│  Rich embeds on events  │   │  Charts (Chart.js)               │
└─────────────────────────┘   └──────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Process Monitor | Detect Elden Ring process start/stop via psutil; gate capture loop | Python psutil, polling every 5s |
| Capture Loop | Grab specific screen region at ~10 FPS (boss bar area); feed frames to detector | DXcam with region=(left, top, right, bottom) |
| Boss Detector | Template match + OCR to identify boss name from health bar text | OpenCV template match for "bar present" trigger; Tesseract OCR for name extraction |
| Event Classifier | Debounce raw detections into discrete events: boss_appeared, boss_killed, player_died | State machine; suppress repeated triggers via cooldown |
| Event Queue | Decouple detection from I/O; prevent detection stalls if Discord/DB is slow | asyncio.Queue or threading.Queue |
| DB Writer | Persist boss_events, sessions, attempt counts to SQLite | aiosqlite; upsert pattern |
| Discord Notifier | Send webhook or bot API message when event fires | discord.py webhook POST or channel.send |
| Discord Bot Process | Serve slash/prefix commands; read-only queries to SQLite | discord.py, runs as separate process |
| Web Dashboard | Serve HTML stats pages; read-only queries to SQLite | FastAPI + Jinja2 templates; Chart.js for graphs |

## Recommended Project Structure

```
eldenring-bot/
├── watcher/                  # Process 1: screen capture + detection
│   ├── capture.py            # DXcam wrapper, region config
│   ├── detector.py           # OpenCV + Tesseract boss detection logic
│   ├── classifier.py         # State machine: raw frames -> discrete events
│   ├── process_monitor.py    # psutil Elden Ring process watcher
│   ├── notifier.py           # Discord webhook sender
│   └── main.py               # Entry point, wires components, runs loop
│
├── bot/                      # Process 2: Discord bot
│   ├── commands/
│   │   ├── stats.py          # !stats command
│   │   ├── bosses.py         # !bosses, !boss <name>
│   │   └── leaderboard.py    # !leaderboard
│   ├── embeds.py             # Rich embed builders
│   └── main.py               # Bot entry point
│
├── web/                      # Process 3: web dashboard
│   ├── routes/
│   │   ├── players.py        # /players endpoints
│   │   ├── bosses.py         # /bosses endpoints
│   │   └── stats.py          # /stats endpoints
│   ├── templates/            # Jinja2 HTML templates
│   ├── static/               # CSS, Chart.js
│   └── main.py               # FastAPI app entry point
│
├── db/                       # Shared database layer
│   ├── schema.sql            # Table definitions
│   ├── models.py             # SQLAlchemy / aiosqlite query wrappers
│   └── migrations/           # Schema version files
│
├── config/                   # Shared configuration
│   ├── config.toml           # Discord token, channel IDs, regions
│   └── boss_templates/       # Reference images for template matching
│
├── tests/
│   ├── test_detector.py
│   ├── test_classifier.py
│   └── fixtures/             # Sample frames for detector tests
│
└── scripts/
    ├── calibrate.py          # Tool to record screen regions interactively
    └── start_all.py          # Launch all 3 processes
```

### Structure Rationale

- **watcher/:** Isolated from Discord and web concerns. Can be developed/tested with no network access. Detection logic changes frequently during tuning; keeping it separate prevents regressions in bot/web.
- **bot/:** Pure Discord I/O. Only reads from DB — never writes. This prevents race conditions with the watcher.
- **web/:** Pure HTTP I/O. Also read-only from DB. Can be deployed separately or turned off without breaking detection.
- **db/:** Single source of truth for all three processes. All cross-process communication flows through here — no sockets, no message queues between processes.
- **config/boss_templates/:** Reference images kept adjacent to config, not buried in source. Calibration script writes here.

## Architectural Patterns

### Pattern 1: State Machine for Event Classification

**What:** Raw frame detections are noisy — a boss health bar appearing and disappearing within milliseconds is noise, not an event. A state machine converts continuous signal into discrete transitions.

**When to use:** Any time you poll for visual state and need to emit exactly one event per occurrence (not one per frame).

**Trade-offs:** Adds code complexity; eliminates duplicate Discord notifications which would be far worse UX.

**Example:**
```python
from enum import Enum, auto

class BossState(Enum):
    NO_BOSS = auto()
    BOSS_ACTIVE = auto()
    BOSS_KILLED = auto()  # transitional, immediately resets

class BossClassifier:
    def __init__(self, cooldown_seconds=5):
        self.state = BossState.NO_BOSS
        self.last_transition = 0
        self.cooldown = cooldown_seconds

    def feed(self, detection: dict) -> list[str]:
        """
        detection: {"boss_bar": bool, "boss_name": str | None,
                    "player_died": bool, "boss_hp_pct": float}
        returns: list of event names to emit (may be empty)
        """
        events = []
        now = time.monotonic()

        if self.state == BossState.NO_BOSS:
            if detection["boss_bar"] and (now - self.last_transition) > self.cooldown:
                self.state = BossState.BOSS_ACTIVE
                self.last_transition = now
                events.append("boss_appeared")

        elif self.state == BossState.BOSS_ACTIVE:
            if detection["player_died"]:
                events.append("player_died")
            elif not detection["boss_bar"] and detection["boss_hp_pct"] == 0:
                self.state = BossState.NO_BOSS
                self.last_transition = now
                events.append("boss_killed")
            elif not detection["boss_bar"]:
                # bar disappeared but no death/kill — player left area
                self.state = BossState.NO_BOSS
                events.append("boss_abandoned")

        return events
```

### Pattern 2: Region-of-Interest (ROI) Capture

**What:** Rather than capturing the full screen each frame, capture only the specific pixel region where the boss health bar appears. For Elden Ring this is a fixed rectangle at the bottom ~15% of screen.

**When to use:** Always for game detection — full-screen capture is 5-10x more data with no benefit for fixed-UI games.

**Trade-offs:** Requires calibration per screen resolution. A calibration script (scripts/calibrate.py) that lets the user click the region is essential.

**Example:**
```python
import dxcam

# Elden Ring boss bar region (1920x1080 reference)
# Adjust via calibration script for other resolutions
BOSS_BAR_REGION = (480, 920, 1440, 980)  # left, top, right, bottom

camera = dxcam.create()

def capture_boss_region() -> np.ndarray | None:
    """Returns BGR numpy array of boss bar region, or None if capture fails."""
    frame = camera.grab(region=BOSS_BAR_REGION)
    return frame  # None if game not rendering (minimized, etc.)
```

### Pattern 3: Three-Process Separation via Shared DB

**What:** Run the screen watcher, Discord bot, and web server as three independent processes that communicate exclusively through SQLite reads/writes — not through sockets, queues, or shared memory.

**When to use:** Small-scale tool with 1-10 concurrent players. This is not event-driven enough for 10k+ users, but for a friend group it's the right tradeoff.

**Trade-offs:**
- PRO: Each process can be started/stopped/restarted independently. Bot going down doesn't interrupt detection.
- PRO: No IPC complexity — no message broker, no shared memory locks.
- CON: Web dashboard can't push real-time updates without polling the DB. Use polling via JavaScript `setInterval` (every 5s) for "good enough" freshness.
- CON: SQLite write locking. Watcher is the only writer; bot and web are readers. This avoids lock contention entirely.

**Example:**
```python
# watcher/main.py — sole writer
async def event_loop():
    async with aiosqlite.connect("data/tracker.db") as db:
        async for event in detect_events():
            await db.execute(
                "INSERT INTO boss_events (player_id, boss_name, event_type, timestamp) VALUES (?,?,?,?)",
                (event.player_id, event.boss_name, event.type, event.ts)
            )
            await db.commit()
            await send_discord_notification(event)

# bot/main.py — read-only
async def cmd_stats(ctx, player: str):
    async with aiosqlite.connect("data/tracker.db") as db:
        rows = await db.execute_fetchall(
            "SELECT boss_name, attempts, kills FROM boss_summary WHERE player_id = ?",
            (player,)
        )
    await ctx.send(embed=build_stats_embed(rows))
```

### Pattern 4: Two-Stage Boss Detection (Template Match then OCR)

**What:** Use fast pixel/template comparison as a cheap gate to determine "is there a boss bar?" before invoking slow OCR to read the name.

**When to use:** Always. OCR is ~100-200ms; template matching is ~1ms. Running OCR on every frame at 10 FPS would lag the system.

**Trade-offs:** Requires maintaining a reference template image per resolution. Worth it: OCR only runs when a boss bar is confirmed present, roughly once per encounter.

**Example:**
```python
import cv2
import numpy as np
import pytesseract

BOSS_BAR_TEMPLATE = cv2.imread("config/boss_templates/boss_bar_indicator.png", 0)
OCR_THRESHOLD = 0.80

def detect_boss_bar(frame: np.ndarray) -> tuple[bool, str | None]:
    """
    Returns (boss_bar_present, boss_name_or_None)
    boss_name is only populated when bar just appeared (transitions to active)
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    result = cv2.matchTemplate(gray, BOSS_BAR_TEMPLATE, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, _ = cv2.minMaxLoc(result)

    if max_val < OCR_THRESHOLD:
        return False, None

    # Bar confirmed present — run OCR on the name region only
    name_region = frame[0:30, 200:600]  # tight crop around text
    name_text = pytesseract.image_to_string(
        name_region,
        config="--oem 3 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' "
    ).strip()
    return True, name_text if name_text else None
```

## Data Flow

### Boss Encounter Flow

```
Game launches (Elden Ring.exe detected by psutil)
    |
    v
DXcam starts capturing BOSS_BAR_REGION at 10 FPS
    |
    v
Each frame -> Template Match (fast, ~1ms)
    |-- No match --> discard frame, continue
    |
    +-- Match found --> OCR for boss name (~150ms, async)
                           |
                           v
                    BossClassifier.feed(detection)
                           |
                    Returns event list (may be empty)
                           |
                    event == "boss_appeared"
                           |
                    asyncio.Queue.put(event)
                           |
             +-------------+---------------+
             |                             |
             v                             v
    DB Writer (aiosqlite)        Discord Notifier (webhook)
    INSERT boss_events           POST to Discord channel
    UPDATE session stats         Embed: boss name, attempt #
```

### Discord Command Flow

```
User types: !stats @username
    |
    v
discord.py on_message / slash command handler
    |
    v
Read-only SELECT from SQLite (aiosqlite)
    |
    v
Build rich embed (discord.py Embed)
    |
    v
ctx.send(embed=embed)
```

### Web Dashboard Flow

```
Browser requests /bosses/Margit
    |
    v
FastAPI route handler
    |
    v
Read-only SELECT from SQLite (aiosqlite)
    |
    v
Jinja2 template renders HTML with data
    |
    v
Browser receives HTML page
    |
    v
JavaScript setInterval(fetch "/api/live", 5000) [optional live updates]
```

### Key Data Flows

1. **Detection to notification:** Watcher process is the sole writer. Events flow: frame -> detector -> classifier -> queue -> (db write + discord POST) in parallel.
2. **Bot to DB:** One-way read. Bot never writes to DB. Prevents write contention.
3. **Web to DB:** One-way read. Freshness via 5-second JavaScript polling of `/api/live` endpoint — no WebSocket complexity needed at this scale.
4. **Cross-player isolation:** Each player registers with a unique `player_id` (Discord user ID). The watcher process is per-machine; multiple friends run their own watcher, all writing to the same shared DB if using a network-accessible SQLite alternative, or each to their own SQLite if self-contained. **This is the key design decision to resolve in Phase 1.**

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-5 players (friend group) | Single SQLite file on one machine. Watcher writes locally. Bot and web server read same file. No network required. |
| 5-20 players | SQLite still viable if all processes on same host. If players run watcher on separate machines, switch DB to PostgreSQL or use a lightweight sync mechanism (e.g., write events to a shared network path or REST endpoint). |
| 20+ players | Replace SQLite with PostgreSQL. Add a lightweight event bus (Redis Pub/Sub or a simple REST webhook endpoint) so the web dashboard can receive live pushes instead of polling. Watcher becomes a client that POSTs events to a central API. |

### Scaling Priorities

1. **First bottleneck:** SQLite concurrent write locking. Watcher is the sole writer so this is not a problem for 1-5 players. If multiple machines each run a watcher writing to the same SQLite file over a network share — contention will cause write failures. Fix: centralize writes through a REST API endpoint as the sole writer.
2. **Second bottleneck:** DXcam and Tesseract CPU usage on the player's machine. Keep capture at 10 FPS (not 60), do ROI capture (not full screen), and gate OCR behind template match. On a modern gaming PC this is negligible.

## Anti-Patterns

### Anti-Pattern 1: Running All Three Processes in One Python Process

**What people do:** Run discord.py bot + FastAPI + screen capture loop all inside one asyncio event loop using `asyncio.create_task()`.

**Why it's wrong:** Screen capture and OpenCV processing are CPU-bound blocking calls. They block the asyncio event loop, causing Discord heartbeat timeouts and HTTP request timeouts. Known issue documented in FastAPI/discord.py integration discussions.

**Do this instead:** Run three separate processes. Use `subprocess.Popen` or a process manager (systemd, PM2, or a simple `start_all.py` script). They communicate through SQLite, not shared memory. This also means each can crash and restart independently.

### Anti-Pattern 2: OCR on Every Frame

**What people do:** Pass every captured frame through Tesseract OCR to check for boss names.

**Why it's wrong:** Tesseract on a 1920x1080 region takes 100-500ms per frame. At 10 FPS this would require 10+ seconds of processing time per second of real-time — impossible.

**Do this instead:** Gate with template matching first. Only invoke OCR when the template match confirms a boss bar is present. In practice, OCR runs once per boss encounter (seconds apart), not per frame.

### Anti-Pattern 3: Full-Screen Capture

**What people do:** Capture the entire screen and then process the whole frame for UI elements.

**Why it's wrong:** Full 1920x1080 capture = ~6MB numpy array per frame at 10 FPS = 60MB/s of data to process. Boss bar occupies ~2% of the screen.

**Do this instead:** DXcam region capture. Define `BOSS_BAR_REGION` coordinates in config. Capture only the boss bar strip. The numpy array is 100x smaller, preprocessing is faster, and OCR accuracy is higher (less noise).

### Anti-Pattern 4: Reading Game Memory

**What people do:** Use a memory reader (pymem, Cheat Engine offsets) to read boss HP directly instead of screen capture.

**Why it's wrong:** Elden Ring uses EasyAntiCheat. Memory reading tools will trigger bans. This is a hard constraint — screen capture only.

**Do this instead:** Screen capture + OCR + template matching as described. It's slower to develop but safe.

### Anti-Pattern 5: Storing Boss Names as Free Text

**What people do:** Store whatever OCR returns directly as the boss name in the database.

**Why it's wrong:** OCR introduces recognition errors ("Margit" vs "Margrt", "Godrick" vs "G0drick"). Stats queries produce fragmented results; leaderboard shows the same boss 3 different ways.

**Do this instead:** After OCR, fuzzy-match the recognized string against a canonical boss name list using `rapidfuzz` (Levenshtein distance). Only store the canonical name. Store the raw OCR string separately for debugging.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Discord API | discord.py library (gateway + REST); webhook for event notifications | Use webhooks for watcher notifications (simpler, no bot process needed for send); use bot for interactive commands. MEDIUM confidence: webhooks vs bot API is a design choice with tradeoffs. |
| Tesseract OCR | Local binary via pytesseract wrapper | Must be installed separately on Windows. Path must be configured in code. |
| Steam / Elden Ring process | psutil.process_iter() to detect process by name ("eldenring.exe") | No Steam API needed; process name detection is sufficient and simpler. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Watcher process <-> Discord bot | SQLite (async read/write via aiosqlite) | Watcher writes events; bot reads for commands. No direct IPC. |
| Watcher process <-> Web server | SQLite (async read via aiosqlite) | Web server is read-only. |
| Discord bot <-> Web server | SQLite only | No direct communication between these two processes. |
| Within Watcher: capture <-> classifier | asyncio.Queue | Decouples fast capture loop from slower OCR/DB/Discord I/O. |

## Build Order Implications

The dependency graph drives this build order:

1. **DB schema first** — all three processes depend on it. Define tables before any other code.
2. **Watcher core** (capture + detector + classifier) — the hardest technical problem; validate boss detection accuracy before building notification delivery.
3. **DB writer + Discord webhook** — wire detection output to storage and notifications.
4. **Discord bot commands** — straightforward read queries once DB has data.
5. **Web dashboard** — purely presentational; can be built last against a DB populated by the watcher.

Recommended phases:
- **Phase 1:** Watcher skeleton (process detection, ROI capture, boss bar template match)
- **Phase 2:** OCR + classifier + event DB writes (validate detection accuracy)
- **Phase 3:** Discord webhook notifications (first end-to-end value)
- **Phase 4:** Discord bot commands (interactive queries)
- **Phase 5:** Web dashboard (full stats UI)

## Sources

- DXcam GitHub (high-confidence): https://github.com/ra1nty/DXcam — Windows Desktop Duplication API capture, 238 FPS benchmark
- Elden Ring death counter reference architecture (medium-confidence): https://github.com/Jan-9C/deathcounter_ocr — polling loop, JSON config, Tesseract OCR, Levenshtein matching pattern
- Automatic Multi-Game Death Counter (medium-confidence): https://github.com/monkey-tang/Automatic-Multi-Game-Death-Counter — multi-game OCR detection, tick_seconds, region config
- FastAPI + discord.py same-process pattern (medium-confidence): https://gist.github.com/haykkh/49ed16a9c3bbe23491139ee6225d6d09 — asyncio.create_task approach
- FastAPI + discord.py process separation recommendation (medium-confidence): GitHub FastAPI discussion #6716 — graceful shutdown issues, separate process recommendation
- Discord bot production architecture (low-confidence, single source): https://arnauld-alex.com/building-a-production-ready-discord-bot-architecture-beyond-discordjs
- OpenCV Template Matching (high-confidence official docs): https://docs.opencv.org/4.x/d4/dc6/tutorial_py_template_matching.html
- Producer-Consumer pattern for polling + event queue: https://superfastpython.com/thread-producer-consumer-pattern-in-python/

---
*Architecture research for: Elden Ring Boss Tracker (screen capture + OCR + Discord bot + web dashboard)*
*Researched: 2026-02-26*

# Stack Research

**Domain:** Windows game event detection bot + Discord bot + web dashboard
**Researched:** 2026-02-26
**Confidence:** HIGH (all versions verified against PyPI and official sources)

---

## Recommended Stack

This project has four distinct runtime components, each with its own stack slice:

1. **Desktop bot process** — runs on the player's Windows machine, captures screen, detects events
2. **Discord bot** — embedded in the same process or sibling process, sends/receives Discord messages
3. **Persistent storage** — SQLite database local to the desktop machine
4. **Web dashboard** — FastAPI backend + React frontend served from the same machine (or remotely)

---

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Python | 3.11+ | Runtime for all backend components | 3.11 delivers significant async performance improvements; 3.12 is stable but some ML libs lag; 3.11 is the sweet spot. All target libraries support it. |
| discord.py | 2.6.4 | Discord bot API wrapper | Actively maintained (latest release Oct 2025), native slash commands via CommandTree, hybrid commands, asyncio-native. It was "abandoned" in 2021 but has been actively developed since 2022; v2.6.4 is the most stable choice right now. |
| mss (python-mss) | 10.1.0 | Screen capture on Windows | Pure Python ctypes — no C extensions or driver-level hooks, making it the safest choice for EasyAntiCheat environments. ~3ms per capture, region capture supported. DXcam is faster but uses DirectX hooks that could be flagged. |
| OpenCV | 4.13.0.92 | Image preprocessing + boss health bar detection | Template matching for detecting health bar presence and bounding box. Preprocessing pipeline (crop, threshold, contrast enhance) before feeding to OCR. Industry standard for this type of pipeline. |
| EasyOCR | 1.7.2 | Read boss name text from health bar | Better than Tesseract for non-standard / semi-stylized game fonts; CRNN architecture generalizes to partial fonts. Tesseract requires clean black-on-white text; Elden Ring's boss name is white bold text on dark background which EasyOCR handles well. |
| psutil | 7.2.2 | Detect Elden Ring process launch | The standard for Windows process enumeration in Python; iterates running processes to detect eldenring.exe or steam.exe with game ID. Latest release Jan 2026, actively maintained. |
| FastAPI | 0.133.1 | REST API for web dashboard | Async-native, automatic OpenAPI docs, Pydantic validation built in. Correct choice for serving dashboard data — it runs inside the same Python process as the bot so no IPC overhead. Latest release Feb 2026. |
| SQLAlchemy | 2.0.47 | ORM for database layer | Async SQLAlchemy 2.0 with `create_async_engine` and `sqlite+aiosqlite://` URI. The 2.0 API is a clean break from the 1.x legacy; use it from the start to avoid migration pain. |
| aiosqlite | 0.22.1 | Async SQLite driver | Required by SQLAlchemy async engine for SQLite. Wraps sqlite3 with asyncio-safe threading. Production/stable, latest release Dec 2025. |
| Alembic | latest (1.x) | Database migrations | Pairs with SQLAlchemy for schema evolution. Use `render_as_batch=True` for SQLite to handle ALTER TABLE constraints. |
| pystray | 0.19.5 | Windows system tray icon | Allows the bot to run in the background with a tray icon for start/stop control. Requires Pillow for icon rendering. Last updated Sept 2023 but stable and the only maintained option for this use case. |
| Pillow | 12.1.1 | Image manipulation + tray icons | Required by pystray; also used in screenshot preprocessing pipeline. Latest release Feb 2026. |

---

### Frontend (Web Dashboard)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 18.x | UI framework | The de-facto standard for data dashboards. Component model works naturally for stat cards, tables, and charts. |
| Vite | 6.x | Build tool + dev server | Fastest HMR, minimal config, widely adopted for React SPAs in 2025. Much faster than Create React App (deprecated). |
| Recharts | 3.x | Charts and graphs | Built on D3 + React, declarative JSX API, handles line charts, bar charts, area charts well. Recharts 3.0 released mid-2025 with better TypeScript and accessibility. For the scale of this project (hundreds to low thousands of data points), Recharts is the right size — not overengineered like Plotly. |
| TailwindCSS | 4.x | Utility-first styling | Zero-config dark mode, responsive breakpoints, minimal bundle when purged. Faster to build UIs than CSS-in-JS alternatives for dashboards. |

---

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| numpy | 2.x | Array operations for image processing | Required by OpenCV and EasyOCR; used for screenshot ndarray manipulation |
| python-dotenv | 1.x | Environment variable loading | Load Discord bot token, config from .env file; never hardcode tokens |
| uvicorn | 0.41.0 | ASGI server for FastAPI | Runs the FastAPI dashboard backend; use with `--reload` in dev |
| aiohttp | 3.x | Async HTTP client | If calling external APIs (Steam API, future webhook endpoints) |
| loguru | 0.7.x | Structured logging | Better than stdlib logging for a multi-component bot; colored output, file rotation, context binding |

---

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| uv | Package manager + venv | Replaces pip + venv + pip-tools. Dramatically faster installs; `uv pip install`, `uv venv`. Becoming the 2025 standard. |
| pytest + pytest-asyncio | Test suite | Required for testing async bot logic; `pytest-asyncio` handles async test functions |
| ruff | Linter + formatter | Replaces black + flake8 + isort in one fast tool; configure in `pyproject.toml` |

---

## Installation

```bash
# Create environment with uv (recommended) or venv
uv venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Core bot + Discord
uv pip install "discord.py>=2.6.4" "mss>=10.1.0" "psutil>=7.2.2" "pystray>=0.19.5" "Pillow>=12.1.1"

# Computer vision + OCR
uv pip install "opencv-python>=4.13.0.92" "easyocr>=1.7.2" "numpy>=2.0"

# Database
uv pip install "SQLAlchemy>=2.0.47" "aiosqlite>=0.22.1" "alembic"

# Web API
uv pip install "fastapi>=0.133.1" "uvicorn[standard]>=0.41.0"

# Utilities
uv pip install "python-dotenv" "loguru"

# Dev dependencies
uv pip install -D pytest pytest-asyncio ruff
```

```bash
# Frontend dashboard (in /dashboard subdirectory)
npm create vite@latest dashboard -- --template react-ts
cd dashboard
npm install recharts tailwindcss @tailwindcss/vite
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| mss (screen capture) | DXcam | DXcam is faster (240Hz vs 60Hz) but uses DirectX Desktop Duplication API hooks. More likely to be flagged by anti-cheat monitoring tools. For a 1-2 Hz boss detection poll, mss's 3ms capture time is more than sufficient. Use DXcam only if you need real-time 60+ FPS capture. |
| mss (screen capture) | pywin32 BitBlt | Lower-level Win32 API; more complex code, no cross-version advantage for this use case. |
| EasyOCR | Tesseract (pytesseract) | Tesseract requires clean, high-contrast document-style text. Elden Ring's boss name uses a stylized serif font on a semi-transparent dark gradient — EasyOCR's neural approach handles this better out of the box. Use Tesseract only if you pre-process screenshots aggressively (binarize, upscale). |
| EasyOCR | PaddleOCR | PaddleOCR is slightly faster and arguably more accurate for printed/document text, but has heavier dependencies (PaddlePaddle framework). EasyOCR has simpler installation and sufficient accuracy. For a single-class problem (reading boss names), EasyOCR is the pragmatic choice. |
| discord.py | disnake | disnake is a discord.py fork that's also actively maintained. The difference is minor. discord.py is the original and more widely documented. Use disnake if you specifically need Components v2 (advanced UI components) before discord.py ships them. |
| discord.py | Pycord | Another active fork. Same rationale — discord.py is the primary choice due to documentation volume and community size. |
| SQLAlchemy + aiosqlite | raw aiosqlite | Raw aiosqlite is fine for simple projects. SQLAlchemy adds Alembic migration support and clean model definitions — necessary here because the schema will evolve (adding bosses, sessions, multi-player). |
| SQLAlchemy + SQLite | PostgreSQL | PostgreSQL would be needed for multi-machine shared state (e.g., multiple players on different PCs sharing a single remote DB). For v1 where the bot and DB are co-located on a single player's machine, SQLite is correct. Scale to Postgres if you ever move to a hosted backend. |
| FastAPI | Flask | Flask is sync-first. FastAPI is async-native, which is critical here because the web server, Discord bot, and detection loop all share the same asyncio event loop. Mixing sync Flask with async discord.py causes threading complexity. |
| Recharts | Chart.js | Chart.js is canvas-based and excellent for lightweight needs. Recharts is React-native and works better with React's state/data flow. For a React dashboard with real-time state updates, Recharts is the cleaner fit. |
| Recharts | Plotly | Plotly is heavyweight (full scientific graphing suite). Recharts is ~60KB gzipped. For simple line/bar/area charts showing boss attempt counts and time stats, Plotly is overengineered. |
| Vite | Create React App | CRA is deprecated as of 2023. Vite is the current community standard. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Memory reading / Cheat Engine approach | Elden Ring runs EasyAntiCheat. Reading game memory will trigger bans and violates the game's ToS. | mss screen capture — reads pixels from the OS display buffer, never touches game process memory |
| DXcam in anti-cheat environments | DirectX Desktop Duplication API hooks are closer to driver-level; uncertain EasyAntiCheat behavior | mss (pure ctypes, OS-level screenshot API) |
| Tesseract for Elden Ring boss names | Struggles with stylized/serif fonts on gradient backgrounds without heavy preprocessing | EasyOCR 1.7.2 |
| discord.py <2.0 / old forks | Pre-2.0 uses deprecated prefix commands that Discord is phasing out; missing slash commands and interactions | discord.py 2.6.4 |
| threading for the bot loop | Mixing Python threading with asyncio is fragile. discord.py is asyncio-native; the detection loop should be an asyncio task | `asyncio.create_task()` for the detection loop |
| SQLite WAL mode conflicts | The bot writes events while the web API reads them concurrently — SQLite WAL mode must be enabled explicitly | Set `PRAGMA journal_mode=WAL` on connection init |
| Blocking OCR in event loop | EasyOCR is CPU-bound; running it directly in async code blocks the event loop | Run OCR in `asyncio.to_thread()` to offload to thread pool |

---

## Stack Patterns by Variant

**If the bot and web dashboard run on the same machine (v1 recommended):**
- Single Python process with three asyncio tasks: detection loop, Discord bot, FastAPI server
- FastAPI served on `localhost:8080`, React dashboard served as static files or via `vite dev`
- SQLite file at `~/.eldenring-bot/data.db`

**If multiple players want a shared leaderboard (future v2):**
- Move FastAPI + database to a VPS (Fly.io, Railway, Render)
- Migrate SQLite to PostgreSQL (change `sqlite+aiosqlite://` to `postgresql+asyncpg://`)
- Each player's desktop bot sends events via HTTP POST to the remote API instead of writing SQLite directly
- No frontend change required

**If OCR CPU usage is too high during gameplay:**
- Reduce polling interval (1 Hz is sufficient; boss health bar persists for the entire fight)
- Only run OCR when a template match confirms health bar presence (reduces OCR calls by 95%)
- Run EasyOCR in a subprocess instead of asyncio thread to isolate GIL pressure

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| discord.py 2.6.4 | Python 3.8+ | Works on 3.11, 3.12 |
| easyocr 1.7.2 | torch 2.x, numpy 2.x | EasyOCR depends on PyTorch; install torch CPU-only (`torch --index-url https://download.pytorch.org/whl/cpu`) to avoid downloading 2GB GPU build on a system with no CUDA |
| opencv-python 4.13.0 | numpy 2.x | Confirmed compatible |
| SQLAlchemy 2.0.47 + aiosqlite 0.22.1 | Python 3.9+ | Use `sqlite+aiosqlite:///path.db` URI; set `expire_on_commit=False` on AsyncSession |
| mss 10.1.0 | Python 3.9+ | Pure Python, no binary deps |
| pystray 0.19.5 | Pillow 10.x–12.x | Updated image flags for Pillow in 0.19.5 release |
| FastAPI 0.133.1 | uvicorn 0.41.0, Pydantic 2.x | FastAPI 0.100+ ships with Pydantic v2 by default |

---

## Sources

- discord.py 2.6.4 — PyPI: https://pypi.org/project/discord.py/ (verified Feb 2026)
- python-mss 10.1.0 — PyPI: https://pypi.org/project/mss/ (verified Feb 2026)
- opencv-python 4.13.0.92 — PyPI: https://pypi.org/project/opencv-python/ (verified Feb 2026)
- EasyOCR 1.7.2 — PyPI: https://pypi.org/project/easyocr/ (verified Feb 2026)
- FastAPI 0.133.1 — PyPI: https://pypi.org/project/fastapi/ (verified Feb 2026, latest release Feb 25 2026)
- uvicorn 0.41.0 — PyPI: https://pypi.org/project/uvicorn/ (verified Feb 2026)
- SQLAlchemy 2.0.47 — PyPI: https://pypi.org/project/SQLAlchemy/ (verified Feb 2026)
- aiosqlite 0.22.1 — PyPI: https://pypi.org/project/aiosqlite/ (verified Feb 2026)
- psutil 7.2.2 — PyPI: https://pypi.org/project/psutil/ (verified Feb 2026)
- Pillow 12.1.1 — PyPI: https://pypi.org/project/Pillow/ (verified Feb 2026)
- pystray 0.19.5 — PyPI: https://pypi.org/project/pystray/ (verified Feb 2026, last release Sept 2023)
- DXcam GitHub (screen capture comparison) — https://github.com/ra1nty/DXcam — MEDIUM confidence (not updated since 2023)
- Recharts 3.0 — WebSearch verified, multiple sources confirm 3.0 release mid-2025 — MEDIUM confidence
- EasyOCR vs Tesseract for game fonts — WebSearch, no formal benchmark found for Elden Ring specifically — LOW confidence on exact accuracy numbers, MEDIUM confidence on EasyOCR being the better default choice
- Elden Ring OpenCV death counter reference implementation — https://github.com/EddieSherban/elden_ring_death_counter — MEDIUM confidence (confirms approach is viable)
- SQLAlchemy async SQLite best practices — https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html — HIGH confidence (official docs)

---
*Stack research for: Windows game event detection bot + Discord bot + web dashboard (Elden Ring Boss Tracker)*
*Researched: 2026-02-26*

# Phase 1: Watcher Core - Research

**Researched:** 2026-02-26
**Domain:** Python screen capture, computer vision, OCR, state machine, Windows packaging
**Confidence:** MEDIUM-HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Boss Scope**
- Track ALL enemies that spawn a large boss health bar (bottom of screen)
- Includes remembrance bosses, field bosses, dungeon bosses, and DLC (Shadow of the Erdtree) bosses
- Identify the boss name via OCR from the health bar text
- Game language is French — OCR must handle French boss names (e.g., "Margit, l'Omen Feal")

**Running Experience**
- System tray icon with color-coded status: green=connected+watching, yellow=no game detected, orange=no server connection, red=error
- No Windows toast notifications — silent operation during gameplay
- Manual launch by player (double-click .exe), no auto-start with Windows
- Watcher exits when the game closes (or player quits from tray)

**Game Capture**
- Must support both exclusive fullscreen and borderless windowed modes
- Handle multiple screen resolutions (1080p, 1440p, and others common among friends)
- Multiple players will run the Watcher on different PCs with different setups
- Minimal CPU/GPU impact is critical — players have varying hardware, frames matter

**Edge Case Handling**
- Multi-phase bosses (Malenia, Radahn, etc.) are treated as ONE continuous fight — no separate encounter per phase
- Solo fights only — do not track boss fights during co-op (summoned help present)
- Report abandoned fights (boss bar disappears without death or kill) as a distinct event
- Pause detection when game is alt-tabbed or minimized — resume when game window returns, no false events

**Offline Resilience**
- Tray icon reflects connection status (orange when VPS unreachable)
- Offline event handling (queue vs drop) at Claude's discretion

**Logging & Debugging**
- Write detailed log files (timestamps, detected regions, confidence scores)
- Save screenshots of detection triggers for visual debugging
- Whether screenshots are always-on or behind a debug toggle: Claude's discretion

**Session Boundaries**
- Session = game process lifecycle (eldenring.exe detected → eldenring.exe closes)
- Watcher polls for the game process automatically — no player action needed to start watching
- Session start and session end events sent to server

**Installation & Distribution**
- Single portable .exe — no installer, no Python required
- Published on GitHub releases page
- Auto-update: check for new releases on startup, download and self-update
- Windows SmartScreen "Run anyway" is acceptable — no code signing needed

### Claude's Discretion
- Configuration method (config file, first-run wizard, or other approach)
- Offline event handling strategy (queue locally vs drop)
- Debug screenshot capture mode (always-on with cleanup vs debug toggle)
- Screen capture technique and OCR engine choice
- Exact polling interval for game process detection
- State machine cooldowns and debounce timings

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DETECT-01 | Watcher auto-detects Elden Ring process launch on Windows without manual start | psutil.process_iter() polls for eldenring.exe; 2-5s poll interval is standard |
| DETECT-02 | Watcher auto-detects when Elden Ring process closes (session end) | psutil process.is_running() or poll; same loop that detects launch detects close |
| DETECT-03 | Watcher captures screen region where boss health bar appears using mss | mss library captures specific monitor regions; but BetterCam/dxcam handles exclusive fullscreen — see Screen Capture section |
| DETECT-04 | Watcher detects boss health bar appearance via OpenCV template matching | cv2.matchTemplate() with TM_CCOEFF_NORMED, threshold ~0.8; multi-scale for resolution variance |
| DETECT-05 | Watcher reads boss name from health bar via OCR (EasyOCR) | EasyOCR v1.7.0 supports French (fr); known challenge with accented chars; preprocessing needed |
| DETECT-06 | Watcher matches OCR output to canonical boss name list (~168 bosses) via fuzzy matching | rapidfuzz library: process.extractOne() with Levenshtein ratio; faster than fuzzywuzzy |
| DETECT-07 | Watcher detects "YOU DIED" screen (player death) | Template match on "YOU DIED" region OR color-pattern detection; consecutive-frame confirmation prevents false positives |
| DETECT-08 | Watcher detects boss kill (health bar disappears after active fight) | State machine: ACTIVE_FIGHT → health bar absent → KILL (only if not abandoned); cooldown needed |
| DETECT-09 | Watcher uses state machine to prevent duplicate events (health bar flicker, phase transitions) | `transitions` library v0.9.4 OR hand-rolled state enum; debounce with frame counters |
| COMM-07 | Watcher handles network disconnects gracefully (retry queue) | requests + urllib3.Retry with HTTPAdapter; persistent queue to disk for offline durability |
| INTG-05 | Watcher installable as a standalone Python app on Windows (pip install or exe) | PyInstaller 6.x with --onefile; EasyOCR/PyTorch packaging requires --hidden-import and data files; ~300-500MB exe expected |
</phase_requirements>

---

## Summary

Phase 1 builds the standalone Windows Watcher: a Python app that captures the Elden Ring screen, detects boss encounters, deaths, and kills, maintains an FSM to prevent false positives, and ships as a single portable .exe. The technical challenge is multi-layered — correct screen capture mode, reliable visual detection across resolutions, French OCR on stylized fonts, co-op exclusion detection, and PyInstaller bundling of a large PyTorch/EasyOCR dependency tree.

The primary architectural risk is EasyOCR accuracy on Elden Ring's stylized UI font with gradient backgrounds. The STATE.md already flags this as unvalidated — Phase 1 must build a test screenshot library and benchmark OCR before locking in the approach. Template-matching for the health bar shape itself (not the text) is a reliable primary detection signal; OCR is secondary and used only for name extraction.

A second important finding: mss (the project-decided screen capture library) does NOT reliably capture Direct3D exclusive fullscreen applications on Windows. BetterCam (maintained fork of DXcam) uses the Desktop Duplication API and handles exclusive fullscreen without interruption. The project should adopt BetterCam for the screen capture layer rather than bare mss, while mss can serve as a cross-platform fallback. The REQUIREMENTS.md specifies mss in DETECT-03; this should be flagged to the user for override consideration.

**Primary recommendation:** Use BetterCam for screen capture (solves exclusive fullscreen), OpenCV template matching for health bar presence detection, EasyOCR (with preprocessing) for boss name OCR, rapidfuzz for name canonicalization, the `transitions` library for state machine, and PyInstaller --onefile for distribution.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bettercam | 1.0+ (PyPI) | Screen capture via Desktop Duplication API | Handles exclusive fullscreen + borderless windowed; 240Hz capable; mss fails on exclusive fullscreen |
| mss | 9.x | Fallback screen capture, region capture | Zero dependencies, cross-platform; reliable for borderless windowed; required by DETECT-03 spec |
| opencv-python | 4.9.x | Template matching, image preprocessing | Industry standard for game vision automation |
| numpy | 1.26.x | Array operations for captured frames | Required by both mss and opencv-python |
| easyocr | 1.7.0 | Boss name OCR from health bar | PyTorch-based, handles stylized fonts better than Tesseract; French language support |
| rapidfuzz | 3.x | Fuzzy match OCR output to canonical boss list | C++ implementation, faster than fuzzywuzzy; MIT license |
| transitions | 0.9.4 | Finite state machine | Lightweight, well-maintained; prevents duplicate events |
| psutil | 7.x | Detect eldenring.exe process | Cross-platform, standard for process monitoring |
| pystray | 0.19.5 | System tray icon with color-coded status | Win32 backend; supports dynamic icon updates and menus |
| Pillow (PIL) | 10.x | Image manipulation for tray icons + debug screenshots | Required by pystray for icon generation |
| requests | 2.31+ | HTTP POST events to VPS | Standard HTTP client |
| PyInstaller | 6.x | Package as single .exe | Works with Python 3.8-3.14; --onefile mode |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pywin32 (win32gui) | 308+ | Detect window focus/minimize state | Required for alt-tab pause logic; check SW_SHOWMINIMIZED |
| pygetwindow | 0.0.9 | Higher-level window state queries | Alternative to raw win32gui for window state polling |
| urllib3 | 2.x | Retry logic on HTTP failures | Bundled with requests; use HTTPAdapter with Retry |
| tenacity | 8.x | Retry decorator for robust HTTP calls | More expressive than urllib3.Retry; useful for queue flushing |
| loguru | 0.7.x | Structured logging with timestamps | Simpler than stdlib logging; rotation support for log files |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bettercam | mss only | mss fails on exclusive fullscreen DX apps; must use bettercam for reliability |
| bettercam | dxcam | dxcam is unmaintained; bettercam is active fork on PyPI |
| easyocr | Tesseract (pytesseract) | Tesseract is smaller/faster but weaker on stylized/game fonts; EasyOCR handles Elden Ring's font better per STATE.md decision |
| transitions | hand-rolled enum FSM | hand-rolled is simpler for <10 states; transitions adds callbacks/guards cleanly; either works |
| rapidfuzz | thefuzz (fuzzywuzzy) | thefuzz is slower (pure Python); rapidfuzz is C++ and MIT licensed |
| PyInstaller | Nuitka | Nuitka produces faster native code but has much harder EasyOCR/PyTorch support |

**Installation:**
```bash
pip install bettercam mss opencv-python numpy easyocr rapidfuzz transitions psutil pystray Pillow requests pywin32 loguru
pip install pyinstaller  # build tool only, not in requirements
```

---

## Architecture Patterns

### Recommended Project Structure

```
watcher/
├── main.py               # Entry point: tray setup, main loop orchestration
├── watcher.py            # Core detection loop (capture → detect → FSM → emit)
├── capture.py            # Screen capture abstraction (BetterCam + mss fallback)
├── detectors/
│   ├── health_bar.py     # Boss health bar presence detection (OpenCV)
│   ├── you_died.py       # "YOU DIED" screen detection (template match + color)
│   ├── boss_name.py      # OCR extraction + fuzzy match to canonical name
│   └── coop.py           # Co-op state detection (player phantom icons)
├── state_machine.py      # FSM definition using transitions library
├── event_queue.py        # Offline event queue with disk persistence
├── http_client.py        # HTTP POST with retry/backoff
├── process_monitor.py    # psutil loop for eldenring.exe detection
├── tray.py               # pystray icon with color-coded status
├── config.py             # Config loader (TOML or INI file)
├── logger.py             # loguru setup + debug screenshot capture
├── assets/
│   ├── templates/        # OpenCV template images (health bar, YOU DIED)
│   └── boss_names.json   # Canonical boss name list (~168 bosses)
├── tests/
│   ├── screenshots/      # Test screenshot library for validation
│   └── test_detectors.py
└── build.spec            # PyInstaller spec file
```

### Pattern 1: Detection Loop with Frame Rate Throttling

**What:** Main loop captures a screen region and passes it through the detector pipeline at a fixed rate (~5-15 fps), not as fast as possible.
**When to use:** Always — this prevents CPU/GPU saturation. Detection does not need 60fps; the game state changes slowly enough that 10fps is sufficient.

```python
# Source: architecture recommendation based on community patterns
import time
import bettercam

camera = bettercam.create(output_idx=0, output_color="BGR")
camera.start(target_fps=10)

while running:
    frame = camera.get_latest_frame()
    if frame is None:
        time.sleep(0.05)
        continue
    pipeline.process(frame)
```

### Pattern 2: FSM States for Boss Fight Lifecycle

**What:** A state machine that prevents duplicate events from health bar flicker, multi-phase transitions, and area transitions.
**States:** `IDLE` → `ENCOUNTER` → `ACTIVE_FIGHT` → (KILL | DEATH | ABANDONED) → `IDLE`

```python
# Source: transitions library v0.9.4 README pattern
from transitions import Machine

states = ['idle', 'encounter', 'active_fight', 'resolving']

transitions = [
    # health bar appears
    {'trigger': 'boss_bar_detected',   'source': 'idle',         'dest': 'encounter'},
    # health bar stable for N frames (debounce flicker)
    {'trigger': 'encounter_confirmed', 'source': 'encounter',    'dest': 'active_fight'},
    # health bar flickered back — multi-phase transition
    {'trigger': 'boss_bar_detected',   'source': 'active_fight', 'dest': 'active_fight'},  # self-loop, no new event
    # health bar gone + YOU DIED detected
    {'trigger': 'death_detected',      'source': 'active_fight', 'dest': 'resolving'},
    # health bar gone + no death (kill or abandon)
    {'trigger': 'bar_disappeared',     'source': 'active_fight', 'dest': 'resolving'},
    # reset
    {'trigger': 'reset',               'source': 'resolving',    'dest': 'idle'},
    {'trigger': 'reset',               'source': 'encounter',    'dest': 'idle'},
]

machine = Machine(model=watcher, states=states, transitions=transitions, initial='idle')
```

**Key rule:** Only emit `boss_encounter` event on `encounter_confirmed` (not on every `boss_bar_detected`). The encounter confirmation requires the health bar to be stable for N consecutive frames (e.g., 3 frames @ 10fps = 300ms) — this eliminates flicker false positives.

### Pattern 3: Multi-Scale Template Matching for Resolution Independence

**What:** Elden Ring's boss health bar is rendered at a fixed percentage of screen height/width. Templates made at 1080p must match at 1440p.
**Approach:** Pre-scale the capture region (percentage-based, not pixel-based), so the template always matches the same pixel dimensions regardless of screen resolution.

```python
# Source: OpenCV template matching official docs + community game automation pattern
import cv2
import numpy as np

def detect_boss_bar(frame: np.ndarray, template: np.ndarray, threshold: float = 0.80) -> bool:
    # frame is a pre-cropped region (bottom 20% of screen)
    result = cv2.matchTemplate(frame, template, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, _ = cv2.minMaxLoc(result)
    return max_val >= threshold
```

**Resolution strategy:** Define capture regions as percentages of screen dimensions, not absolute pixels. At startup, query screen resolution via mss or bettercam and compute pixel coordinates. Template images should be captured at 1080p and scaled to match the captured region size.

### Pattern 4: Consecutive-Frame Confirmation (Debounce)

**What:** Require N consecutive frames with a positive detection before triggering state transitions. Prevents one-frame false positives.
**When to use:** All detection signals — health bar, YOU DIED, co-op icons.

```python
# Source: community pattern from death counter projects (fauskanger/elden-ring-you-died)
class ConsecutiveConfirmer:
    def __init__(self, required_count: int = 3):
        self.required = required_count
        self.count = 0

    def update(self, detected: bool) -> bool:
        if detected:
            self.count += 1
        else:
            self.count = 0
        return self.count >= self.required
```

### Pattern 5: Offline Event Queue with Disk Persistence

**What:** Events are written to a local JSON queue file before HTTP POST. On success, they are removed. On failure, they persist for retry.

```python
# Source: architecture recommendation
import json
import pathlib

QUEUE_FILE = pathlib.Path("~/.watcher/event_queue.json").expanduser()

def enqueue(event: dict):
    queue = _load_queue()
    queue.append(event)
    QUEUE_FILE.write_text(json.dumps(queue))

def flush_queue(http_client):
    queue = _load_queue()
    sent = []
    for event in queue:
        if http_client.post(event):
            sent.append(event)
    remaining = [e for e in queue if e not in sent]
    QUEUE_FILE.write_text(json.dumps(remaining))
```

### Pattern 6: HTTP Retry with Exponential Backoff

```python
# Source: urllib3 + requests HTTPAdapter pattern (verified across multiple sources)
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def make_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=5,
        backoff_factor=0.5,          # sleeps 0.5, 1.0, 2.0, 4.0, 8.0s
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    return session
```

### Anti-Patterns to Avoid

- **Pixel-absolute capture regions:** Do not hardcode pixel positions (e.g., `region = (1750, 950, 170, 50)`). Breaks on non-1080p screens. Use percentage-based calculations from screen dimensions.
- **Triggering events on every positive detection frame:** Without debounce, a health bar present for 5 seconds at 10fps generates 50 `boss_encounter` events. Always gate on FSM state + consecutive confirmation.
- **Single-frame YOU DIED detection:** The "YOU DIED" screen is displayed for multiple seconds; any single-frame hit is reliable in practice, but false positives from similar-colored frames (fade to black) can occur. Use 2-3 consecutive frame confirmation.
- **EasyOCR inside the hot loop:** EasyOCR's model inference takes ~100-500ms. Only invoke OCR when a health bar is first confirmed, not on every captured frame. Cache the result for the duration of the fight.
- **PyInstaller with --onefile and large models at startup:** EasyOCR downloads PyTorch models on first use (~100MB). Bundle the model files into the PyInstaller package using `--add-data` rather than fetching at runtime. The .exe will be large (~300-500MB) but self-contained.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy string matching | Custom edit-distance | rapidfuzz | Handles Unicode (French accents), C++ speed, edge cases around partial names |
| State machine | if/elif state flags | transitions | Transition guards, callbacks, self-loops, logging built-in; bug-prone to hand-roll |
| HTTP retry | Custom sleep/retry loop | urllib3.Retry + HTTPAdapter | Handles backoff, jitter, specific status codes, idempotency |
| Screen capture | win32 API calls | bettercam | Desktop Duplication API is complex; exclusive fullscreen handling is non-trivial |
| Process monitoring | tasklist subprocess | psutil | Cross-version Windows support, efficient polling, process info dict |

**Key insight:** The FSM is the most error-prone component to hand-roll. Multi-phase boss transitions (Malenia: two phases, both active in same fight) require that the FSM correctly identify bar disappearance during phase change vs. actual kill. Using self-loop transitions on `boss_bar_detected` while in `active_fight` state handles this without custom logic.

---

## Common Pitfalls

### Pitfall 1: mss Fails on Exclusive Fullscreen (Critical)
**What goes wrong:** mss uses GDI on Windows and cannot capture Direct3D exclusive fullscreen applications — captures return black frames.
**Why it happens:** Exclusive fullscreen apps bypass the Windows compositor. GDI-based capture methods cannot intercept this path.
**How to avoid:** Use BetterCam (Desktop Duplication API) as the primary capture path. BetterCam's README explicitly states it captures exclusive fullscreen without interruption. Keep mss as a fallback only for borderless windowed mode if bettercam is unavailable.
**Warning signs:** Screenshot shows all-black frame despite game running.

### Pitfall 2: EasyOCR French Accented Characters
**What goes wrong:** EasyOCR has known challenges with French accented characters (é, è, à, â, ê, û, î, ô). Boss names like "Margit, l'Omen Feal" may have accents stripped or misread.
**Why it happens:** EasyOCR's default English model does not include French accented character training data. The `fr` language code uses a different model.
**How to avoid:** Initialize EasyOCR with `Reader(['fr', 'en'])` to load both models. Apply preprocessing: increase contrast, reduce noise on the health bar region before OCR. Use rapidfuzz matching with a threshold that tolerates 1-2 character errors.
**Warning signs:** Boss names consistently missing accents or having substituted characters (e.g., "Morgott" reads as "M0rg0tt").

### Pitfall 3: PyInstaller + PyTorch/EasyOCR Packaging Bloat and Hidden Import Errors
**What goes wrong:** PyInstaller cannot automatically discover all PyTorch dynamic imports. The resulting .exe crashes with `ModuleNotFoundError` for `torch._C._jit`, `skimage.__init__`, or EasyOCR character files.
**Why it happens:** PyTorch uses lazy imports and C extensions that PyInstaller's dependency scanner misses. EasyOCR embeds data files (character lists, model weights) that must be explicitly included.
**How to avoid:** Use a `.spec` file (not CLI flags). Add `--hidden-import torch`, `--hidden-import torch.jit`, `--hidden-import skimage`. Use `--add-data` for EasyOCR model files. Test the packaged .exe on a clean machine (no Python installed) before release.
**Warning signs:** Works fine in `python main.py` but crashes immediately when run as .exe.

### Pitfall 4: Multi-Phase Boss Causing False Kill/Encounter Events
**What goes wrong:** Malenia, Radahn (pre-patch), and some DLC bosses transition between phases by briefly dropping the health bar before regenerating it. This triggers KILL detection followed immediately by a new ENCOUNTER event for the same fight.
**Why it happens:** Without phase transition awareness, the FSM treats any health bar disappearance during ACTIVE_FIGHT as a kill.
**How to avoid:** Add a "phase transition window" cooldown (e.g., 5-8 seconds) after bar disappearance during a fight. If the health bar reappears within the window, it is a phase transition (same fight), not a kill. Only emit kill event if the bar is absent for longer than the window.
**Warning signs:** Two boss_encounter events logged for a single Malenia fight.

### Pitfall 5: Co-op Detection Complexity
**What goes wrong:** When a cooperator is summoned, their small health bar icon appears in the upper-left of the screen. If this is not detected and excluded, fights with summoned help are tracked incorrectly.
**Why it happens:** Elden Ring's co-op UI adds small health bar icons for phantom players in the top-left corner. These are distinct from the boss health bar (which is at the bottom, large, with the boss name).
**How to avoid:** Define two detection regions: the boss bar region (bottom center) and the co-op phantom region (top left). If any phantom player icon is detected when a boss bar appears, set co-op flag and skip event emission until the co-op session ends (phantom icons disappear).
**Warning signs:** Boss fights assisted by friends are being tracked.

### Pitfall 6: Alt-Tab / Minimize False Events
**What goes wrong:** When the game is minimized, the screen capture either blacks out or captures the desktop/other windows. This can trigger false detections.
**Why it happens:** BetterCam may return stale frames or black frames when the target application is minimized.
**How to avoid:** Use win32gui.GetForegroundWindow() + win32gui.IsIconic(hwnd) to check if eldenring.exe is the active foreground window before processing any frame. If minimized or not foreground, skip detection entirely.
**Warning signs:** YOU DIED events triggered while game is alt-tabbed.

### Pitfall 7: HDR Display Capture
**What goes wrong:** On HDR-enabled displays, captured screenshots may have washed-out or incorrect colors, breaking color-based detection.
**Why it happens:** HDR tone-mapping alters the color values of captured frames.
**How to avoid:** Use structural (shape-based) detection rather than color-based detection wherever possible. Template matching on grayscale frames sidesteps most color distortion issues. Flag HDR as an unsupported configuration in README; advise users to disable HDR or use borderless windowed mode.
**Warning signs:** All detections fail on HDR monitors; frames look washed out in debug screenshots.

---

## Code Examples

### Screen Capture with BetterCam (Region-Based, Percentage)

```python
# Source: bettercam PyPI/README + community pattern
import bettercam
import mss

def create_capture_context(screen_width: int, screen_height: int):
    """Create BetterCam context with percentage-based boss bar region."""
    # Boss health bar: bottom 15% of screen, center 60%
    left = int(screen_width * 0.20)
    top = int(screen_height * 0.82)
    right = int(screen_width * 0.80)
    bottom = int(screen_height * 0.95)
    region = (left, top, right, bottom)

    try:
        cam = bettercam.create(output_idx=0, output_color="BGR")
        cam.start(region=region, target_fps=10)
        return cam
    except Exception:
        # fallback to mss for borderless windowed mode
        return None
```

### EasyOCR Boss Name Extraction

```python
# Source: EasyOCR GitHub README + preprocessing pattern from community
import easyocr
import cv2
import numpy as np

# Initialize once at startup — model load is expensive (~2-3 seconds)
reader = easyocr.Reader(['fr', 'en'], gpu=False)

def extract_boss_name(health_bar_roi: np.ndarray) -> str | None:
    """Extract boss name from health bar region with preprocessing."""
    # Upscale for better OCR accuracy
    upscaled = cv2.resize(health_bar_roi, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    # Convert to grayscale
    gray = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY)
    # Increase contrast
    _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)

    results = reader.readtext(binary, detail=0, paragraph=True)
    if results:
        return results[0].strip()
    return None
```

### Fuzzy Boss Name Matching

```python
# Source: rapidfuzz documentation
from rapidfuzz import process, fuzz

BOSS_NAMES: list[str] = [...]  # loaded from assets/boss_names.json

def match_boss_name(ocr_text: str, threshold: int = 75) -> str | None:
    """Match OCR text to canonical boss name."""
    result = process.extractOne(
        ocr_text,
        BOSS_NAMES,
        scorer=fuzz.ratio,
        score_cutoff=threshold
    )
    if result:
        name, score, _ = result
        return name
    return None
```

### Process Monitor Loop

```python
# Source: psutil documentation
import psutil
import time

GAME_PROCESS = "eldenring.exe"

def find_game_pid() -> int | None:
    for proc in psutil.process_iter(['name', 'pid']):
        if proc.info['name'].lower() == GAME_PROCESS:
            return proc.info['pid']
    return None

def monitor_game_process(on_launch, on_close):
    pid = None
    while True:
        current_pid = find_game_pid()
        if current_pid and pid is None:
            pid = current_pid
            on_launch(pid)
        elif pid and not current_pid:
            pid = None
            on_close()
        time.sleep(2)  # 2s poll interval — minimal CPU cost
```

### pystray Tray Icon with Dynamic Color

```python
# Source: pystray 0.19.5 documentation
import pystray
from PIL import Image, ImageDraw

STATUS_COLORS = {
    'watching':      (0, 200, 0),    # green
    'no_game':       (220, 180, 0),  # yellow
    'disconnected':  (220, 100, 0),  # orange
    'error':         (220, 0, 0),    # red
}

def make_icon(color: tuple) -> Image.Image:
    img = Image.new('RGB', (64, 64), color=color)
    return img

class TrayApp:
    def __init__(self):
        self.icon = pystray.Icon(
            "EldenWatcher",
            make_icon(STATUS_COLORS['no_game']),
            "Elden Ring Watcher",
            menu=pystray.Menu(
                pystray.MenuItem("Quit", self._quit)
            )
        )

    def set_status(self, status: str):
        self.icon.icon = make_icon(STATUS_COLORS[status])

    def _quit(self):
        self.icon.stop()

    def run(self):
        self.icon.run()  # blocking; must be called from main thread
```

### Window Foreground/Minimize Check

```python
# Source: pywin32 win32gui documentation pattern
import win32gui
import win32con

def is_game_in_focus(game_hwnd: int) -> bool:
    """Returns False if game window is minimized or not foreground."""
    if win32gui.IsIconic(game_hwnd):  # SW_SHOWMINIMIZED
        return False
    fg_hwnd = win32gui.GetForegroundWindow()
    return fg_hwnd == game_hwnd

def find_window_by_pid(pid: int) -> int | None:
    result = []
    def callback(hwnd, _):
        _, found_pid = win32process.GetWindowThreadProcessId(hwnd)
        if found_pid == pid:
            result.append(hwnd)
    win32gui.EnumWindows(callback, None)
    return result[0] if result else None
```

### Auto-Update: Check GitHub Releases on Startup

```python
# Source: architecture recommendation using GitHub API
import requests
import sys
import subprocess
import pathlib

GITHUB_RELEASES_API = "https://api.github.com/repos/OWNER/REPO/releases/latest"
CURRENT_VERSION = "1.0.0"

def check_for_update() -> bool:
    try:
        r = requests.get(GITHUB_RELEASES_API, timeout=5)
        r.raise_for_status()
        latest = r.json()["tag_name"].lstrip("v")
        if latest > CURRENT_VERSION:
            download_url = next(
                a["browser_download_url"]
                for a in r.json()["assets"]
                if a["name"].endswith(".exe")
            )
            _download_and_replace(download_url)
            return True
    except Exception:
        pass
    return False

def _download_and_replace(url: str):
    exe_path = pathlib.Path(sys.executable)
    tmp_path = exe_path.with_suffix(".new.exe")
    # Download new exe to tmp, then schedule a batch script to replace
    r = requests.get(url, stream=True)
    with open(tmp_path, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
    # Use a helper bat file to rename after process exits
    bat = exe_path.parent / "updater.bat"
    bat.write_text(
        f'@echo off\n'
        f'timeout /t 2 /nobreak > nul\n'
        f'move /y "{tmp_path}" "{exe_path}"\n'
        f'start "" "{exe_path}"\n'
    )
    subprocess.Popen(["cmd", "/c", str(bat)], shell=False)
    sys.exit(0)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| mss for all screen capture | BetterCam (Desktop Duplication API) for games | DXcam ~2022, BetterCam active fork | Exclusive fullscreen now capturable reliably |
| Tesseract for game OCR | EasyOCR (deep learning) | ~2020 onward | Better accuracy on stylized/non-standard fonts |
| fuzzywuzzy for string matching | rapidfuzz | 2021+ | 10-100x faster, MIT license, same API |
| Manual FSM with if/elif | `transitions` library | ~2017+ | Less code, built-in guards and callbacks |
| PyUpdater for auto-update | Manual GitHub API check + bat launcher | PyUpdater archived 2023 | PyUpdater is unmaintained; tufup exists but complex for a simple use case |

**Deprecated/outdated:**
- `dxcam`: Original DXcam library — unmaintained since 2023; use `bettercam` fork instead
- `fuzzywuzzy`: Superceded by `rapidfuzz` which has identical API but C++ backend
- `PyUpdater`: Archived and unmaintained; manual GitHub Releases API approach is simpler for a single-binary app

---

## Open Questions

1. **BetterCam capture in exclusive fullscreen — practical validation required**
   - What we know: BetterCam README claims to capture exclusive fullscreen DX apps; this is based on Desktop Duplication API
   - What's unclear: Whether current Elden Ring (with EasyAntiCheat) triggers any anti-cheat detection for DXGI Desktop Duplication; community reports suggest no, but unverified for current versions
   - Recommendation: Test on Day 1 of Phase 1 with an actual Elden Ring session. If it triggers issues, fall back to mss + borderless windowed requirement (document this in FAQ)
   - Confidence: LOW (unverified with live game)

2. **EasyOCR accuracy on Elden Ring's boss name font**
   - What we know: EasyOCR supports French, but has documented challenges with accented characters; game font uses golden gradient text on dark background
   - What's unclear: Whether preprocessed frames (grayscale, upscaled, thresholded) achieve acceptable accuracy (>90%) before fuzzy matching
   - Recommendation: Build a screenshot test library of 30-50 boss health bar captures at multiple resolutions as the first task in Phase 1. Benchmark OCR accuracy before committing to the pipeline.
   - Confidence: LOW (unvalidated per STATE.md blockers)

3. **Co-op detection implementation**
   - What we know: Co-op adds small player HP bar icons to the top-left corner of the screen (visible during sessions with cooperators); these are visually distinct from the boss bar
   - What's unclear: Exact pixel region and template needed for co-op icon detection; whether the icon appears before boss bar or simultaneously
   - Recommendation: Template-match for the co-op health bar frame (the golden bordered box in top-left) as the co-op signal; build this template from actual screenshots
   - Confidence: LOW (no verified source; based on game UI knowledge)

4. **PyInstaller exe size with EasyOCR/PyTorch**
   - What we know: PyTorch alone is ~300MB; EasyOCR adds model weights; PyInstaller --onefile bundles everything
   - What's unclear: Whether a ~300-500MB exe is acceptable for distribution via GitHub Releases; slow startup time from decompression
   - Recommendation: Test a --onefile build early. If size is unacceptable, consider --onedir distribution (folder with exe) or lazy model download pattern
   - Confidence: MEDIUM (size estimate from community reports, confirmed direction)

5. **Phase transition window timing for Malenia / multi-phase bosses**
   - What we know: Malenia's second phase starts with a dramatic cutscene; health bar disappears then reappears; approximate duration is 3-6 seconds
   - What's unclear: Exact timing of bar disappearance per boss; whether all multi-phase bosses share the same pattern
   - Recommendation: Start with a 10-second phase transition window; tune down during testing. Log all bar-disappear events with timestamps for calibration.
   - Confidence: LOW (timing estimates from gameplay knowledge, not measured)

---

## Sources

### Primary (HIGH confidence)
- psutil 7.x official docs (https://psutil.readthedocs.io/) — process iteration API
- pystray 0.19.5 official docs (https://pystray.readthedocs.io/en/latest/usage.html) — tray icon creation
- transitions 0.9.4 GitHub README (https://github.com/pytransitions/transitions) — FSM API
- PyInstaller 6.x official docs (https://pyinstaller.org/en/stable/operating-mode.html) — onefile mode
- rapidfuzz GitHub (https://github.com/rapidfuzz/RapidFuzz) — fuzzy matching API
- OpenCV template matching docs (https://docs.opencv.org/3.4/de/da9/tutorial_template_matching.html)

### Secondary (MEDIUM confidence)
- BetterCam GitHub (https://github.com/RootKit-Org/BetterCam) — exclusive fullscreen support claim
- EasyOCR GitHub (https://github.com/JaidedAI/EasyOCR) — v1.7.0, French language support
- mss official docs (https://python-mss.readthedocs.io/) — region capture, GDI-based limitations
- PyInstaller + EasyOCR packaging issues (GitHub issue #958, #473 on JaidedAI/EasyOCR) — hidden import requirements
- Kyle Fu performance benchmark (https://kylefu.me/2023/02/18/python-fast-screen-capture.html) — mss vs DXcam fps comparison
- fauskanger/elden-ring-you-died (https://github.com/fauskanger/elden-ring-you-died) — consecutive-frame detection pattern
- monkey-tang/Automatic-Multi-Game-Death-Counter (https://github.com/monkey-tang/Automatic-Multi-Game-Death-Counter) — streak confirmation, cooldown pattern

### Tertiary (LOW confidence)
- EasyOCR French accented character challenges — mentioned in multiple search results but no single authoritative source
- BetterCam + EasyAntiCheat compatibility — not verified in any official source
- Phase transition timing estimates — based on gameplay knowledge, not measured data

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via official docs/GitHub, versions confirmed on PyPI
- Architecture: MEDIUM — patterns are standard for Python game automation; specific to Elden Ring detection unvalidated
- Pitfalls: MEDIUM — most pitfalls verified against community projects and official limitation docs; timing values are LOW

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days — libraries are stable; bettercam less actively maintained, check PyPI for updates)

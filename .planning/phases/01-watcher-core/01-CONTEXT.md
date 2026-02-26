# Phase 1: Watcher Core - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

A packaged Python app on the player's Windows PC that captures the Elden Ring screen and reliably detects boss encounters, deaths, and kills. The Watcher auto-detects when the game is running, identifies boss names via OCR, and sends events to a remote server. Covers detection, state machine, packaging, and distribution. Event pipeline and server-side handling are Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Boss Scope
- Track ALL enemies that spawn a large boss health bar (bottom of screen)
- Includes remembrance bosses, field bosses, dungeon bosses, and DLC (Shadow of the Erdtree) bosses
- Identify the boss name via OCR from the health bar text
- Game language is French — OCR must handle French boss names (e.g., "Margit, l'Omen Feal")

### Running Experience
- System tray icon with color-coded status: green=connected+watching, yellow=no game detected, orange=no server connection, red=error
- No Windows toast notifications — silent operation during gameplay
- Manual launch by player (double-click .exe), no auto-start with Windows
- Watcher exits when the game closes (or player quits from tray)

### Game Capture
- Must support both exclusive fullscreen and borderless windowed modes
- Handle multiple screen resolutions (1080p, 1440p, and others common among friends)
- Multiple players will run the Watcher on different PCs with different setups
- Minimal CPU/GPU impact is critical — players have varying hardware, frames matter

### Edge Case Handling
- Multi-phase bosses (Malenia, Radahn, etc.) are treated as ONE continuous fight — no separate encounter per phase
- Solo fights only — do not track boss fights during co-op (summoned help present)
- Report abandoned fights (boss bar disappears without death or kill) as a distinct event
- Pause detection when game is alt-tabbed or minimized — resume when game window returns, no false events

### Offline Resilience
- Tray icon reflects connection status (orange when VPS unreachable)
- Offline event handling (queue vs drop) at Claude's discretion

### Logging & Debugging
- Write detailed log files (timestamps, detected regions, confidence scores)
- Save screenshots of detection triggers for visual debugging
- Whether screenshots are always-on or behind a debug toggle: Claude's discretion

### Session Boundaries
- Session = game process lifecycle (eldenring.exe detected → eldenring.exe closes)
- Watcher polls for the game process automatically — no player action needed to start watching
- Session start and session end events sent to server

### Installation & Distribution
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

</decisions>

<specifics>
## Specific Ideas

- Boss detection targets the large health bar at the bottom of the screen — this is the universal indicator across all boss types
- "YOU DIED" screen detection for death events
- Boss kill = health bar disappears during active fight (not from leaving area)
- Co-op detection needed to filter out non-solo fights
- French language OCR is required — all players run the game in French

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-watcher-core*
*Context gathered: 2026-02-26*

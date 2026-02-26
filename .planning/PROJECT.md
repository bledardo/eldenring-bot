# Elden Ring Boss Tracker

## What This Is

A Windows desktop bot that runs in the background, auto-detects when Elden Ring is launched via Steam, and monitors gameplay to detect boss encounters through screen analysis (boss health bar). When a boss is detected, it sends real-time notifications to a dedicated Discord channel with boss name, attempt count, session time, and fight outcomes. Supports multiple players on the same Discord server, with both Discord commands and a web dashboard for browsing stats and history.

## Core Value

Automatically detect boss encounters in Elden Ring and notify Discord — zero manual input from the player.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Auto-detect Elden Ring process launch on Windows (via Steam)
- [ ] Screen capture and analysis to detect boss health bar appearance
- [ ] Identify boss name from the health bar UI element
- [ ] Send Discord notification to a dedicated channel when a boss is encountered
- [ ] Track number of attempts per boss (deaths = new attempt)
- [ ] Track time spent on each boss fight / session
- [ ] Detect fight outcome (victory or death)
- [ ] Send Discord notification on boss kill (victory)
- [ ] Support multiple players tracking on the same Discord server
- [ ] Discord bot commands for viewing stats (!stats, !bosses, etc.)
- [ ] Web dashboard with boss history, stats, and graphs
- [ ] Persistent storage of all boss encounter data

### Out of Scope

- Mobile app — web dashboard is accessible from mobile browsers
- Other games — Elden Ring only for v1
- Linux/Mac support — Windows only (where the game runs)
- Real-time stream/overlay — this is a notification + tracking tool, not a streaming overlay
- Automatic gameplay/assistance — purely observational, no game interaction

## Context

- Elden Ring on PC (Steam) — Windows environment
- Boss encounters are visually identifiable by a large health bar appearing at the bottom of the screen with the boss name
- The bot needs to run alongside the game without impacting performance
- Discord is the primary notification and social layer
- Multiple friends want to track and compare their boss progress together
- OCR or image recognition needed to read boss names from the health bar
- Steam API may help detect game launch state

## Constraints

- **Performance**: Must not noticeably impact game FPS — lightweight screen capture
- **Platform**: Windows only (Elden Ring PC via Steam)
- **Anti-cheat**: Must not interact with game memory or inject into process — screen capture only (EasyAntiCheat safe)
- **Discord**: Follows Discord bot rate limits and ToS

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Screen capture over memory reading | EasyAntiCheat safe, no ban risk | — Pending |
| Multi-player support from the start | Friends want to use it together | — Pending |
| Discord + Web dual dashboard | Discord for quick checks, web for deep stats | — Pending |

---
*Last updated: 2026-02-26 after initialization*

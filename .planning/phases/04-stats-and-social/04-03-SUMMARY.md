---
phase: 04-stats-and-social
plan: 03
subsystem: discord-commands
tags: [discord, slash-commands, leaderboard, rankings]

requires:
  - phase: 04
    plan: 01
    provides: "getEldenRingLeaderboard, getEldenRingBossDifficulty aggregation functions"
  - phase: 04
    plan: 02
    provides: "formatErDuration helper"
provides:
  - handleErLeaderboard: "Server-wide rankings embed with kills, deaths, time, and boss difficulty"
---

# Plan 04-03 Summary: /er-leaderboard Command

## What Was Built
Server-wide Elden Ring leaderboard slash command with 4 ranking sections in a single embed.

## Key Files

### Modified
- `~/delu-bot/src/bot.js` — Added handleErLeaderboard function and er-leaderboard switch case

## Technical Decisions
- Top 10 per category with medal emojis for top 3
- Caller's own rank shown below top 10 if not included
- Boss difficulty section uses death count across all players (per user decision: "raw body count")
- All sections in single embed (per user decision: "all categories shown in a single embed")
- formatRanking helper handles ties implicitly (dense ranking — same rank order)

## Self-Check: PASSED
- [x] /er-leaderboard command registered
- [x] handleErLeaderboard function implemented
- [x] 4 sections: kills, deaths, time, deadliest bosses
- [x] Caller rank shown at bottom
- [x] bot.js syntax check passed

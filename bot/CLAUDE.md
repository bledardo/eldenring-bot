# CLAUDE.md

Guidance for Claude Code working in this directory.

## What this is

`tarnished-bot` — Discord bot + HTTP API for the Elden Ring community. Pairs with the [Elden Ring Watcher](../watcher/) running on each player's PC.

## Commands

```bash
npm install
npm start              # node src/index.js
npm test               # vitest run
docker compose up -d --build
docker compose logs -f
```

Always run `node --check src/<file>.js` after editing a source file before claiming it works.

## Source files (`src/`)

- `index.js` — entry point, boots Discord client + Express API + (optional) Ollama
- `bot.js` — Discord client, slash commands, button/modal handlers
- `apiServer.js` — Express server: `/api/events` for the watcher + `/quests/:token/...` for the web UI
- `storage.js` — JSON persistence (`data/players.json`); wallets, bets, ER fights, settings, transactions
- `config.js` — env-var driven configuration
- `features.js` — feature flags (env > storage > defaults)
- `eldenRingTracker.js` — EventEmitter that the API server feeds and the notifier consumes
- `eldenRingNotifier.js` — Discord notifications + bet cycle resolution + **Runes reward on boss kill**
- `eldenRingAssets.js` — boss image mapping (~205 bosses)
- `erRoute.js` — boss DB (~207 bosses, regions, recommended levels)
- `erQuests.js` — NPC quest DB (~40 quests)
- `erItems.js` — legendary items / DLC collectibles
- `erConstants.js` — shared ER constants
- `dlcPredictions.js` — DLC boss attempt-prediction game
- `llm.js` — Ollama integration (mention replies)
- `llmBettor.js` — bot wallet management

## Runes

Currency is **Runes** (configurable via `CURRENCY_NAME` / `CURRENCY_SYMBOL`).

- **Earned**: only via boss kills. Each kill credits `BOSS_KILL_REWARD` (default 200) to the player's wallet — see `awardBossKillRunes` in `eldenRingNotifier.js`.
- **Spent**: betting (cycle bets on boss fights, spontaneous bets), giveaways.
- **Bets**: redistribution between players, not new Runes printed.

## Watcher integration

The watcher POSTs events to `/api/events` with a per-player Bearer token. Event types:
- `session_start`, `session_end`
- `boss_encounter` (opens a betting cycle)
- `player_death`, `boss_kill`
- `phase_transition`, `fight_abandoned`, `global_death`

Tokens are generated via `/er-setup` in Discord.

## Web UI

`public/quests/` is served at `/quests/:token` (auth via the URL token). Tabs: Quests, Route, Items, Stats, Leaderboard, Hall of Fame.

## Conventions

- Code and user-facing text are in French (Discord audience).
- Slash command names mostly in English/French mix as inherited (`/er-stats`, `/mystats`, `/leaderboard`).
- All persistence is the single JSON file at `DATA_PATH`. No external DB.

## Don't

- Don't reintroduce Riot API / LoL / TFT code paths — this codebase was extracted from a multi-game bot specifically to drop them.
- Don't import deleted modules (`riotApi`, `tracker`, `tftTracker`, `missions`, `lolComposite`, `tftComposite`, etc.).
- Don't rename the wallet schema fields without migrating `data/players.json` consumers — many functions read `wallets[id].balance/totalWon/totalLost` directly.

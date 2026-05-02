# Tarnished Bot

> Discord bot for the Elden Ring community: tracks boss fights via the [Elden Ring Watcher](../watcher/), awards **Runes** for every kill, runs a Discord betting/economy system, and exposes a quest-tracking web UI.

This project is the bot/HTTP-server half of the [eldenring-bot](https://github.com/) monorepo. The other half — the watcher — runs on the player's Windows machine, captures the screen, detects boss fights, and POSTs events to this bot.

## What it does

- **Boss tracking** — receives `boss_encounter` / `player_death` / `boss_kill` events from each player's watcher.
- **Runes economy** — every confirmed boss kill credits the player **+200 Runes** (configurable). Runes are the bot's virtual currency.
- **Betting cycles** — when a player encounters a boss, the bot opens a betting window in Discord (Victory in ≤ N attempts vs Defeat). Bets are settled when the cycle resolves.
- **Spontaneous bets** — `/pari` lets any user open a free-form bet on any topic, parimutuel odds.
- **Quest / route / items / leaderboard web UI** — `/quests/:token` serves a per-player dashboard backed by the bot's data.
- **Optional LLM** — Ollama-powered commentary on mentions (off by default).

## Architecture

```
┌──────────────────────────────────┐         ┌──────────────────────────────────┐
│  Player's PC (Windows)           │         │  This bot (Node.js, self-hosted) │
│  ┌───────────────────────────┐   │  HTTPS  │  ┌─────────────────────────────┐ │
│  │ Elden Ring Watcher        │ ──┼────────▶│  │ Express API (/api/events)   │ │
│  │ - screen capture          │   │         │  │ Discord.js bot              │ │
│  │ - boss/death detection    │   │         │  │ JSON storage (data/)        │ │
│  │ - sends authenticated     │   │         │  │ Quest web UI                │ │
│  │   events with API key     │   │         │  └─────────────────────────────┘ │
│  └───────────────────────────┘   │         │                                  │
└──────────────────────────────────┘         └──────────────────────────────────┘
```

Each player runs the watcher on their PC. The bot is shared by the community (one Discord server = one bot instance). Players link their watcher to the bot via `/er-setup`, which generates a per-player API key.

## Self-hosting

### Requirements
- Node.js 20+
- A Discord application + bot token ([create one](https://discord.com/developers/applications))
- Optional: Ollama for the LLM features

### Quick start (Docker)

```bash
cp .env.example .env
# Edit .env: set DISCORD_TOKEN, ADMIN_USER_ID, NOTIFICATION_CHANNEL_ID
docker compose up -d --build
docker compose logs -f
```

The bot exposes the Watcher API on `ER_API_PORT` (default `3000`). Forward / reverse-proxy this port to make it reachable from your players' PCs.

### Local dev

```bash
npm install
cp .env.example .env
# fill in DISCORD_TOKEN, ADMIN_USER_ID, NOTIFICATION_CHANNEL_ID
npm start
```

## Discord commands

### Players
- `/er-setup` — generate or reset your watcher API key (DM'd to you)
- `/er-stats` — your Elden Ring stats (kills, attempts, sessions)
- `/er-bosses` — bosses you've fought, with attempt counts
- `/er-route` — full boss route with completion status
- `/er-cycle` — details of the active betting cycle
- `/er-leaderboard` — server boss-kill leaderboard
- `/er-nemesis` — boss you've fought the most
- `/er-hall-of-fame` — community achievements
- `/quest` — open the web UI for quests / route / items / stats
- `/mystats` — your Runes wallet
- `/leaderboard` — server wealth leaderboard
- `/historique` — your transaction history
- `/help`, `/info` — help and rules
- `/pari`, `/pari-fermer`, `/pari-resoudre`, `/pari-liste` — spontaneous bets

### Admin
- `/setbetwindow`, `/setlinkedbetwindow`, `/setminbet`, `/setbetvisibility`
- `/setgoldenoffer`, `/setfirstbettor`
- `/resetwallet`, `/give`, `/ajuster`, `/purge-user`
- `/feature list|enable|disable`
- `/giveaway`, `/setchannel`
- `/llm-stats`, `/llm-config`
- `/er-add-kill`, `/er-remove-kill`, `/er-reset`, `/er-migrate-zones`

## Configuration

All configuration is environment variables — see `.env.example` for the full list with defaults.

The most important ones:
- `DISCORD_TOKEN` — your bot token
- `ADMIN_USER_ID` — your Discord user ID (gates admin commands)
- `NOTIFICATION_CHANNEL_ID` — channel where boss notifications post
- `BOSS_KILL_REWARD` — Runes credited per boss kill (default `200`)
- `STARTING_BALANCE` — Runes given to new wallets (default `5000`)
- `ER_API_PORT` — port for the watcher API (default `3000`)

## Web UI

When a player runs `/quest`, the bot generates a tokenized URL like `https://your-host/quests/<token>`. The page is served by the same Express server and exposes:
- Quest tab — NPC questline tracker
- Route tab — boss progression by region (~207 bosses)
- Items tab — collectible legendary items + DLC
- Stats tab — kills, deaths, session time, nemesis
- Leaderboard tab — server-wide rankings
- Hall of Fame tab — achievements

Set `ER_PUBLIC_HOST` to the public URL the watcher and players will use.

## Data

All persistence is a single JSON file at `DATA_PATH` (default `./data/players.json` locally, `/app/data/players.json` in Docker). No external database. Volume-mount `data/` to persist across container rebuilds.

## License

MIT.

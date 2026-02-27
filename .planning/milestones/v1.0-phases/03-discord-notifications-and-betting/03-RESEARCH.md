# Phase 3: Discord Notifications and Betting - Research

**Researched:** 2026-02-27
**Domain:** discord.js v14 embeds, button interactions, event-driven notification flow, delu-bot betting system integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Embed design & tone
- Hype/dramatic narrator energy — "A Great Enemy has appeared..." style, boss titles in full, epic language
- Event-based embed colors: gold/amber for boss encounter, red for player death, green for boss kill
- Death embeds include progressive taunts that escalate with attempt count (e.g., attempt 15 → "At this point the boss is farming YOU")
- Boss kill embeds should feel triumphant — match the dramatic tone of the encounter

#### Betting interaction
- Predefined bet tiers via buttons: 50 / 100 / 500 delu-coins — no typing, quick tap
- Betting closes on first death or kill event — you can only bet during the initial encounter window
- Encounter embed updates live as bets come in — shows bet count per side ("3 Victoire / 1 Défaite")
- If nobody bets, embed is edited to say "No bets placed" when the fight resolves
- Parier Victoire / Parier Défaite buttons on encounter embed (French labels, matching existing delu-bot)
- Odds based on player's historical defeat rate per boss, locked at bet time
- Golden Offer and first-bettor bonuses apply (reuse existing delu-bot system)

#### Session summary
- Full recap: every boss fought, attempts per boss, kills, deaths, total session duration
- No betting results in the session summary — keep it about the player's journey
- No individual callouts (MVP bettor, biggest loser, etc.)
- If the session had zero boss encounters, don't post a summary at all — silent skip

#### Boss artwork
- All ~168 bosses should have artwork — full coverage
- Large image display (full-width at bottom of embed) for dramatic effect
- If no artwork exists for a boss, skip the image entirely — embed still works without it
- No fallback/placeholder image

### Claude's Discretion
- Information density in encounter embeds (what fields to show beyond the required boss name, player, attempt #)
- Boss artwork sourcing approach (pre-bundled vs wiki fetch vs hybrid)
- Exact death taunt messages and escalation thresholds
- Loading/transition states for embed updates
- Exact spacing, typography, and embed field layout

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NOTIF-01 | Bot sends rich embed on boss encounter (boss name, attempt #, player name) | EmbedBuilder with gold/amber color, eldenRingEvents event bus already wired |
| NOTIF-02 | Bot sends rich embed on boss kill (victory, time spent, attempts) | Green embed posted as follow-up to encounter channel; fight data has attempt_number and duration_seconds |
| NOTIF-03 | Bot sends rich embed on player death (attempt count increment) | Red embed; storage.getEldenRingBossFights() gives full fight history for attempt count |
| NOTIF-04 | Embeds include boss artwork/thumbnail from asset library | EmbedBuilder.setImage() for full-width bottom image; URL-based from static hosting or wiki |
| NOTIF-05 | Bot sends session summary embed when game closes (bosses fought, total attempts, kills, session time) | Triggered by session_end event; storage.endEldenRingSession() provides session data |
| BET-01 | Bot displays Parier Victoire / Parier Défaite buttons on boss encounter notification | ActionRowBuilder with 3 amount buttons per side (50/100/500) or two main buttons with tier sub-selection |
| BET-02 | Betting uses delu-bot's existing odds calculation system (seed pool, minority bonus, margin) | storage.calculateOdds() is generic but coupled to activeBets structure; need ER-specific bet storage |
| BET-03 | Odds based on player's historical defeat rate for that specific boss | storage.getEldenRingBossFights() returns fight history; compute death_rate = deaths / total_fights |
| BET-04 | Odds are locked at time of bet placement | Follow existing placeBet() pattern: calculate odds before adding bet, store lockedOdds per bettor |
| BET-05 | Bets resolve automatically on player death (losers: bet victoire) or boss kill (losers: bet défaite) | Triggered by player_death/boss_kill events on eldenRingEvents bus |
| BET-06 | Winnings/losses applied to existing delu-bot wallet system (shared currency) | storage.getBalance(), wallets structure already exists; use addCoins/deductCoins patterns |
| BET-07 | Golden Offer and first bettor bonus apply to Elden Ring bets | Reuse existing logic from storage.closeBet(); needs ER-specific bet object with hasGoldenOffer, firstBettorId |
</phase_requirements>

---

## Summary

Phase 3 is a notification + betting layer that subscribes to the `eldenRingEvents` EventEmitter already wired in `eldenRingTracker.js`. All infrastructure from Phase 2 is in place: the event bus emits `boss_encounter`, `player_death`, `boss_kill`, `session_start`, and `session_end` with the right payloads. Phase 3 adds a new file (e.g., `eldenRingNotifier.js`) that listens to this bus, posts Discord embeds, and manages an ER-specific active bet state.

The existing delu-bot betting system (wallets, odds calculation, Golden Offer, first-bettor bonus) can be reused conceptually but NOT structurally — `storage.calculateOdds()` is tightly coupled to `activeBets[gameId]` which stores a `puuid` for LoL players. For Elden Ring, the "player identity" is a Discord ID (not a puuid), and odds are based on per-boss defeat rate (not overall win rate). The cleanest approach is to mirror the existing bet structures in `storage.js` under an `activeEldenRingBets` key, and to wire odds calculation through a new `calculateEldenRingOdds()` function that sources winrate from boss fight history.

For betting buttons, the user decided on predefined tiers (50/100/500) with no modal. This diverges from the existing LoL pattern (which uses a text modal for arbitrary amounts). This requires a new button customId scheme (e.g., `er_bet_victoire_50_<fightId>`) and a new button interaction handler in `bot.js`. The encounter embed updates live on each bet, so the message object must be stored in active bet state and fetched for editing.

**Primary recommendation:** Implement `eldenRingNotifier.js` as a new module registered in `eldenRingTracker.start()`. It subscribes to all five events, manages ER-specific bet state in storage, and handles message edits. Register new button handlers in `bot.js` under the existing `interactionCreate` handler block.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| discord.js | 14.25.1 (already installed) | EmbedBuilder, ActionRowBuilder, ButtonBuilder, channel.send, message.edit | Already in use throughout delu-bot |
| Node.js EventEmitter | built-in | Event bus from eldenRingTracker | Already wired — eldenRingEvents emits all five event types |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^1.6.0 (already installed) | Unit tests for notifier logic | All new storage functions and bet resolution |
| dotenv | already in use | Config via env vars | If new config keys are needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reusing storage.calculateOdds() directly | New calculateEldenRingOdds() | LoL odds use puuid + activeBets; ER uses discordId + boss defeat rate — function signatures differ |
| Predefined tier buttons (user decision) | Text modal (existing LoL pattern) | Locked: user wants quick tap buttons, no typing |
| In-memory bet state | storage.js JSON persistence | Persistence survives bot restarts; consistent with rest of system |

**Installation:** No new packages required. All dependencies already in `/home/hamza/delu-bot/node_modules/`.

---

## Architecture Patterns

### Recommended Project Structure

```
/home/hamza/delu-bot/src/
├── eldenRingTracker.js    # Phase 2 — event bus, API server wiring (EXISTS)
├── eldenRingNotifier.js   # Phase 3 — NEW: subscribes to events, posts embeds, manages ER bets
├── eldenRingAssets.js     # Phase 3 — NEW: boss name → artwork URL mapping (168 bosses)
├── bot.js                 # Modify: register er_bet_* button handlers
└── storage.js             # Modify: add activeEldenRingBets, calculateEldenRingOdds, placeEldenRingBet, closeEldenRingBet
```

### Pattern 1: Event Subscription in eldenRingNotifier.js

**What:** The notifier is a module with a `register(client)` function called from `eldenRingTracker.start()`. It attaches listeners to `eldenRingEvents`.

**When to use:** Any time a new event type needs a Discord response.

```javascript
// Source: eldenRingTracker.js pattern (existing)
const { eldenRingEvents } = require('./eldenRingTracker');

function register(client) {
  eldenRingEvents.on('boss_encounter', (data) => handleEncounter(client, data));
  eldenRingEvents.on('player_death',   (data) => handleDeath(client, data));
  eldenRingEvents.on('boss_kill',      (data) => handleKill(client, data));
  eldenRingEvents.on('session_end',    (data) => handleSessionEnd(client, data));
}

module.exports = { register };
```

Call from `eldenRingTracker.start()`:
```javascript
// In eldenRingTracker.js start():
const notifier = require('./eldenRingNotifier');
notifier.register(client);
```

### Pattern 2: Boss Encounter Embed with Tier Buttons

**What:** Send a gold/amber embed to the notification channel. Attach six buttons in two rows: [50 Victoire | 100 Victoire | 500 Victoire] / [50 Défaite | 100 Défaite | 500 Défaite]. Store the message ID in active bet state for later editing.

```javascript
// Source: tracker.js lines 244-266 (existing LoL pattern)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const fightId = `er_${discordUserId}_${bossName}_${Date.now()}`;
const embed = new EmbedBuilder()
  .setColor(0xFFA500)  // amber for encounter
  .setTitle('⚔️ Un Grand Ennemi est apparu...')
  .setDescription(`**${bossName}** fait face à <@${discordUserId}>`)
  .addFields(
    { name: 'Tentative', value: String(attemptNumber), inline: true },
    { name: 'Paris', value: '0 Victoire / 0 Défaite', inline: true },
  );

const bossImage = getEldenRingBossImage(bossName);
if (bossImage) embed.setImage(bossImage);

const rowVictoire = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(`er_bet_victoire_50_${fightId}`).setLabel('50 PC').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId(`er_bet_victoire_100_${fightId}`).setLabel('100 PC').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId(`er_bet_victoire_500_${fightId}`).setLabel('500 PC').setStyle(ButtonStyle.Success),
);
const rowDefaite = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(`er_bet_defaite_50_${fightId}`).setLabel('50 PC').setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId(`er_bet_defaite_100_${fightId}`).setLabel('100 PC').setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId(`er_bet_defaite_500_${fightId}`).setLabel('500 PC').setStyle(ButtonStyle.Danger),
);

const msg = await channel.send({ embeds: [embed], components: [rowVictoire, rowDefaite] });
storage.createEldenRingBet(fightId, discordUserId, bossName, msg.id);
```

### Pattern 3: Live Embed Update on Bet Placed

**What:** After a bet button interaction in `bot.js`, update the encounter embed to show current bet count. Edit the original message.

```javascript
// Source: tracker.js line 353 pattern (existing message.edit)
// In bot.js button handler for er_bet_*:
const bet = storage.getEldenRingBet(fightId);
const channel = client.channels.cache.get(notifChannelId);
const message = await channel.messages.fetch(bet.messageId);

const updatedEmbed = EmbedBuilder.from(message.embeds[0]);
// Update the "Paris" field value
const victCount = Object.values(bet.bets).filter(b => b.prediction === 'victoire').length;
const defCount  = Object.values(bet.bets).filter(b => b.prediction === 'defaite').length;
updatedEmbed.spliceFields(1, 1, { name: 'Paris', value: `${victCount} Victoire / ${defCount} Défaite`, inline: true });

await message.edit({ embeds: [updatedEmbed], components: message.components });
await interaction.reply({ content: `Pari de ${amount} PC placé !`, ephemeral: true });
```

### Pattern 4: Bet Resolution on Death or Kill

**What:** On `player_death`, close the bet with result `defaite` (bet-défaite losers = those who bet victoire lose). On `boss_kill`, close with result `victoire`.

```javascript
// Source: tracker.js line 924 (storage.closeBet pattern)
eldenRingEvents.on('player_death', async ({ discordUserId, bossName }) => {
  const fightId = storage.getActiveEldenRingFightId(discordUserId, bossName);
  if (!fightId) return;
  const betResult = storage.closeEldenRingBet(fightId, 'defaite'); // player died → defaite wins
  await postDeathEmbed(client, discordUserId, bossName, betResult);
  await editEncounterEmbedToClosed(client, fightId, betResult);
});
```

### Pattern 5: Per-Boss Defeat Rate for Odds

**What:** For a given player+boss combo, compute defeat_rate = (death_count / total_encounters). Use this as the "lose probability" for odds (analogous to LoL winrate). Feed into the same `calculateBaseOdds(winrate)` math.

```javascript
// Source: storage.js getEldenRingBossFights() + calculateBaseOdds()
function getEldenRingBossDefeatRate(discordId, bossName) {
  const fights = storage.getEldenRingBossFights(discordId, bossName);
  if (fights.length === 0) return 0.7; // default: boss usually wins (70% defeat rate)
  const deaths = fights.filter(f => f.outcome === 'death').length;
  return deaths / fights.length;
}
```

The defeat_rate maps to: `winrate_for_odds = 1 - defeat_rate` (since "victoire" = player kills boss = low probability outcome when boss is hard).

### Pattern 6: Storage for ER Active Bets

**What:** Mirror `activeBets` structure under `activeEldenRingBets` in players.json. Each entry keyed by `fightId`.

```javascript
// Analogous to storage.js createBet() / placeBet()
// New keys in players.json:
// data.activeEldenRingBets[fightId] = {
//   discordUserId,     // the player being fought
//   bossName,
//   messageId,         // for message.edit on bet update
//   bets: {},          // { odUserId: { prediction: 'victoire'|'defaite', amount, lockedOdds } }
//   hasGoldenOffer,    // 20% random per encounter
//   firstBettorId,     // first eligible bettor
//   closedAt,          // null until death or kill
//   createdAt,
// }
```

### Pattern 7: Session Summary Embed

**What:** On `session_end`, compute session stats from `storage.getEldenRingPlayer(discordId)`. Post a blue/neutral embed. Skip entirely if no boss encounters in this session.

```javascript
eldenRingEvents.on('session_end', async ({ discordUserId, sessionId, timestamp }) => {
  const player = storage.getEldenRingPlayer(discordUserId);
  const session = player?.sessions?.find(s => s.id === sessionId);
  if (!session) return;

  // Find all bosses fought during this session's time window
  const sessionBosses = getSessionBosses(player, session);
  if (sessionBosses.length === 0) return; // silent skip per user decision

  const durationSeconds = (new Date(timestamp) - new Date(session.start)) / 1000;
  await postSessionSummary(client, discordUserId, sessionBosses, durationSeconds);
});
```

### Pattern 8: Button customId scheme

```
er_bet_victoire_50_<fightId>
er_bet_victoire_100_<fightId>
er_bet_victoire_500_<fightId>
er_bet_defaite_50_<fightId>
er_bet_defaite_100_<fightId>
er_bet_defaite_500_<fightId>
```

Parse in `bot.js`:
```javascript
// In the interactionCreate button handler block:
if (customId.startsWith('er_bet_')) {
  const parts = customId.split('_');
  // er_bet_victoire_50_<fightId>
  // parts[2] = prediction, parts[3] = amount, parts[4..] = fightId
  const prediction = parts[2]; // 'victoire' or 'defaite'
  const amount = parseInt(parts[3], 10);
  const fightId = parts.slice(4).join('_');
  // ... handle bet
}
```

### Anti-Patterns to Avoid

- **Reusing activeBets directly for ER fights:** The existing `activeBets[gameId]` stores a `puuid` (LoL player identifier). ER uses `discordUserId`. Plugging ER data into the LoL bet structure will break `calculateOdds()`, which calls `getPlayerWinrate(puuid)`. Use separate `activeEldenRingBets`.
- **Using setTimeout to close betting:** LoL uses a timed window. For ER, betting closes on the first death or kill event — no timer needed. Closing is event-driven.
- **Storing message objects in memory:** The message ID must be persisted to storage (not just in a closure) so it survives bot restarts. Fetch with `channel.messages.fetch(messageId)` when editing.
- **Updating embed fields by index blindly:** `EmbedBuilder.spliceFields()` is index-sensitive. Better to rebuild the embed from scratch with known field order, or use named field updates carefully.
- **Discord rate limits on rapid edits:** Discord allows ~1-2 edits/second per message. If multiple bets hit within milliseconds, queue edits or debounce (e.g., 500ms debounce on the live counter update). Use `.catch(() => {})` per existing pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Odds calculation math | Custom formula | Adapt existing `calculateBaseOdds()` + `calculateMinorityBonus()` + `calculateStreakBonus()` from storage.js | Already battle-tested, handles edge cases (clamp, division by zero) |
| Wallet deduction/credit | Custom balance tracking | `storage.addCoins()` / `storage.getBalance()` / wallet write patterns in storage.js | Ensures transaction history, leaderboard updates are consistent |
| Golden Offer logic | Custom bonus system | Reuse `hasGoldenOffer` flag on bet object + `bet.hasGoldenOffer && winner.amount >= threshold` from closeBet | Same pattern works for ER bets |
| First-bettor detection | Custom tracking | Mirror `bet.firstBettorId` pattern from `placeBet()` | Same eligibility rules apply |
| Button disabling after close | Custom UI state management | `ButtonBuilder.setDisabled(true)` + `message.edit()` per tracker.js lines 315-353 | Pattern already proven |
| Session duration calculation | Custom time tracking | `new Date(end) - new Date(start)` in milliseconds → seconds | Simple arithmetic, no library needed |

**Key insight:** The betting system value is in the wallet+leaderboard integration, not the math. Never duplicate wallet writes — always go through storage functions.

---

## Common Pitfalls

### Pitfall 1: Fight ID Collision

**What goes wrong:** Two players encounter the same boss simultaneously and their bet entries clobber each other in storage.
**Why it happens:** fightId must be unique per player+boss+time, not just per boss.
**How to avoid:** Use `er_${discordUserId}_${Date.now()}` or `er_${discordUserId}_${bossName.replace(/\s/g,'_')}_${timestamp}`. Store discordUserId in the bet object for resolution.
**Warning signs:** Bet data for wrong player appears on notifications.

### Pitfall 2: Orphaned Active Bets

**What goes wrong:** If the game crashes without emitting `session_end`, active bets remain open indefinitely. Users cannot bet on future encounters for the same boss.
**Why it happens:** The betting close is event-driven (death/kill), but those events may never come.
**How to avoid:** On `session_end`, force-close any open active bets for that player's session. On `boss_encounter`, if there's already an open bet for same discordUserId+bossName, close/cancel the old one first.
**Warning signs:** Users report bet buttons still showing as active hours later.

### Pitfall 3: Message Fetch Failure After Restart

**What goes wrong:** Bot restarts, active bets persist in storage, but the `channel.messages.fetch(messageId)` call fails if the message was deleted or the channel ID changed.
**Why it happens:** Discord message IDs are valid forever but channels can be reconfigured.
**How to avoid:** Wrap all `channel.messages.fetch()` calls in try/catch. Log but continue if message is gone. Don't crash the event handler.
**Warning signs:** Unhandled promise rejections in logs for DiscordAPIError[10008] (Unknown Message).

### Pitfall 4: Incorrect Odds Direction for Bosses

**What goes wrong:** Odds favor "Victoire" even when the player has died 20 times to this boss.
**Why it happens:** If you accidentally feed `defeat_rate` as the "win probability" to `calculateBaseOdds(winrate)`, the math inverts. The function's `winrate` argument means "probability of the favorable outcome."
**How to avoid:** Clearly define: defeat_rate = probability of death = probability that "Défaite" bet wins. Pass `winrate = 1 - defeat_rate` to `calculateBaseOdds()`, or write a separate function with explicit naming.
**Warning signs:** Boss with 80% historical deaths shows 1.1x odds on "Victoire" (should be ~4-5x).

### Pitfall 5: Discord Button Custom ID Length Limit

**What goes wrong:** CustomId string exceeds Discord's 100-character limit, causing interaction registration to fail silently or throw.
**Why it happens:** fightId includes bossName + timestamp + discordId, which can be long for bosses with long names ("Malenia, Blade of Miquella").
**How to avoid:** Use a short hash or numeric ID as fightId. Store the full mapping in storage. Example: `er_bet_v_50_${shortId}` where shortId is 8 hex chars from `crypto.randomBytes(4).toString('hex')`.
**Warning signs:** Buttons do not respond to clicks; Discord console shows "Invalid Form Body".

### Pitfall 6: EmbedBuilder.from() field mutation

**What goes wrong:** `EmbedBuilder.from(message.embeds[0])` creates a mutable copy, but `.spliceFields()` with wrong index deletes the wrong field.
**Why it happens:** Embed field order depends on how they were originally built. If code changes add/remove fields, splice indices break.
**How to avoid:** Use `embed.data.fields.findIndex(f => f.name === 'Paris')` to find the field by name before splicing, or rebuild the full embed from stored data rather than mutating.
**Warning signs:** Wrong embed field disappears or duplicates on live update.

### Pitfall 7: Boss Artwork URL Availability

**What goes wrong:** Wiki image URLs break over time (CDN changes, filename renames).
**Why it happens:** Elden Ring Wiki (Fandom/Fextralife) rewrites URLs when pages are updated.
**How to avoid:** Pre-download and host artwork on the VPS or a GitHub repository as static assets. Reference by stable URL. For Phase 3, a simple JSON map `{ "Margit the Fell Omen": "https://..." }` in `eldenRingAssets.js` is sufficient.
**Warning signs:** Embeds show broken image icons.

---

## Code Examples

### Encounter Embed with Buttons (Verified Pattern)

```javascript
// Source: discord.js v14 (installed at /home/hamza/delu-bot/node_modules/discord.js, v14.25.1)
// Matches pattern from tracker.js lines 244-266

const embed = new EmbedBuilder()
  .setColor(0xFFA500)
  .setTitle('⚔️ Un Grand Ennemi est apparu...')
  .setDescription(`**${bossName}** — ${epicBossIntro(bossName)}`)
  .addFields(
    { name: 'Tarnished', value: `<@${discordUserId}>`, inline: true },
    { name: 'Tentative', value: `#${attemptNumber}`, inline: true },
    { name: 'Paris', value: '0 Victoire / 0 Défaite', inline: true },
  )
  .setTimestamp();

const bossImg = getEldenRingBossImage(bossName);
if (bossImg) embed.setImage(bossImg);  // Full-width bottom image
```

### Message Edit for Live Bet Count (Verified Pattern)

```javascript
// Source: tracker.js line 326-353 (existing EmbedBuilder.from + message.edit)
const channel = client.channels.cache.get(storage.getNotificationChannelId());
try {
  const message = await channel.messages.fetch(bet.messageId);
  const updatedEmbed = EmbedBuilder.from(message.embeds[0]);
  const fieldIdx = updatedEmbed.data.fields.findIndex(f => f.name === 'Paris');
  if (fieldIdx >= 0) {
    updatedEmbed.spliceFields(fieldIdx, 1, {
      name: 'Paris',
      value: `${victCount} Victoire / ${defCount} Défaite`,
      inline: true,
    });
  }
  await message.edit({ embeds: [updatedEmbed], components: message.components });
} catch (e) {
  console.warn('[ER] Could not update encounter embed:', e.message);
}
```

### Button Interaction Handler in bot.js (Verified Pattern)

```javascript
// Source: bot.js line 3096-3162 (existing interactionCreate button pattern)
// Add inside the existing button handler block:
if (customId.startsWith('er_bet_')) {
  const [, , prediction, amountStr, ...fightIdParts] = customId.split('_');
  const fightId = fightIdParts.join('_');
  const amount = parseInt(amountStr, 10);

  const bet = storage.getEldenRingBet(fightId);
  if (!bet || bet.closedAt) {
    return interaction.reply({ content: '⏱️ Les paris sont fermés', ephemeral: true });
  }
  const result = storage.placeEldenRingBet(fightId, interaction.user.id, prediction, amount);
  if (!result.success) {
    return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
  }
  // Update live counter (fire-and-forget)
  updateEncounterEmbedBetCount(client, bet).catch(() => {});
  return interaction.reply({ content: `✅ Pari de **${amount} PC** sur **${prediction === 'victoire' ? 'Victoire' : 'Défaite'}** (cote: x${result.lockedOdds.toFixed(2)})`, ephemeral: true });
}
```

### Bet Resolution Pattern (Verified Pattern)

```javascript
// Source: tracker.js line 920-1002 (storage.closeBet + betResult handling)
eldenRingEvents.on('boss_kill', async ({ discordUserId, bossName, attemptNumber }) => {
  const fightId = storage.getActiveEldenRingFightId(discordUserId, bossName);
  const betResult = fightId ? storage.closeEldenRingBet(fightId, 'victoire') : null;

  const channel = client.channels.cache.get(storage.getNotificationChannelId());
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x00CC44)  // green for kill
    .setTitle('🏆 BOSS VAINCU !')
    .setDescription(`<@${discordUserId}> a terrassé **${bossName}** après ${attemptNumber} tentative(s) !`);

  if (betResult && (betResult.winners.length > 0 || betResult.losers.length > 0)) {
    embed.addFields({ name: '🎰 Résultats des paris', value: formatBetResults(betResult), inline: false });
  } else if (betResult) {
    embed.addFields({ name: '🎰 Paris', value: 'Aucun pari placé', inline: false });
  }

  await channel.send({ embeds: [embed] });
  if (fightId) await disableEncounterEmbedButtons(client, fightId);
});
```

### Per-Boss Defeat Rate (New Storage Function)

```javascript
// Source: storage.js getEldenRingBossFights() (existing) + calculateBaseOdds() (existing)
function getEldenRingBossDefeatRate(discordId, bossName) {
  const fights = getEldenRingBossFights(discordId, bossName);
  if (!fights || fights.length === 0) return 0.75; // default: 75% defeat if unknown
  const deaths = fights.filter(f => f.outcome === 'death').length;
  return deaths / fights.length;
}

// For calculateEldenRingOdds:
// defeatRate = probability player dies = probability "defaite" bet wins
// Pass (1 - defeatRate) as the "winrate" to calculateBaseOdds since that function's
// "winrate" means probability of the win side winning.
const defeatRate = getEldenRingBossDefeatRate(discordId, bossName);
const { winOdds, loseOdds } = calculateBaseOdds(1 - defeatRate);
// winOdds → cote for "Victoire" bet (player kills boss)
// loseOdds → cote for "Défaite" bet (player dies)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Message components via `components` array of arrays | `ActionRowBuilder` wrapping `ButtonBuilder` instances | discord.js v14 | Existing pattern throughout bot.js — use this |
| `MessageEmbed` | `EmbedBuilder` | discord.js v14 | Already in use — no change needed |
| Text modals for bet amounts (existing LoL) | Predefined tier buttons (user decision for ER) | User decision 2026-02-27 | No modal needed; simpler UX, 6 buttons total |

**Deprecated/outdated:**
- `MessageEmbed`: Replaced by `EmbedBuilder` in discord.js v14. Already using EmbedBuilder throughout.
- `MessageActionRow` / `MessageButton`: Replaced by `ActionRowBuilder` / `ButtonBuilder`. Already using new API.

---

## Open Questions

1. **Boss artwork sourcing approach**
   - What we know: ~168 bosses, user wants full coverage, no fallback image
   - What's unclear: Where to source 168 images (Fandom wiki, Fextralife, game files, GitHub repos). Fandom CDN URLs are stable but may require scraping. Pre-bundled in repo is most reliable but ~50-100MB.
   - Recommendation: Use a JSON map of boss name → URL for a community-maintained GitHub CDN (e.g., raw.githubusercontent.com). If URL fetch fails at embed time, silently skip image. Build the map in `eldenRingAssets.js` as a plain object — can be updated independently of code.

2. **Active fight ID lookup: how to find the open fightId for a player+boss on death/kill events**
   - What we know: `player_death` and `boss_kill` events include `discordUserId` and `bossName`
   - What's unclear: Phase 2 does not store the "current active fightId" for a given player+boss combination. The storage would need a reverse-lookup or the notifier needs to maintain an in-memory map.
   - Recommendation: Add `storage.getActiveEldenRingFightId(discordUserId, bossName)` that scans `activeEldenRingBets` for an open (non-closed) bet with matching discordUserId+bossName. Or maintain an in-memory `Map<${discordUserId}_${bossName}, fightId>` in the notifier (cleared on bet close).

3. **Session boss aggregation logic for session summary**
   - What we know: `storage.endEldenRingSession()` is called with the session_id; `player.bosses[bossName].fights` has all fights with timestamps
   - What's unclear: There's no direct per-session fight index. Need to filter fights by timestamp between `session.start` and `session.end`
   - Recommendation: Add a `getEldenRingSessionFights(discordId, sessionId)` storage function that cross-references session timestamps with fight timestamps to produce the session summary data.

4. **Concurrent bet update race condition**
   - What we know: Multiple friends may click bet buttons within the same second
   - What's unclear: `storage.js` uses synchronous `readData()`/`writeData()` (JSON file), so concurrent writes may clobber each other
   - Recommendation: The existing system has this same race condition for LoL bets and it hasn't been a real-world problem (low concurrency). Accept the risk for Phase 3 — it's the same architectural tradeoff as the rest of the system. Document it as a known limitation.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` (key absent). Skipping this section.

---

## Sources

### Primary (HIGH confidence)

- `/home/hamza/delu-bot/src/bot.js` — discord.js v14 button handler patterns, EmbedBuilder usage, ActionRowBuilder/ButtonBuilder, interactionCreate structure
- `/home/hamza/delu-bot/src/tracker.js` — embed creation, message.edit, closeBet flow, Golden Offer + first-bettor integration
- `/home/hamza/delu-bot/src/storage.js` — calculateOdds(), placeBet(), closeBet(), eldenRing storage schema, wallet functions
- `/home/hamza/delu-bot/src/eldenRingTracker.js` — eldenRingEvents EventEmitter, emitEvent(), module structure
- `/home/hamza/delu-bot/src/apiServer.js` — event handler payloads (boss_encounter, player_death, boss_kill, session_end)
- `/home/hamza/delu-bot/src/features.js` — tracking_elden_ring + betting_elden_ring feature flags already defined
- `/home/hamza/delu-bot/package.json` — discord.js 14.25.1, vitest 1.6.0 confirmed installed
- `/home/hamza/delu-bot/data/players.json` — `eldenRing` key already present in data structure

### Secondary (MEDIUM confidence)

- discord.js v14 changelog knowledge (training data, 6-18 months): EmbedBuilder.from(), spliceFields() behavior. Should verify spliceFields edge cases against official docs before implementing.
- Button customId 100-char limit: widely documented in discord.js community, consistent with API behavior.

### Tertiary (LOW confidence)

- Boss artwork sources: Fandom Wiki CDN stability and Fextralife image URL patterns not verified against current (2026) state. Treat as needing manual validation during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use, versions confirmed
- Architecture: HIGH — based on direct reading of existing source files, patterns are proven in production
- Pitfalls: HIGH for Discord/code pitfalls (direct code analysis); MEDIUM for boss artwork sourcing (external service dependency)
- Open questions: identified from gap analysis of existing code, not speculation

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (discord.js stable; 30-day window)

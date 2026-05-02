const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { eldenRingEvents } = require('./eldenRingTracker');
const storage = require('./storage');
const { getEldenRingBossImage } = require('./eldenRingAssets');
const crypto = require('crypto');
const config = require('./config');
const features = require('./features');
const { getDuplicateZones } = require('./erRoute');

// Multi-phase boss reverse lookup: phase2 → phase1
// Used to find bet cycles created under phase1 name when death/kill comes with phase2 name
const PHASE2_TO_PHASE1 = {
  "Rykard, seigneur du blasphème": "Serpent dévoreur de dieux",
  "Bête d'Elden": "Radagon de l'Ordre d'or",
  "Messmer, serpent maléfique": "Messmer l'Empaleur",
  "Maliketh la Lame d'ébène": "Clerc Bestial",
  "Malenia, déesse de la putréfaction": "Malenia, épée de Miquella",
  "Hoarah Loux, le Guerrier": "Godfrey, premier Seigneur d'Elden",
  "Radahn, consort de Miquella": "Radahn, futur consort",
};

// Forward lookup: phase1 → phase2 (for counting all fights across phases)
const PHASE1_TO_PHASE2 = Object.fromEntries(
  Object.entries(PHASE2_TO_PHASE1).map(([p2, p1]) => [p1, p2])
);

function buildZoneSelectRow(bossName, discordUserId, customId) {
  const duplicateZones = getDuplicateZones(bossName);
  if (!duplicateZones) return null;

  const stats = storage.getEldenRingPlayerStats(discordUserId);
  const defeatedKeys = new Set();
  if (stats) {
    for (const boss of stats.bosses) {
      if (boss.defeated) defeatedKeys.add(boss.bossName);
    }
  }

  const options = duplicateZones
    .filter(dz => !defeatedKeys.has(`${dz.name}::${dz.zone}`))
    .map(dz => ({
      label: dz.zone.substring(0, 100),
      description: `Niv ${dz.level}`,
      value: dz.zone,
    }));

  if (options.length === 0) return null;

  const zoneSelect = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder('📍 Choisir la zone...')
    .addOptions(options);
  return new ActionRowBuilder().addComponents(zoneSelect);
}

// Maps shortKey (8-char hex in button IDs) to cycleKey (discordUserId_bossName)
const _cycleKeyMap = {};


function register(client) {
  eldenRingEvents.on('boss_encounter', (data) => handleEncounter(client, data));
  eldenRingEvents.on('player_death', (data) => handleDeath(client, data));
  eldenRingEvents.on('boss_kill', (data) => handleKill(client, data));
  eldenRingEvents.on('phase_transition', (data) => handlePhaseTransition(client, data));
  eldenRingEvents.on('session_end', (data) => handleSessionEnd(client, data));
  eldenRingEvents.on('global_death', (data) => handleGlobalDeath(client, data));
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handleEncounter(client, { discordUserId, bossName, attemptNumber, timestamp, screenshotBase64, ocrFallback }) {
  try {
    const channel = getNotifChannel(client);
    if (!channel) return;

    // Notify admin when OCR fallback is used (boss not in canonical list)
    if (ocrFallback) {
      notifyAdminOcrFallback(client, bossName, discordUserId).catch(() => {});
    }

    // Auto-lock DLC predictions on first DLC boss encounter (lock the run owned by this user)
    require('./dlcPredictions').maybeAutoLockOnEncounter(client, discordUserId, bossName, channel.id).catch(() => {});

    // Check for active cycle
    const existing = storage.getActiveBetCycle(discordUserId, bossName);

    if (existing) {
      // Cycle exists — re-encounter after abandon (no death = no new attempt)
      // attemptCount = deathCount + 1 (current attempt), not incremented on encounter
      const cycle = existing.cycle;
      await updateCycleEmbed(client, existing.cycleKey, cycle, 'encounter');
      return;
    }

    // No active cycle — create new one
    const odds = storage.calculateEldenRingOdds(discordUserId, bossName);
    const cycleSize = storage.getEldenRingCycleSize();

    // Build gold encounter embed
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle(`⚔️ ${bossName} — Tentative ${attemptNumber}`)
      .setDescription(getEpicIntro(bossName, attemptNumber))
      .addFields(
        { name: 'Sans-éclat', value: `<@${discordUserId}>`, inline: true },
        { name: 'Morts', value: '0', inline: true },
        { name: 'Paris', value: '0 Victoire / 0 Défaite', inline: true },
      )
      .setFooter({ text: `Pari: Victoire en ≤${cycleSize} essais ? | Cotes: V x${odds.victoireOdds.toFixed(2)} / D x${odds.defaiteOdds.toFixed(2)}` })
      .setTimestamp();

    const bossImage = getEldenRingBossImage(bossName);
    const encounterFiles = [];
    if (bossImage) {
      embed.setImage(bossImage);
    } else if (screenshotBase64) {
      const { AttachmentBuilder } = require('discord.js');
      const buf = Buffer.from(screenshotBase64, 'base64');
      encounterFiles.push(new AttachmentBuilder(buf, { name: 'encounter.png' }));
      embed.setImage('attachment://encounter.png');
    }

    // Build bet buttons
    const components = [];
    let shortKey = null;
    if (features.isEnabled('betting_elden_ring')) {
      shortKey = crypto.randomBytes(4).toString('hex');
      const rowVictoire = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`erc_v_50_${shortKey}`).setLabel('50 Runes Victoire').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`erc_v_100_${shortKey}`).setLabel('100 Runes Victoire').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`erc_v_500_${shortKey}`).setLabel('500 Runes Victoire').setStyle(ButtonStyle.Success),
      );
      const rowDefaite = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`erc_d_50_${shortKey}`).setLabel('50 Runes Défaite').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`erc_d_100_${shortKey}`).setLabel('100 Runes Défaite').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`erc_d_500_${shortKey}`).setLabel('500 Runes Défaite').setStyle(ButtonStyle.Danger),
      );
      components.push(rowVictoire, rowDefaite);
    }

    // Add zone select menu for duplicate bosses (or auto-select if only 1 zone left)
    const duplicateZones = getDuplicateZones(bossName);
    let autoSelectedZone = null;
    if (duplicateZones) {
      const stats = storage.getEldenRingPlayerStats(discordUserId);
      const defeatedKeys = new Set();
      if (stats) {
        for (const boss of stats.bosses) {
          if (boss.defeated) defeatedKeys.add(boss.bossName);
        }
      }
      const available = duplicateZones.filter(dz => !defeatedKeys.has(`${dz.name}::${dz.zone}`));
      if (available.length === 1) {
        // Auto-select the only remaining zone
        autoSelectedZone = available[0].zone;
        embed.addFields({ name: '📍 Zone', value: autoSelectedZone, inline: true });
      } else if (available.length > 1) {
        const zoneCustomId = `er_zone_${discordUserId}_${bossName}`;
        const zoneRow = buildZoneSelectRow(bossName, discordUserId, zoneCustomId);
        if (zoneRow) components.push(zoneRow);
      }
    }

    const msg = await channel.send({ embeds: [embed], components, files: encounterFiles });

    // Create cycle in storage
    const cycleKey = `${discordUserId}_${bossName}`;
    const { hasGoldenOffer } = storage.createBetCycle(discordUserId, bossName, msg.id, channel.id);

    // Auto-select zone if only 1 undefeated zone
    if (autoSelectedZone) {
      storage.setBetCycleSelectedZone(cycleKey, autoSelectedZone);
    }

    // Mark cycle if encounter screenshot was used as fallback image
    if (encounterFiles.length > 0) {
      storage.setBetCycleEncounterScreenshot(cycleKey, true);
    }

    // Store shortKey mapping for button handler
    if (shortKey) {
      _cycleKeyMap[shortKey] = cycleKey;
    }

    if (hasGoldenOffer) {
      embed.setFooter({
        text: `🌟 OFFRE EN OR — Gains doublés ! | Pari: Victoire en ≤${cycleSize} essais ? | Cotes: V x${odds.victoireOdds.toFixed(2)} / D x${odds.defaiteOdds.toFixed(2)}`,
      });
      await msg.edit({ embeds: [embed], components: msg.components });
    }
  } catch (e) {
    console.warn('[ER Notifier] Encounter error:', e.message);
  }
}

async function handleDeath(client, { discordUserId, bossName, attemptNumber, timestamp }) {
  try {
    let existing = storage.getActiveBetCycle(discordUserId, bossName);
    let phase2Name = null;

    // Phase 2 lookup: if no cycle for this name, check if it's a phase 2 boss
    if (!existing && PHASE2_TO_PHASE1[bossName]) {
      existing = storage.getActiveBetCycle(discordUserId, PHASE2_TO_PHASE1[bossName]);
      if (existing) phase2Name = bossName;
    }

    if (!existing) return;

    const result = storage.incrementBetCycleDeathCount(existing.cycleKey);
    if (!result) return;

    if (result.shouldResolve) {
      const betResult = storage.resolveBetCycle(existing.cycleKey, 'defaite');
      await updateCycleEmbed(client, existing.cycleKey, result, 'defeat', betResult, undefined, undefined, phase2Name);
    } else {
      await updateCycleEmbed(client, existing.cycleKey, result, 'death', undefined, undefined, undefined, phase2Name);
    }
  } catch (e) {
    console.warn('[ER Notifier] Death error:', e.message);
  }
}

async function awardBossKillRunes(discordUserId, bossName) {
  if (!discordUserId || !bossName || bossName === 'Unknown Boss') return null;
  const reward = config.bossKillReward;
  if (!reward || reward <= 0) return null;
  const newBalance = storage.addCoins(discordUserId, reward, 'BOSS_KILL', { bossName });
  return { reward, newBalance };
}

async function notifyBossKillReward(client, discordUserId, bossName, reward) {
  try {
    const channel = getNotifChannel(client);
    if (!channel) return;
    const symbol = config.currency.symbol;
    await channel.send({
      content: `🪙 <@${discordUserId}> a vaincu **${bossName}** et reçoit **+${reward} ${symbol}**.`,
      allowedMentions: { users: [discordUserId] },
    });
  } catch (e) {
    console.warn('[ER Notifier] Reward notification error:', e.message);
  }
}

async function handleKill(client, { discordUserId, bossName, attemptNumber, timestamp, durationSeconds, screenshotBase64 }) {
  try {
    const award = await awardBossKillRunes(discordUserId, bossName);
    if (award) {
      await notifyBossKillReward(client, discordUserId, bossName, award.reward);
    }

    let existing = storage.getActiveBetCycle(discordUserId, bossName);
    let phase2Name = null;

    if (!existing && PHASE2_TO_PHASE1[bossName]) {
      existing = storage.getActiveBetCycle(discordUserId, PHASE2_TO_PHASE1[bossName]);
      if (existing) phase2Name = bossName;
    }

    if (!existing) return;

    const cycle = existing.cycle;
    const betResult = storage.resolveBetCycle(existing.cycleKey, 'victoire');
    await updateCycleEmbed(client, existing.cycleKey, cycle, 'victory', betResult, durationSeconds, screenshotBase64, phase2Name);
  } catch (e) {
    console.warn('[ER Notifier] Kill error:', e.message);
  }
}

async function handleSessionEnd(client, { discordUserId, sessionId, timestamp }) {
  try {
    // Force-close any orphaned active bets for this player (Pitfall 2)
    await forceCloseOrphanedBets(client, discordUserId);

    // Get session fights
    const sessionFights = storage.getEldenRingSessionFights(discordUserId, sessionId);

    // Silent skip if no boss encounters (per user decision)
    if (sessionFights.length === 0) return;

    const channel = getNotifChannel(client);
    if (!channel) return;

    // Aggregate session stats (exclude Unknown Boss)
    const bossMap = {};
    let totalDeaths = 0;
    let totalKills = 0;

    for (const fight of sessionFights) {
      if (fight.bossName === 'Unknown Boss') continue;
      // Only count deaths and kills as real attempts (abandon = not a real fight)
      if (fight.outcome !== 'death' && fight.outcome !== 'kill') continue;
      if (!bossMap[fight.bossName]) {
        bossMap[fight.bossName] = { attempts: 0, deaths: 0, kills: 0 };
      }
      bossMap[fight.bossName].attempts++;
      if (fight.outcome === 'death') {
        bossMap[fight.bossName].deaths++;
        totalDeaths++;
      } else if (fight.outcome === 'kill') {
        bossMap[fight.bossName].kills++;
        totalKills++;
      }
    }

    // Calculate session duration
    const player = storage.getEldenRingPlayer(discordUserId);
    const session = player?.sessions?.find(s => s.id === sessionId);
    const durationSec = session
      ? Math.floor((new Date(timestamp).getTime() - new Date(session.start).getTime()) / 1000)
      : 0;

    // Build session summary embed (blue/neutral)
    const embed = new EmbedBuilder()
      .setColor(0x5865F2) // Discord blurple for session summary
      .setTitle('📋 Fin de session Elden Ring')
      .setDescription(`<@${discordUserId}> a terminé sa session.`)
      .setTimestamp();

    // Boss breakdown
    const bossLines = Object.entries(bossMap).map(([name, stats]) => {
      let line = `**${name}** — ${stats.attempts} tentative(s)`;
      if (stats.kills > 0) line += ' ✅ Vaincu';
      if (stats.deaths > 0) line += ` (${stats.deaths} mort(s))`;
      return line;
    });

    embed.addFields(
      { name: '⚔️ Boss affrontés', value: bossLines.join('\n') || 'Aucun', inline: false },
      { name: '📊 Bilan', value: `${totalKills} boss vaincu(s) / ${totalDeaths} mort(s)`, inline: true },
      { name: '⏱️ Durée', value: formatDuration(durationSec), inline: true },
    );

    await channel.send({ embeds: [embed] });
  } catch (e) {
    console.warn('[ER Notifier] Session summary error:', e.message);
  }
}

async function handlePhaseTransition(client, { discordUserId, bossName, phase2Name, timestamp, screenshotBase64 }) {
  try {
    // Find active cycle under phase 1 name
    let existing = storage.getActiveBetCycle(discordUserId, bossName);
    if (!existing) return;

    await updateCycleEmbed(client, existing.cycleKey, existing.cycle, 'phase_transition', undefined, undefined, screenshotBase64, phase2Name);
  } catch (e) {
    console.warn('[ER Notifier] Phase transition error:', e.message);
  }
}

async function handleGlobalDeath(client, { discordUserId, timestamp }) {
  // Silent — global death count is tracked in storage but not spammed to channel.
  // Use /er-stats to see the total.
}

// ============================================
// CYCLE EMBED UPDATER
// ============================================

async function updateCycleEmbed(client, cycleKey, cycle, state, betResult, durationSeconds, screenshotBase64, phase2Name) {
  try {
    const channelId = cycle.channelId || storage.getNotificationChannelId();
    const channel = client.channels.cache.get(channelId);
    if (!channel) return;

    const message = await channel.messages.fetch(cycle.messageId);
    if (!message) return;

    // Display name: use phase 2 name when in phase 2, otherwise phase 1 (cycle) name
    const displayName = phase2Name || cycle.bossName;

    // Compute total attempts across all cycles for this boss (both phases)
    const fightBossName = cycle.selectedZone
      ? `${cycle.bossName}::${cycle.selectedZone}`
      : cycle.bossName;
    let allFights = [...storage.getEldenRingBossFights(cycle.discordUserId, fightBossName)];
    // Include phase 2 fights for multi-phase bosses
    const phase2Boss = PHASE1_TO_PHASE2[cycle.bossName];
    if (phase2Boss) {
      const phase2Fights = storage.getEldenRingBossFights(cycle.discordUserId, phase2Boss);
      allFights = [...allFights, ...phase2Fights];
    }
    const storedAttempts = allFights.filter(f => f.outcome === 'death' || f.outcome === 'kill').length;
    // Also count buffered fights (duplicate boss awaiting zone selection)
    const pendingAttempts = (cycle.pendingFights || []).filter(f => f.outcome === 'death' || f.outcome === 'kill').length;
    const pastAttempts = storedAttempts + pendingAttempts;
    // On encounter: current attempt not yet recorded → +1
    // On death/defeat: death already recorded, next attempt = +1
    // On victory: kill already recorded, total = pastAttempts (no +1)
    const totalAttempts = (state === 'victory' || state === 'defeat') ? pastAttempts : pastAttempts + 1;

    const embed = new EmbedBuilder();
    // Use phase 2 image when in phase 2, fallback to phase 1 image
    const bossImage = getEldenRingBossImage(displayName) || getEldenRingBossImage(cycle.bossName);
    if (bossImage) {
      embed.setImage(bossImage);
    } else if (cycle.hasEncounterScreenshot) {
      // Keep referencing the encounter screenshot attached to the original message
      embed.setImage('attachment://encounter.png');
    }
    embed.setTimestamp();

    const bets = Object.values(cycle.bets || {});
    const victCount = bets.filter(b => b.prediction === 'victoire').length;
    const defCount = bets.filter(b => b.prediction === 'defaite').length;
    const parisLabel = `${victCount} Victoire / ${defCount} Défaite`;

    let disableButtons = false;

    switch (state) {
      case 'encounter':
        embed.setColor(0xFFA500)
          .setTitle(`⚔️ ${cycle.bossName} — Tentative ${totalAttempts}`)
          .setDescription(`<@${cycle.discordUserId}> reprend le combat !`)
          .addFields(
            { name: 'Sans-éclat', value: `<@${cycle.discordUserId}>`, inline: true },
            { name: 'Morts', value: `${cycle.deathCount}`, inline: true },
            { name: 'Paris', value: parisLabel, inline: true },
          );
        break;

      case 'phase_transition':
        embed.setColor(0xFFA500)
          .setTitle(`🔄 ${phase2Name} — Tentative ${totalAttempts}`)
          .setDescription(
            `<@${cycle.discordUserId}> a déclenché la **Phase 2** !\n` +
            `**${cycle.bossName}** → **${phase2Name}**`
          )
          .addFields(
            { name: 'Sans-éclat', value: `<@${cycle.discordUserId}>`, inline: true },
            { name: 'Morts', value: `${cycle.deathCount}`, inline: true },
            { name: 'Paris', value: parisLabel, inline: true },
          );
        break;

      case 'death':
        embed.setColor(0xFF8C00)
          .setTitle(`💀 ${displayName} — Mort #${cycle.deathCount} — Tentative ${totalAttempts}`)
          .setDescription(
            `<@${cycle.discordUserId}> est tombé face à **${displayName}**` +
            (phase2Name ? '\n🔄 **Phase 2**' : '') +
            `\n${getDeathTaunt(totalAttempts)}`
          )
          .addFields(
            { name: 'Sans-éclat', value: `<@${cycle.discordUserId}>`, inline: true },
            { name: 'Morts', value: `${cycle.deathCount}/${cycle.cycleSize}`, inline: true },
            { name: 'Paris', value: parisLabel, inline: true },
          );
        break;

      case 'defeat':
        embed.setColor(0xFF0000)
          .setTitle(`☠️ ${cycle.cycleSize} morts atteintes !`)
          .setDescription(
            `<@${cycle.discordUserId}> n'a pas réussi à vaincre **${displayName}**` +
            (phase2Name ? ' (Phase 2)' : '') +
            ` en ${cycle.cycleSize} essais.`
          );
        if (betResult && (betResult.winners.length > 0 || betResult.losers.length > 0)) {
          embed.addFields({
            name: '🎰 Résultats des paris',
            value: formatBetResults(betResult),
            inline: false,
          });
        }
        disableButtons = true;
        break;

      case 'victory': {
        const title = totalAttempts === 1
          ? '🏆 FIRST TRY ! BOSS VAINCU !'
          : '🏆 BOSS VAINCU !';
        embed.setColor(0x00CC44)
          .setTitle(title)
          .setDescription(
            `<@${cycle.discordUserId}> a terrassé **${displayName}** !` +
            (phase2Name ? ' 🔄 Phase 2' : '')
          )
          .addFields(
            { name: 'Tentatives', value: `${totalAttempts}`, inline: true },
            { name: 'Morts', value: `${totalAttempts - 1}`, inline: true },
          );
        if (durationSeconds) {
          embed.addFields({ name: 'Durée du combat', value: formatDuration(durationSeconds), inline: true });
        }
        if (betResult && (betResult.winners.length > 0 || betResult.losers.length > 0)) {
          embed.addFields({
            name: '🎰 Résultats des paris',
            value: formatBetResults(betResult),
            inline: false,
          });
        }
        disableButtons = true;
        break;
      }
    }

    // Add zone field if zone was selected
    if (cycle.selectedZone) {
      embed.addFields({ name: '📍 Zone', value: cycle.selectedZone, inline: true });
    }

    let components = message.components.map(row => {
      const newRow = ActionRowBuilder.from(row);
      if (disableButtons) {
        newRow.components.forEach(c => {
          // Don't disable zone select — it must stay active even after victory/defeat
          if (!c.data?.custom_id?.startsWith('er_zone_')) {
            c.setDisabled(true);
          }
        });
      }
      return newRow;
    });

    // Remove zone select only when zone is already chosen
    if (cycle.selectedZone) {
      components = components.filter(row =>
        !row.components.some(c => c.data?.custom_id?.startsWith('er_zone_'))
      );
    }

    // Add zone select for duplicate bosses if zone not yet selected (even on victory/defeat)
    if (!cycle.selectedZone && getDuplicateZones(cycle.bossName)) {
      const hasZoneSelect = components.some(row =>
        row.components?.some(c => c.data?.custom_id?.startsWith('er_zone_'))
      );
      if (!hasZoneSelect) {
        const zoneCustomId = `er_zone_${cycle.discordUserId}_${cycle.bossName}`;
        const zoneRow = buildZoneSelectRow(cycle.bossName, cycle.discordUserId, zoneCustomId);
        if (zoneRow) components.push(zoneRow);
      }
    }

    // Attach screenshot on victory or phase transition
    const files = [];
    if (state === 'victory' && screenshotBase64) {
      const buf = Buffer.from(screenshotBase64, 'base64');
      const { AttachmentBuilder } = require('discord.js');
      const attachment = new AttachmentBuilder(buf, { name: 'victory.png' });
      files.push(attachment);
      embed.setImage('attachment://victory.png');
    } else if (state === 'phase_transition' && screenshotBase64) {
      const buf = Buffer.from(screenshotBase64, 'base64');
      const { AttachmentBuilder } = require('discord.js');
      const attachment = new AttachmentBuilder(buf, { name: 'phase2.png' });
      files.push(attachment);
      embed.setImage('attachment://phase2.png');
    }

    await message.edit({ embeds: [embed], components, files });
  } catch (e) {
    console.warn('[ER Notifier] updateCycleEmbed error:', e.message);
  }
}

// ============================================
// BET RESOLUTION HELPERS
// ============================================

function formatBetResults(betResult) {
  const lines = [];
  for (const w of betResult.winners) {
    let line = `✅ <@${w.odUserId}> — **+${w.profit} Runes** (cote x${w.lockedOdds.toFixed(2)})`;
    if (w.goldenOfferApplied) line += ' 🌟';
    lines.push(line);
  }
  for (const l of betResult.losers) {
    lines.push(`❌ <@${l.odUserId}> — **-${l.amount} Runes**`);
  }
  return lines.join('\n') || 'Aucun pari placé';
}

async function disableEncounterButtons(client, fightId) {
  const bet = storage.getEldenRingBet(fightId);
  if (!bet) return;

  const channelId = bet.channelId || storage.getNotificationChannelId();
  const channel = client.channels.cache.get(channelId);
  if (!channel) return;

  try {
    const message = await channel.messages.fetch(bet.messageId);

    // Rebuild components with all buttons disabled
    const disabledComponents = message.components.map(row => {
      const newRow = ActionRowBuilder.from(row);
      newRow.components.forEach(btn => btn.setDisabled(true));
      return newRow;
    });

    // Update the Paris field to show final state
    const updatedEmbed = EmbedBuilder.from(message.embeds[0]);
    const fieldIdx = updatedEmbed.data.fields.findIndex(f => f.name === 'Paris');
    if (fieldIdx >= 0) {
      const bets = Object.values(bet.bets || {});
      const victCount = bets.filter(b => b.prediction === 'victoire').length;
      const defCount = bets.filter(b => b.prediction === 'defaite').length;
      const label = (victCount + defCount) > 0
        ? `${victCount} Victoire / ${defCount} Défaite (fermé)`
        : 'Aucun pari placé';
      updatedEmbed.spliceFields(fieldIdx, 1, { name: 'Paris', value: label, inline: true });
    }

    await message.edit({ embeds: [updatedEmbed], components: disabledComponents });
  } catch (e) {
    console.warn('[ER Notifier] Could not disable encounter buttons:', e.message);
  }
}

async function forceCloseOrphanedBets(client, discordUserId) {
  try {
    // Close orphaned bet cycles
    const allCycles = storage.getAllActiveBetCycles();
    for (const [cycleKey, cycle] of Object.entries(allCycles)) {
      if (cycle.discordUserId === discordUserId && !cycle.resolved) {
        const refunded = storage.cancelBetCycle(cycleKey);
        if (refunded > 0) {
          console.log(`[ER Notifier] Force-cancelled orphaned cycle ${cycleKey} (${refunded} bets refunded)`);
        }
        await disableCycleButtons(client, cycle).catch(() => {});
      }
    }

    // Also close legacy per-fight bets (backward compat)
    const allBets = storage.getAllActiveEldenRingBets();
    for (const [fightId, bet] of Object.entries(allBets)) {
      if (bet.discordUserId === discordUserId && !bet.closedAt) {
        storage.cancelEldenRingBet(fightId);
        await disableEncounterButtons(client, fightId).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('[ER Notifier] Orphan cleanup error:', e.message);
  }
}

async function disableCycleButtons(client, cycle) {
  const channelId = cycle.channelId || storage.getNotificationChannelId();
  const channel = client.channels.cache.get(channelId);
  if (!channel) return;
  try {
    const message = await channel.messages.fetch(cycle.messageId);
    const disabledComponents = message.components.map(row => {
      const newRow = ActionRowBuilder.from(row);
      newRow.components.forEach(btn => btn.setDisabled(true));
      return newRow;
    });
    await message.edit({ components: disabledComponents });
  } catch (e) {
    console.warn('[ER Notifier] Could not disable cycle buttons:', e.message);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getEpicIntro(bossName, attemptNumber) {
  if (attemptNumber === 1) {
    const intros = [
      `**${bossName}** se dresse devant le Sans-éclat... Le combat commence !`,
      `L'arène tremble... **${bossName}** apparaît dans toute sa fureur !`,
      `Un nouveau défi se présente : **${bossName}** attend son adversaire.`,
    ];
    return intros[Math.floor(Math.random() * intros.length)];
  }

  const returnIntros = [
    `**${bossName}** fait face au Sans-éclat une fois de plus... La revanche commence !`,
    `Le Sans-éclat revient défier **${bossName}** — la détermination est sans faille.`,
    `Retour dans l'arène face à **${bossName}**... Cette fois sera-t-elle la bonne ?`,
    `**${bossName}** attend son adversaire de pied ferme... Le Sans-éclat ne recule pas.`,
  ];
  return returnIntros[Math.floor(Math.random() * returnIntros.length)];
}

function getDeathTaunt(attemptNumber) {
  // Premières morts : taquineries légères
  if (attemptNumber <= 3) {
    const taunts = [
      '💀 Le Sans-éclat a chuté...',
      '💀 Encore une chute...',
      '💀 Ce n\'est que le début...',
      '💀 Le Sans-éclat mord la poussière.',
      '💀 Bienvenue dans la souffrance.',
      '💀 T\'as esquivé... dans la mauvaise direction.',
      '💀 C\'est un échauffement, hein ? ... Hein ?',
      '💀 Même les rats de Limgrave te regardent avec pitié.',
    ];
    return taunts[Math.floor(Math.random() * taunts.length)];
  }

  // 4+ morts : un seul gros pool, tout le monde y passe
  const taunts = [
    '💀 Ce boss ne rigole pas...',
    '💀 La patience est mise à rude épreuve...',
    '💀 Combien de fois encore ?',
    '💀 Le boss commence à te reconnaître à l\'odeur.',
    '💀 T\'as essayé de level up ou c\'est juste du masochisme ?',
    `💀 ${attemptNumber} tentatives et toujours pas de plan B ?`,
    '💀 Le site de la Grâce commence à avoir ton empreinte de fesses.',
    '💀 À ce rythme, c\'est le boss qui va demander un nerf.',
    '💀 Ton perso a plus vu l\'écran de mort que le gameplay.',
    '💀 À ce stade, c\'est le boss qui te farm...',
    '💀 Le Sans-éclat est devenu un test de résistance pour le boss.',
    `💀 ${attemptNumber} essais. Le boss a eu le temps de se faire un café.`,
    '💀 T\'es sûr que t\'as pas lancé le jeu en NG+7 par erreur ?',
    '💀 Même un Let Me Solo Her te laisserait tomber.',
    '💀 Le boss te salue maintenant quand t\'arrives.',
    '💀 Ton perso a plus de temps de vol que les oiseaux de Caelid.',
    '💀 C\'est beau la persévérance. C\'est con, mais c\'est beau.',
    '💀 Le wiki a ajouté ton nom dans la section "victimes notables".',
    `💀 Tentative ${attemptNumber}... la définition de la folie selon Einstein.`,
    '💀 Tu es devenu un distributeur d\'âmes...',
    '💀 Le boss s\'ennuie tellement qu\'il bâille entre tes tentatives...',
    '💀 Même le boss a de la peine pour toi maintenant.',
    `💀 ${attemptNumber} morts. Ton personnage a un abonnement au cimetière.`,
    '💀 Les développeurs de FromSoft te remercient pour le contenu gratuit.',
    '💀 Le boss a changé de build entre tes tentatives, il s\'ennuyait.',
    '💀 T\'as pensé à essayer un autre jeu ? Genre Animal Crossing ?',
    '💀 Même Patches aurait eu pitié de toi.',
    '💀 Le boss vient de demander un buff, il trouve ça trop facile.',
    '💀 Ton sang décore tellement l\'arène que ça compte comme de la peinture.',
    '💀 À ce stade, le boss te considère comme un PNJ récurrent.',
    '💀 Le boss a créé un groupe Discord pour se moquer de toi.',
    '💀 Ta manette a déposé une plainte pour maltraitance.',
    '💀 Le Sans-éclat ? Non. Le Sans-espoir.',
    '💀 Miyazaki regarde ton stream et pleure... de joie.',
    '💀 Tu donnes plus de runes que les mobs du DLC.',
    '💀 Le boss a fini par te mettre dans ses contacts.',
    '💀 Les messages par terre disent tous "skill issue".',
    '💀 L\'écran "VOUS AVEZ PÉRI" a un burn-in sur ton écran.',
    '💀 Le boss a pris sa retraite et c\'est son fils qui te combat maintenant.',
    '💀 Tu pourrais écrire une thèse sur les patterns de ce boss. Enfin, si tu les apprenais.',
    '💀 Le boss envisage de te laisser gagner par charité.',
    '💀 Techniquement, t\'as créé un nouveau genre : le die-and-retry-and-retry-and-retry.',
    `💀 ${attemptNumber} morts et tu continues ? Respect. Ou folie. Probablement les deux.`,
    '💀 Le boss a ouvert un compteur de morts de son côté aussi. Pour rigoler.',
    '💀 Même le narrateur a perdu espoir.',
    '💀 Tu es la raison pour laquelle le boss a un taux de réussite de 99.8%.',
    '💀 Ton écran de chargement a plus de temps de jeu que toi.',
    '💀 Le boss a eu le temps d\'apprendre le français entre tes tentatives.',
    '💀 Ta Fiole d\'Estus a demandé une mutation.',
    '💀 Le boss te laisse entrer par politesse maintenant.',
    '💀 T\'as plus de morts que de FPS.',
    '💀 Le brouillard du boss s\'ouvre automatiquement tellement il t\'attend.',
    '💀 Quelque part, un développeur de FromSoft sourit.',
    '💀 T\'es le seul joueur que le boss a ajouté en ami.',
    '💀 Ta tombe est devenue un point de repère sur la map.',
  ];
  return taunts[Math.floor(Math.random() * taunts.length)];
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function getNotifChannel(client) {
  const channelId = storage.getNotificationChannelId();
  if (!channelId) return null;
  return client.channels.cache.get(channelId) || null;
}

async function notifyAdminOcrFallback(client, bossName, discordUserId) {
  const config = require('./config');
  const adminId = config.adminUserId;
  if (!adminId) return;
  try {
    const admin = await client.users.fetch(adminId);
    await admin.send(
      `⚠️ **Boss non reconnu (OCR fallback)**\n` +
      `Nom détecté : **${bossName}**\n` +
      `Joueur : <@${discordUserId}>\n\n` +
      `Ce nom n'est pas dans la liste canonique. Vérifie et ajoute-le si nécessaire.`
    );
  } catch (err) {
    console.error('[ER Notifier] Failed to DM admin about OCR fallback:', err.message);
  }
}

module.exports = { register, _cycleKeyMap };

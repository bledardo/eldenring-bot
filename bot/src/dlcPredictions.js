// dlcPredictions.js — Pronostics communautaires sur le DLC Shadow of the Erdtree.
// Chaque utilisateur Discord prédit le nombre de tentatives (deaths + kill) que la
// run streamer mettra sur chaque boss DLC unique. Lock automatique au premier
// encounter d'un boss DLC, scoring à la fin du DLC (kill de Radahn Consort).

// 36 boss uniques du DLC. Pour les boss apparaissant à plusieurs zones, une seule
// entrée — la prédiction porte sur la difficulté du boss, pas sur les coordonnées.
// Les phases multiples sont fusionnées (Messmer / Radahn DLC).
const DLC_BOSSES = [
  // Plaine sépulcrale
  { name: "Dragon de flammes spectrales", group: "Plaine sépulcrale", hint: "1-3" },
  { name: "Chevalier de la Geôle Solitaire", group: "Plaine sépulcrale", hint: "5-15" },
  { name: "Chef des démons sanglants", group: "Plaine sépulcrale", hint: "1-5" },
  { name: "Larmoyeur", group: "Plaine sépulcrale", hint: "3-10" },
  { name: "Onze, épéiste semi-humain", group: "Plaine sépulcrale", hint: "3-10" },
  { name: "Lion dansant de la bête divine", group: "Belurat / Rauh", hint: "5-20", required: true },
  { name: "Rellana, chevaleresse des Lunes jumelles", group: "Château d'Ensis", hint: "10-30", required: true },

  // Altus occulte
  { name: "Ralva, grand ours écarlate", group: "Altus occulte", hint: "1-5" },
  { name: "Rugalea, grand ours écarlate", group: "Altus occulte", hint: "1-5" },
  { name: "Dane Mortefeuille", group: "Altus occulte", hint: "3-10" },
  { name: "Edredd, chevalier Noir", group: "Altus occulte", hint: "3-10" },
  { name: "Garrew, chevalier Noir", group: "Altus occulte", hint: "3-10" },
  { name: "Ours écarlate", group: "Altus occulte", hint: "1-5" },
  { name: "Rakshasa", group: "Altus occulte", hint: "3-10" },
  { name: "Metyr, mère des Doigts", group: "Altus occulte", hint: "5-15" },
  { name: "Comte Ymir, mère des Doigts", group: "Altus occulte", hint: "5-15" },
  { name: "Chevalier de la Mort", group: "Altus occulte", hint: "5-15" },
  { name: "Labirith l'Exécrable", group: "Altus occulte", hint: "3-10" },
  { name: "Hippopotame doré", group: "Château noir", hint: "5-20" },
  { name: "Messmer l'Empaleur & Messmer, serpent maléfique", group: "Château noir", hint: "15-50", required: true },

  // Ruines de Rauh
  { name: "Romina, sainte du bourgeon", group: "Ruines antiques de Rauh", hint: "10-30" },

  // Côte céruléenne
  { name: "Danseuse de Ranah", group: "Côte céruléenne", hint: "3-10" },
  { name: "Chevalier putride", group: "Côte céruléenne", hint: "5-15" },

  // Tombeau de Charo
  { name: "Volatile funèbre", group: "Tombeau de Charo", hint: "1-5" },
  { name: "Marigga, reine semi-humaine", group: "Tombeau de Charo", hint: "3-10" },

  // Pic déchiqueté
  { name: "Dragon du Pic déchiqueté", group: "Pic déchiqueté", hint: "1-5" },
  { name: "Homme-dragon ancien", group: "Pic déchiqueté", hint: "1-5" },
  { name: "Senessax, Dragon ancien", group: "Pic déchiqueté", hint: "3-10" },
  { name: "Bayle l'Effroyable", group: "Pic déchiqueté", hint: "10-30" },

  // Panorama occulte
  { name: "Sentinelle de l'Arbre", group: "Panorama occulte", hint: "1-5" },
  { name: "Créature stellaire", group: "Panorama occulte", hint: "3-10" },
  { name: "Commandant Gaïus", group: "Panorama occulte", hint: "10-40", required: true },
  { name: "Avatar de l'Arbre-Occulte", group: "Panorama occulte", hint: "5-15", required: true },

  // Bois abyssaux
  { name: "Jori, inquisiteur en chef", group: "Bois abyssaux", hint: "1-5" },
  { name: "Midra, seigneur de la Flamme exaltée", group: "Bois abyssaux", hint: "5-20" },

  // Enir-Ilim
  { name: "Radahn, futur consort & Radahn, consort de Miquella", group: "Enir-Ilim", hint: "50-300", required: true, final: true },
];

// Set rapide pour vérifier si un nom de boss appartient au DLC (toutes les variantes
// possibles que le watcher peut envoyer, y compris phase1/phase2 séparés).
const DLC_BOSS_NAME_SET = new Set();
for (const boss of DLC_BOSSES) {
  DLC_BOSS_NAME_SET.add(boss.name);
  // For multi-phase boss: also accept individual phase names
  if (boss.name.includes(" & ")) {
    for (const phase of boss.name.split(" & ")) {
      DLC_BOSS_NAME_SET.add(phase.trim());
    }
  }
}

function isDlcBoss(bossName) {
  return DLC_BOSS_NAME_SET.has(bossName);
}

// Pour comparer prédictions vs réalité : retrouver les fights de chaque boss DLC
// dans les stats du joueur (gérant : zones multiples, phases multiples, kill final).
//
// Si `sinceTimestamp` est fourni (ISO string), seuls les fights avec timestamp >=
// sinceTimestamp sont comptés. C'est crucial pour éviter de compter les kills de
// boss du DLC qui existent aussi en base game (Volatile funèbre, Sentinelle de
// l'Arbre, Créature stellaire) mais ont été tués dans une run antérieure.
//
// Retourne { [predictionBossName]: { attempts, deaths, kills, defeated } } pour chaque
// boss DLC dans la liste — y compris les boss pas encore rencontrés (attempts: 0).
function getActualAttemptsByBoss(playerBosses, sinceTimestamp = null) {
  const sinceMs = sinceTimestamp ? new Date(sinceTimestamp).getTime() : 0;

  function fightInWindow(f) {
    if (!sinceMs) return true;
    const t = f.timestamp ? new Date(f.timestamp).getTime() : 0;
    return t >= sinceMs;
  }

  const out = {};
  for (const dlcBoss of DLC_BOSSES) {
    const phaseNames = dlcBoss.name.includes(" & ")
      ? dlcBoss.name.split(" & ").map(s => s.trim())
      : [dlcBoss.name];

    let attempts = 0;
    let deaths = 0;
    let kills = 0;
    let defeated = false;

    // Cherche tous les buckets correspondants (avec ou sans suffixe ::zone)
    for (const [storageKey, bossData] of Object.entries(playerBosses || {})) {
      const baseName = storageKey.split("::")[0];
      if (!phaseNames.includes(baseName)) continue;

      const fights = (bossData.fights || []).filter(fightInWindow);
      for (const f of fights) {
        if (f.outcome === "kill") {
          kills++;
          attempts++;
        } else if (f.outcome === "death") {
          deaths++;
          attempts++;
        }
      }
    }

    // Multi-phase : défait = phase 2 a un kill (dans la fenêtre). Mono-phase : défait = au moins 1 kill.
    if (phaseNames.length === 2) {
      const phase2 = phaseNames[1];
      for (const [storageKey, bossData] of Object.entries(playerBosses || {})) {
        if (storageKey.split("::")[0] !== phase2) continue;
        if ((bossData.fights || []).filter(fightInWindow).some(f => f.outcome === "kill")) {
          defeated = true;
          break;
        }
      }
    } else {
      defeated = kills > 0;
    }

    out[dlcBoss.name] = { attempts, deaths, kills, defeated };
  }
  return out;
}

// Distance logarithmique entre prédiction et réalité.
// Insensible à l'échelle : se tromper de 5 sur Rellana (×2.5) compte autant que se
// tromper de 100 sur Radahn (×2.5). Plus c'est bas, mieux c'est.
function scoreLogDistance(predicted, actual) {
  return Math.abs(Math.log1p(Math.max(0, predicted)) - Math.log1p(Math.max(0, actual)));
}

// Calcule le leaderboard final.
//   allPredictions: { [discordId]: { username, predictions: { boss: n }, lockedAt } }
//   actuals: { [boss]: { attempts, defeated } } (issu de getActualAttemptsByBoss)
//
// Renvoie [{ discordId, username, total, perBoss: [{ boss, predicted, actual, score, exact }] }]
// trié par total croissant. Seuls les boss `defeated` sont scorés (les autres sont
// affichés mais comptent 0 — neutre).
function computeLeaderboard(allPredictions, actuals) {
  const rows = [];
  for (const [discordId, entry] of Object.entries(allPredictions || {})) {
    const preds = entry.predictions || {};
    const perBoss = [];
    let total = 0;
    let exactCount = 0;
    let scoredBosses = 0;

    for (const dlcBoss of DLC_BOSSES) {
      const actual = actuals[dlcBoss.name];
      if (!actual || !actual.defeated) continue;
      const predicted = preds[dlcBoss.name];
      if (predicted == null) continue; // pas de mise → pas scoré

      const score = scoreLogDistance(predicted, actual.attempts);
      const exact = predicted === actual.attempts;
      if (exact) exactCount++;
      total += score;
      scoredBosses++;

      perBoss.push({
        boss: dlcBoss.name,
        predicted,
        actual: actual.attempts,
        score,
        exact,
      });
    }

    rows.push({
      discordId,
      username: entry.username || discordId,
      total,
      scoredBosses,
      exactCount,
      perBoss,
    });
  }

  rows.sort((a, b) => {
    if (a.scoredBosses !== b.scoredBosses) return b.scoredBosses - a.scoredBosses;
    return a.total - b.total;
  });
  return rows;
}

// Auto-lock au premier encounter de boss DLC. Lock la run active de l'owner
// dont l'event provient (discordUserId).
async function maybeAutoLockOnEncounter(client, discordUserId, bossName, notifChannelId) {
  if (!isDlcBoss(bossName)) return;
  const storage = require('./storage');
  const run = storage.getActiveDlcRunByOwner(discordUserId);
  if (!run) return;

  const result = storage.lockDlcRun(run.runId, `auto:${bossName}`);
  if (!result.newlyLocked) return;

  if (notifChannelId && client) {
    try {
      const { EmbedBuilder } = require('discord.js');
      const channel = await client.channels.fetch(notifChannelId);
      if (channel) {
        const count = Object.keys(run.predictions || {}).length;
        const embed = new EmbedBuilder()
          .setTitle('🔒 Pronostics DLC verrouillés')
          .setDescription(`Run de **${run.ownerUsername || run.owner}** — premier boss DLC : **${bossName}**\n${count} joueur${count > 1 ? 's' : ''} ont misé. Place au game !`)
          .setColor(0xc9a84c);
        await channel.send({ embeds: [embed] });
      }
    } catch (e) {
      console.error('[DLC] auto-lock announce failed:', e.message);
    }
  }
}

module.exports = {
  DLC_BOSSES,
  isDlcBoss,
  getActualAttemptsByBoss,
  scoreLogDistance,
  computeLeaderboard,
  maybeAutoLockOnEncounter,
};

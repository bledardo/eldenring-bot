const express = require('express');
const path = require('path');
const storage = require('./storage');
const features = require('./features');
const config = require('./config');
const quests = require('./erQuests');
const route = require('./erRoute');
const { getEldenRingBossImage } = require('./eldenRingAssets');
const { MULTI_PHASE_BOSSES, GODFREY_ENDGAME_ZONE_PREFIX, GODFREY_PHASES, PHASE1_TO_PHASE2 } = require('./erConstants');

let discordClient = null;

const app = express();
app.use(express.json({ limit: '10mb' }));

// Serve static files for quest tracker
app.use('/quests/static', express.static(path.join(__dirname, '..', 'public', 'quests')));

let server = null;
let cleanupInterval = null;

// Lazy import to avoid circular dependency (eldenRingTracker requires apiServer and vice versa)
let _tracker = null;
function getTracker() {
  if (!_tracker) _tracker = require('./eldenRingTracker');
  return _tracker;
}

// ============================================
// HEALTH CHECK (no auth)
// ============================================

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// ============================================
// AUTH MIDDLEWARE
// ============================================

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!apiKey) {
    return res.status(401).json({ ok: false, error: 'Missing API key' });
  }

  const discordId = storage.getEldenRingPlayerByApiKey(apiKey);
  if (!discordId) {
    return res.status(401).json({ ok: false, error: 'Invalid API key' });
  }

  req.discordUserId = discordId;
  next();
}

// ============================================
// FEATURE FLAG MIDDLEWARE
// ============================================

function featureFlagMiddleware(req, res, next) {
  if (!features.isEnabled('tracking_elden_ring')) {
    return res.status(503).json({ ok: false, error: 'Tracking disabled' });
  }
  next();
}

/**
 * If the active bet cycle for this boss has a selected zone, return "bossName::zone".
 * Otherwise return plain bossName.
 */
/**
 * Resolve the storage key for a boss.
 * - If zone selected on active cycle → "bossName::zone"
 * - If duplicate boss with no zone selected → null (caller must buffer)
 * - Otherwise → plain bossName
 */
function resolveZonedBossName(discordUserId, bossName) {
  const existing = storage.getActiveBetCycle(discordUserId, bossName);
  if (existing?.cycle?.selectedZone) {
    return `${bossName}::${existing.cycle.selectedZone}`;
  }
  // Duplicate boss without zone selection → must buffer
  if (route.getDuplicateZones(bossName)) {
    return null;
  }
  return bossName;
}

// ============================================
// EVENT HANDLERS
// ============================================

function handleBossEncounter(discordUserId, data) {
  const bossName = data.boss_canonical_name || data.boss || 'Unknown Boss';
  if (bossName === 'Unknown Boss') {
    console.log('[ER API] Ignoring encounter for Unknown Boss');
    return;
  }
  // Don't store encounter as a fight — only death/kill are real attempts.
  // Abandon = just passing by, not a real attempt.
  const zonedName = resolveZonedBossName(discordUserId, bossName);
  let attemptNumber;
  if (zonedName) {
    let fights = storage.getEldenRingBossFights(discordUserId, zonedName);
    // Include phase 2 fights for multi-phase bosses
    const phase2Name = PHASE1_TO_PHASE2[bossName];
    if (phase2Name) {
      fights = [...fights, ...storage.getEldenRingBossFights(discordUserId, phase2Name)];
    }
    attemptNumber = fights.filter(f => f.outcome === 'death' || f.outcome === 'kill').length + 1;
  } else {
    // Duplicate boss, no zone yet — count pending fights from active cycle
    const existing = storage.getActiveBetCycle(discordUserId, bossName);
    const pending = (existing?.cycle?.pendingFights || []).filter(f => f.outcome === 'death' || f.outcome === 'kill').length;
    attemptNumber = pending + 1;
  }
  getTracker().emitEvent('boss_encounter', {
    discordUserId,
    bossName,
    attemptNumber,
    sessionId: data.session_id,
    timestamp: data.timestamp,
    screenshotBase64: data.screenshot_base64 || null,
    ocrFallback: data.ocr_fallback || false,
  });
}

function handlePlayerDeath(discordUserId, data) {
  const bossName = data.boss_canonical_name || data.boss || 'Unknown Boss';
  if (bossName === 'Unknown Boss') {
    console.log('[ER API] Ignoring death for Unknown Boss');
    return;
  }
  const zonedName = resolveZonedBossName(discordUserId, bossName);
  const fightData = {
    timestamp: data.timestamp || new Date().toISOString(),
    outcome: 'death',
    duration_seconds: data.duration_seconds || 0,
    boss_canonical_name: bossName,
    session_id: data.session_id || null,
  };

  if (zonedName === null) {
    // Duplicate boss, zone not selected — buffer fight in cycle
    const existing = storage.getActiveBetCycle(discordUserId, bossName);
    if (existing) {
      storage.addPendingFight(existing.cycleKey, fightData);
      const pendingCount = (existing.cycle.pendingFights || []).length + 1;
      getTracker().emitEvent('player_death', {
        discordUserId, bossName, attemptNumber: pendingCount,
        sessionId: data.session_id, timestamp: data.timestamp,
      });
    }
    return;
  }

  const fight = storage.addEldenRingFight(discordUserId, zonedName, fightData);
  getTracker().emitEvent('player_death', {
    discordUserId, bossName,
    attemptNumber: fight.attempt_number,
    sessionId: data.session_id,
    timestamp: data.timestamp,
  });
  return fight;
}

function handleBossKill(discordUserId, data) {
  const bossName = data.boss_canonical_name || data.boss || 'Unknown Boss';
  if (bossName === 'Unknown Boss') {
    console.log('[ER API] Ignoring kill for Unknown Boss');
    return;
  }
  const zonedName = resolveZonedBossName(discordUserId, bossName);
  const fightData = {
    timestamp: data.timestamp || new Date().toISOString(),
    outcome: 'kill',
    duration_seconds: data.duration_seconds || 0,
    boss_canonical_name: bossName,
    session_id: data.session_id || null,
  };

  if (zonedName === null) {
    // Duplicate boss, zone not selected — buffer kill in cycle
    const existing = storage.getActiveBetCycle(discordUserId, bossName);
    if (existing) {
      storage.addPendingFight(existing.cycleKey, fightData);
      const pendingCount = (existing.cycle.pendingFights || []).length + 1;
      getTracker().emitEvent('boss_kill', {
        discordUserId, bossName, attemptNumber: pendingCount,
        sessionId: data.session_id, timestamp: data.timestamp,
        durationSeconds: fightData.duration_seconds,
        screenshotBase64: data.screenshot_base64 || null,
      });
    }
    return;
  }

  const fight = storage.addEldenRingFight(discordUserId, zonedName, fightData);
  getTracker().emitEvent('boss_kill', {
    discordUserId, bossName,
    attemptNumber: fight.attempt_number,
    sessionId: data.session_id,
    timestamp: data.timestamp,
    durationSeconds: fight.duration_seconds,
    screenshotBase64: data.screenshot_base64 || null,
  });
  return fight;
}

function handleSessionStart(discordUserId, data) {
  const sessionId = data.session_id;
  const timestamp = data.timestamp || new Date().toISOString();
  storage.startEldenRingSession(discordUserId, sessionId, timestamp);
  getTracker().emitEvent('session_start', {
    discordUserId,
    sessionId,
    timestamp,
  });
}

function handleSessionEnd(discordUserId, data) {
  const sessionId = data.session_id;
  const timestamp = data.timestamp || new Date().toISOString();
  const summary = data.summary || null;
  storage.endEldenRingSession(discordUserId, sessionId, timestamp, summary);
  getTracker().emitEvent('session_end', {
    discordUserId,
    sessionId,
    timestamp,
    summary,
  });
}

function handleGlobalDeath(discordUserId, data) {
  const timestamp = data.timestamp || new Date().toISOString();
  storage.incrementEldenRingGlobalDeaths(discordUserId);
  getTracker().emitEvent('global_death', {
    discordUserId,
    sessionId: data.session_id || null,
    timestamp,
  });
}

function handlePhaseTransition(discordUserId, data) {
  const bossName = data.boss_canonical_name || 'Unknown Boss';
  const phase2Name = data.phase2_name;
  if (!phase2Name) return;
  console.log(`[ER API] Phase transition: ${bossName} → ${phase2Name}`);
  getTracker().emitEvent('phase_transition', {
    discordUserId,
    bossName,
    phase2Name,
    sessionId: data.session_id,
    timestamp: data.timestamp,
    screenshotBase64: data.screenshot_base64 || null,
  });
}

function handleFightAbandoned(discordUserId, data) {
  // Abandon = encounter without combat (e.g. walked past a dragon, aggro but no fight)
  // Not stored as a fight — without death, it's not a real attempt.
  const bossName = data.boss_canonical_name || data.boss || 'Unknown Boss';
  if (bossName === 'Unknown Boss') return;
  console.log(`[ER API] Fight abandoned: ${bossName} (not counted as attempt)`);
}

// ============================================
// EVENT ROUTING
// ============================================

const EVENT_HANDLERS = {
  boss_encounter: handleBossEncounter,
  player_death: handlePlayerDeath,
  boss_kill: handleBossKill,
  phase_transition: handlePhaseTransition,
  session_start: handleSessionStart,
  session_end: handleSessionEnd,
  fight_abandoned: handleFightAbandoned,
  global_death: handleGlobalDeath,
};

app.post('/api/events', authMiddleware, featureFlagMiddleware, (req, res) => {
  const { type, event_id, data, timestamp } = req.body;

  if (!type) {
    return res.status(400).json({ ok: false, error: 'Missing event type' });
  }

  // Deduplication
  if (event_id && storage.isEldenRingEventSeen(event_id)) {
    return res.json({ ok: true, duplicate: true });
  }

  const handler = EVENT_HANDLERS[type];
  if (!handler) {
    return res.status(400).json({ ok: false, error: `Unknown event type: ${type}` });
  }

  // Mark event as seen
  if (event_id) {
    storage.markEldenRingEventSeen(event_id);
  }

  try {
    handler(req.discordUserId, data || {});
    res.json({ ok: true });
  } catch (err) {
    console.error(`[ER] Error handling ${type} event:`, err);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ============================================
// QUEST TRACKER — WEB ROUTES
// ============================================

function questTokenMiddleware(req, res, next) {
  const discordId = storage.getDiscordIdByQuestToken(req.params.token);
  if (!discordId) {
    return res.status(404).send('Lien invalide ou expiré.');
  }
  req.questDiscordId = discordId;
  next();
}

async function resolveUsernames(discordIds) {
  const names = {};
  if (!discordClient) return names;
  for (const id of discordIds) {
    try {
      const user = await discordClient.users.fetch(id);
      names[id] = user.displayName || user.username;
    } catch {
      names[id] = `Joueur ${id.slice(-4)}`;
    }
  }
  return names;
}

// Main quest page — serves index.html
app.get('/quests/:token', questTokenMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'quests', 'index.html'));
});

// API: get all quests data + user progress
app.get('/quests/:token/api/progress', questTokenMiddleware, (req, res) => {
  const progress = storage.getQuestProgress(req.questDiscordId);
  res.json({
    ok: true,
    quests: quests.map(q => ({
      id: q.id,
      name: q.name,
      npc: q.npc,
      category: q.category,
      zone: q.zone,
      guide: q.guide,
      endingUnlocked: q.endingUnlocked,
      relatedQuests: q.relatedQuests,
      steps: q.steps,
      failConditions: q.failConditions,
      pointsOfNoReturn: q.pointsOfNoReturn,
      choices: q.choices,
      rewards: q.rewards,
    })),
    progress,
    globalPointsOfNoReturn: quests.globalPointsOfNoReturn,
  });
});

// API: get single quest + progress
app.get('/quests/:token/api/quest/:id', questTokenMiddleware, (req, res) => {
  const quest = quests.getQuestById(req.params.id);
  if (!quest) {
    return res.status(404).json({ ok: false, error: 'Quest not found' });
  }
  const progress = storage.getQuestProgressById(req.questDiscordId, req.params.id);
  res.json({ ok: true, quest, progress });
});

// API: toggle a step
app.post('/quests/:token/api/toggle', questTokenMiddleware, (req, res) => {
  const { questId, stepId } = req.body;
  if (!questId || stepId == null) {
    return res.status(400).json({ ok: false, error: 'Missing questId or stepId' });
  }
  const quest = quests.getQuestById(questId);
  if (!quest) {
    return res.status(404).json({ ok: false, error: 'Quest not found' });
  }
  if (!quest.steps.find(s => s.id === stepId)) {
    return res.status(400).json({ ok: false, error: 'Invalid stepId' });
  }
  const progress = storage.toggleQuestStep(req.questDiscordId, questId, stepId);
  res.json({ ok: true, progress });
});

// API: set a choice
app.post('/quests/:token/api/choice', questTokenMiddleware, (req, res) => {
  const { questId, choiceIndex, optionIndex } = req.body;
  if (!questId || choiceIndex == null || optionIndex == null) {
    return res.status(400).json({ ok: false, error: 'Missing fields' });
  }
  const quest = quests.getQuestById(questId);
  if (!quest || !quest.choices[choiceIndex]) {
    return res.status(400).json({ ok: false, error: 'Invalid quest or choiceIndex' });
  }
  if (!quest.choices[choiceIndex].options[optionIndex]) {
    return res.status(400).json({ ok: false, error: 'Invalid optionIndex' });
  }
  const progress = storage.setQuestChoice(req.questDiscordId, questId, choiceIndex, optionIndex);
  res.json({ ok: true, progress });
});

// API: get route data + player boss kills
app.get('/quests/:token/api/route', questTokenMiddleware, (req, res) => {
  const player = storage.getEldenRingPlayer(req.questDiscordId);
  const killedBosses = {};
  if (player?.bosses) {
    for (const [bossKey, bossData] of Object.entries(player.bosses)) {
      const hasKill = bossData.fights?.some(f => f.outcome === 'kill');
      if (hasKill) {
        // bossKey may be "name::zone" for zoned bosses
        const baseName = bossKey.includes('::') ? bossKey.split('::')[0] : bossKey;
        const zone = bossKey.includes('::') ? bossKey.split('::')[1] : null;
        const deaths = bossData.fights.filter(f => f.outcome === 'death').length;
        const kills = bossData.fights.filter(f => f.outcome === 'kill').length;
        if (!killedBosses[baseName]) killedBosses[baseName] = [];
        killedBosses[baseName].push({ zone, deaths, kills });
      }
    }
  }

  // Aggregate multi-phase boss stats (phase1 deaths + phase2 deaths/kills → route name)
  if (player?.bosses) {
    for (const [routeName, phases] of Object.entries(MULTI_PHASE_BOSSES)) {
      const [phase1, phase2] = phases;
      const p1 = player.bosses[phase1]?.fights || [];
      const p2 = player.bosses[phase2]?.fights || [];
      if (p1.length === 0 && p2.length === 0) continue;
      const p1Deaths = p1.filter(f => f.outcome === 'death').length;
      const p2Deaths = p2.filter(f => f.outcome === 'death').length;
      const p2Kills = p2.filter(f => f.outcome === 'kill').length;
      // Phase 2 kill = boss defeated. Total deaths = phase1 + phase2 deaths.
      if (p2Kills > 0 || p1Deaths > 0 || p2Deaths > 0) {
        killedBosses[routeName] = [{
          zone: null,
          deaths: p1Deaths + p2Deaths,
          kills: p2Kills,
          phase1Deaths: p1Deaths,
          phase2Deaths: p2Deaths,
        }];
      }
    }
    // Special case: Godfrey endgame (same route name, different zone)
    const gP1 = player.bosses[GODFREY_PHASES[0]]?.fights || [];
    const gP2 = player.bosses[GODFREY_PHASES[1]]?.fights || [];
    if (gP1.length > 0 || gP2.length > 0) {
      const p1Deaths = gP1.filter(f => f.outcome === 'death').length;
      const p2Deaths = gP2.filter(f => f.outcome === 'death').length;
      const p2Kills = gP2.filter(f => f.outcome === 'kill').length;
      if (p2Kills > 0 || p1Deaths > 0 || p2Deaths > 0) {
        const existing = killedBosses[GODFREY_PHASES[0]] || [];
        // Replace or add the endgame entry (zone matches "capitale des cendres")
        const endgameIdx = existing.findIndex(k => k.zone && k.zone.startsWith(GODFREY_ENDGAME_ZONE_PREFIX));
        const entry = {
          zone: GODFREY_ENDGAME_ZONE_PREFIX,
          deaths: p1Deaths + p2Deaths,
          kills: p2Kills,
          phase1Deaths: p1Deaths,
          phase2Deaths: p2Deaths,
        };
        if (endgameIdx >= 0) {
          existing[endgameIdx] = entry;
        } else {
          existing.push(entry);
        }
        killedBosses[GODFREY_PHASES[0]] = existing;
      }
    }
  }

  // Group route by region (parse zone prefix before " - ")
  const regions = [];
  let currentRegion = null;
  for (const boss of route) {
    const regionName = boss.zone.split(' - ')[0].trim();
    if (!currentRegion || currentRegion.name !== regionName) {
      currentRegion = { name: regionName, bosses: [] };
      regions.push(currentRegion);
    }
    currentRegion.bosses.push({
      name: boss.name,
      zone: boss.zone,
      wiki: boss.wiki,
      map: boss.map,
      level: boss.level,
      required: boss.required,
      quest: boss.quest || null,
      image: getEldenRingBossImage(boss.name) || null,
    });
  }
  res.json({ ok: true, regions, killedBosses });
});

// API: player stats
app.get('/quests/:token/api/stats', questTokenMiddleware, (req, res) => {
  const stats = storage.getEldenRingPlayerStats(req.questDiscordId);
  if (!stats) return res.json({ ok: true, stats: null });
  const nemesis = storage.getEldenRingNemesis(req.questDiscordId);
  const firstTryBossesWithImages = stats.firstTryBosses.map(name => ({
    name,
    image: getEldenRingBossImage(name) || null,
  }));
  const nemesisWithImage = nemesis && nemesis.length > 0 ? {
    ...nemesis[0],
    image: getEldenRingBossImage(nemesis[0].bossName) || null,
  } : null;
  res.json({
    ok: true,
    stats: {
      ...stats,
      firstTryBossesWithImages,
      nemesis: nemesisWithImage,
    },
  });
});

// API: hall of fame (server-wide)
app.get('/quests/:token/api/hall-of-fame', questTokenMiddleware, async (req, res) => {
  const hof = storage.getEldenRingHallOfFame();
  const ids = new Set();
  for (const e of (hof.mostFirstTries || [])) ids.add(e.discordId);
  for (const e of (hof.mostBossesDefeated || [])) ids.add(e.discordId);
  for (const e of (hof.gladiators || [])) ids.add(e.discordId);
  if (hof.worstWall) ids.add(hof.worstWall.discordId);
  if (hof.fastestKill) ids.add(hof.fastestKill.discordId);
  if (hof.perseverant) ids.add(hof.perseverant.discordId);
  if (hof.noLife) ids.add(hof.noLife.discordId);
  if (hof.serialFirstTry) ids.add(hof.serialFirstTry.discordId);
  if (hof.worstWall) hof.worstWall.image = getEldenRingBossImage(hof.worstWall.bossName) || null;
  if (hof.fastestKill) hof.fastestKill.image = getEldenRingBossImage(hof.fastestKill.bossName) || null;
  if (hof.unbeatenWall) hof.unbeatenWall.image = getEldenRingBossImage(hof.unbeatenWall.bossName) || null;
  if (hof.perseverant) hof.perseverant.image = getEldenRingBossImage(hof.perseverant.bossName) || null;
  if (hof.easiestBoss) hof.easiestBoss.image = getEldenRingBossImage(hof.easiestBoss.bossName) || null;
  const usernames = await resolveUsernames([...ids]);
  res.json({ ok: true, hallOfFame: hof, usernames });
});

// API: leaderboard (server-wide)
app.get('/quests/:token/api/leaderboard', questTokenMiddleware, async (req, res) => {
  const lb = storage.getEldenRingLeaderboard();
  const ids = new Set();
  for (const list of [lb.byKills, lb.byDeaths, lb.byTime]) {
    for (const e of list) ids.add(e.discordId);
  }
  const usernames = await resolveUsernames([...ids]);
  res.json({
    ok: true,
    leaderboard: lb,
    usernames,
    currentPlayerId: req.questDiscordId,
  });
});

// API: manually add a boss kill
app.post('/quests/:token/api/add-kill', questTokenMiddleware, (req, res) => {
  const { bossName, bossZone, attempts } = req.body;
  if (!bossName || !attempts || attempts < 1) {
    return res.status(400).json({ ok: false, error: 'Missing bossName or invalid attempts' });
  }
  const bossExists = route.some(b => b.name === bossName);
  if (!bossExists) {
    return res.status(400).json({ ok: false, error: 'Unknown boss name' });
  }
  // Use zone-qualified key for bosses that appear multiple times
  const isDuplicate = route.filter(b => b.name === bossName).length > 1;
  const storageKey = isDuplicate && bossZone ? `${bossName}::${bossZone}` : bossName;
  const discordId = req.questDiscordId;
  storage.ensureEldenRingPlayer(discordId);
  // Archive existing fights — manual add replaces, not appends
  storage.archiveEldenRingBossData(discordId, storageKey);
  for (let i = 0; i < attempts - 1; i++) {
    storage.addEldenRingFight(discordId, storageKey, {
      outcome: 'death',
      duration_seconds: 0,
      timestamp: new Date().toISOString(),
      manual: true,
    });
  }
  storage.addEldenRingFight(discordId, storageKey, {
    outcome: 'kill',
    duration_seconds: 0,
    timestamp: new Date().toISOString(),
    manual: true,
  });
  res.json({ ok: true });
});

// API: remove a boss kill
app.post('/quests/:token/api/remove-kill', questTokenMiddleware, (req, res) => {
  const { bossName, bossZone } = req.body;
  if (!bossName) {
    return res.status(400).json({ ok: false, error: 'Missing bossName' });
  }
  const discordId = req.questDiscordId;
  // Try zone-qualified key first, then plain name
  let removed = false;
  if (bossZone) {
    removed = storage.removeEldenRingBossKill(discordId, `${bossName}::${bossZone}`);
  }
  if (!removed) {
    // Try with region prefix (zone split before " - ")
    if (bossZone) {
      const region = bossZone.split(' - ')[0];
      removed = storage.removeEldenRingBossKill(discordId, `${bossName}::${region}`);
    }
  }
  if (!removed) {
    removed = storage.removeEldenRingBossKill(discordId, bossName);
  }
  if (!removed) {
    return res.status(404).json({ ok: false, error: 'No kill found for this boss' });
  }
  // Also remove multi-phase partner data
  const phases = MULTI_PHASE_BOSSES[bossName];
  if (phases) {
    for (const phase of phases) {
      storage.removeEldenRingBossData(discordId, phase);
    }
  }
  // Check if bossName is a phase of a multi-phase boss — also clean partner
  for (const [, phaseList] of Object.entries(MULTI_PHASE_BOSSES)) {
    if (phaseList.includes(bossName)) {
      for (const phase of phaseList) {
        if (phase !== bossName) storage.removeEldenRingBossData(discordId, phase);
      }
    }
  }
  // Godfrey endgame special case
  if (bossName === GODFREY_PHASES[0] && bossZone && bossZone.startsWith(GODFREY_ENDGAME_ZONE_PREFIX)) {
    storage.removeEldenRingBossData(discordId, GODFREY_PHASES[1]);
  }
  res.json({ ok: true });
});

// API: set quest status
app.post('/quests/:token/api/status', questTokenMiddleware, (req, res) => {
  const { questId, status } = req.body;
  if (!questId || !status) {
    return res.status(400).json({ ok: false, error: 'Missing questId or status' });
  }
  const progress = storage.setQuestStatus(req.questDiscordId, questId, status);
  if (!progress) {
    return res.status(400).json({ ok: false, error: 'Invalid status' });
  }
  res.json({ ok: true, progress });
});

// ============================================
// ITEMS API
// ============================================

const erItems = require('./erItems');

app.get('/quests/:token/api/items', questTokenMiddleware, (req, res) => {
  const progress = storage.getItemProgress(req.questDiscordId);
  res.json({
    ok: true,
    legendary: erItems.getLegendaryCategories(),
    dlc: erItems.getDlcCategories(),
    missable: erItems.getMissableItems(),
    progress,
  });
});

app.post('/quests/:token/api/items/toggle', questTokenMiddleware, (req, res) => {
  const { categoryKey, itemName } = req.body;
  if (!categoryKey || !itemName) {
    return res.status(400).json({ ok: false, error: 'Missing categoryKey or itemName' });
  }
  const progress = storage.toggleItemCollected(req.questDiscordId, categoryKey, itemName);
  res.json({ ok: true, progress });
});

// ============================================
// DLC PREDICTIONS (read-only — Discord seul peut miser)
// ============================================

const { DLC_BOSSES, getActualAttemptsByBoss, computeLeaderboard } = require('./dlcPredictions');

function getQuestUsername(discordId) {
  const custom = storage.getEldenRingDisplayName?.(discordId);
  if (custom) return custom;
  return `User ${discordId.substring(0, 6)}`;
}

app.get('/quests/:token/api/dlc-predictions', questTokenMiddleware, (req, res) => {
  const runs = storage.getDlcRuns();

  // Enrich each run with actuals (filtered by initializedAt) + leaderboard
  const enriched = {};
  for (const [runId, run] of Object.entries(runs)) {
    let actuals = {};
    const owner = storage.getEldenRingPlayer(run.owner);
    if (owner && owner.bosses) {
      actuals = getActualAttemptsByBoss(owner.bosses, run.initializedAt);
    }
    const leaderboard = computeLeaderboard(run.predictions, actuals);
    enriched[runId] = { ...run, actuals, leaderboard };
  }

  res.json({
    ok: true,
    me: req.questDiscordId,
    myUsername: getQuestUsername(req.questDiscordId),
    bosses: DLC_BOSSES,
    runs: enriched,
  });
});

app.post('/quests/:token/api/dlc-predictions/init', questTokenMiddleware, (req, res) => {
  const username = getQuestUsername(req.questDiscordId);
  const result = storage.initDlcRun(req.questDiscordId, username);
  if (!result.ok) {
    return res.status(409).json({ ok: false, error: result.error, run: result.run });
  }
  res.json({ ok: true, run: result.run });
});

app.post('/quests/:token/api/dlc-predictions/set', questTokenMiddleware, (req, res) => {
  const { runId, boss, value } = req.body || {};
  if (!runId || !boss) return res.status(400).json({ ok: false, error: 'missing_fields' });
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 0 || num > 9999) {
    return res.status(400).json({ ok: false, error: 'invalid_value' });
  }
  const username = getQuestUsername(req.questDiscordId);
  const result = storage.setDlcPredictionInRun(runId, req.questDiscordId, username, boss, num);
  if (!result.ok) {
    return res.status(409).json({ ok: false, error: result.error });
  }
  res.json({ ok: true });
});

app.post('/quests/:token/api/dlc-predictions/reset', questTokenMiddleware, (req, res) => {
  const { runId } = req.body || {};
  if (!runId) return res.status(400).json({ ok: false, error: 'missing_runId' });
  const run = storage.getDlcRun(runId);
  if (!run) return res.status(404).json({ ok: false, error: 'run_not_found' });
  // Seul l'owner peut reset sa run
  if (run.owner !== req.questDiscordId) {
    return res.status(403).json({ ok: false, error: 'not_owner' });
  }
  storage.resetDlcRun(runId);
  res.json({ ok: true });
});

app.post('/quests/:token/api/me/name', questTokenMiddleware, (req, res) => {
  const { name } = req.body || {};
  if (typeof name !== 'string') return res.status(400).json({ ok: false, error: 'invalid_name' });
  const trimmed = name.trim().substring(0, 32);
  if (trimmed.length < 1) return res.status(400).json({ ok: false, error: 'empty_name' });
  storage.setEldenRingDisplayName(req.questDiscordId, trimmed);
  res.json({ ok: true, name: trimmed });
});

// ============================================
// SSE — LIVE UPDATES
// ============================================

// Map discordId → Set of SSE response objects
const sseClients = new Map();

app.get('/quests/:token/api/events', questTokenMiddleware, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(':\n\n'); // comment to establish connection

  const discordId = req.questDiscordId;
  if (!sseClients.has(discordId)) sseClients.set(discordId, new Set());
  sseClients.get(discordId).add(res);

  req.on('close', () => {
    const clients = sseClients.get(discordId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(discordId);
    }
  });
});

function notifySSEClients(discordId, event, data) {
  const clients = sseClients.get(discordId);
  if (!clients || clients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

// ============================================
// SERVER LIFECYCLE
// ============================================

function startApiServer(client) {
  discordClient = client;
  const port = config.eldenRing.apiPort;
  server = app.listen(port, () => {
    console.log(`[ER] API server listening on port ${port}`);
  });

  // Subscribe to ER events for SSE push
  const tracker = getTracker();
  tracker.eldenRingEvents.on('boss_kill', (data) => {
    notifySSEClients(data.discordUserId, 'boss_kill', {
      bossName: data.bossName,
      attemptNumber: data.attemptNumber,
      durationSeconds: data.durationSeconds,
    });
  });
  tracker.eldenRingEvents.on('player_death', (data) => {
    notifySSEClients(data.discordUserId, 'player_death', {
      bossName: data.bossName,
      attemptNumber: data.attemptNumber,
    });
  });
  tracker.eldenRingEvents.on('boss_encounter', (data) => {
    notifySSEClients(data.discordUserId, 'boss_encounter', {
      bossName: data.bossName,
      attemptNumber: data.attemptNumber,
    });
  });

  // Schedule dedup cleanup every hour
  cleanupInterval = setInterval(() => {
    storage.cleanEldenRingSeenEvents();
  }, 60 * 60 * 1000);

  return server;
}

function stopApiServer() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  if (server) {
    server.close();
    server = null;
  }
}

module.exports = {
  app,
  startApiServer,
  stopApiServer,
};

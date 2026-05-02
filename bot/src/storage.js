const fs = require('fs');
const path = require('path');
const config = require('./config');

// Import paresseux pour éviter la dépendance circulaire avec features.js
let _features = null;
function getFeatures() {
  if (!_features) {
    _features = require('./features');
  }
  return _features;
}

const dataPath = path.resolve(config.dataPath);

function ensureDataFile() {
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dataPath)) {
    const initialData = {
      notificationChannelId: config.discord.notificationChannelId || null,
      wallets: {},
      settings: { betWindowMinutes: 5 },
      activeGiveaways: {},
      featureFlags: {},
      spontaneousBets: {},
      transactionHistory: {},
      eldenRing: {
        apiKeys: {},
        players: {},
        seenEventIds: {},
      },
    };
    fs.writeFileSync(dataPath, JSON.stringify(initialData, null, 2));
  }
  // Migrate existing data if missing new fields
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  let needsWrite = false;
  if (!data.wallets) {
    data.wallets = {};
    needsWrite = true;
  }
  if (!data.settings) {
    data.settings = { betWindowMinutes: 5 };
    needsWrite = true;
  }
  if (!data.activeGiveaways) {
    data.activeGiveaways = {};
    needsWrite = true;
  }
  if (!data.transactionHistory) {
    data.transactionHistory = {};
    needsWrite = true;
  }
  if (!data.featureFlags) {
    data.featureFlags = {};
    needsWrite = true;
  }
  if (!data.spontaneousBets) {
    data.spontaneousBets = {};
    needsWrite = true;
  }
  if (!data.eldenRing) {
    data.eldenRing = {
      apiKeys: {},      // { discordId: { key, created_at } }
      players: {},      // { discordId: { bosses: {}, sessions: [] } }
      seenEventIds: {}, // { uuid: timestamp_ms } for dedup
    };
    needsWrite = true;
  }
  if (data.eldenRing && !data.eldenRing.activeEldenRingBets) {
    data.eldenRing.activeEldenRingBets = {};
    needsWrite = true;
  }
  if (data.eldenRing && !data.eldenRing.activeBetCycles) {
    data.eldenRing.activeBetCycles = {};
    needsWrite = true;
  }
  if (data.settings && data.settings.eldenRingCycleSize === undefined) {
    data.settings.eldenRingCycleSize = 5;
    needsWrite = true;
  }
  if (data.eldenRing && !data.eldenRing.dlcPredictions) {
    data.eldenRing.dlcPredictions = {}; // { discordId: { username, predictions: { boss: n }, lockedAt: ts|null, updatedAt: ts } }
    needsWrite = true;
  }
  if (data.eldenRing && !data.eldenRing.displayNames) {
    data.eldenRing.displayNames = {}; // { discordId: customName }
    needsWrite = true;
  }
  if (data.eldenRing && !data.eldenRing.dlcRuns) {
    data.eldenRing.dlcRuns = {}; // { runId: { owner, ownerUsername, initializedAt, lockedAt, lockedBy, predictions: { discordId: {username, predictions, updatedAt} } } }
    // Migrate from old single-run shape if present
    const oldState = data.eldenRing.dlcPredictionsState;
    if (oldState?.runOwner) {
      const runId = `r_${new Date(oldState.initializedAt || Date.now()).getTime()}_${oldState.runOwner.substring(0, 4)}`;
      const run = {
        runId,
        owner: oldState.runOwner,
        ownerUsername: oldState.runOwnerUsername || oldState.runOwner,
        initializedAt: oldState.initializedAt || new Date().toISOString(),
        lockedAt: oldState.lockedAt || null,
        lockedBy: oldState.lockedBy || null,
        predictions: {},
      };
      for (const [pid, entry] of Object.entries(data.eldenRing.dlcPredictions || {})) {
        run.predictions[pid] = {
          username: entry.username,
          predictions: entry.predictions || {},
          updatedAt: entry.updatedAt || run.initializedAt,
        };
      }
      data.eldenRing.dlcRuns[runId] = run;
    }
    needsWrite = true;
  }
  if (data.eldenRing && !data.eldenRing.dlcPredictionsState) {
    data.eldenRing.dlcPredictionsState = { runOwner: null, runOwnerUsername: null, initializedAt: null, lockedAt: null, lockedBy: null };
    needsWrite = true;
  } else if (data.eldenRing?.dlcPredictionsState && data.eldenRing.dlcPredictionsState.runOwner === undefined) {
    // Migration : ancien shape sans runOwner
    data.eldenRing.dlcPredictionsState.runOwner = null;
    data.eldenRing.dlcPredictionsState.runOwnerUsername = null;
    data.eldenRing.dlcPredictionsState.initializedAt = null;
    needsWrite = true;
  }
  if (needsWrite) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  }
}

function readData() {
  ensureDataFile();
  const content = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(content);
}

function writeData(data) {
  ensureDataFile();
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function getNotificationChannelId() {
  const data = readData();
  return data.notificationChannelId || config.discord.notificationChannelId;
}

function setNotificationChannelId(channelId) {
  const data = readData();
  data.notificationChannelId = channelId;
  writeData(data);
}


function getWallet(userId) {
  const data = readData();
  return data.wallets[userId] || null;
}

function ensureWallet(userId) {
  const data = readData();
  let needsWrite = false;

  if (!data.wallets[userId]) {
    data.wallets[userId] = {
      odUserId: userId,
      balance: getStartingBalance(),
      totalWon: 0,
      totalLost: 0,
      createdAt: new Date().toISOString(),
    };
    needsWrite = true;
  } else {
    // Ensure totalWon and totalLost exist for older wallets
    if (data.wallets[userId].totalWon === undefined) {
      data.wallets[userId].totalWon = 0;
      needsWrite = true;
    }
    if (data.wallets[userId].totalLost === undefined) {
      data.wallets[userId].totalLost = 0;
      needsWrite = true;
    }
  }

  if (needsWrite) {
    writeData(data);
  }
  return data.wallets[userId];
}

function getBalance(userId) {
  const wallet = ensureWallet(userId);
  return wallet.balance;
}

function setWalletBalance(userId, balance) {
  const data = readData();
  if (!data.wallets[userId]) return;
  data.wallets[userId].balance = balance;
  writeData(data);
}

function addCoins(userId, amount, type = null, metadata = {}) {
  const data = readData();
  if (!data.wallets[userId]) {
    data.wallets[userId] = {
      odUserId: userId,
      balance: getStartingBalance(),
      totalWon: 0,
      totalLost: 0,
      createdAt: new Date().toISOString(),
    };
  }
  data.wallets[userId].balance += amount;
  if (amount > 0) {
    data.wallets[userId].totalWon += amount;
  } else {
    data.wallets[userId].totalLost += Math.abs(amount);
  }
  writeData(data);

  // Log transaction if type is provided
  if (type) {
    addTransaction(userId, type, amount, data.wallets[userId].balance, metadata);
  }

  return data.wallets[userId].balance;
}

function deductCoins(userId, amount) {
  const data = readData();
  if (!data.wallets[userId]) {
    return { success: false, message: 'Portefeuille introuvable' };
  }
  if (data.wallets[userId].balance < amount) {
    return { success: false, message: 'Solde insuffisant' };
  }
  data.wallets[userId].balance -= amount;
  writeData(data);
  return { success: true, newBalance: data.wallets[userId].balance };
}

function getWealthLeaderboard() {
  const data = readData();
  return Object.values(data.wallets)
    .sort((a, b) => b.balance - a.balance);
}

// Settings functions
function getBetWindowMinutes() {
  const data = readData();
  return data.settings?.betWindowMinutes ?? 5;
}

function setBetWindowMinutes(minutes) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.betWindowMinutes = minutes;
  writeData(data);
}

function getLinkedPlayerBetWindowMinutes() {
  const data = readData();
  return data.settings?.linkedPlayerBetWindowMinutes ?? config.linkedPlayerBetWindowMinutes;
}

function setLinkedPlayerBetWindowMinutes(minutes) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.linkedPlayerBetWindowMinutes = minutes;
  writeData(data);
}

function getMinBetFlat() {
  const data = readData();
  return data.settings?.minBetFlat ?? 0;
}

function setMinBetFlat(amount) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.minBetFlat = amount;
  writeData(data);
}

function getMinBetPercent() {
  const data = readData();
  return data.settings?.minBetPercent ?? 0;
}

function setMinBetPercent(percent) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.minBetPercent = percent;
  writeData(data);
}

function calculateMinBet(userBalance) {
  const flat = getMinBetFlat();
  const percent = getMinBetPercent();
  const percentAmount = Math.floor(userBalance * percent / 100);
  return Math.max(flat, percentAmount);
}

// Bet visibility setting
function getShowBetAmounts() {
  const data = readData();
  return data.settings?.showBetAmounts ?? true;
}

function setShowBetAmounts(show) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.showBetAmounts = show;
  writeData(data);
}

// Golden Offer settings
function getGoldenOfferThreshold() {
  const data = readData();
  return data.settings?.goldenOfferThreshold ?? 1000;
}

function setGoldenOfferThreshold(amount) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.goldenOfferThreshold = amount;
  writeData(data);
}

function getGoldenOfferBonus() {
  const data = readData();
  return data.settings?.goldenOfferBonus ?? 50;
}

function setGoldenOfferBonus(percent) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.goldenOfferBonus = percent;
  writeData(data);
}

// First Bettor Bonus settings
function getFirstBettorBonusPercent() {
  const data = readData();
  return data.settings?.firstBettorBonusPercent ?? 15;
}

function setFirstBettorBonusPercent(percent) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.firstBettorBonusPercent = percent;
  writeData(data);
}

function getFirstBettorLinkedPlayerEligible() {
  const data = readData();
  return data.settings?.firstBettorLinkedPlayerEligible ?? false;
}

function setFirstBettorLinkedPlayerEligible(eligible) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.firstBettorLinkedPlayerEligible = eligible;
  writeData(data);
}

// === Odds settings ===
function getSeedPool() {
  const data = readData();
  return data.settings?.seedPool ?? config.betting.seedPool;
}

function setSeedPool(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.seedPool = value;
  writeData(data);
}

function getBookmakerMarginPercent() {
  const data = readData();
  return data.settings?.bookmakerMarginPercent ?? config.betting.bookmakerMarginPercent;
}

function setBookmakerMarginPercent(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.bookmakerMarginPercent = value;
  writeData(data);
}

function getMaxMinorityBonusPercent() {
  const data = readData();
  return data.settings?.maxMinorityBonusPercent ?? config.betting.maxMinorityBonusPercent;
}

function setMaxMinorityBonusPercent(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.maxMinorityBonusPercent = value;
  writeData(data);
}

function getStreakBonusPercent() {
  const data = readData();
  return data.settings?.streakBonusPercent ?? config.betting.streakBonusPercent;
}

function setStreakBonusPercent(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.streakBonusPercent = value;
  writeData(data);
}

function getStreakThreshold() {
  const data = readData();
  return data.settings?.streakThreshold ?? config.betting.streakThreshold;
}

function setStreakThreshold(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.streakThreshold = value;
  writeData(data);
}

function getDefaultWinratePercent() {
  const data = readData();
  return data.settings?.defaultWinratePercent ?? config.betting.defaultWinratePercent;
}

function setDefaultWinratePercent(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.defaultWinratePercent = value;
  writeData(data);
}

// === Reward settings ===
function getStartingBalance() {
  const data = readData();
  return data.settings?.startingBalance ?? config.startingBalance;
}

function setStartingBalance(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.startingBalance = value;
  writeData(data);
}

function getPlayerBaseReward() {
  const data = readData();
  return data.settings?.playerBaseReward ?? config.betting.playerBaseReward;
}

function setPlayerBaseReward(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.playerBaseReward = value;
  writeData(data);
}

function getPlayerCutPercent() {
  const data = readData();
  return data.settings?.playerCutPercent ?? config.betting.playerCutPercent;
}

function setPlayerCutPercent(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.playerCutPercent = value;
  writeData(data);
}

function getSoloBetBonusPercent() {
  const data = readData();
  return data.settings?.soloBetBonusPercent ?? config.betting.soloBetBonusPercent;
}

function setSoloBetBonusPercent(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.soloBetBonusPercent = value;
  writeData(data);
}

// === Betting Mode settings ===
function getBettingMode() {
  const data = readData();
  return data.settings?.bettingMode ?? 'odds';
}

function setBettingMode(mode) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.bettingMode = mode;
  writeData(data);
}

function hasActiveGameBets() {
  return false;
}

// === Mission settings ===
function getDailyGamesRequired() {
  const data = readData();
  return data.settings?.dailyGamesRequired ?? config.missions.dailyGamesRequired;
}

function setDailyGamesRequired(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.dailyGamesRequired = value;
  writeData(data);
}

function getDailyWheelPrizes() {
  const data = readData();
  return data.settings?.dailyWheelPrizes ?? config.missions.dailyWheelPrizes;
}

function setDailyWheelPrizes(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.dailyWheelPrizes = value;
  writeData(data);
}

function getWeeklyGamesRequired() {
  const data = readData();
  return data.settings?.weeklyGamesRequired ?? config.missions.weeklyGamesRequired;
}

function setWeeklyGamesRequired(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.weeklyGamesRequired = value;
  writeData(data);
}

function getWeeklyWheelPrizes() {
  const data = readData();
  return data.settings?.weeklyWheelPrizes ?? config.missions.weeklyWheelPrizes;
}

function setWeeklyWheelPrizes(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.weeklyWheelPrizes = value;
  writeData(data);
}

function getWeeklyBonusChance() {
  const data = readData();
  return data.settings?.weeklyBonusChance ?? config.missions.weeklyBonusChance;
}

function setWeeklyBonusChance(value) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.weeklyBonusChance = value;
  writeData(data);
}

// Giveaway functions
function createGiveaway(messageId, channelId, amount, endTime, participants = []) {
  const data = readData();
  if (!data.activeGiveaways) data.activeGiveaways = {};
  data.activeGiveaways[messageId] = {
    messageId,
    channelId,
    amount,
    endTime,
    participants,
    createdAt: new Date().toISOString(),
  };
  writeData(data);
}

function getGiveaway(messageId) {
  const data = readData();
  return data.activeGiveaways?.[messageId] || null;
}

function getActiveGiveaways() {
  const data = readData();
  return data.activeGiveaways || {};
}

function addGiveawayParticipant(messageId, odUserId) {
  const data = readData();
  if (!data.activeGiveaways?.[messageId]) return false;
  if (!data.activeGiveaways[messageId].participants.includes(odUserId)) {
    data.activeGiveaways[messageId].participants.push(odUserId);
    writeData(data);
  }
  return true;
}

function getGiveawayParticipants(messageId) {
  const data = readData();
  return data.activeGiveaways?.[messageId]?.participants || [];
}

function deleteGiveaway(messageId) {
  const data = readData();
  if (data.activeGiveaways?.[messageId]) {
    delete data.activeGiveaways[messageId];
    writeData(data);
  }
}

// ============================================
// TRANSACTION HISTORY
// ============================================

function addTransaction(userId, type, amount, newBalance, metadata = {}) {
  const data = readData();
  if (!data.transactionHistory) data.transactionHistory = {};
  if (!data.transactionHistory[userId]) data.transactionHistory[userId] = [];

  const transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type,
    amount,
    balance: newBalance,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  data.transactionHistory[userId].unshift(transaction); // Plus récent en premier

  // Garder max 100 transactions par utilisateur
  if (data.transactionHistory[userId].length > 100) {
    data.transactionHistory[userId] = data.transactionHistory[userId].slice(0, 100);
  }

  writeData(data);
  return transaction;
}

function getTransactionHistory(userId, limit = 10) {
  const data = readData();
  if (!data.transactionHistory || !data.transactionHistory[userId]) {
    return [];
  }
  return data.transactionHistory[userId].slice(0, limit);
}

function adminAdjustBalance(userId, amount, reason) {
  const data = readData();
  ensureWallet(userId);

  // Re-read data after ensureWallet
  const freshData = readData();
  const wallet = freshData.wallets[userId];
  const previousBalance = wallet.balance;
  wallet.balance += amount;

  writeData(freshData);

  addTransaction(userId, 'ADMIN_ADJUST', amount, wallet.balance, {
    reason,
    previousBalance
  });

  return { previousBalance, newBalance: wallet.balance };
}

// ============================================
// LLM SETTINGS
// ============================================

function getLlmSettings() {
  const data = readData();
  return data.settings?.llm || {
    enabled: true,
    mode: 'normal',
    contextLevel: 'complet',
  };
}

function setLlmSettings(settings) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.llm = {
    ...getLlmSettings(),
    ...settings,
  };
  writeData(data);
  return data.settings.llm;
}

function getLlmMode() {
  return getLlmSettings().mode;
}

function setLlmMode(mode) {
  return setLlmSettings({ mode });
}

function getLlmContextLevel() {
  return getLlmSettings().contextLevel;
}

function setLlmContextLevel(level) {
  return setLlmSettings({ contextLevel: level });
}

function isLlmEnabled() {
  return getLlmSettings().enabled;
}

function setLlmEnabled(enabled) {
  return setLlmSettings({ enabled });
}

// ============================================
// ELDEN RING
// ============================================

// --- API Key management ---

function getEldenRingApiKey(discordId) {
  const data = readData();
  return data.eldenRing?.apiKeys?.[discordId] || null;
}

function setEldenRingApiKey(discordId, keyObj) {
  const data = readData();
  if (!data.eldenRing) data.eldenRing = { apiKeys: {}, players: {}, seenEventIds: {} };
  data.eldenRing.apiKeys[discordId] = keyObj;
  writeData(data);
}

function getEldenRingPlayerByApiKey(apiKey) {
  const data = readData();
  if (!data.eldenRing?.apiKeys) return null;
  for (const [discordId, entry] of Object.entries(data.eldenRing.apiKeys)) {
    if (entry.key === apiKey) return discordId;
  }
  return null;
}

function deleteEldenRingApiKey(discordId) {
  const data = readData();
  if (data.eldenRing?.apiKeys?.[discordId]) {
    delete data.eldenRing.apiKeys[discordId];
    writeData(data);
  }
}

// --- Fight data ---

function getEldenRingPlayer(discordId) {
  const data = readData();
  return data.eldenRing?.players?.[discordId] || null;
}

function ensureEldenRingPlayer(discordId) {
  const data = readData();
  if (!data.eldenRing) data.eldenRing = { apiKeys: {}, players: {}, seenEventIds: {} };
  if (!data.eldenRing.players[discordId]) {
    data.eldenRing.players[discordId] = { bosses: {}, sessions: [] };
    writeData(data);
  }
  return data.eldenRing.players[discordId];
}

function addEldenRingFight(discordId, bossName, fight) {
  const data = readData();
  if (!data.eldenRing) data.eldenRing = { apiKeys: {}, players: {}, seenEventIds: {} };
  if (!data.eldenRing.players[discordId]) {
    data.eldenRing.players[discordId] = { bosses: {}, sessions: [] };
  }
  if (!data.eldenRing.players[discordId].bosses[bossName]) {
    data.eldenRing.players[discordId].bosses[bossName] = { fights: [] };
  }
  const fights = data.eldenRing.players[discordId].bosses[bossName].fights;
  fight.attempt_number = fights.length + 1;
  fights.push(fight);
  writeData(data);
  return fight;
}

function getEldenRingBossFights(discordId, bossName) {
  const data = readData();
  return data.eldenRing?.players?.[discordId]?.bosses?.[bossName]?.fights || [];
}

function removeEldenRingBossKill(discordId, bossName) {
  const data = readData();
  const fights = data.eldenRing?.players?.[discordId]?.bosses?.[bossName]?.fights;
  if (!fights) return false;
  const hasKill = fights.some(f => f.outcome === 'kill');
  if (!hasKill) return false;
  // Remove the entire boss entry (all fights) to avoid stale death accumulation
  delete data.eldenRing.players[discordId].bosses[bossName];
  writeData(data);
  return true;
}

function removeEldenRingBossData(discordId, bossName) {
  const data = readData();
  const bosses = data.eldenRing?.players?.[discordId]?.bosses;
  if (!bosses || !bosses[bossName]) return false;
  delete bosses[bossName];
  writeData(data);
  return true;
}

function archiveEldenRingBossData(discordId, bossName) {
  const data = readData();
  const player = data.eldenRing?.players?.[discordId];
  if (!player?.bosses?.[bossName]) return false;
  const existing = player.bosses[bossName];
  if (!existing.fights || existing.fights.length === 0) return false;
  // Archive into player.archivedFights[bossName][]
  if (!player.archivedFights) player.archivedFights = {};
  if (!player.archivedFights[bossName]) player.archivedFights[bossName] = [];
  player.archivedFights[bossName].push({
    archivedAt: new Date().toISOString(),
    reason: 'manual_override',
    fights: existing.fights,
  });
  delete player.bosses[bossName];
  writeData(data);
  return true;
}

function incrementEldenRingGlobalDeaths(discordId) {
  const data = readData();
  if (!data.eldenRing) data.eldenRing = { apiKeys: {}, players: {}, seenEventIds: {} };
  if (!data.eldenRing.players[discordId]) {
    data.eldenRing.players[discordId] = { bosses: {}, sessions: [] };
  }
  const player = data.eldenRing.players[discordId];
  player.globalDeaths = (player.globalDeaths || 0) + 1;
  writeData(data);
  return player.globalDeaths;
}

// --- Session management ---

function startEldenRingSession(discordId, sessionId, timestamp) {
  const data = readData();
  if (!data.eldenRing) data.eldenRing = { apiKeys: {}, players: {}, seenEventIds: {} };
  if (!data.eldenRing.players[discordId]) {
    data.eldenRing.players[discordId] = { bosses: {}, sessions: [] };
  }
  data.eldenRing.players[discordId].sessions.push({
    id: sessionId,
    start: timestamp,
    end: null,
    summary: null,
  });
  writeData(data);
}

function endEldenRingSession(discordId, sessionId, timestamp, summary) {
  const data = readData();
  const sessions = data.eldenRing?.players?.[discordId]?.sessions;
  if (!sessions) return;
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    session.end = timestamp;
    session.summary = summary || null;
    writeData(data);
  }
}

function getEldenRingSessionFights(discordId, sessionId) {
  const data = readData();
  const player = data.eldenRing?.players?.[discordId];
  if (!player) return [];

  const session = player.sessions?.find(s => s.id === sessionId);
  if (!session) return [];

  const sessionStart = new Date(session.start).getTime();
  const sessionEnd = session.end ? new Date(session.end).getTime() : Date.now();

  const sessionFights = [];
  for (const [bossName, bossData] of Object.entries(player.bosses || {})) {
    for (const fight of (bossData.fights || [])) {
      const fightTime = new Date(fight.timestamp).getTime();
      if (fightTime >= sessionStart && fightTime <= sessionEnd) {
        sessionFights.push({ bossName, ...fight });
      }
    }
  }

  return sessionFights;
}

// --- Deduplication ---

function isEldenRingEventSeen(eventId) {
  const data = readData();
  return !!data.eldenRing?.seenEventIds?.[eventId];
}

function markEldenRingEventSeen(eventId) {
  const data = readData();
  if (!data.eldenRing) data.eldenRing = { apiKeys: {}, players: {}, seenEventIds: {} };
  data.eldenRing.seenEventIds[eventId] = Date.now();
  writeData(data);
}

function cleanEldenRingSeenEvents(maxAgeMs = 24 * 60 * 60 * 1000) {
  const data = readData();
  if (!data.eldenRing?.seenEventIds) return;
  const now = Date.now();
  let changed = false;
  for (const [id, ts] of Object.entries(data.eldenRing.seenEventIds)) {
    if (now - ts > maxAgeMs) {
      delete data.eldenRing.seenEventIds[id];
      changed = true;
    }
  }
  if (changed) writeData(data);
}

// ============================================
// ELDEN RING BETTING
// ============================================

function createEldenRingBet(fightId, discordUserId, bossName, messageId, channelId) {
  const data = readData();
  if (!data.eldenRing.activeEldenRingBets) {
    data.eldenRing.activeEldenRingBets = {};
  }
  const hasGoldenOffer = Math.random() < 0.2;
  data.eldenRing.activeEldenRingBets[fightId] = {
    discordUserId,
    bossName,
    messageId,
    channelId,
    bets: {},
    hasGoldenOffer,
    firstBettorId: null,
    closedAt: null,
    createdAt: new Date().toISOString(),
  };
  writeData(data);
  return { hasGoldenOffer };
}

function getEldenRingBet(fightId) {
  const data = readData();
  return data.eldenRing?.activeEldenRingBets?.[fightId] || null;
}

function getActiveEldenRingFightId(discordUserId, bossName) {
  const data = readData();
  const bets = data.eldenRing?.activeEldenRingBets || {};
  for (const [fightId, bet] of Object.entries(bets)) {
    if (bet.discordUserId === discordUserId && bet.bossName === bossName && !bet.closedAt) {
      return fightId;
    }
  }
  return null;
}

function getEldenRingBossDefeatRate(discordId, bossName) {
  const fights = getEldenRingBossFights(discordId, bossName);
  if (!fights || fights.length === 0) return 0.75; // default: 75% defeat rate for unknown boss
  const deaths = fights.filter(f => f.outcome === 'death').length;
  return deaths / fights.length;
}

function calculateEldenRingOdds(discordId, bossName) {
  const defeatRate = getEldenRingBossDefeatRate(discordId, bossName);
  const { winOdds, loseOdds } = calculateBaseOdds(1 - defeatRate);
  return { victoireOdds: winOdds, defaiteOdds: loseOdds, defeatRate };
}

function placeEldenRingBet(fightId, odUserId, prediction, amount) {
  const data = readData();
  const bet = data.eldenRing?.activeEldenRingBets?.[fightId];
  if (!bet) return { success: false, message: 'Pari introuvable' };
  if (bet.closedAt) return { success: false, message: 'Les paris sont fermes' };

  const existingBet = bet.bets[odUserId];
  if (existingBet && existingBet.prediction !== prediction) {
    return { success: false, message: 'Vous avez deja parie sur l\'autre resultat' };
  }

  if (existingBet && !getFeatures().isEnabled('bet_modification')) {
    return { success: false, message: 'La modification des paris est desactivee. Vous avez deja parie.' };
  }

  if (!data.wallets[odUserId]) {
    data.wallets[odUserId] = {
      odUserId,
      balance: getStartingBalance(),
      totalWon: 0,
      totalLost: 0,
      createdAt: new Date().toISOString(),
    };
  }

  // Refund previous bet if modifying
  if (existingBet) {
    data.wallets[odUserId].balance += existingBet.amount;
  }

  if (data.wallets[odUserId].balance < amount) {
    return { success: false, message: `Solde insuffisant (vous avez ${data.wallets[odUserId].balance} Runes)` };
  }

  data.wallets[odUserId].balance -= amount;

  // Calculate locked odds
  const odds = calculateEldenRingOdds(bet.discordUserId, bet.bossName);
  const lockedOdds = prediction === 'victoire' ? odds.victoireOdds : odds.defaiteOdds;

  // Store bet
  bet.bets[odUserId] = { prediction, amount, lockedOdds };

  // First bettor bonus
  if (getFeatures().isEnabled('first_bettor_bonus') && !bet.firstBettorId) {
    bet.firstBettorId = odUserId;
  }

  writeData(data);

  return { success: true, newBalance: data.wallets[odUserId].balance, lockedOdds };
}

function closeEldenRingBet(fightId, result) {
  const data = readData();
  const bet = data.eldenRing?.activeEldenRingBets?.[fightId];
  if (!bet) return { winners: [], losers: [] };

  const goldenOfferThreshold = getGoldenOfferThreshold();
  const goldenOfferBonus = getGoldenOfferBonus();
  const winners = [];
  const losers = [];

  for (const [odUserId, betData] of Object.entries(bet.bets)) {
    if (betData.prediction === result) {
      winners.push({ odUserId, amount: betData.amount, lockedOdds: betData.lockedOdds });
    } else {
      losers.push({ odUserId, amount: betData.amount });
    }
  }

  // Credit winners
  for (const winner of winners) {
    const totalReturn = Math.floor(winner.amount * winner.lockedOdds);
    let profit = totalReturn - winner.amount;

    let goldenOfferApplied = false;
    if (bet.hasGoldenOffer && winner.amount >= goldenOfferThreshold) {
      const bonusAmount = Math.floor(profit * goldenOfferBonus / 100);
      profit += bonusAmount;
      goldenOfferApplied = true;
      winner.goldenOfferBonus = bonusAmount;
    }

    if (getFeatures().isEnabled('first_bettor_bonus') && bet.firstBettorId === winner.odUserId) {
      const fbPercent = getFirstBettorBonusPercent() / 100;
      const fbBonus = Math.floor(profit * fbPercent);
      profit += fbBonus;
      winner.firstBettorBonus = fbBonus;
    }

    const finalReturn = winner.amount + profit;
    if (!data.wallets[winner.odUserId]) {
      data.wallets[winner.odUserId] = {
        odUserId: winner.odUserId,
        balance: getStartingBalance(),
        totalWon: 0,
        totalLost: 0,
        createdAt: new Date().toISOString(),
      };
    }
    data.wallets[winner.odUserId].balance += finalReturn;
    data.wallets[winner.odUserId].totalWon += profit;
    winner.profit = profit;
    winner.goldenOfferApplied = goldenOfferApplied;
  }

  // Debit losers
  for (const loser of losers) {
    if (!data.wallets[loser.odUserId]) {
      data.wallets[loser.odUserId] = {
        odUserId: loser.odUserId,
        balance: getStartingBalance(),
        totalWon: 0,
        totalLost: 0,
        createdAt: new Date().toISOString(),
      };
    }
    if (data.wallets[loser.odUserId].totalLost === undefined) {
      data.wallets[loser.odUserId].totalLost = 0;
    }
    data.wallets[loser.odUserId].totalLost += loser.amount;
    loser.loss = loser.amount;

    if (getFeatures().isEnabled('first_bettor_bonus') && bet.firstBettorId === loser.odUserId) {
      const fbPercent = getFirstBettorBonusPercent() / 100;
      const refundAmount = Math.floor(loser.amount * fbPercent);
      data.wallets[loser.odUserId].balance += refundAmount;
      loser.firstBettorRefund = refundAmount;
    }
  }

  bet.closedAt = new Date().toISOString();
  delete data.eldenRing.activeEldenRingBets[fightId];
  writeData(data);

  return { winners, losers };
}

function cancelEldenRingBet(fightId) {
  const data = readData();
  const bet = data.eldenRing?.activeEldenRingBets?.[fightId];
  if (!bet) return 0;

  let refundCount = 0;
  for (const [odUserId, betData] of Object.entries(bet.bets)) {
    if (!data.wallets[odUserId]) continue;
    data.wallets[odUserId].balance += betData.amount;
    refundCount++;
  }

  delete data.eldenRing.activeEldenRingBets[fightId];
  writeData(data);

  return refundCount;
}

function getAllActiveEldenRingBets() {
  const data = readData();
  return data.eldenRing?.activeEldenRingBets || {};
}

// ============================================
// ELDEN RING BET CYCLES
// ============================================

function getEldenRingCycleSize() {
  const data = readData();
  return data.settings?.eldenRingCycleSize ?? 5;
}

function setEldenRingCycleSize(size) {
  const data = readData();
  if (!data.settings) data.settings = {};
  data.settings.eldenRingCycleSize = size;
  writeData(data);
}

function getActiveBetCycle(discordUserId, bossName) {
  const data = readData();
  const cycleKey = `${discordUserId}_${bossName}`;
  const cycle = data.eldenRing?.activeBetCycles?.[cycleKey];
  if (cycle && !cycle.resolved) return { cycleKey, cycle };
  return null;
}

function createBetCycle(discordUserId, bossName, messageId, channelId) {
  const data = readData();
  if (!data.eldenRing.activeBetCycles) data.eldenRing.activeBetCycles = {};
  const cycleKey = `${discordUserId}_${bossName}`;
  const cycleSize = data.settings?.eldenRingCycleSize ?? 5;
  const hasGoldenOffer = Math.random() < 0.2;
  data.eldenRing.activeBetCycles[cycleKey] = {
    discordUserId, bossName, cycleSize,
    attemptCount: 1, deathCount: 0,
    messageId, channelId, bets: {},
    hasGoldenOffer, firstBettorId: null,
    hasEncounterScreenshot: false,
    selectedZone: null,
    pendingFights: [],
    createdAt: new Date().toISOString(), resolved: false,
  };
  writeData(data);
  return { cycleKey, cycleSize, hasGoldenOffer };
}

function setBetCycleEncounterScreenshot(cycleKey, value) {
  const data = readData();
  const cycle = data.eldenRing?.activeBetCycles?.[cycleKey];
  if (!cycle) return;
  cycle.hasEncounterScreenshot = value;
  writeData(data);
}

function setBetCycleSelectedZone(cycleKey, zone) {
  const data = readData();
  const cycle = data.eldenRing?.activeBetCycles?.[cycleKey];
  if (!cycle) return false;
  cycle.selectedZone = zone;
  writeData(data);
  return true;
}

/**
 * Buffer a fight in the cycle's pendingFights array (for duplicate bosses awaiting zone selection).
 */
function addPendingFight(cycleKey, fightData) {
  const data = readData();
  const cycle = data.eldenRing?.activeBetCycles?.[cycleKey];
  if (!cycle) return;
  if (!cycle.pendingFights) cycle.pendingFights = [];
  cycle.pendingFights.push(fightData);
  writeData(data);
}

/**
 * Flush buffered pendingFights to the player's boss fights under the zoned key.
 * Called when zone is finally selected.
 */
function flushPendingFights(cycleKey) {
  const data = readData();
  const cycle = data.eldenRing?.activeBetCycles?.[cycleKey];
  if (!cycle || !cycle.pendingFights || cycle.pendingFights.length === 0) return 0;
  if (!cycle.selectedZone) return 0;

  const zonedName = `${cycle.bossName}::${cycle.selectedZone}`;
  const discordId = cycle.discordUserId;

  if (!data.eldenRing.players[discordId]) {
    data.eldenRing.players[discordId] = { bosses: {}, sessions: [] };
  }
  if (!data.eldenRing.players[discordId].bosses[zonedName]) {
    data.eldenRing.players[discordId].bosses[zonedName] = { fights: [] };
  }
  const fights = data.eldenRing.players[discordId].bosses[zonedName].fights;
  for (const pending of cycle.pendingFights) {
    pending.attempt_number = fights.length + 1;
    fights.push(pending);
  }
  const flushed = cycle.pendingFights.length;
  cycle.pendingFights = [];
  writeData(data);
  return flushed;
}

/**
 * Returns duplicate boss names that a player still has under plain (non-zoned) keys with kills.
 * @param {string} discordId
 * @param {string[]} duplicateBossNames - list of boss names that appear multiple times in route
 * @returns {Array<{name: string, kills: number}>}
 */
function getEldenRingDuplicateBossesForMigration(discordId, duplicateBossNames) {
  const data = readData();
  const bosses = data.eldenRing?.players?.[discordId]?.bosses;
  if (!bosses) return [];

  const result = [];
  for (const name of duplicateBossNames) {
    // Only consider plain keys (no "::" in the key) that have kills
    if (bosses[name] && !name.includes('::')) {
      const kills = (bosses[name].fights || []).filter(f => f.outcome === 'kill').length;
      if (kills > 0) {
        result.push({ name, kills });
      }
    }
  }
  return result;
}

function migrateEldenRingFightsToZonedKey(discordId, plainName, zonedName) {
  const data = readData();
  const bosses = data.eldenRing?.players?.[discordId]?.bosses;
  if (!bosses || !bosses[plainName] || plainName === zonedName) return;

  // Move fights from plain key to zoned key
  if (!bosses[zonedName]) {
    bosses[zonedName] = { fights: [] };
  }
  bosses[zonedName].fights = bosses[plainName].fights.concat(bosses[zonedName].fights);
  delete bosses[plainName];
  writeData(data);
}

/**
 * Migrate kills from a plain boss key to multiple zoned keys (1 kill per zone).
 * Deaths and other fights stay under the plain key.
 * If no fights remain under the plain key after migration, delete it.
 * @param {string} discordId
 * @param {string} plainName - e.g. "Rapace funeste"
 * @param {string[]} zones - e.g. ["Nécrolimbe", "Péninsule larmoyante"]
 */
function migrateEldenRingKillsToZones(discordId, plainName, zones) {
  const data = readData();
  const bosses = data.eldenRing?.players?.[discordId]?.bosses;
  if (!bosses || !bosses[plainName]) return;

  const fights = bosses[plainName].fights || [];
  const killFights = fights.filter(f => f.outcome === 'kill');
  const otherFights = fights.filter(f => f.outcome !== 'kill');

  // Assign 1 kill to each selected zone
  for (let i = 0; i < zones.length && i < killFights.length; i++) {
    const zonedName = `${plainName}::${zones[i]}`;
    if (!bosses[zonedName]) {
      bosses[zonedName] = { fights: [] };
    }
    bosses[zonedName].fights.push(killFights[i]);
  }

  // Keep remaining fights (deaths, encounters) under the plain key, or delete if empty
  if (otherFights.length > 0) {
    bosses[plainName].fights = otherFights;
  } else {
    delete bosses[plainName];
  }

  writeData(data);
}

function incrementBetCycleDeathCount(cycleKey) {
  const data = readData();
  const cycle = data.eldenRing?.activeBetCycles?.[cycleKey];
  if (!cycle || cycle.resolved) return null;
  cycle.deathCount++;
  // attemptCount = deathCount + 1 (deaths so far + current attempt in progress)
  cycle.attemptCount = cycle.deathCount + 1;
  writeData(data);
  return { ...cycle, shouldResolve: cycle.deathCount >= cycle.cycleSize };
}

function placeBetCycleBet(cycleKey, odUserId, prediction, amount) {
  const data = readData();
  const cycle = data.eldenRing?.activeBetCycles?.[cycleKey];
  if (!cycle) return { success: false, message: 'Cycle introuvable' };
  if (cycle.resolved) return { success: false, message: 'Les paris sont fermes' };

  const existingBet = cycle.bets[odUserId];
  if (existingBet && existingBet.prediction !== prediction) {
    return { success: false, message: "Vous avez deja parie sur l'autre resultat" };
  }
  if (existingBet && !getFeatures().isEnabled('bet_modification')) {
    return { success: false, message: 'La modification des paris est desactivee. Vous avez deja parie.' };
  }

  if (!data.wallets[odUserId]) {
    data.wallets[odUserId] = {
      odUserId, balance: getStartingBalance(), totalWon: 0, totalLost: 0,
      createdAt: new Date().toISOString(),
    };
  }
  if (existingBet) data.wallets[odUserId].balance += existingBet.amount;
  if (data.wallets[odUserId].balance < amount) {
    return { success: false, message: `Solde insuffisant (vous avez ${data.wallets[odUserId].balance} Runes)` };
  }

  data.wallets[odUserId].balance -= amount;
  const odds = calculateEldenRingOdds(cycle.discordUserId, cycle.bossName);
  const lockedOdds = prediction === 'victoire' ? odds.victoireOdds : odds.defaiteOdds;
  cycle.bets[odUserId] = { prediction, amount, lockedOdds };

  if (getFeatures().isEnabled('first_bettor_bonus') && !cycle.firstBettorId) {
    cycle.firstBettorId = odUserId;
  }

  writeData(data);
  return { success: true, newBalance: data.wallets[odUserId].balance, lockedOdds };
}

function resolveBetCycle(cycleKey, result) {
  const data = readData();
  const cycle = data.eldenRing?.activeBetCycles?.[cycleKey];
  if (!cycle) return { winners: [], losers: [] };

  const goldenOfferThreshold = getGoldenOfferThreshold();
  const goldenOfferBonus = getGoldenOfferBonus();
  const winners = [];
  const losers = [];

  for (const [odUserId, betData] of Object.entries(cycle.bets)) {
    if (betData.prediction === result) {
      winners.push({ odUserId, amount: betData.amount, lockedOdds: betData.lockedOdds });
    } else {
      losers.push({ odUserId, amount: betData.amount });
    }
  }

  for (const winner of winners) {
    const totalReturn = Math.floor(winner.amount * winner.lockedOdds);
    let profit = totalReturn - winner.amount;
    let goldenOfferApplied = false;
    if (cycle.hasGoldenOffer && winner.amount >= goldenOfferThreshold) {
      const bonusAmount = Math.floor(profit * goldenOfferBonus / 100);
      profit += bonusAmount;
      goldenOfferApplied = true;
      winner.goldenOfferBonus = bonusAmount;
    }
    if (getFeatures().isEnabled('first_bettor_bonus') && cycle.firstBettorId === winner.odUserId) {
      const fbPercent = getFirstBettorBonusPercent() / 100;
      const fbBonus = Math.floor(profit * fbPercent);
      profit += fbBonus;
      winner.firstBettorBonus = fbBonus;
    }
    const finalReturn = winner.amount + profit;
    if (!data.wallets[winner.odUserId]) {
      data.wallets[winner.odUserId] = {
        odUserId: winner.odUserId, balance: getStartingBalance(),
        totalWon: 0, totalLost: 0, createdAt: new Date().toISOString(),
      };
    }
    data.wallets[winner.odUserId].balance += finalReturn;
    data.wallets[winner.odUserId].totalWon += profit;
    winner.profit = profit;
    winner.goldenOfferApplied = goldenOfferApplied;
  }

  for (const loser of losers) {
    if (!data.wallets[loser.odUserId]) {
      data.wallets[loser.odUserId] = {
        odUserId: loser.odUserId, balance: getStartingBalance(),
        totalWon: 0, totalLost: 0, createdAt: new Date().toISOString(),
      };
    }
    if (data.wallets[loser.odUserId].totalLost === undefined) data.wallets[loser.odUserId].totalLost = 0;
    data.wallets[loser.odUserId].totalLost += loser.amount;
    loser.loss = loser.amount;
    if (getFeatures().isEnabled('first_bettor_bonus') && cycle.firstBettorId === loser.odUserId) {
      const fbPercent = getFirstBettorBonusPercent() / 100;
      const refundAmount = Math.floor(loser.amount * fbPercent);
      data.wallets[loser.odUserId].balance += refundAmount;
      loser.firstBettorRefund = refundAmount;
    }
  }

  // Flush any remaining pending fights before deleting the cycle
  if (cycle.pendingFights && cycle.pendingFights.length > 0) {
    const fallbackName = cycle.selectedZone
      ? `${cycle.bossName}::${cycle.selectedZone}`
      : cycle.bossName; // fallback to plain key if zone was never selected
    const discordId = cycle.discordUserId;
    if (!data.eldenRing.players[discordId]) {
      data.eldenRing.players[discordId] = { bosses: {}, sessions: [] };
    }
    if (!data.eldenRing.players[discordId].bosses[fallbackName]) {
      data.eldenRing.players[discordId].bosses[fallbackName] = { fights: [] };
    }
    const fights = data.eldenRing.players[discordId].bosses[fallbackName].fights;
    for (const pending of cycle.pendingFights) {
      pending.attempt_number = fights.length + 1;
      fights.push(pending);
    }
    if (!cycle.selectedZone) {
      console.warn(`[ER Storage] Flushed ${cycle.pendingFights.length} pending fights to plain key "${cycle.bossName}" — zone was never selected`);
    }
  }

  cycle.resolved = true;
  cycle.closedAt = new Date().toISOString();
  delete data.eldenRing.activeBetCycles[cycleKey];
  writeData(data);
  return { winners, losers };
}

function cancelBetCycle(cycleKey) {
  const data = readData();
  const cycle = data.eldenRing?.activeBetCycles?.[cycleKey];
  if (!cycle) return 0;
  let refundCount = 0;
  for (const [odUserId, betData] of Object.entries(cycle.bets)) {
    if (!data.wallets[odUserId]) continue;
    data.wallets[odUserId].balance += betData.amount;
    refundCount++;
  }
  // Flush pending fights before deleting cycle (same fallback as resolveBetCycle)
  if (cycle.pendingFights && cycle.pendingFights.length > 0) {
    const fallbackName = cycle.selectedZone
      ? `${cycle.bossName}::${cycle.selectedZone}`
      : cycle.bossName;
    const discordId = cycle.discordUserId;
    if (!data.eldenRing.players) data.eldenRing.players = {};
    if (!data.eldenRing.players[discordId]) {
      data.eldenRing.players[discordId] = { bosses: {}, sessions: [] };
    }
    if (!data.eldenRing.players[discordId].bosses[fallbackName]) {
      data.eldenRing.players[discordId].bosses[fallbackName] = { fights: [] };
    }
    const fights = data.eldenRing.players[discordId].bosses[fallbackName].fights;
    for (const pending of cycle.pendingFights) {
      pending.attempt_number = fights.length + 1;
      fights.push(pending);
    }
  }
  delete data.eldenRing.activeBetCycles[cycleKey];
  writeData(data);
  return refundCount;
}

function getBetCycle(cycleKey) {
  const data = readData();
  return data.eldenRing?.activeBetCycles?.[cycleKey] || null;
}

function getAllActiveBetCycles() {
  const data = readData();
  return data.eldenRing?.activeBetCycles || {};
}

function resetEldenRingPlayerStats(discordId) {
  const data = readData();
  if (!data.eldenRing?.players?.[discordId]) return false;

  // Reset fights, sessions, global deaths
  data.eldenRing.players[discordId] = { bosses: {}, sessions: [], globalDeaths: 0 };

  // Cancel any active bet cycles for this player
  if (data.eldenRing.activeBetCycles) {
    for (const [cycleKey, cycle] of Object.entries(data.eldenRing.activeBetCycles)) {
      if (cycle.discordUserId === discordId) {
        // Refund bets
        for (const [odUserId, betData] of Object.entries(cycle.bets || {})) {
          if (data.wallets[odUserId]) {
            data.wallets[odUserId].balance += betData.amount;
          }
        }
        delete data.eldenRing.activeBetCycles[cycleKey];
      }
    }
  }

  // Cancel any legacy active bets for this player
  if (data.eldenRing.activeEldenRingBets) {
    for (const [fightId, bet] of Object.entries(data.eldenRing.activeEldenRingBets)) {
      if (bet.discordUserId === discordId && !bet.closedAt) {
        for (const [odUserId, betData] of Object.entries(bet.bets || {})) {
          if (data.wallets[odUserId]) {
            data.wallets[odUserId].balance += betData.amount;
          }
        }
        delete data.eldenRing.activeEldenRingBets[fightId];
      }
    }
  }

  writeData(data);
  return true;
}

// ============================================
// ELDEN RING STATS
// ============================================

function getAllEldenRingPlayerIds() {
  const data = readData();
  return Object.keys(data.eldenRing?.players || {});
}

function getEldenRingPlayerStats(discordId) {
  const { PHASE_TO_ROUTE, PHASE1_TO_PHASE2 } = require('./erConstants');
  const data = readData();
  const player = data.eldenRing?.players?.[discordId];
  if (!player) return null;

  let totalKills = 0;
  let totalDeaths = 0;
  let totalFightTime = 0;
  let totalSessionTime = 0;
  const bossEntries = [];

  // Build a quick lookup: does phase2 have a kill?
  const phase2HasKill = {};
  for (const [phase1, phase2] of Object.entries(PHASE1_TO_PHASE2)) {
    const p2Fights = player.bosses?.[phase2]?.fights || [];
    phase2HasKill[phase1] = p2Fights.some(f => f.outcome === 'kill');
    phase2HasKill[phase2] = p2Fights.some(f => f.outcome === 'kill');
  }
  // Godfrey endgame: Hoarah Loux is the "phase 2"
  const godfreyP2Fights = player.bosses?.["Hoarah Loux, le Guerrier"]?.fights || [];
  const godfreyP2Kill = godfreyP2Fights.some(f => f.outcome === 'kill');
  phase2HasKill["Godfrey, premier Seigneur d'Elden"] = godfreyP2Kill;
  phase2HasKill["Hoarah Loux, le Guerrier"] = godfreyP2Kill;

  for (const [bossName, bossData] of Object.entries(player.bosses || {})) {
    const fights = bossData.fights || [];
    const kills = fights.filter(f => f.outcome === 'kill').length;
    const deaths = fights.filter(f => f.outcome === 'death').length;
    const fightTime = fights.reduce((sum, f) => sum + (f.duration_seconds || 0), 0);
    totalKills += kills;
    totalDeaths += deaths;
    totalFightTime += fightTime;

    // For multi-phase bosses, defeated = phase 2 has a kill (phase 1 kill is just transition)
    const isMultiPhase = bossName in phase2HasKill;
    const defeated = isMultiPhase ? phase2HasKill[bossName] : kills > 0;

    // First try = first real attempt (non-encounter) was a kill
    const realFights = fights.filter(f => f.outcome !== 'encounter');
    const firstTry = defeated && realFights.length > 0 && realFights[0].outcome === 'kill';

    bossEntries.push({
      bossName,
      attempts: fights.length,
      kills,
      deaths,
      defeated,
      firstTry,
      fightTime,
      lastFight: fights.length > 0 ? fights[fights.length - 1] : null,
    });
  }

  // Merge multi-phase bosses for counting: phase pairs count as 1 boss
  // Keep the phase2 entry (the one with the actual kill) if it exists, otherwise phase1
  const mergedRouteNames = new Map(); // routeName → index in bossEntries of kept entry
  const phaseKeysToSkip = new Set();
  for (let i = 0; i < bossEntries.length; i++) {
    const entry = bossEntries[i];
    const routeName = PHASE_TO_ROUTE[entry.bossName];
    if (!routeName) continue;
    if (mergedRouteNames.has(routeName)) {
      const keptIdx = mergedRouteNames.get(routeName);
      const keptEntry = bossEntries[keptIdx];
      if (!keptEntry.defeated && entry.defeated) {
        phaseKeysToSkip.delete(keptEntry.bossName);
        phaseKeysToSkip.add(keptEntry.bossName);
        mergedRouteNames.set(routeName, i);
      } else {
        phaseKeysToSkip.add(entry.bossName);
      }
    } else {
      mergedRouteNames.set(routeName, i);
    }
  }
  const mergedBossEntries = bossEntries.filter(b => !phaseKeysToSkip.has(b.bossName));

  for (const session of (player.sessions || [])) {
    if (session.start && session.end) {
      totalSessionTime += (new Date(session.end) - new Date(session.start)) / 1000;
    }
  }

  const globalDeaths = player.globalDeaths || 0;

  const firstTryBosses = bossEntries.filter(b => b.firstTry);

  return {
    totalKills,
    totalDeaths,
    globalDeaths,
    totalAllDeaths: totalDeaths + globalDeaths,
    bossesDefeated: mergedBossEntries.filter(b => b.defeated).length,
    bossesEncountered: mergedBossEntries.length,
    firstTryCount: firstTryBosses.length,
    firstTryBosses: firstTryBosses.map(b => b.bossName),
    totalFightTime,
    totalSessionTime,
    bosses: bossEntries,  // Keep unmerged for activity display
  };
}

function getEldenRingLeaderboard() {
  const { PHASE_TO_ROUTE } = require('./erConstants');
  const data = readData();
  const players = data.eldenRing?.players || {};
  const entries = [];

  for (const [discordId, player] of Object.entries(players)) {
    let kills = 0;
    let deaths = 0;
    let totalTime = 0;

    // Collect boss keys with kills, then merge multi-phase
    const bossKeysWithKills = [];
    for (const [bossName, bossData] of Object.entries(player.bosses || {})) {
      let bossHasKill = false;
      for (const fight of (bossData.fights || [])) {
        if (fight.outcome === 'kill') { kills++; bossHasKill = true; }
        if (fight.outcome === 'death') deaths++;
        totalTime += (fight.duration_seconds || 0);
      }
      if (bossHasKill) bossKeysWithKills.push(bossName);
    }

    // Merge multi-phase: count phase pairs as 1 defeated boss
    const mergedRouteNames = new Set();
    let bossesDefeated = 0;
    for (const bossName of bossKeysWithKills) {
      const routeName = PHASE_TO_ROUTE[bossName];
      if (routeName) {
        if (!mergedRouteNames.has(routeName)) {
          mergedRouteNames.add(routeName);
          bossesDefeated++;
        }
      } else {
        bossesDefeated++;
      }
    }

    entries.push({ discordId, kills, deaths, totalTime, bossesDefeated });
  }

  return {
    byKills: [...entries].sort((a, b) => b.kills - a.kills),
    byDeaths: [...entries].sort((a, b) => b.deaths - a.deaths),
    byTime: [...entries].sort((a, b) => b.totalTime - a.totalTime),
  };
}

function getEldenRingBossDifficulty() {
  const data = readData();
  const players = data.eldenRing?.players || {};
  const bossDeaths = {};

  for (const player of Object.values(players)) {
    for (const [bossName, bossData] of Object.entries(player.bosses || {})) {
      const deaths = (bossData.fights || []).filter(f => f.outcome === 'death').length;
      bossDeaths[bossName] = (bossDeaths[bossName] || 0) + deaths;
    }
  }

  return Object.entries(bossDeaths)
    .map(([bossName, deaths]) => ({ bossName, deaths }))
    .sort((a, b) => b.deaths - a.deaths);
}

function getEldenRingNemesis(discordId) {
  const data = readData();
  const player = data.eldenRing?.players?.[discordId];
  if (!player) return null;

  const { MULTI_PHASE_BOSSES, GODFREY_PHASES, PHASE1_TO_PHASE2 } = require('./erConstants');

  // Skip phase2 names — their deaths will be merged into phase1
  const phase2Names = new Set();
  for (const phases of Object.values(MULTI_PHASE_BOSSES)) {
    if (phases.length === 2) phase2Names.add(phases[1]);
  }
  phase2Names.add(GODFREY_PHASES[1]);

  const entries = [];
  for (const [bossName, bossData] of Object.entries(player.bosses || {})) {
    // Skip phase2 entries — they'll be counted under phase1
    if (phase2Names.has(bossName)) continue;

    const fights = bossData.fights || [];
    let deaths = fights.filter(f => f.outcome === 'death').length;
    let kills = fights.filter(f => f.outcome === 'kill').length;
    let attempts = fights.filter(f => f.outcome !== 'encounter').length;

    // For multi-phase bosses: merge phase2 deaths + check phase2 kill
    const p2Name = PHASE1_TO_PHASE2[bossName];
    let defeated = kills > 0;
    if (p2Name) {
      const p2Fights = player.bosses?.[p2Name]?.fights || [];
      const p2Deaths = p2Fights.filter(f => f.outcome === 'death').length;
      const p2Kills = p2Fights.filter(f => f.outcome === 'kill').length;
      deaths += p2Deaths;
      kills += p2Kills;
      attempts += p2Fights.filter(f => f.outcome !== 'encounter').length;
      if (p2Kills > 0) defeated = true;
    }

    if (deaths === 0) continue;
    entries.push({ bossName, deaths, kills, attempts, defeated });
  }

  return entries.sort((a, b) => b.deaths - a.deaths);
}

function getEldenRingHallOfFame() {
  const data = readData();
  const players = data.eldenRing?.players || {};
  const { PHASE1_TO_PHASE2, GODFREY_PHASES } = require('./erConstants');
  const erRoute = require('./erRoute');

  // Set of valid boss names from the official route (for filtering ghost OCR entries)
  const routeBossNames = new Set();
  for (const entry of erRoute) {
    routeBossNames.add(entry.name);
    // Also add individual phase names from multi-phase route entries (e.g. "A & B" → "A", "B")
    if (entry.name.includes(' & ')) {
      for (const part of entry.name.split(' & ')) routeBossNames.add(part.trim());
    }
  }
  // Add phase names from constants
  for (const [p1, p2] of Object.entries(PHASE1_TO_PHASE2)) {
    routeBossNames.add(p1);
    routeBossNames.add(p2);
  }
  for (const p of GODFREY_PHASES) routeBossNames.add(p);

  // Build reverse lookup: phase2 → phase1
  const phase2ToPhase1 = {};
  for (const [p1, p2] of Object.entries(PHASE1_TO_PHASE2)) {
    phase2ToPhase1[p2] = p1;
  }
  phase2ToPhase1[GODFREY_PHASES[1]] = GODFREY_PHASES[0];

  let mostFirstTries = []; // { discordId, count }
  let worstWall = null; // { discordId, bossName, deaths }
  let fastestKill = null; // { discordId, bossName, duration }
  let unbeatenWall = null; // { bossName, totalDeaths }
  let mostBossesDefeated = []; // { discordId, count }
  let perseverant = null; // { discordId, bossName, deathsBeforeKill }
  let gladiators = []; // { discordId, totalFightTime }
  let noLife = null; // { discordId, duration, start, end }
  const bossFirstTryStats = {}; // bossName -> { count, fastestKillDuration }
  // For serial first try: per-player tracking
  let serialFirstTry = null; // { discordId, streak, bosses }

  const bossGlobalStats = {}; // bossName -> { totalDeaths, hasBeenKilled }

  for (const [discordId, player] of Object.entries(players)) {
    let firstTryCount = 0;
    let bossesDefeated = 0;
    let totalFightTime = 0;

    // For serial first try: collect first-try kills with timestamps
    const firstTryKills = []; // { bossName, timestamp }

    for (const [bossName, bossData] of Object.entries(player.bosses || {})) {
      const fights = bossData.fights || [];
      const realFights = fights.filter(f => f.outcome !== 'encounter');
      const kills = fights.filter(f => f.outcome === 'kill').length;
      const deaths = fights.filter(f => f.outcome === 'death').length;

      // First try detection
      if (kills > 0 && realFights.length > 0 && realFights[0].outcome === 'kill') {
        firstTryCount++;
        // Track for boss le plus facile (count + fastest kill duration)
        const canonName = phase2ToPhase1[bossName] || bossName;
        if (!bossFirstTryStats[canonName]) bossFirstTryStats[canonName] = { count: 0, fastestKillDuration: Infinity };
        bossFirstTryStats[canonName].count++;
        const killDuration = realFights[0].duration_seconds || Infinity;
        if (killDuration < bossFirstTryStats[canonName].fastestKillDuration) {
          bossFirstTryStats[canonName].fastestKillDuration = killDuration;
        }
        // Track for serial first try
        firstTryKills.push({ bossName: canonName, timestamp: realFights[0].timestamp });
      }

      if (kills > 0) bossesDefeated++;

      // Worst wall (most deaths on a single boss by a single player)
      if (deaths > 0 && (!worstWall || deaths > worstWall.deaths)) {
        worstWall = { discordId, bossName, deaths };
      }

      // Fastest kill & fight time
      for (const fight of fights) {
        if (fight.duration_seconds > 0) totalFightTime += fight.duration_seconds;
        if (fight.outcome === 'kill' && fight.duration_seconds > 0) {
          if (!fastestKill || fight.duration_seconds < fastestKill.duration) {
            fastestKill = { discordId, bossName, duration: fight.duration_seconds };
          }
        }
      }

      // Le Persévérant: most deaths before first kill (single-phase only here, multi-phase handled after loop)
      if (kills > 0 && !phase2ToPhase1[bossName] && !PHASE1_TO_PHASE2[bossName]) {
        const firstKillIdx = realFights.findIndex(f => f.outcome === 'kill');
        const deathsBeforeKill = realFights.slice(0, firstKillIdx).filter(f => f.outcome === 'death').length;
        if (deathsBeforeKill > 0 && (!perseverant || deathsBeforeKill > perseverant.deathsBeforeKill)) {
          perseverant = { discordId, bossName, deathsBeforeKill };
        }
      }

      // Boss global stats for unbeaten wall
      // For phase 2 bosses, attribute deaths to phase 1 name (canonical name)
      // Also strip zone qualifier (e.g. "Boss::Zone") to merge with base name
      const baseName = phase2ToPhase1[bossName] || bossName;
      const canonicalName = baseName.split('::')[0];
      if (!bossGlobalStats[canonicalName]) {
        bossGlobalStats[canonicalName] = { totalDeaths: 0, hasBeenKilled: false };
      }
      bossGlobalStats[canonicalName].totalDeaths += deaths;
      // Phase 2 kill or any kill means the boss is killed
      if (kills > 0) {
        bossGlobalStats[canonicalName].hasBeenKilled = true;
      }
    }

    // Le Persévérant: multi-phase bosses (all phase1 deaths + phase2 deaths before kill)
    for (const [p1Name, p2Name] of Object.entries(PHASE1_TO_PHASE2)) {
      const p2Fights = (player.bosses?.[p2Name]?.fights || []).filter(f => f.outcome !== 'encounter');
      const p2Kill = p2Fights.some(f => f.outcome === 'kill');
      if (p2Kill) {
        const p1Fights = (player.bosses?.[p1Name]?.fights || []).filter(f => f.outcome !== 'encounter');
        const p1Deaths = p1Fights.filter(f => f.outcome === 'death').length;
        const p2FirstKillIdx = p2Fights.findIndex(f => f.outcome === 'kill');
        const p2Deaths = p2Fights.slice(0, p2FirstKillIdx).filter(f => f.outcome === 'death').length;
        const totalDeathsBeforeKill = p1Deaths + p2Deaths;
        if (totalDeathsBeforeKill > 0 && (!perseverant || totalDeathsBeforeKill > perseverant.deathsBeforeKill)) {
          perseverant = { discordId, bossName: p1Name, deathsBeforeKill: totalDeathsBeforeKill };
        }
      }
    }
    // Godfrey endgame multi-phase
    const godP2Fights = (player.bosses?.[GODFREY_PHASES[1]]?.fights || []).filter(f => f.outcome !== 'encounter');
    if (godP2Fights.some(f => f.outcome === 'kill')) {
      const godP1Fights = (player.bosses?.[GODFREY_PHASES[0]]?.fights || []).filter(f => f.outcome !== 'encounter');
      const gp1Deaths = godP1Fights.filter(f => f.outcome === 'death').length;
      const gp2KillIdx = godP2Fights.findIndex(f => f.outcome === 'kill');
      const gp2Deaths = godP2Fights.slice(0, gp2KillIdx).filter(f => f.outcome === 'death').length;
      const godTotalDeaths = gp1Deaths + gp2Deaths;
      if (godTotalDeaths > 0 && (!perseverant || godTotalDeaths > perseverant.deathsBeforeKill)) {
        perseverant = { discordId, bossName: GODFREY_PHASES[0], deathsBeforeKill: godTotalDeaths };
      }
    }

    mostFirstTries.push({ discordId, count: firstTryCount });
    mostBossesDefeated.push({ discordId, count: bossesDefeated });
    if (totalFightTime > 0) gladiators.push({ discordId, totalFightTime });

    // Serial First Try: find longest consecutive first-try streak by chronological order
    if (firstTryKills.length >= 2) {
      // Sort all boss first-kills chronologically
      const allKills = [];
      for (const [bossName, bossData] of Object.entries(player.bosses || {})) {
        const fights = (bossData.fights || []).filter(f => f.outcome !== 'encounter');
        const firstKill = fights.find(f => f.outcome === 'kill');
        if (firstKill) {
          allKills.push({ bossName: phase2ToPhase1[bossName] || bossName, timestamp: firstKill.timestamp, firstTry: fights[0].outcome === 'kill' });
        }
      }
      allKills.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      // Find longest consecutive first-try streak
      let currentStreak = 0;
      let currentBosses = [];
      let bestStreak = 0;
      let bestBosses = [];
      for (const k of allKills) {
        if (k.firstTry) {
          currentStreak++;
          currentBosses.push(k.bossName);
        } else {
          if (currentStreak > bestStreak) { bestStreak = currentStreak; bestBosses = [...currentBosses]; }
          currentStreak = 0;
          currentBosses = [];
        }
      }
      if (currentStreak > bestStreak) { bestStreak = currentStreak; bestBosses = [...currentBosses]; }
      if (bestStreak >= 2 && (!serialFirstTry || bestStreak > serialFirstTry.streak)) {
        serialFirstTry = { discordId, streak: bestStreak, bosses: bestBosses };
      }
    }

    // Le No-Life: longest single session
    for (const session of (player.sessions || [])) {
      if (session.start && session.end) {
        const duration = Math.floor((new Date(session.end) - new Date(session.start)) / 1000);
        if (duration > 0 && (!noLife || duration > noLife.duration)) {
          noLife = { discordId, duration, start: session.start, end: session.end };
        }
      }
    }
  }

  // Filter out players with fewer than 2 bosses defeated (misclicks / non-players)
  const MIN_BOSSES = 2;
  mostFirstTries = mostFirstTries.filter(e => e.count > 0 && mostBossesDefeated.find(b => b.discordId === e.discordId)?.count >= MIN_BOSSES || false);
  mostBossesDefeated = mostBossesDefeated.filter(e => e.count >= MIN_BOSSES);
  gladiators = gladiators.filter(e => {
    const defeated = mostBossesDefeated.find(b => b.discordId === e.discordId);
    return defeated && defeated.count >= MIN_BOSSES;
  });

  mostFirstTries = mostFirstTries.sort((a, b) => b.count - a.count).slice(0, 3);
  mostBossesDefeated = mostBossesDefeated.sort((a, b) => b.count - a.count).slice(0, 3);
  gladiators = gladiators.sort((a, b) => b.totalFightTime - a.totalFightTime).slice(0, 3);

  // Unbeaten wall: boss with most deaths that nobody has killed
  // Skip phase 2 entries, and only consider bosses from the official route (no OCR ghosts)
  for (const [bossName, stats] of Object.entries(bossGlobalStats)) {
    if (phase2ToPhase1[bossName]) continue; // skip phase 2 names
    if (!routeBossNames.has(bossName)) continue; // skip OCR ghost entries not in route
    if (!stats.hasBeenKilled && stats.totalDeaths > 0) {
      if (!unbeatenWall || stats.totalDeaths > unbeatenWall.totalDeaths) {
        unbeatenWall = { bossName, totalDeaths: stats.totalDeaths };
      }
    }
  }

  // Boss le plus facile: most first-tries, tiebreak by fastest kill duration
  let easiestBoss = null;
  for (const [bossName, stats] of Object.entries(bossFirstTryStats)) {
    if (!easiestBoss
      || stats.count > easiestBoss.count
      || (stats.count === easiestBoss.count && stats.fastestKillDuration < easiestBoss.fastestKillDuration)) {
      easiestBoss = { bossName, count: stats.count, fastestKillDuration: stats.fastestKillDuration };
    }
  }

  return {
    mostFirstTries, worstWall, fastestKill, unbeatenWall, mostBossesDefeated,
    perseverant, gladiators, easiestBoss, noLife, serialFirstTry,
  };
}

// ============================================
// QUEST PROGRESS & WEB TOKENS
// ============================================

function getQuestProgress(discordId) {
  const data = readData();
  return data.eldenRing?.questProgress?.[discordId] || {};
}

function getQuestProgressById(discordId, questId) {
  const data = readData();
  return data.eldenRing?.questProgress?.[discordId]?.[questId] || null;
}

function toggleQuestStep(discordId, questId, stepId) {
  const data = readData();
  if (!data.eldenRing) data.eldenRing = {};
  if (!data.eldenRing.questProgress) data.eldenRing.questProgress = {};
  if (!data.eldenRing.questProgress[discordId]) data.eldenRing.questProgress[discordId] = {};
  if (!data.eldenRing.questProgress[discordId][questId]) {
    data.eldenRing.questProgress[discordId][questId] = {
      completedSteps: [],
      choicesMade: {},
      status: 'in_progress',
      notes: '',
    };
  }
  const progress = data.eldenRing.questProgress[discordId][questId];
  const idx = progress.completedSteps.indexOf(stepId);
  if (idx >= 0) {
    progress.completedSteps.splice(idx, 1);
  } else {
    progress.completedSteps.push(stepId);
    progress.completedSteps.sort((a, b) => a - b);
  }
  // Auto-update status
  if (progress.completedSteps.length === 0) {
    progress.status = 'not_started';
  } else if (progress.status === 'not_started') {
    progress.status = 'in_progress';
  }
  writeData(data);
  return progress;
}

function setQuestChoice(discordId, questId, choiceIndex, optionIndex) {
  const data = readData();
  if (!data.eldenRing) data.eldenRing = {};
  if (!data.eldenRing.questProgress) data.eldenRing.questProgress = {};
  if (!data.eldenRing.questProgress[discordId]) data.eldenRing.questProgress[discordId] = {};
  if (!data.eldenRing.questProgress[discordId][questId]) {
    data.eldenRing.questProgress[discordId][questId] = {
      completedSteps: [],
      choicesMade: {},
      status: 'in_progress',
      notes: '',
    };
  }
  data.eldenRing.questProgress[discordId][questId].choicesMade[String(choiceIndex)] = optionIndex;
  writeData(data);
  return data.eldenRing.questProgress[discordId][questId];
}

function setQuestStatus(discordId, questId, status) {
  const validStatuses = ['not_started', 'in_progress', 'completed', 'failed'];
  if (!validStatuses.includes(status)) return null;
  const data = readData();
  if (!data.eldenRing) data.eldenRing = {};
  if (!data.eldenRing.questProgress) data.eldenRing.questProgress = {};
  if (!data.eldenRing.questProgress[discordId]) data.eldenRing.questProgress[discordId] = {};
  if (!data.eldenRing.questProgress[discordId][questId]) {
    data.eldenRing.questProgress[discordId][questId] = {
      completedSteps: [],
      choicesMade: {},
      status: 'not_started',
      notes: '',
    };
  }
  data.eldenRing.questProgress[discordId][questId].status = status;
  writeData(data);
  return data.eldenRing.questProgress[discordId][questId];
}

function setQuestNote(discordId, questId, note) {
  const data = readData();
  if (!data.eldenRing) data.eldenRing = {};
  if (!data.eldenRing.questProgress) data.eldenRing.questProgress = {};
  if (!data.eldenRing.questProgress[discordId]) data.eldenRing.questProgress[discordId] = {};
  if (!data.eldenRing.questProgress[discordId][questId]) {
    data.eldenRing.questProgress[discordId][questId] = {
      completedSteps: [],
      choicesMade: {},
      status: 'not_started',
      notes: '',
    };
  }
  data.eldenRing.questProgress[discordId][questId].notes = note;
  writeData(data);
  return data.eldenRing.questProgress[discordId][questId];
}

// ============================================
// ITEM COLLECTION PROGRESS
// ============================================

function getItemProgress(discordId) {
  const data = readData();
  return data.eldenRing?.itemProgress?.[discordId] || {};
}

function toggleItemCollected(discordId, categoryKey, itemName) {
  const data = readData();
  if (!data.eldenRing) data.eldenRing = {};
  if (!data.eldenRing.itemProgress) data.eldenRing.itemProgress = {};
  if (!data.eldenRing.itemProgress[discordId]) data.eldenRing.itemProgress[discordId] = {};
  if (!data.eldenRing.itemProgress[discordId][categoryKey]) {
    data.eldenRing.itemProgress[discordId][categoryKey] = [];
  }
  const collected = data.eldenRing.itemProgress[discordId][categoryKey];
  const idx = collected.indexOf(itemName);
  if (idx >= 0) {
    collected.splice(idx, 1);
  } else {
    collected.push(itemName);
  }
  writeData(data);
  return data.eldenRing.itemProgress[discordId];
}

function getQuestWebToken(discordId) {
  // Reuse the existing ER API key as quest web token
  const apiKeyObj = getEldenRingApiKey(discordId);
  return apiKeyObj?.key || null;
}

function getDiscordIdByQuestToken(token) {
  // Reuse the existing ER API key lookup
  return getEldenRingPlayerByApiKey(token);
}

// ============================================
// FEATURE FLAGS
// ============================================

function getFeatureFlag(featureName) {
  const data = readData();
  if (!data.featureFlags) return null;
  const value = data.featureFlags[featureName];
  return value === undefined ? null : value;
}

function setFeatureFlag(featureName, enabled) {
  const data = readData();
  if (!data.featureFlags) data.featureFlags = {};
  data.featureFlags[featureName] = enabled;
  writeData(data);
}

// RGPD - Purge all user data
function purgeUserDataByDiscordId(discordId) {
  const data = readData();
  const deletedData = {
    wallet: false,
    giveaways: 0,
  };

  // Delete wallet
  if (data.wallets[discordId]) {
    delete data.wallets[discordId];
    deletedData.wallet = true;
  }

  // Remove from giveaways
  for (const [messageId, giveaway] of Object.entries(data.activeGiveaways || {})) {
    if (giveaway.participants && giveaway.participants.includes(discordId)) {
      giveaway.participants = giveaway.participants.filter(id => id !== discordId);
      deletedData.giveaways++;
    }
  }

  // Remove from spontaneous bets
  deletedData.spontaneousBets = 0;
  if (data.spontaneousBets) {
    for (const [betId, bet] of Object.entries(data.spontaneousBets)) {
      if (bet.options) {
        for (const option of bet.options) {
          if (option.bets && option.bets[discordId]) {
            delete option.bets[discordId];
            deletedData.spontaneousBets++;
          }
        }
      }
    }
  }

  // Delete transaction history
  if (data.transactionHistory && data.transactionHistory[discordId]) {
    delete data.transactionHistory[discordId];
    deletedData.transactionHistory = true;
  }

  writeData(data);
  return deletedData;
}

// ============================================
// RESET WALLET
// ============================================

function resetWallet(userId, toZero = false) {
  const data = readData();
  const wallet = data.wallets[userId];

  if (!wallet) {
    return { success: false, message: 'Portefeuille introuvable' };
  }

  const previousBalance = wallet.balance;
  const newBalance = toZero ? 0 : getStartingBalance();

  wallet.balance = newBalance;
  wallet.totalWon = 0;
  wallet.totalLost = 0;

  writeData(data);

  addTransaction(userId, 'ADMIN_RESET', newBalance - previousBalance, newBalance, {
    resetType: toZero ? 'zero' : 'starting',
    previousBalance
  });

  return { success: true, previousBalance, newBalance };
}

function resetAllWallets(toZero = false) {
  const data = readData();
  const newBalance = toZero ? 0 : getStartingBalance();
  let count = 0;

  const transactions = [];

  for (const userId of Object.keys(data.wallets)) {
    const wallet = data.wallets[userId];
    const previousBalance = wallet.balance;

    wallet.balance = newBalance;
    wallet.totalWon = 0;
    wallet.totalLost = 0;
    count++;

    transactions.push({
      userId, type: 'ADMIN_RESET', amount: newBalance - previousBalance, newBalance, metadata: {
        resetType: toZero ? 'zero' : 'starting',
        previousBalance,
        massReset: true
      }
    });
  }

  // Sauvegarder d'abord (wallets mis à jour)
  writeData(data);

  // Logger les transactions après le writeData (addTransaction fait son propre readData/writeData)
  for (const txn of transactions) {
    addTransaction(txn.userId, txn.type, txn.amount, txn.newBalance, txn.metadata);
  }

  return { success: true, count, newBalance };
}

function resetAllLeaderboards() {
  // LoL/TFT leaderboards have been removed; nothing to reset.
  return { success: true };
}

function cancelAllActiveBets() {
  const data = readData();
  // Rembourser et supprimer tous les paris spontanés actifs
  for (const [betId, bet] of Object.entries(data.spontaneousBets || {})) {
    if (bet.status !== 'resolved' && bet.status !== 'cancelled') {
      for (const [userId, betData] of Object.entries(bet.bets || {})) {
        if (!data.wallets[userId]) continue;
        data.wallets[userId].balance += betData.amount;
      }
    }
  }
  data.spontaneousBets = {};
  writeData(data);
  return { success: true };
}

// ============================================
// PARIS SPONTANÉS
// ============================================

function generateBetId() {
  return `sbet_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function generateOptionId() {
  return `opt_${Math.random().toString(36).substr(2, 8)}`;
}

function ensureSpontaneousBets() {
  const data = readData();
  if (!data.spontaneousBets) {
    data.spontaneousBets = {};
    writeData(data);
  }
}

function createSpontaneousBet(creatorId, channelId, question, options, endsAt = null) {
  ensureSpontaneousBets();
  const data = readData();

  const betId = generateBetId();
  const optionsWithIds = options.map(label => ({
    id: generateOptionId(),
    label,
    bets: {}
  }));

  data.spontaneousBets[betId] = {
    id: betId,
    creatorId,
    channelId,
    messageId: null,
    question,
    options: optionsWithIds,
    status: 'open',
    endsAt,
    createdAt: new Date().toISOString(),
    closedAt: null,
    resolvedAt: null,
    winningOptionId: null
  };

  writeData(data);
  return data.spontaneousBets[betId];
}

function getSpontaneousBet(betId) {
  const data = readData();
  return data.spontaneousBets?.[betId] || null;
}

function getActiveSpontaneousBets() {
  const data = readData();
  if (!data.spontaneousBets) return [];
  return Object.values(data.spontaneousBets).filter(bet => bet.status === 'open');
}

function getAllSpontaneousBets() {
  const data = readData();
  return data.spontaneousBets || {};
}

function updateSpontaneousBetMessageId(betId, messageId) {
  const data = readData();
  if (data.spontaneousBets?.[betId]) {
    data.spontaneousBets[betId].messageId = messageId;
    writeData(data);
  }
}

function calculateSpontaneousOdds(betId) {
  const bet = getSpontaneousBet(betId);
  if (!bet) return null;

  // Calcul du pool total
  let totalPool = 0;
  const optionTotals = {};

  for (const option of bet.options) {
    let optionTotal = 0;
    for (const betData of Object.values(option.bets)) {
      optionTotal += betData.amount;
    }
    optionTotals[option.id] = optionTotal;
    totalPool += optionTotal;
  }

  // Calcul des cotes parimutuel avec seed pool
  const seedPool = config.betting.seedPool;
  const playerCut = config.betting.playerCutPercent / 100;
  const effectivePool = (totalPool + seedPool * bet.options.length) * (1 - playerCut);

  const odds = {};
  for (const option of bet.options) {
    const effectiveOptionTotal = optionTotals[option.id] + seedPool;
    let optionOdds = effectivePool / effectiveOptionTotal;
    // Garantit une cote minimum de 1.05 et maximum de 20
    optionOdds = Math.max(1.05, Math.min(20, optionOdds));
    odds[option.id] = {
      odds: optionOdds,
      total: optionTotals[option.id],
      count: Object.keys(option.bets).length
    };
  }

  return { odds, totalPool };
}

function placeSpontaneousBet(betId, odUserId, optionId, amount) {
  const data = readData();
  const bet = data.spontaneousBets?.[betId];

  if (!bet) return { success: false, message: 'Pari introuvable' };
  if (bet.status !== 'open') return { success: false, message: 'Les paris sont fermés' };

  // Vérifie si endsAt est passé
  if (bet.endsAt && new Date(bet.endsAt) < new Date()) {
    return { success: false, message: 'Le temps de pari est écoulé' };
  }

  const option = bet.options.find(o => o.id === optionId);
  if (!option) return { success: false, message: 'Option invalide' };

  // Vérifie si l'utilisateur a déjà parié sur une autre option
  for (const opt of bet.options) {
    if (opt.id !== optionId && opt.bets[odUserId]) {
      return { success: false, message: 'Vous avez déjà parié sur une autre option' };
    }
  }

  // Gestion du wallet
  if (!data.wallets[odUserId]) {
    data.wallets[odUserId] = {
      odUserId,
      balance: getStartingBalance(),
      totalWon: 0,
      totalLost: 0,
      createdAt: new Date().toISOString(),
    };
  }

  const existingBet = option.bets[odUserId];

  // Vérifier si la modification de pari est autorisée
  if (existingBet && !getFeatures().isEnabled('bet_modification')) {
    return { success: false, message: 'La modification des paris est désactivée. Vous avez déjà parié.' };
  }

  if (existingBet) {
    data.wallets[odUserId].balance += existingBet.amount;
  }

  if (data.wallets[odUserId].balance < amount) {
    return { success: false, message: `Solde insuffisant (vous avez ${data.wallets[odUserId].balance} Runes)` };
  }

  data.wallets[odUserId].balance -= amount;

  // Calculer les cotes AVANT d'ajouter le pari
  const oddsInfo = calculateSpontaneousOdds(betId);
  const lockedOdds = oddsInfo?.odds[optionId]?.odds || 2.0;

  // Marquer le premier parieur éligible (spontané)
  if (getFeatures().isEnabled('first_bettor_bonus') && !data.spontaneousBets[betId].firstBettorId) {
    if (odUserId !== config.llm.botWalletId) {
      data.spontaneousBets[betId].firstBettorId = odUserId;
    }
  }

  // Ajouter le pari
  option.bets[odUserId] = { amount, lockedOdds, placedAt: new Date().toISOString() };
  writeData(data);

  // Log transaction
  addTransaction(odUserId, 'SPONTANEOUS_BET_PLACED', -amount, data.wallets[odUserId].balance, {
    betId,
    question: bet.question,
    optionLabel: option.label,
    description: `Pari spontané: ${option.label}`,
    lockedOdds
  });

  return {
    success: true,
    newBalance: data.wallets[odUserId].balance,
    lockedOdds,
    oddsInfo: calculateSpontaneousOdds(betId)
  };
}

function removeSpontaneousBet(betId, odUserId) {
  const data = readData();
  const bet = data.spontaneousBets?.[betId];
  if (!bet || bet.status !== 'open') return { success: false };

  for (const option of bet.options) {
    const userBet = option.bets[odUserId];
    if (userBet) {
      if (data.wallets[odUserId]) {
        data.wallets[odUserId].balance += userBet.amount;
      }
      const newBalance = data.wallets[odUserId]?.balance || 0;
      delete option.bets[odUserId];
      writeData(data);

      addTransaction(odUserId, 'SPONTANEOUS_BET_REMOVED', userBet.amount, newBalance, {
        betId,
        question: bet.question,
        description: `Pari spontané annulé`
      });

      return { success: true, refundedAmount: userBet.amount };
    }
  }

  return { success: false, message: 'Pari non trouvé' };
}

function getUserSpontaneousBet(betId, odUserId) {
  const bet = getSpontaneousBet(betId);
  if (!bet) return null;

  for (const option of bet.options) {
    if (option.bets[odUserId]) {
      return { optionId: option.id, optionLabel: option.label, ...option.bets[odUserId] };
    }
  }
  return null;
}

function closeSpontaneousBets(betId) {
  const data = readData();
  if (data.spontaneousBets?.[betId]) {
    data.spontaneousBets[betId].status = 'closed';
    data.spontaneousBets[betId].closedAt = new Date().toISOString();
    writeData(data);
    return true;
  }
  return false;
}

function resolveSpontaneousBet(betId, winningOptionId) {
  const data = readData();
  const bet = data.spontaneousBets?.[betId];

  if (!bet) return { success: false, message: 'Pari introuvable' };
  if (bet.status === 'resolved') return { success: false, message: 'Pari déjà résolu' };
  if (bet.status === 'cancelled') return { success: false, message: 'Pari annulé' };

  const winningOption = bet.options.find(o => o.id === winningOptionId);
  if (!winningOption) return { success: false, message: 'Option gagnante invalide' };

  const winners = [];
  const losers = [];
  let totalPool = 0;

  // Collecter tous les parieurs
  for (const option of bet.options) {
    for (const [odUserId, betData] of Object.entries(option.bets)) {
      totalPool += betData.amount;
      if (option.id === winningOptionId) {
        winners.push({ odUserId, amount: betData.amount, lockedOdds: betData.lockedOdds || 2.0 });
      } else {
        losers.push({ odUserId, amount: betData.amount, optionLabel: option.label });
      }
    }
  }

  // Distribuer les gains
  const transactions = [];

  for (const winner of winners) {
    const totalReturn = Math.floor(winner.amount * winner.lockedOdds);
    let profit = totalReturn - winner.amount;

    // Bonus premier parieur (sur les gains)
    if (getFeatures().isEnabled('first_bettor_bonus') && bet.firstBettorId === winner.odUserId) {
      const fbPercent = getFirstBettorBonusPercent() / 100;
      const fbBonus = Math.floor(profit * fbPercent);
      profit += fbBonus;
      winner.firstBettorBonus = fbBonus;
    }

    const finalReturn = winner.amount + profit;
    data.wallets[winner.odUserId].balance += finalReturn;
    data.wallets[winner.odUserId].totalWon += profit;
    winner.profit = profit;

    transactions.push({
      userId: winner.odUserId, type: 'SPONTANEOUS_BET_WON', amount: finalReturn,
      newBalance: data.wallets[winner.odUserId].balance, metadata: {
        betId,
        question: bet.question,
        winningOption: winningOption.label,
        description: `Pari spontané gagné: ${winningOption.label}`,
        profit,
        lockedOdds: winner.lockedOdds,
        firstBettorBonus: winner.firstBettorBonus
      }
    });
  }

  // Logger les perdants
  for (const loser of losers) {
    if (data.wallets[loser.odUserId].totalLost === undefined) {
      data.wallets[loser.odUserId].totalLost = 0;
    }
    data.wallets[loser.odUserId].totalLost += loser.amount;
    loser.loss = loser.amount;

    // Remboursement premier parieur (sur les pertes)
    if (getFeatures().isEnabled('first_bettor_bonus') && bet.firstBettorId === loser.odUserId) {
      const fbPercent = getFirstBettorBonusPercent() / 100;
      const refundAmount = Math.floor(loser.amount * fbPercent);
      data.wallets[loser.odUserId].balance += refundAmount;
      loser.firstBettorRefund = refundAmount;
    }

    transactions.push({
      userId: loser.odUserId, type: 'SPONTANEOUS_BET_LOST', amount: 0,
      newBalance: data.wallets[loser.odUserId].balance, metadata: {
        betId,
        question: bet.question,
        winningOption: winningOption.label,
        description: `Pari spontané perdu`,
        lostAmount: loser.amount,
        firstBettorRefund: loser.firstBettorRefund
      }
    });
    if (loser.firstBettorRefund) {
      transactions.push({
        userId: loser.odUserId, type: 'FIRST_BETTOR_REFUND', amount: loser.firstBettorRefund,
        newBalance: data.wallets[loser.odUserId].balance, metadata: {
          betId,
          description: `Remboursement premier parieur (${getFirstBettorBonusPercent()}%)`
        }
      });
    }
  }

  // Mettre à jour le statut du pari
  bet.status = 'resolved';
  bet.resolvedAt = new Date().toISOString();
  bet.winningOptionId = winningOptionId;
  if (!bet.closedAt) bet.closedAt = bet.resolvedAt;

  // Sauvegarder d'abord (wallets mis à jour + pari résolu)
  writeData(data);

  // Logger les transactions après le writeData (addTransaction fait son propre readData/writeData)
  for (const txn of transactions) {
    addTransaction(txn.userId, txn.type, txn.amount, txn.newBalance, txn.metadata);
  }

  return {
    success: true,
    winners,
    losers,
    totalPool,
    winningOption: winningOption.label
  };
}

function cancelSpontaneousBet(betId, reason = null) {
  const data = readData();
  const bet = data.spontaneousBets?.[betId];

  if (!bet) return { success: false, message: 'Pari introuvable' };
  if (bet.status === 'resolved') return { success: false, message: 'Pari déjà résolu, impossible d\'annuler' };
  if (bet.status === 'cancelled') return { success: false, message: 'Pari déjà annulé' };

  let refundCount = 0;

  // Collecter les remboursements
  const refunds = [];
  for (const option of bet.options) {
    for (const [odUserId, betData] of Object.entries(option.bets)) {
      if (!data.wallets[odUserId]) continue;

      data.wallets[odUserId].balance += betData.amount;
      refundCount++;
      refunds.push({ odUserId, amount: betData.amount, newBalance: data.wallets[odUserId].balance });
    }
  }

  bet.status = 'cancelled';
  bet.closedAt = new Date().toISOString();
  bet.cancelReason = reason;

  // Sauvegarder d'abord (wallets mis à jour + statut annulé)
  writeData(data);

  // Logger les transactions après le writeData (addTransaction fait son propre readData/writeData)
  for (const refund of refunds) {
    addTransaction(refund.odUserId, 'SPONTANEOUS_BET_REFUND', refund.amount, refund.newBalance, {
      betId,
      question: bet.question,
      description: `Pari spontané annulé - Remboursement`,
      reason
    });
  }

  return { success: true, refundCount };
}

function deleteSpontaneousBet(betId) {
  const data = readData();
  if (data.spontaneousBets?.[betId]) {
    delete data.spontaneousBets[betId];
    writeData(data);
    return true;
  }
  return false;
}

function checkExpiredSpontaneousBets() {
  const data = readData();
  if (!data.spontaneousBets) return [];

  const now = new Date();
  const expired = [];

  for (const bet of Object.values(data.spontaneousBets)) {
    if (bet.status === 'open' && bet.endsAt && new Date(bet.endsAt) < now) {
      bet.status = 'closed';
      bet.closedAt = now.toISOString();
      expired.push(bet);
    }
  }

  if (expired.length > 0) {
    writeData(data);
  }

  return expired;
}

// ============================================================
// DLC Predictions — multi-runs
// ============================================================

function getDlcRuns() {
  const data = readData();
  return data.eldenRing?.dlcRuns || {};
}

function getDlcRun(runId) {
  const data = readData();
  return data.eldenRing?.dlcRuns?.[runId] || null;
}

// L'unique run active (non lockée) appartenant à un owner donné, ou null.
function getActiveDlcRunByOwner(ownerId) {
  const runs = getDlcRuns();
  for (const r of Object.values(runs)) {
    if (r.owner === ownerId && !r.lockedAt) return r;
  }
  return null;
}

function initDlcRun(ownerId, ownerUsername) {
  const data = readData();
  if (!data.eldenRing) data.eldenRing = {};
  if (!data.eldenRing.dlcRuns) data.eldenRing.dlcRuns = {};

  // Reject si l'owner a déjà une run active non lockée
  for (const r of Object.values(data.eldenRing.dlcRuns)) {
    if (r.owner === ownerId && !r.lockedAt) {
      return { ok: false, error: 'already_active', run: r };
    }
  }

  const now = new Date().toISOString();
  const runId = `r_${Date.now()}_${ownerId.substring(0, 4)}`;
  data.eldenRing.dlcRuns[runId] = {
    runId,
    owner: ownerId,
    ownerUsername,
    initializedAt: now,
    lockedAt: null,
    lockedBy: null,
    predictions: {},
  };
  writeData(data);
  return { ok: true, run: data.eldenRing.dlcRuns[runId] };
}

function setDlcPredictionInRun(runId, predictorId, username, bossName, value) {
  const data = readData();
  const run = data.eldenRing?.dlcRuns?.[runId];
  if (!run) return { ok: false, error: 'run_not_found' };
  if (run.lockedAt) return { ok: false, error: 'locked' };

  const now = new Date().toISOString();
  if (!run.predictions[predictorId]) {
    run.predictions[predictorId] = { username, predictions: {}, updatedAt: now };
  }
  run.predictions[predictorId].username = username;
  run.predictions[predictorId].predictions[bossName] = value;
  run.predictions[predictorId].updatedAt = now;
  writeData(data);
  return { ok: true, run };
}

function lockDlcRun(runId, reason) {
  const data = readData();
  const run = data.eldenRing?.dlcRuns?.[runId];
  if (!run) return { newlyLocked: false, error: 'run_not_found' };
  if (run.lockedAt) return { newlyLocked: false, run };
  run.lockedAt = new Date().toISOString();
  run.lockedBy = reason || 'auto';
  writeData(data);
  return { newlyLocked: true, run };
}

function resetDlcRun(runId) {
  const data = readData();
  if (!data.eldenRing?.dlcRuns?.[runId]) return false;
  delete data.eldenRing.dlcRuns[runId];
  writeData(data);
  return true;
}

function getEldenRingDisplayName(discordId) {
  const data = readData();
  return data.eldenRing?.displayNames?.[discordId] || null;
}

function setEldenRingDisplayName(discordId, name) {
  const data = readData();
  if (!data.eldenRing) data.eldenRing = {};
  if (!data.eldenRing.displayNames) data.eldenRing.displayNames = {};
  data.eldenRing.displayNames[discordId] = name;

  // Propagate to all runs (owner + predictions entries)
  for (const run of Object.values(data.eldenRing.dlcRuns || {})) {
    if (run.owner === discordId) run.ownerUsername = name;
    if (run.predictions?.[discordId]) run.predictions[discordId].username = name;
  }

  writeData(data);
  return name;
}

module.exports = {
  // Channel
  getNotificationChannelId,
  setNotificationChannelId,
  // Wallets
  getWallet,
  ensureWallet,
  getBalance,
  addCoins,
  deductCoins,
  getWealthLeaderboard,
  // Settings
  getBetWindowMinutes,
  setBetWindowMinutes,
  getLinkedPlayerBetWindowMinutes,
  setLinkedPlayerBetWindowMinutes,
  getMinBetFlat,
  setMinBetFlat,
  getMinBetPercent,
  setMinBetPercent,
  calculateMinBet,
  getShowBetAmounts,
  setShowBetAmounts,
  getGoldenOfferThreshold,
  setGoldenOfferThreshold,
  getGoldenOfferBonus,
  setGoldenOfferBonus,
  getFirstBettorBonusPercent,
  setFirstBettorBonusPercent,
  getFirstBettorLinkedPlayerEligible,
  setFirstBettorLinkedPlayerEligible,
  // Odds settings
  getSeedPool,
  setSeedPool,
  getBookmakerMarginPercent,
  setBookmakerMarginPercent,
  getMaxMinorityBonusPercent,
  setMaxMinorityBonusPercent,
  getStreakBonusPercent,
  setStreakBonusPercent,
  getStreakThreshold,
  setStreakThreshold,
  getDefaultWinratePercent,
  setDefaultWinratePercent,
  // Reward settings
  getStartingBalance,
  setStartingBalance,
  getPlayerBaseReward,
  setPlayerBaseReward,
  getPlayerCutPercent,
  setPlayerCutPercent,
  getSoloBetBonusPercent,
  setSoloBetBonusPercent,
  // Betting Mode
  getBettingMode,
  setBettingMode,
  hasActiveGameBets,
  // Mission settings (kept for /settings panel compatibility)
  getDailyGamesRequired,
  setDailyGamesRequired,
  getDailyWheelPrizes,
  setDailyWheelPrizes,
  getWeeklyGamesRequired,
  setWeeklyGamesRequired,
  getWeeklyWheelPrizes,
  setWeeklyWheelPrizes,
  getWeeklyBonusChance,
  setWeeklyBonusChance,
  // Giveaways
  createGiveaway,
  getGiveaway,
  getActiveGiveaways,
  addGiveawayParticipant,
  getGiveawayParticipants,
  deleteGiveaway,
  // RGPD
  purgeUserDataByDiscordId,
  // Transaction history
  addTransaction,
  getTransactionHistory,
  adminAdjustBalance,
  // LLM Settings
  getLlmSettings,
  setLlmSettings,
  getLlmMode,
  setLlmMode,
  getLlmContextLevel,
  setLlmContextLevel,
  isLlmEnabled,
  setLlmEnabled,
  // Feature Flags
  getFeatureFlag,
  setFeatureFlag,
  // Reset Wallet
  resetWallet,
  resetAllWallets,
  resetAllLeaderboards,
  cancelAllActiveBets,
  // Paris Spontanés
  createSpontaneousBet,
  getSpontaneousBet,
  getActiveSpontaneousBets,
  getAllSpontaneousBets,
  updateSpontaneousBetMessageId,
  calculateSpontaneousOdds,
  placeSpontaneousBet,
  removeSpontaneousBet,
  getUserSpontaneousBet,
  closeSpontaneousBets,
  resolveSpontaneousBet,
  cancelSpontaneousBet,
  deleteSpontaneousBet,
  checkExpiredSpontaneousBets,
  // Wallet
  setWalletBalance,
  // Elden Ring
  getEldenRingApiKey,
  setEldenRingApiKey,
  getEldenRingPlayerByApiKey,
  deleteEldenRingApiKey,
  getEldenRingPlayer,
  ensureEldenRingPlayer,
  addEldenRingFight,
  getEldenRingBossFights,
  removeEldenRingBossKill,
  removeEldenRingBossData,
  incrementEldenRingGlobalDeaths,
  startEldenRingSession,
  endEldenRingSession,
  getEldenRingSessionFights,
  isEldenRingEventSeen,
  markEldenRingEventSeen,
  cleanEldenRingSeenEvents,
  // Elden Ring Betting
  createEldenRingBet,
  getEldenRingBet,
  getActiveEldenRingFightId,
  getEldenRingBossDefeatRate,
  calculateEldenRingOdds,
  placeEldenRingBet,
  closeEldenRingBet,
  cancelEldenRingBet,
  getAllActiveEldenRingBets,
  // Elden Ring Bet Cycles
  getEldenRingCycleSize,
  setEldenRingCycleSize,
  getActiveBetCycle,
  createBetCycle,
  setBetCycleEncounterScreenshot,
  setBetCycleSelectedZone,
  addPendingFight,
  flushPendingFights,
  migrateEldenRingFightsToZonedKey,
  migrateEldenRingKillsToZones,
  getEldenRingDuplicateBossesForMigration,

  incrementBetCycleDeathCount,
  placeBetCycleBet,
  resolveBetCycle,
  cancelBetCycle,
  getBetCycle,
  getAllActiveBetCycles,
  resetEldenRingPlayerStats,
  // Elden Ring Stats
  getAllEldenRingPlayerIds,
  getEldenRingPlayerStats,
  getEldenRingLeaderboard,
  getEldenRingBossDifficulty,
  getEldenRingNemesis,
  getEldenRingHallOfFame,
  // Quest Progress
  getQuestProgress,
  getQuestProgressById,
  toggleQuestStep,
  setQuestChoice,
  setQuestStatus,
  setQuestNote,
  getQuestWebToken,
  getDiscordIdByQuestToken,
  // Item Progress
  getItemProgress,
  toggleItemCollected,
  // Boss Data
  archiveEldenRingBossData,
  // DLC Predictions (multi-runs)
  getDlcRuns,
  getDlcRun,
  getActiveDlcRunByOwner,
  initDlcRun,
  setDlcPredictionInRun,
  lockDlcRun,
  resetDlcRun,
  getEldenRingDisplayName,
  setEldenRingDisplayName,
};

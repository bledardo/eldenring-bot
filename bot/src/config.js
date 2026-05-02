require('dotenv').config();

module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    notificationChannelId: process.env.NOTIFICATION_CHANNEL_ID,
  },
  dataPath: process.env.DATA_PATH || './data/players.json',
  debug: process.env.DEBUG === 'true',
  // Monnaie virtuelle (Runes)
  currency: {
    name: process.env.CURRENCY_NAME || 'Runes',
    symbol: process.env.CURRENCY_SYMBOL || '🪙',
  },
  adminUserId: process.env.ADMIN_USER_ID || null,
  betWindowMinutes: parseInt(process.env.BET_WINDOW_MINUTES, 10) || 5,
  linkedPlayerBetWindowMinutes: parseInt(process.env.LINKED_PLAYER_BET_WINDOW_MINUTES, 10) || 2,
  startingBalance: parseInt(process.env.STARTING_BALANCE, 10) || 5000,
  // Récompense fixe attribuée au joueur lié à la clé API à chaque boss tué
  bossKillReward: parseInt(process.env.BOSS_KILL_REWARD, 10) || 200,
  // Taux de distribution des paris
  betting: {
    bonusAllWinnersPercent: parseInt(process.env.BONUS_ALL_WINNERS_PERCENT, 10) || 10,
    playerCutPercent: parseInt(process.env.PLAYER_CUT_PERCENT, 10) || 10,
    playerBaseReward: parseInt(process.env.PLAYER_BASE_REWARD, 10) || 100,
    soloBetBonusPercent: parseInt(process.env.SOLO_BET_BONUS_PERCENT, 10) || 25,
    seedPool: parseInt(process.env.SEED_POOL, 10) || 500,
    bookmakerMarginPercent: parseInt(process.env.BOOKMAKER_MARGIN_PERCENT, 10) || 5,
    maxMinorityBonusPercent: parseInt(process.env.MAX_MINORITY_BONUS_PERCENT, 10) || 50,
    streakBonusPercent: parseInt(process.env.STREAK_BONUS_PERCENT, 10) || 20,
    streakThreshold: parseInt(process.env.STREAK_THRESHOLD, 10) || 3,
    defaultWinratePercent: parseInt(process.env.DEFAULT_WINRATE_PERCENT, 10) || 50,
  },
  llm: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'mistral:7b',
    enabled: process.env.LLM_ENABLED === 'true',
    defaultMode: process.env.LLM_DEFAULT_MODE || 'normal',
    defaultContextLevel: process.env.LLM_DEFAULT_CONTEXT || 'complet',
    botName: process.env.LLM_BOT_NAME || 'Tarnished',
    personality: process.env.LLM_PERSONALITY || 'un compagnon des Terres Intermédiaires, sarcastique mais respectueux, qui chambre les Sans-éclat',
    responseStyle: process.env.LLM_RESPONSE_STYLE || 'Phrases courtes et percutantes. Références Souls/Elden Ring assumées.',
    systemPrompt: process.env.LLM_SYSTEM_PROMPT || null,
    promptGameStart: process.env.LLM_PROMPT_GAME_START || null,
    promptGameEnd: process.env.LLM_PROMPT_GAME_END || null,
    promptBetReaction: process.env.LLM_PROMPT_BET_REACTION || null,
    promptMention: process.env.LLM_PROMPT_MENTION || null,
    botWalletId: 'LLM_BOT_WALLET',
  },
  // Elden Ring Watcher API
  eldenRing: {
    apiPort: parseInt(process.env.ER_API_PORT, 10) || 3000,
    apiKeyLength: 32,
    publicHost: process.env.ER_PUBLIC_HOST || '',
  },
};

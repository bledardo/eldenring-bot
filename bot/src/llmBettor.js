const config = require('./config');
const storage = require('./storage');

const BOT_WALLET_ID = config.llm.botWalletId;
const STARTING_BALANCE = 1000;

function ensureBotWallet() {
  const wallet = storage.getWallet(BOT_WALLET_ID);
  if (!wallet) {
    storage.ensureWallet(BOT_WALLET_ID);
    const currentWallet = storage.getWallet(BOT_WALLET_ID);
    if (currentWallet && currentWallet.balance !== STARTING_BALANCE) {
      storage.setWalletBalance(BOT_WALLET_ID, STARTING_BALANCE);
    }
  }
  return storage.getWallet(BOT_WALLET_ID);
}

function getBotStats() {
  const wallet = storage.getWallet(BOT_WALLET_ID);
  return {
    balance: wallet?.balance || 0,
    totalWins: 0,
    totalLosses: 0,
  };
}

function isBotWallet(userId) {
  return userId === BOT_WALLET_ID;
}

module.exports = {
  ensureBotWallet,
  getBotStats,
  isBotWallet,
  BOT_WALLET_ID,
};

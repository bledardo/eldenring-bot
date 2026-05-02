import { describe, it, expect, vi, beforeEach } from 'vitest';

// Pure function tests - extracted logic equivalent to storage.js functions

function calculateBaseOdds(winrate, bookmakerMarginPercent = 5) {
  const margin = bookmakerMarginPercent / 100;
  const fairnessMultiplier = 1 - margin;
  const clampedWinrate = Math.max(0.1, Math.min(0.9, winrate));
  const winOdds = (1 / clampedWinrate) * fairnessMultiplier;
  const loseOdds = (1 / (1 - clampedWinrate)) * fairnessMultiplier;
  return { winOdds, loseOdds };
}

function getEldenRingBossDefeatRate(fights) {
  if (!fights || fights.length === 0) return 0.75;
  const deaths = fights.filter(f => f.outcome === 'death').length;
  return deaths / fights.length;
}

function calculateEldenRingOdds(fights) {
  const defeatRate = getEldenRingBossDefeatRate(fights);
  const { winOdds, loseOdds } = calculateBaseOdds(1 - defeatRate);
  return { victoireOdds: winOdds, defaiteOdds: loseOdds, defeatRate };
}

function getActiveEldenRingFightId(bets, discordUserId, bossName) {
  for (const [fightId, bet] of Object.entries(bets)) {
    if (bet.discordUserId === discordUserId && bet.bossName === bossName && !bet.closedAt) {
      return fightId;
    }
  }
  return null;
}

function placeEldenRingBetLogic(bet, wallet, prediction, amount, odds, featureFlags) {
  if (!bet) return { success: false, message: 'Pari introuvable' };
  if (bet.closedAt) return { success: false, message: 'Les paris sont fermes' };

  const existingBet = bet.bets[wallet.odUserId];
  if (existingBet && existingBet.prediction !== prediction) {
    return { success: false, message: "Vous avez deja parie sur l'autre resultat" };
  }
  if (existingBet && !featureFlags.bet_modification) {
    return { success: false, message: 'La modification des paris est desactivee. Vous avez deja parie.' };
  }

  let balance = wallet.balance;
  if (existingBet) balance += existingBet.amount;
  if (balance < amount) {
    return { success: false, message: `Solde insuffisant (vous avez ${balance} Runes)` };
  }

  balance -= amount;
  const lockedOdds = prediction === 'victoire' ? odds.victoireOdds : odds.defaiteOdds;
  return { success: true, newBalance: balance, lockedOdds };
}

function closeEldenRingBetLogic(bet, result) {
  if (!bet) return { winners: [], losers: [] };
  const winners = [];
  const losers = [];

  for (const [odUserId, betData] of Object.entries(bet.bets)) {
    if (betData.prediction === result) {
      const totalReturn = Math.floor(betData.amount * betData.lockedOdds);
      const profit = totalReturn - betData.amount;
      winners.push({ odUserId, amount: betData.amount, profit, lockedOdds: betData.lockedOdds });
    } else {
      losers.push({ odUserId, amount: betData.amount, loss: betData.amount });
    }
  }
  return { winners, losers };
}

function cancelEldenRingBetLogic(bet) {
  if (!bet) return { refundCount: 0, refunds: [] };
  const refunds = [];
  for (const [odUserId, betData] of Object.entries(bet.bets)) {
    refunds.push({ odUserId, amount: betData.amount });
  }
  return { refundCount: refunds.length, refunds };
}

describe('Elden Ring Betting - Pure Logic', () => {
  describe('getEldenRingBossDefeatRate', () => {
    it('should return 0.75 for unknown boss (no fights)', () => {
      expect(getEldenRingBossDefeatRate([])).toBe(0.75);
      expect(getEldenRingBossDefeatRate(null)).toBe(0.75);
      expect(getEldenRingBossDefeatRate(undefined)).toBe(0.75);
    });

    it('should compute correctly from fight history', () => {
      const fights = [
        { outcome: 'death' },
        { outcome: 'death' },
        { outcome: 'death' },
        { outcome: 'kill' },
      ];
      expect(getEldenRingBossDefeatRate(fights)).toBe(0.75); // 3/4
    });

    it('should return 0 for all kills', () => {
      const fights = [{ outcome: 'kill' }, { outcome: 'kill' }];
      expect(getEldenRingBossDefeatRate(fights)).toBe(0);
    });

    it('should return 1 for all deaths', () => {
      const fights = [{ outcome: 'death' }, { outcome: 'death' }];
      expect(getEldenRingBossDefeatRate(fights)).toBe(1);
    });
  });

  describe('calculateEldenRingOdds', () => {
    it('should use defeat rate to calculate odds via calculateBaseOdds', () => {
      // 75% defeat rate → winrate = 0.25 → high victoire odds
      const odds = calculateEldenRingOdds([]);
      expect(odds.defeatRate).toBe(0.75);
      expect(odds.victoireOdds).toBeGreaterThan(odds.defaiteOdds);
      // victoireOdds should be around 3.8 (1/0.25 * 0.95)
      expect(odds.victoireOdds).toBeGreaterThan(3);
    });

    it('should give lower victoire odds for easy bosses', () => {
      // 2 deaths, 8 kills = 20% defeat rate → winrate = 0.8 → low victoire odds
      const fights = [
        ...Array(2).fill({ outcome: 'death' }),
        ...Array(8).fill({ outcome: 'kill' }),
      ];
      const odds = calculateEldenRingOdds(fights);
      expect(odds.defeatRate).toBe(0.2);
      expect(odds.victoireOdds).toBeLessThan(2);
    });
  });

  describe('getActiveEldenRingFightId', () => {
    it('should find open bet for player+boss', () => {
      const bets = {
        fight_abc: {
          discordUserId: 'player1',
          bossName: 'Margit',
          closedAt: null,
        },
      };
      expect(getActiveEldenRingFightId(bets, 'player1', 'Margit')).toBe('fight_abc');
    });

    it('should return null for closed bet', () => {
      const bets = {
        fight_abc: {
          discordUserId: 'player1',
          bossName: 'Margit',
          closedAt: '2026-01-01T00:00:00Z',
        },
      };
      expect(getActiveEldenRingFightId(bets, 'player1', 'Margit')).toBeNull();
    });

    it('should not match different player', () => {
      const bets = {
        fight_abc: {
          discordUserId: 'player2',
          bossName: 'Margit',
          closedAt: null,
        },
      };
      expect(getActiveEldenRingFightId(bets, 'player1', 'Margit')).toBeNull();
    });

    it('should not match different boss', () => {
      const bets = {
        fight_abc: {
          discordUserId: 'player1',
          bossName: 'Godrick',
          closedAt: null,
        },
      };
      expect(getActiveEldenRingFightId(bets, 'player1', 'Margit')).toBeNull();
    });
  });

  describe('placeEldenRingBetLogic', () => {
    const baseBet = {
      discordUserId: 'player1',
      bossName: 'Margit',
      bets: {},
      closedAt: null,
    };
    const baseWallet = { odUserId: 'bettor1', balance: 1000 };
    const baseOdds = { victoireOdds: 3.8, defaiteOdds: 1.27 };
    const baseFlags = { bet_modification: false };

    it('should deduct amount and lock odds for victoire', () => {
      const result = placeEldenRingBetLogic(baseBet, baseWallet, 'victoire', 100, baseOdds, baseFlags);
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(900);
      expect(result.lockedOdds).toBe(3.8);
    });

    it('should deduct amount and lock odds for defaite', () => {
      const result = placeEldenRingBetLogic(baseBet, baseWallet, 'defaite', 100, baseOdds, baseFlags);
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(900);
      expect(result.lockedOdds).toBe(1.27);
    });

    it('should reject insufficient balance', () => {
      const poorWallet = { odUserId: 'bettor1', balance: 10 };
      const result = placeEldenRingBetLogic(baseBet, poorWallet, 'victoire', 100, baseOdds, baseFlags);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Solde insuffisant');
    });

    it('should reject bet on opposite prediction', () => {
      const betWithExisting = {
        ...baseBet,
        bets: { bettor1: { prediction: 'victoire', amount: 50, lockedOdds: 3.8 } },
      };
      const result = placeEldenRingBetLogic(betWithExisting, baseWallet, 'defaite', 100, baseOdds, baseFlags);
      expect(result.success).toBe(false);
      expect(result.message).toContain('autre resultat');
    });

    it('should reject closed bets', () => {
      const closedBet = { ...baseBet, closedAt: '2026-01-01T00:00:00Z' };
      const result = placeEldenRingBetLogic(closedBet, baseWallet, 'victoire', 100, baseOdds, baseFlags);
      expect(result.success).toBe(false);
      expect(result.message).toContain('fermes');
    });

    it('should reject null bet', () => {
      const result = placeEldenRingBetLogic(null, baseWallet, 'victoire', 100, baseOdds, baseFlags);
      expect(result.success).toBe(false);
    });
  });

  describe('closeEldenRingBetLogic', () => {
    it('should separate winners and losers', () => {
      const bet = {
        bets: {
          user1: { prediction: 'defaite', amount: 100, lockedOdds: 1.5 },
          user2: { prediction: 'victoire', amount: 200, lockedOdds: 3.0 },
        },
      };
      const result = closeEldenRingBetLogic(bet, 'defaite');
      expect(result.winners.length).toBe(1);
      expect(result.losers.length).toBe(1);
      expect(result.winners[0].odUserId).toBe('user1');
      expect(result.winners[0].profit).toBe(50); // 100*1.5=150, profit=50
      expect(result.losers[0].odUserId).toBe('user2');
      expect(result.losers[0].amount).toBe(200);
    });

    it('should handle no bets', () => {
      const bet = { bets: {} };
      const result = closeEldenRingBetLogic(bet, 'victoire');
      expect(result.winners.length).toBe(0);
      expect(result.losers.length).toBe(0);
    });

    it('should handle null bet', () => {
      const result = closeEldenRingBetLogic(null, 'victoire');
      expect(result.winners.length).toBe(0);
      expect(result.losers.length).toBe(0);
    });

    it('should calculate profit correctly with high odds', () => {
      const bet = {
        bets: {
          user1: { prediction: 'victoire', amount: 100, lockedOdds: 3.8 },
        },
      };
      const result = closeEldenRingBetLogic(bet, 'victoire');
      expect(result.winners[0].profit).toBe(280); // floor(100*3.8)=380, profit=280
    });
  });

  describe('cancelEldenRingBetLogic', () => {
    it('should refund all bettors', () => {
      const bet = {
        bets: {
          bettor1: { prediction: 'victoire', amount: 100, lockedOdds: 2.0 },
          bettor2: { prediction: 'defaite', amount: 200, lockedOdds: 1.5 },
        },
      };
      const result = cancelEldenRingBetLogic(bet);
      expect(result.refundCount).toBe(2);
      expect(result.refunds[0].amount).toBe(100);
      expect(result.refunds[1].amount).toBe(200);
    });

    it('should handle empty bets', () => {
      const result = cancelEldenRingBetLogic({ bets: {} });
      expect(result.refundCount).toBe(0);
    });

    it('should handle null bet', () => {
      const result = cancelEldenRingBetLogic(null);
      expect(result.refundCount).toBe(0);
    });
  });
});

// Integration test: verify module loads and exports exist
describe('Elden Ring Storage Module Exports', () => {
  vi.mock('fs', () => ({
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => JSON.stringify({
      players: [],
      tftPlayers: [],
      wallets: {},
      activeBets: {},
      activeTftBets: {},
      leaderboard: {},
      tftLeaderboard: {},
      playerLinks: {},
      missions: {},
      settings: {},
      activeGiveaways: {},
      featureFlags: {},
      spontaneousBets: {},
      transactionHistory: {},
      eldenRing: { apiKeys: {}, players: {}, seenEventIds: {}, activeEldenRingBets: {} },
    })),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  }));

  vi.mock('../src/config', () => ({
    default: {
      dataPath: './data/players.json',
      startingBalance: 5000,
      betting: {
        defaultWinratePercent: 50,
        bookmakerMarginPercent: 5,
        maxMinorityBonusPercent: 50,
        streakBonusPercent: 20,
        streakThreshold: 3,
        seedPool: 500,
        playerCutPercent: 10,
        soloBetBonusPercent: 25,
      },
      discord: { notificationChannelId: null },
    },
  }));

  it('should export all new ER betting functions', () => {
    const storage = require('../src/storage');
    expect(typeof storage.createEldenRingBet).toBe('function');
    expect(typeof storage.getEldenRingBet).toBe('function');
    expect(typeof storage.getActiveEldenRingFightId).toBe('function');
    expect(typeof storage.getEldenRingBossDefeatRate).toBe('function');
    expect(typeof storage.calculateEldenRingOdds).toBe('function');
    expect(typeof storage.placeEldenRingBet).toBe('function');
    expect(typeof storage.closeEldenRingBet).toBe('function');
    expect(typeof storage.cancelEldenRingBet).toBe('function');
    expect(typeof storage.getAllActiveEldenRingBets).toBe('function');
  });
});

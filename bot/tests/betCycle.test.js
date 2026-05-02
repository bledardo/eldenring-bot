import { describe, it, expect } from 'vitest';

// Pure function: ensures data has bet cycle fields
function ensureBetCycleFields(data) {
  if (!data.eldenRing) {
    data.eldenRing = { apiKeys: {}, players: {}, seenEventIds: {} };
  }
  if (!data.eldenRing.activeBetCycles) {
    data.eldenRing.activeBetCycles = {};
  }
  if (!data.settings) {
    data.settings = { betWindowMinutes: 5 };
  }
  if (data.settings.eldenRingCycleSize === undefined) {
    data.settings.eldenRingCycleSize = 5;
  }
  return data;
}

describe('BetCycle data migration', () => {
  it('adds activeBetCycles to fresh eldenRing data', () => {
    const data = { eldenRing: { apiKeys: {}, players: {}, seenEventIds: {} }, settings: {} };
    const result = ensureBetCycleFields(data);
    expect(result.eldenRing.activeBetCycles).toEqual({});
    expect(result.settings.eldenRingCycleSize).toBe(5);
  });

  it('preserves existing activeBetCycles', () => {
    const data = {
      eldenRing: { apiKeys: {}, players: {}, seenEventIds: {}, activeBetCycles: { foo: {} } },
      settings: { eldenRingCycleSize: 10 },
    };
    const result = ensureBetCycleFields(data);
    expect(result.eldenRing.activeBetCycles).toEqual({ foo: {} });
    expect(result.settings.eldenRingCycleSize).toBe(10);
  });
});

// Pure function: create a bet cycle
function createBetCycleLogic({ discordUserId, bossName, cycleSize, messageId, channelId }) {
  const cycleKey = `${discordUserId}_${bossName}`;
  return {
    cycleKey,
    cycle: {
      discordUserId, bossName, cycleSize,
      attemptCount: 1, deathCount: 0,
      messageId, channelId, bets: {},
      hasGoldenOffer: false, firstBettorId: null,
      createdAt: new Date().toISOString(), resolved: false,
    },
  };
}

function shouldResolveCycleOnDeath(cycle) {
  return cycle.deathCount >= cycle.cycleSize;
}

describe('BetCycle CRUD', () => {
  it('creates a cycle with correct initial state', () => {
    const { cycleKey, cycle } = createBetCycleLogic({
      discordUserId: '123', bossName: 'Margit', cycleSize: 5,
      messageId: 'msg1', channelId: 'ch1',
    });
    expect(cycleKey).toBe('123_Margit');
    expect(cycle.attemptCount).toBe(1);
    expect(cycle.deathCount).toBe(0);
    expect(cycle.resolved).toBe(false);
    expect(cycle.cycleSize).toBe(5);
  });

  it('resolves cycle when deathCount reaches cycleSize', () => {
    expect(shouldResolveCycleOnDeath({ deathCount: 5, cycleSize: 5 })).toBe(true);
  });

  it('does not resolve cycle when deathCount below cycleSize', () => {
    expect(shouldResolveCycleOnDeath({ deathCount: 3, cycleSize: 5 })).toBe(false);
  });
});

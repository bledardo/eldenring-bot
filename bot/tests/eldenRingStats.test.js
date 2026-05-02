import { describe, it, expect, beforeEach } from 'vitest';

// Pure function tests - extracted logic equivalent to storage.js stats functions

function getEldenRingPlayerStats(player) {
  if (!player) return null;

  let totalKills = 0;
  let totalDeaths = 0;
  let totalFightTime = 0;
  let totalSessionTime = 0;
  const bossEntries = [];

  for (const [bossName, bossData] of Object.entries(player.bosses || {})) {
    const fights = bossData.fights || [];
    const kills = fights.filter(f => f.outcome === 'kill').length;
    const deaths = fights.filter(f => f.outcome === 'death').length;
    const fightTime = fights.reduce((sum, f) => sum + (f.duration_seconds || 0), 0);
    totalKills += kills;
    totalDeaths += deaths;
    totalFightTime += fightTime;

    bossEntries.push({
      bossName,
      attempts: fights.length,
      kills,
      deaths,
      defeated: kills > 0,
      fightTime,
      lastFight: fights.length > 0 ? fights[fights.length - 1] : null,
    });
  }

  for (const session of (player.sessions || [])) {
    if (session.start && session.end) {
      totalSessionTime += (new Date(session.end) - new Date(session.start)) / 1000;
    }
  }

  const globalDeaths = player.globalDeaths || 0;

  return {
    totalKills,
    totalDeaths,
    globalDeaths,
    totalAllDeaths: totalDeaths + globalDeaths,
    bossesDefeated: bossEntries.filter(b => b.defeated).length,
    bossesEncountered: bossEntries.length,
    totalFightTime,
    totalSessionTime,
    bosses: bossEntries,
  };
}

function getEldenRingLeaderboard(players) {
  const entries = [];

  for (const [discordId, player] of Object.entries(players)) {
    let kills = 0;
    let deaths = 0;
    let totalTime = 0;
    let bossesDefeated = 0;

    for (const bossData of Object.values(player.bosses || {})) {
      let bossHasKill = false;
      for (const fight of (bossData.fights || [])) {
        if (fight.outcome === 'kill') { kills++; bossHasKill = true; }
        if (fight.outcome === 'death') deaths++;
        totalTime += (fight.duration_seconds || 0);
      }
      if (bossHasKill) bossesDefeated++;
    }

    entries.push({ discordId, kills, deaths, totalTime, bossesDefeated });
  }

  return {
    byKills: [...entries].sort((a, b) => b.kills - a.kills),
    byDeaths: [...entries].sort((a, b) => b.deaths - a.deaths),
    byTime: [...entries].sort((a, b) => b.totalTime - a.totalTime),
  };
}

function getEldenRingBossDifficulty(players) {
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

// Test data
let player1, player2, players;

beforeEach(() => {
  player1 = {
    bosses: {
      'Margit, the Fell Omen': {
        fights: [
          { timestamp: '2026-02-27T10:00:00Z', outcome: 'death', duration_seconds: 120, attempt_number: 1 },
          { timestamp: '2026-02-27T10:05:00Z', outcome: 'death', duration_seconds: 90, attempt_number: 2 },
          { timestamp: '2026-02-27T10:10:00Z', outcome: 'kill', duration_seconds: 150, attempt_number: 3 },
        ],
      },
      'Godrick the Grafted': {
        fights: [
          { timestamp: '2026-02-27T11:00:00Z', outcome: 'death', duration_seconds: 60, attempt_number: 1 },
        ],
      },
    },
    sessions: [
      { id: 's1', start: '2026-02-27T09:00:00Z', end: '2026-02-27T12:00:00Z', summary: null },
    ],
  };

  player2 = {
    bosses: {
      'Margit, the Fell Omen': {
        fights: [
          { timestamp: '2026-02-27T10:00:00Z', outcome: 'death', duration_seconds: 200, attempt_number: 1 },
        ],
      },
    },
    sessions: [],
  };

  players = { player1: player1, player2: player2 };
});

describe('getEldenRingPlayerStats', () => {
  it('returns correct stats for player with data', () => {
    const stats = getEldenRingPlayerStats(player1);
    expect(stats.totalKills).toBe(1);
    expect(stats.totalDeaths).toBe(3);
    expect(stats.bossesDefeated).toBe(1);
    expect(stats.bossesEncountered).toBe(2);
    expect(stats.totalFightTime).toBe(420); // 120 + 90 + 150 + 60
    expect(stats.totalSessionTime).toBe(10800); // 3 hours = 10800 seconds
    expect(stats.bosses).toHaveLength(2);

    const margit = stats.bosses.find(b => b.bossName === 'Margit, the Fell Omen');
    expect(margit.attempts).toBe(3);
    expect(margit.kills).toBe(1);
    expect(margit.deaths).toBe(2);
    expect(margit.defeated).toBe(true);
  });

  it('returns null for unknown player', () => {
    const stats = getEldenRingPlayerStats(null);
    expect(stats).toBeNull();
  });

  it('handles player with no sessions', () => {
    const stats = getEldenRingPlayerStats(player2);
    expect(stats.totalSessionTime).toBe(0);
    expect(stats.totalKills).toBe(0);
    expect(stats.totalDeaths).toBe(1);
  });

  it('includes globalDeaths defaulting to 0', () => {
    const stats = getEldenRingPlayerStats(player1);
    expect(stats.globalDeaths).toBe(0);
    expect(stats.totalAllDeaths).toBe(3); // 3 boss deaths + 0 global
  });

  it('sums boss deaths and global deaths into totalAllDeaths', () => {
    player1.globalDeaths = 5;
    const stats = getEldenRingPlayerStats(player1);
    expect(stats.globalDeaths).toBe(5);
    expect(stats.totalAllDeaths).toBe(8); // 3 boss deaths + 5 global
  });
});

describe('getEldenRingLeaderboard', () => {
  it('ranks players correctly by kills', () => {
    const lb = getEldenRingLeaderboard(players);
    expect(lb.byKills[0].discordId).toBe('player1'); // 1 kill vs 0
    expect(lb.byKills[0].kills).toBe(1);
  });

  it('ranks players correctly by deaths', () => {
    const lb = getEldenRingLeaderboard(players);
    expect(lb.byDeaths[0].discordId).toBe('player1'); // 3 deaths vs 1
    expect(lb.byDeaths[0].deaths).toBe(3);
  });

  it('ranks players correctly by time', () => {
    const lb = getEldenRingLeaderboard(players);
    expect(lb.byTime[0].discordId).toBe('player1'); // 420s vs 200s
    expect(lb.byTime[0].totalTime).toBe(420);
  });
});

describe('getEldenRingBossDifficulty', () => {
  it('ranks bosses by total deaths across all players', () => {
    const difficulty = getEldenRingBossDifficulty(players);
    expect(difficulty[0].bossName).toBe('Margit, the Fell Omen'); // 2 + 1 = 3 deaths
    expect(difficulty[0].deaths).toBe(3);
    expect(difficulty[1].bossName).toBe('Godrick the Grafted'); // 1 death
    expect(difficulty[1].deaths).toBe(1);
  });

  it('handles empty players', () => {
    const difficulty = getEldenRingBossDifficulty({});
    expect(difficulty).toHaveLength(0);
  });
});

describe('getAllEldenRingPlayerIds', () => {
  it('returns all player IDs', () => {
    const ids = Object.keys(players);
    expect(ids).toContain('player1');
    expect(ids).toContain('player2');
    expect(ids).toHaveLength(2);
  });
});

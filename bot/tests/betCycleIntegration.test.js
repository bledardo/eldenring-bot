import { describe, it, expect } from 'vitest';

// Simulate a full cycle flow using pure logic
function simulateCycle(cycleSize, events) {
  const cycle = {
    attemptCount: 0,
    deathCount: 0,
    cycleSize,
    resolved: false,
    resolution: null,
  };
  const log = [];

  for (const event of events) {
    if (cycle.resolved) {
      log.push({ event, action: 'new_cycle_needed' });
      continue;
    }

    if (event === 'encounter') {
      cycle.attemptCount++;
      log.push({ event, attemptCount: cycle.attemptCount, deathCount: cycle.deathCount });
    } else if (event === 'death') {
      cycle.deathCount++;
      if (cycle.deathCount >= cycle.cycleSize) {
        cycle.resolved = true;
        cycle.resolution = 'defaite';
        log.push({ event, action: 'resolved_defaite', deathCount: cycle.deathCount });
      } else {
        log.push({ event, deathCount: cycle.deathCount });
      }
    } else if (event === 'kill') {
      cycle.resolved = true;
      cycle.resolution = 'victoire';
      log.push({ event, action: 'resolved_victoire', attemptCount: cycle.attemptCount });
    }
  }

  return { cycle, log };
}

describe('BetCycle integration', () => {
  it('resolves defaite when 5 deaths reached', () => {
    const events = [
      'encounter', 'death',
      'encounter', 'death',
      'encounter', 'death',
      'encounter', 'death',
      'encounter', 'death',
    ];
    const { cycle } = simulateCycle(5, events);
    expect(cycle.resolved).toBe(true);
    expect(cycle.resolution).toBe('defaite');
    expect(cycle.deathCount).toBe(5);
    expect(cycle.attemptCount).toBe(5);
  });

  it('resolves victoire when kill before X deaths', () => {
    const events = [
      'encounter', 'death',
      'encounter', 'death',
      'encounter', 'kill',
    ];
    const { cycle } = simulateCycle(5, events);
    expect(cycle.resolved).toBe(true);
    expect(cycle.resolution).toBe('victoire');
    expect(cycle.attemptCount).toBe(3);
    expect(cycle.deathCount).toBe(2);
  });

  it('events after resolution trigger new_cycle_needed', () => {
    const events = [
      'encounter', 'kill',
      'encounter', // after resolution
    ];
    const { log } = simulateCycle(5, events);
    expect(log[2].action).toBe('new_cycle_needed');
  });

  it('first try victory works', () => {
    const events = ['encounter', 'kill'];
    const { cycle } = simulateCycle(5, events);
    expect(cycle.resolved).toBe(true);
    expect(cycle.resolution).toBe('victoire');
    expect(cycle.attemptCount).toBe(1);
    expect(cycle.deathCount).toBe(0);
  });

  it('works with cycleSize of 2', () => {
    const events = ['encounter', 'death', 'encounter', 'death'];
    const { cycle } = simulateCycle(2, events);
    expect(cycle.resolved).toBe(true);
    expect(cycle.resolution).toBe('defaite');
  });
});

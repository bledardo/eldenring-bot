/**
 * API Server integration tests.
 * Uses real Express app but mocks storage/features at the module level.
 */
const http = require('http');

// We'll test using a simple approach: override module.exports on the loaded modules
// before requiring apiServer

// Step 1: Pre-load and mock dependencies
const storage = require('../src/storage');
const features = require('../src/features');

// Save originals
const origGetPlayerByApiKey = storage.getEldenRingPlayerByApiKey;
const origAddFight = storage.addEldenRingFight;
const origStartSession = storage.startEldenRingSession;
const origEndSession = storage.endEldenRingSession;
const origIsEventSeen = storage.isEldenRingEventSeen;
const origMarkEventSeen = storage.markEldenRingEventSeen;
const origIsEnabled = features.isEnabled;

// Mock state
let mockApiKeyLookup = null;
let mockFightReturn = { attempt_number: 1 };
let mockIsEventSeen = false;
let mockIsEnabled = true;
let startSessionCalls = [];
let endSessionCalls = [];
let addFightCalls = [];
let markSeenCalls = [];
let incrementGlobalDeathsCalls = [];

// Override functions
storage.getEldenRingPlayerByApiKey = (key) => mockApiKeyLookup;
storage.addEldenRingFight = (...args) => { addFightCalls.push(args); return mockFightReturn; };
storage.startEldenRingSession = (...args) => { startSessionCalls.push(args); };
storage.endEldenRingSession = (...args) => { endSessionCalls.push(args); };
storage.isEldenRingEventSeen = (id) => mockIsEventSeen;
storage.markEldenRingEventSeen = (id) => { markSeenCalls.push(id); };
storage.incrementEldenRingGlobalDeaths = (...args) => { incrementGlobalDeathsCalls.push(args); return 1; };
storage.cleanEldenRingSeenEvents = () => {};
storage.getEldenRingBossFights = () => [];
features.isEnabled = (name) => mockIsEnabled;

// Mock eldenRingTracker emitEvent
const tracker = require('../src/eldenRingTracker');
const origEmitEvent = tracker.emitEvent;
let emitEventCalls = [];
tracker.emitEvent = (...args) => { emitEventCalls.push(args); };

// Now require apiServer (it will get our mocked storage/features)
const { app } = require('../src/apiServer');

// Simple supertest alternative using node http
function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          server.close();
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      req.on('error', (err) => { server.close(); reject(err); });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

// Reset mocks before each test
function resetMocks() {
  mockApiKeyLookup = 'discord-user-123';
  mockFightReturn = { attempt_number: 1 };
  mockIsEventSeen = false;
  mockIsEnabled = true;
  startSessionCalls = [];
  endSessionCalls = [];
  addFightCalls = [];
  markSeenCalls = [];
  emitEventCalls = [];
  incrementGlobalDeathsCalls = [];
}

describe('API Server', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('GET /health returns ok without auth', async () => {
    const res = await makeRequest('GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('rejects missing Authorization header with 401', async () => {
    const res = await makeRequest('POST', '/api/events', {}, { type: 'boss_encounter', data: {} });
    expect(res.status).toBe(401);
  });

  it('rejects invalid API key with 401', async () => {
    mockApiKeyLookup = null;
    const res = await makeRequest('POST', '/api/events', { Authorization: 'Bearer bad-key' }, { type: 'boss_encounter', data: {} });
    expect(res.status).toBe(401);
  });

  it('accepts valid Bearer token', async () => {
    const res = await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, { type: 'boss_encounter', data: { boss: 'Margit' } });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 503 when tracking disabled', async () => {
    mockIsEnabled = false;
    const res = await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, { type: 'boss_encounter', data: {} });
    expect(res.status).toBe(503);
  });

  it('returns duplicate for seen events', async () => {
    mockIsEventSeen = true;
    const res = await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, { type: 'boss_encounter', event_id: 'seen-1', data: {} });
    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(true);
    expect(addFightCalls.length).toBe(0);
  });

  it('marks new events as seen', async () => {
    const res = await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, { type: 'boss_encounter', event_id: 'new-1', data: { boss: 'Margit' } });
    expect(res.status).toBe(200);
    expect(markSeenCalls).toContain('new-1');
  });

  it('handles boss_encounter', async () => {
    const res = await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, { type: 'boss_encounter', event_id: 'e1', data: { boss: 'Margit' } });
    expect(res.status).toBe(200);
    // boss_encounter no longer stores fights — it just emits an event
    expect(addFightCalls.length).toBe(0);
    expect(emitEventCalls.length).toBe(1);
    expect(emitEventCalls[0][0]).toBe('boss_encounter');
    expect(emitEventCalls[0][1].bossName).toBe('Margit');
  });

  it('handles player_death', async () => {
    const res = await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, { type: 'player_death', event_id: 'e2', data: { boss: 'Margit' } });
    expect(res.status).toBe(200);
    expect(addFightCalls[0][2].outcome).toBe('death');
  });

  it('handles boss_kill', async () => {
    const res = await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, { type: 'boss_kill', event_id: 'e3', data: { boss: 'Margit' } });
    expect(res.status).toBe(200);
    expect(addFightCalls[0][2].outcome).toBe('kill');
  });

  it('handles session_start', async () => {
    const res = await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, { type: 'session_start', event_id: 'e4', data: { session_id: 's1', timestamp: '2026-02-27T12:00:00Z' } });
    expect(res.status).toBe(200);
    expect(startSessionCalls.length).toBe(1);
  });

  it('handles session_end', async () => {
    const res = await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, { type: 'session_end', event_id: 'e5', data: { session_id: 's1', timestamp: '2026-02-27T13:00:00Z' } });
    expect(res.status).toBe(200);
    expect(endSessionCalls.length).toBe(1);
  });

  it('rejects unknown event type', async () => {
    const res = await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, { type: 'invalid_type', event_id: 'e6', data: {} });
    expect(res.status).toBe(400);
  });

  it('rejects missing event type', async () => {
    const res = await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, { data: {} });
    expect(res.status).toBe(400);
  });

  // === Phase 5 BREAK 5 tests: fight_abandoned ===

  it('accepts fight_abandoned event (not 400)', async () => {
    const res = await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, {
      type: 'fight_abandoned',
      event_id: 'e-abandon-1',
      data: { boss_canonical_name: 'Margit', duration_seconds: 30, session_id: 's1' },
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('fight_abandoned does NOT store a fight (abandon is not an attempt)', async () => {
    await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, {
      type: 'fight_abandoned',
      event_id: 'e-abandon-2',
      data: { boss_canonical_name: 'Godrick', duration_seconds: 15, session_id: 's2' },
    });
    expect(addFightCalls.length).toBe(0);
  });

  it('fight_abandoned does NOT emit event', async () => {
    await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, {
      type: 'fight_abandoned',
      event_id: 'e-abandon-3',
      data: { boss_canonical_name: 'Margit' },
    });
    expect(emitEventCalls.length).toBe(0);
  });

  // === Phase 5 BREAK 6 test: durationSeconds in boss_kill emitEvent ===

  it('boss_kill emitEvent includes durationSeconds', async () => {
    mockFightReturn = { attempt_number: 3, duration_seconds: 120 };
    await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, {
      type: 'boss_kill',
      event_id: 'e-kill-dur',
      data: { boss_canonical_name: 'Margit', duration_seconds: 120, session_id: 's1', timestamp: '2026-02-27T12:00:00Z' },
    });
    expect(emitEventCalls.length).toBe(1);
    expect(emitEventCalls[0][0]).toBe('boss_kill');
    expect(emitEventCalls[0][1].durationSeconds).toBe(120);
  });

  // === global_death tests ===

  it('accepts global_death event', async () => {
    const res = await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, {
      type: 'global_death',
      event_id: 'e-gd-1',
      data: { session_id: 's1', timestamp: '2026-02-27T12:00:00Z' },
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('global_death increments global deaths counter', async () => {
    await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, {
      type: 'global_death',
      event_id: 'e-gd-2',
      data: { session_id: 's1' },
    });
    expect(incrementGlobalDeathsCalls.length).toBe(1);
    expect(incrementGlobalDeathsCalls[0][0]).toBe('discord-user-123');
  });

  it('global_death emits event', async () => {
    await makeRequest('POST', '/api/events', { Authorization: 'Bearer valid-key' }, {
      type: 'global_death',
      event_id: 'e-gd-3',
      data: { session_id: 's1', timestamp: '2026-02-27T12:00:00Z' },
    });
    expect(emitEventCalls.length).toBe(1);
    expect(emitEventCalls[0][0]).toBe('global_death');
    expect(emitEventCalls[0][1].discordUserId).toBe('discord-user-123');
  });
});

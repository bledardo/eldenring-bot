const { EventEmitter } = require('events');
const crypto = require('crypto');
const config = require('./config');
const features = require('./features');

let discordClient = null;
let apiServer = null;

// Event bus for Phase 3 subscribers (notifications, betting)
const eldenRingEvents = new EventEmitter();

function generateApiKey() {
  return crypto.randomBytes(config.eldenRing.apiKeyLength).toString('hex');
}

function start(client) {
  discordClient = client;

  if (!features.isEnabled('tracking_elden_ring')) {
    console.log('[ER] Elden Ring tracking disabled by feature flag');
    return;
  }

  // Lazy-load apiServer to avoid circular deps and ensure it exists
  const { startApiServer } = require('./apiServer');

  try {
    apiServer = startApiServer(discordClient);
    console.log(`[ER] API server started on port ${config.eldenRing.apiPort}`);
  } catch (err) {
    console.error('[ER] Failed to start API server:', err.message);
    console.error('[ER] Elden Ring tracking will not work until server issue is resolved');
  }

  // Register notification handlers
  const notifier = require('./eldenRingNotifier');
  notifier.register(client);
  console.log('[ER] Notifier registered');
}

function stop() {
  if (apiServer) {
    const { stopApiServer } = require('./apiServer');
    stopApiServer();
    apiServer = null;
    console.log('[ER] API server stopped');
  }
}

// Called by apiServer event handlers to emit events for Phase 3
function emitEvent(type, data) {
  eldenRingEvents.emit(type, data);
}

module.exports = {
  start,
  stop,
  eldenRingEvents,
  generateApiKey,
  emitEvent,
};

const bot = require('./bot');
const eldenRingTracker = require('./eldenRingTracker');
const config = require('./config');
const llm = require('./llm');
const llmBettor = require('./llmBettor');
const features = require('./features');

async function initLlm() {
  if (!config.llm.enabled) {
    console.log('[LLM] Désactivé par configuration');
    return;
  }

  console.log('[LLM] Vérification Ollama...');
  const healthy = await llm.checkOllamaHealth();

  if (healthy) {
    console.log('[LLM] Ollama connecté, vérification du modèle...');
    await llm.ensureModel();
    llmBettor.ensureBotWallet();
    console.log('[LLM] Prêt !');
  } else {
    console.warn('[LLM] Ollama non disponible, fonctionnalités IA désactivées');
  }
}

async function main() {
  console.log('Starting Tarnished Bot (Elden Ring watcher)...');

  if (!config.discord.token) {
    console.error('Error: DISCORD_TOKEN is not set');
    process.exit(1);
  }

  try {
    const client = await bot.login();
    console.log('Discord bot connected');

    features.logDisabledFeatures();

    initLlm().catch(err => console.error('[LLM] Erreur init:', err));

    eldenRingTracker.start(client);

    process.on('SIGINT', () => {
      console.log('Shutting down...');
      eldenRingTracker.stop();
      client.destroy();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('Shutting down...');
      eldenRingTracker.stop();
      client.destroy();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

main();

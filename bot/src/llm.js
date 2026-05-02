const config = require('./config');
const storage = require('./storage');

function buildSystemPrompt() {
  if (config.llm.systemPrompt) {
    return config.llm.systemPrompt;
  }

  return `Tu es "${config.llm.botName}", un bot Discord pour une communauté Elden Ring qui suit les combats de boss et gère un système de paris en ${config.currency.name} (${config.currency.symbol}).

QUI TU ES:
- ${config.llm.personality}
- Tu connais les Sans-éclat (joueurs) qui combattent les boss du jeu
- Tu as de la répartie : si on te chambre, tu réponds avec une vanne

TON STYLE:
- ${config.llm.responseStyle}
- Références Souls/Elden Ring assumées (Margit, Malenia, Radahn, l'Erdtree, etc.)
- 1-2 phrases maximum par réponse

RÈGLES:
- JAMAIS inventer de statistiques
- Reste dans l'univers Souls / paris
- Utilise UNIQUEMENT les infos du contexte fourni
`;
}

const SYSTEM_PROMPT = buildSystemPrompt();
const MEMORY_PATH = './data/llm-memory.json';

async function checkOllamaHealth() {
  if (!config.llm.enabled) return false;

  try {
    const response = await fetch(`${config.llm.url}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (error) {
    console.error('[LLM] Ollama non disponible:', error.message);
    return false;
  }
}

async function ensureModel() {
  if (!config.llm.enabled) return false;

  try {
    const response = await fetch(`${config.llm.url}/api/tags`);
    const data = await response.json();
    const models = data.models || [];
    const hasModel = models.some(m => m.name.startsWith(config.llm.model));

    if (!hasModel) {
      console.log(`[LLM] Téléchargement du modèle ${config.llm.model}...`);
      const pullResponse = await fetch(`${config.llm.url}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: config.llm.model }),
      });

      const reader = pullResponse.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.status) console.log(`[LLM] ${json.status}`);
          } catch {}
        }
      }

      console.log(`[LLM] Modèle ${config.llm.model} prêt`);
    }

    return true;
  } catch (error) {
    console.error('[LLM] Erreur lors de la vérification du modèle:', error.message);
    return false;
  }
}

async function generate(prompt, context = '') {
  if (!config.llm.enabled) return null;

  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

  try {
    const response = await fetch(`${config.llm.url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.llm.model,
        prompt: fullPrompt,
        system: SYSTEM_PROMPT,
        stream: false,
        options: {
          temperature: 0.75,
          top_p: 0.9,
          top_k: 40,
          num_predict: 80,
          repeat_penalty: 1.2,
        },
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.response?.trim() || null;
  } catch (error) {
    console.error('[LLM] Erreur de génération:', error.message);
    return null;
  }
}

function loadMemory() {
  const fs = require('fs');
  try {
    if (fs.existsSync(MEMORY_PATH)) {
      return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf-8'));
    }
  } catch {}
  return { users: {} };
}

function saveMemory(memory) {
  const fs = require('fs');
  const path = require('path');
  const dir = path.dirname(MEMORY_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
}

function addInteraction(userId, userName, type, message, response) {
  const memory = loadMemory();
  if (!memory.users[userId]) {
    memory.users[userId] = {
      discordName: userName,
      interactions: [],
      lastSeen: new Date().toISOString(),
    };
  }
  memory.users[userId].interactions.unshift({
    date: new Date().toISOString(),
    type,
    message,
    response,
  });
  memory.users[userId].interactions = memory.users[userId].interactions.slice(0, 20);
  memory.users[userId].lastSeen = new Date().toISOString();
  memory.users[userId].discordName = userName;
  saveMemory(memory);
}

function buildContextForUser(userId) {
  const contextLevel = storage.getLlmContextLevel?.() || 'complet';
  if (contextLevel === 'basique') return '';

  const parts = [];
  const memory = loadMemory();
  const userMemory = memory.users[userId];

  if (userMemory && contextLevel === 'complet') {
    const recentInteractions = userMemory.interactions.slice(0, 2);
    if (recentInteractions.length > 0) {
      parts.push(`[Historique avec ${userMemory.discordName}]`);
      for (const i of recentInteractions) {
        parts.push(`- "${i.message}" -> "${i.response}"`);
      }
    }
  }

  const botWallet = storage.getWallet(config.llm.botWalletId);
  if (botWallet) {
    parts.push(`[Mon wallet: ${botWallet.balance} ${config.currency.symbol}]`);
  }

  return parts.join('\n');
}

const DEFAULT_PROMPT_MENTION = `Tu es {botName}, le compagnon des Sans-éclat. {user} te dit : "{message}"

Réponds en restant dans l'univers Elden Ring / paris. Une seule phrase.`;

async function respondToMention(userName, odUserId, message) {
  const context = buildContextForUser(odUserId);

  const promptTemplate = config.llm.promptMention || DEFAULT_PROMPT_MENTION;
  const prompt = promptTemplate
    .replace('{botName}', config.llm.botName)
    .replace('{user}', userName)
    .replace('{message}', message);

  const response = await generate(prompt, context);
  if (response) {
    addInteraction(odUserId, userName, 'mention', message, response);
  }
  return response;
}

module.exports = {
  checkOllamaHealth,
  ensureModel,
  generate,
  loadMemory,
  saveMemory,
  addInteraction,
  respondToMention,
};

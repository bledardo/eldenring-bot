const storage = require('./storage');

const FEATURES = {
  giveaways: { description: 'Tirages au sort', default: true },
  llm_comments: { description: 'Commentaires IA début/fin de combat', default: true },
  llm_mentions: { description: 'Réponses IA aux mentions', default: true },
  golden_offer: { description: 'Offres en or sur les paris', default: true },
  spontaneous_bets: { description: 'Paris spontanés (créés par les utilisateurs)', default: true },
  bet_modification: { description: "Modification du montant d'un pari existant", default: false },
  first_bettor_bonus: { description: 'Bonus pour le premier parieur', default: true },
  tracking_elden_ring: { description: 'Suivi des combats Elden Ring', default: true },
  betting_elden_ring: { description: 'Paris sur les combats Elden Ring', default: true },
};

function getEnvVarName(featureName) {
  return `FEATURE_${featureName.toUpperCase()}`;
}

function isLockedByEnv(featureName) {
  return process.env[getEnvVarName(featureName)] !== undefined;
}

function getEnvValue(featureName) {
  const value = process.env[getEnvVarName(featureName)];
  if (value === undefined) return null;
  return value.toLowerCase() === 'true';
}

function isEnabled(featureName) {
  if (!FEATURES[featureName]) {
    console.warn(`[Features] Unknown feature: ${featureName}`);
    return true;
  }

  const persistedValue = storage.getFeatureFlag(featureName);
  if (persistedValue !== null) return persistedValue;

  const envValue = getEnvValue(featureName);
  if (envValue !== null) return envValue;

  return FEATURES[featureName].default;
}

function setEnabled(featureName, enabled) {
  if (!FEATURES[featureName]) {
    return { success: false, message: `Feature inconnue: ${featureName}` };
  }
  storage.setFeatureFlag(featureName, enabled);
  return { success: true };
}

function listAll() {
  const result = {};
  for (const [name, cfg] of Object.entries(FEATURES)) {
    const persistedValue = storage.getFeatureFlag(name);
    const envValue = getEnvValue(name);
    let source = 'default';
    if (persistedValue !== null) source = 'discord';
    else if (envValue !== null) source = 'env';
    result[name] = {
      enabled: isEnabled(name),
      description: cfg.description,
      source,
    };
  }
  return result;
}

function logDisabledFeatures() {
  const disabled = [];
  for (const name of Object.keys(FEATURES)) {
    if (!isEnabled(name)) disabled.push(name);
  }
  if (disabled.length > 0) {
    console.log(`[Features] ${disabled.length} feature(s) désactivée(s): ${disabled.join(', ')}`);
  } else {
    console.log('[Features] Toutes les features sont activées');
  }
}

module.exports = {
  FEATURES,
  isEnabled,
  setEnabled,
  listAll,
  logDisabledFeatures,
};

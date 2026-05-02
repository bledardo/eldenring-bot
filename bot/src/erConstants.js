// Multi-phase boss mapping: watcher sends phase1/phase2 separately,
// route may list them as "Phase1 & Phase2" or just one phase name.
// Maps route name → [phase1_watcher_name, phase2_watcher_name]
const MULTI_PHASE_BOSSES = {
  "Serpent dévoreur de dieux & Rykard, seigneur du blasphème": ["Serpent dévoreur de dieux", "Rykard, seigneur du blasphème"],
  "Radagon de l'Ordre d'or & Bête d'Elden": ["Radagon de l'Ordre d'or", "Bête d'Elden"],
  "Messmer l'Empaleur & Messmer, serpent maléfique": ["Messmer l'Empaleur", "Messmer, serpent maléfique"],
  "Maliketh la Lame d'ébène": ["Clerc Bestial", "Maliketh la Lame d'ébène"],
  "Malenia, épée de Miquella & Malenia, déesse de la putréfaction": ["Malenia, épée de Miquella", "Malenia, déesse de la putréfaction"],
  "Radahn, futur consort & Radahn, consort de Miquella": ["Radahn, futur consort", "Radahn, consort de Miquella"],
};

// Godfrey endgame: handled specially since the same name appears twice in route
// (shade in Leyndell + real in Capitale des cendres).  We use zone to disambiguate.
const GODFREY_ENDGAME_ZONE_PREFIX = "Leyndell, capitale des cendres";
const GODFREY_PHASES = ["Godfrey, premier Seigneur d'Elden", "Hoarah Loux, le Guerrier"];

// phase1 → phase2 lookup for attempt counting (include both phases in totals)
const PHASE1_TO_PHASE2 = {};
for (const [, phases] of Object.entries(MULTI_PHASE_BOSSES)) {
  if (phases.length === 2) PHASE1_TO_PHASE2[phases[0]] = phases[1];
}

// Build reverse lookup: phase name → route name (for stats merging)
const PHASE_TO_ROUTE = {};
for (const [routeName, phases] of Object.entries(MULTI_PHASE_BOSSES)) {
  for (const phase of phases) {
    PHASE_TO_ROUTE[phase] = routeName;
  }
}
// Godfrey endgame phases
for (const phase of GODFREY_PHASES) {
  PHASE_TO_ROUTE[phase] = `${GODFREY_PHASES[0]}::${GODFREY_ENDGAME_ZONE_PREFIX}`;
}

module.exports = {
  MULTI_PHASE_BOSSES,
  GODFREY_ENDGAME_ZONE_PREFIX,
  GODFREY_PHASES,
  PHASE1_TO_PHASE2,
  PHASE_TO_ROUTE,
};

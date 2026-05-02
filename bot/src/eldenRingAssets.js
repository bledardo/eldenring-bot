// Boss name -> artwork URL mapping for Elden Ring
// Keys MUST match watcher/assets/boss_names.json (in-game French names)
// Uses Fextralife wiki images as primary source
// Returns null if no artwork found (embed skips image — no fallback)

const BOSS_IMAGES = {
  // ============================================================
  // Main Story Bosses
  // ============================================================
  "Margit le Déchu": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/margit-altus-2-small.jpg',
  "Godrick le Greffé": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/godrick_the_grafted_bosses_elden_ring_wiki_600px1-min.jpg',
  "Rennala, reine de la pleine lune": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/rennala_queen_of_the_full_moon_bosses_elden_ring_wiki_600px1-min.jpg',
  "Radahn le Fléau des astres": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/radahn_enemies_elden_ring_wiki_600px1-min.jpg',
  "Morgott, roi Réprouvé": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/morgott-omen-king-3-elden-ring-wiki-guide.jpg',
  "Rykard, seigneur du blasphème": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/rykard_lord_of_blasphemy_bosses_elden_ring_wiki_600px1.jpg',
  "Serpent dévoreur de dieux": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/god-devouring-serpent-elden-ring-wiki-guide1-min.jpg',
  "Malenia, épée de Miquella": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/malenia,-blade-of-miquella1-min.jpg',
  "Malenia, déesse de la putréfaction": 'https://static1.fextralifeimages.com/wordpress/wp-content/uploads/images/malenia_goddess1-min.jpg',
  "Maliketh la Lame d'ébène": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/maliketh-the-black-blade-4k.jpg',
  "Godfrey, premier Seigneur d'Elden": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/godfrey_first_elden_lord_bosses_elden_ring_wiki_600px1-min.jpg',
  "Hoarah Loux, le Guerrier": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/godfrey,hoarah1-min.jpg',
  "Radagon de l'Ordre d'or": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/radagon_of_the_golden_order_bosses_elden_ring_wiki_600px1-min.jpg',
  "Bête d'Elden": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/elden_beast_bosses_elden_ring_wiki_600px1-min.jpg',
  "Mohg, seigneur du sang": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/mohg_the_omen_bosses_elden_ring_wiki_600px1-min.jpg',
  "Mohg le Réprouvé": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/mogh_the_omen1-min.jpg',
  "Sire Gideon Ofnir l'Omniscient": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/sir_gideon_ofnir_the_all_knowing_bosses_elden_ring_wiki_guide.jpg',
  "Géant de feu": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/fire_giant_bosses_elden_ring_wiki_600px1-min.jpg',

  // ============================================================
  // Major Bosses
  // ============================================================
  "Loretta, chevaleresse royale": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/royal_knight_loretta_bosses_elden_ring_wiki_guide1-min.jpg',
  "Loretta, chevaleresse de l'Arbre-Sacré": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/loretta-knight-of-the-haligtree-1-elden-ring-wiki-guide.jpg',
  "Noble sanctechair": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/godskin_noble_elden_ring_wiki_600px.jpg',
  "Apôtre sanctechair": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/apostle1-min.jpg',
  "Duo sanctechair": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/godskin_duo_elden_ring_wiki_guide_300px.jpg',
  "Commandant Niall": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/commander-niall-elden-ring-wiki-600px.jpg',
  "Commandant O'Neil": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/commander-o\'neil-elden-ring-wiki-300px.jpg',
  "Loup cramoisi de Radagon": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/red-wolf-of-radagon-2-elden-ring-wiki-guide.jpg',
  "Loup rouge du champion": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/red-wolf-of-radagon-2-elden-ring-wiki-guide.jpg',
  "Elemer du Roncier": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/elemer-of-the-briar-1-elden-ring-wiki-guide.jpg',
  "Godefroy le Greffé": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/godefroy-the-grafted-1-elden-ring-wiki-guide.jpg',
  "Adepte de la Lame d'ébène": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/beast-clergyman-4k1-min.jpg',
  "Clerc Bestial": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/beast-clergyman-4k1-min.jpg',

  // ============================================================
  // Dragons
  // ============================================================
  "Lansseax le Dragon ancien": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/ancient-dragon-lansseax-1-elden-ring-wiki-guide.jpg',
  "Placidusax, seigneur draconique": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/dragonlord_placidusax_bosses_elden_ring_wiki_600px1-min.jpg',
  "Fortissax la Liche draconique": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/fortissax_bosses_elden_ring_wiki_600px1-min.jpg',
  "Makar le Dragon du magma": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/magma-wyrm-3-elden-ring-wiki-guide.jpg',
  "Dragon du magma": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/magma_wyrm_bosses_elden_ring_wiki_guide1-min.jpg',
  "Agheel le dragon volant": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/flying_dragon_agheel_2_bosses_elden_ring_wiki_600px1-min.jpg',
  "Greyll le Dragon volant": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/flying_dragon_greyll_bosses_elden_ring_wiki_guide_300px.jpg',
  "Smarag, dragon de pierre d'éclat": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/glintstone-dragon-smarag-boss-elden-ring-wiki-guide.jpg',
  "Adula, dragon de pierre d'éclat": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/glintstone_dragon_bosses_elden_ring_wiki_600px1-min.jpg',
  "Ekzykes le Putréfié": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/decaying_ekzykes_bosses_elden_ring_wiki_guide1-min.jpg',
  "Borealis la Brume glaciale": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/borealis_enemies_elden_ring_wiki_300px.jpg',
  "Greyoll, Matriarche des Dragons": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/greyoll_bosses_elden_ring_wiki_guide_300px.jpg',
  "Theodorix le Grand ver": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/great_wyrm_theodorix_elden_ring_wiki_guide_300px.jpg',

  // ============================================================
  // Erdtree / Tree-related
  // ============================================================
  "Avatar de l'Arbre-Monde": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/erdtree-avatar-weeping-peninsula-elden-rink-wiki-guide-1-small.jpg',
  "Avatar putride": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/putrid-avatar-1-elden-ring-wiki-guide.jpg',
  "Sentinelle de l'Arbre": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/tree-sentinel-1-small1-min.jpg',
  "Sentinelle de l'Arbre(x2)": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/tree-sentinel-1-small1-min.jpg',
  "Sentinelle draconique de l'Arbre": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/draconic-tree-sentinel-2-elden-ring-wiki-guide.jpg',
  "Esprit d'arbre ulcéreux": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/ulcerated-tree-spirit-2-small1-min.jpg',
  "Esprit d'arbre putride": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/ulcerated-tree-spirit-2-small1-min.jpg',

  // ============================================================
  // Dungeon / Field Bosses
  // ============================================================
  "Soldat de Godrick": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/godrick_soldier_enemies_elden_ring_wiki_600px.jpg',
  "Rejeton greffé": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/er_grafted_scion_300px.jpg',
  "Chevalier Peau-de-dragon": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/dragonkin_soldier_bosses_elden_ring_wiki_600px.jpg',
  "Soldat draconide": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/dragonkin_soldier_bosses_elden_ring_wiki_600px.jpg',
  "Soldat draconide de Nokstella": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/dragonkin_soldier_bosses_elden_ring_wiki_600px.jpg',
  "Troll fouisseur": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/stonedigger_troll_bosses_elden_ring_wiki_600px1-min.jpg',
  "Golem gardien": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/guardian-golem-field-boss-elden-ring-wiki-guide.jpg',
  "Limier de l'Évergéôle": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/burial_watchdog_bosses_elden_ring_wiki_600px1-min.jpg',
  "Limier de l'Évergéôle (Labyrinthe)": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/burial_watchdog_bosses_elden_ring_wiki_600px1-min.jpg',
  "Tête de citrouille démente": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/mad_pumpkin_head_bosses_elden_ring_wiki_600px.jpg',
  "Tête de citrouille démente au fléau d'armes": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/mad_pumpkin_head_bosses_elden_ring_wiki_600px.jpg',
  "Tête de citrouille démente au marteau": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/mad_pumpkin_head_bosses_elden_ring_wiki_600px.jpg',
  "Chien Errant Blaidd": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/blaidd-wolfman-location2-npc-elden-ring-wiki-300px-min.jpeg',

  // ============================================================
  // Crystallians
  // ============================================================
  "Cristallien": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crystalians_bosses_elden_ring_wiki_guide_300x.jpg',
  "Cristallien (Lance)": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crystalians_bosses_elden_ring_wiki_guide_300x.jpg',
  "Cristallien (Bâton)": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crystalians_bosses_elden_ring_wiki_guide_300x.jpg',
  "Cristallien (Anneau)": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crystalians_bosses_elden_ring_wiki_guide_300x.jpg',
  "Trio de Cristalliens": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crystalians_bosses_elden_ring_wiki_guide_300x.jpg',
  "Lancier cristalien": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crystalians_bosses_elden_ring_wiki_guide_300x.jpg',
  "Lancier cristalien putride": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crystalians_bosses_elden_ring_wiki_guide_300x.jpg',
  "Sorcier cristalien": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crystalians_bosses_elden_ring_wiki_guide_300x.jpg',
  "Sorcier cristalien putride": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crystalians_bosses_elden_ring_wiki_guide_300x.jpg',
  "Danseur cristalien": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crystalians_bosses_elden_ring_wiki_guide_300x.jpg',
  "Danseur cristalien putride": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crystalians_bosses_elden_ring_wiki_guide_300x.jpg',

  // ============================================================
  // Unique Bosses
  // ============================================================
  "Larme imitatrice": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/mimic-tear-boss-enemies-elden-ring-wiki-guide-300px.jpg',
  "Larme imitatrice égarée": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/mimic-tear-boss-enemies-elden-ring-wiki-guide-300px.jpg',
  "Duelliste gardien du tombeau": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/grave-warden-duelist-2.jpg',
  "Duelliste putride gardien du tombeau": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/grave-warden-duelist-2.jpg',
  "Duelliste frénétique": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/grave-warden-duelist-2.jpg',
  "Esprit ancestral": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/ancestor_spirit1-min.jpg',
  "Esprit ancestral royal": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/regal-ancestor-spirit_map-bosses-enemies-elden-ring-wiki-guide-300px.jpg',

  // ============================================================
  // Crucible Knights
  // ============================================================
  "Chevalier du Creuset": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crucible-knight-stormhill-3-min.jpg',
  "Chevalier du Creuset Ordovis": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crucible-knight-stormhill-3-min.jpg',
  "Ordovis, chevalier du Creuset": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crucible-knight-stormhill-3-min.jpg',
  "Chevalier du Creuset Siluria": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crucible-knight-stormhill-3-min.jpg',
  "Siluria du Creuset": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crucible-knight-stormhill-3-min.jpg',
  "Chevalier du Creuset Devonia": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crucible-knight-stormhill-3-min.jpg',
  "Duo de Chevaliers du Creuset": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/crucible-knight-stormhill-3-min.jpg',

  // ============================================================
  // Named NPCs and Invaders
  // ============================================================
  "Éléonora, Danseuse du Sang Putride": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/eleonora_violet_bloody_finger_npc_invader_elden_ring_wiki_guide_300px.jpg',
  "Vyke aux Doigts Putréfiés": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/festering-fingerprint-vyke-elden-ring-wiki.jpg',
  "Vyke, chevalier de la Table ronde": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/festering-fingerprint-vyke-elden-ring-wiki.jpg',
  "Mage de bataille Hugues": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/battlemage-hugues-1-elden-ring-wiki-guide.jpg',
  "Mage Royal Miriam": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/preceptor_miriam_npc_invader_elden_ring_wiki_guide_300px.jpg',
  "Parfumeuse Tricia": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/perfumer-tricia-1-elden-ring-wiki-guide.jpg',
  "Garris le Nécromancien": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/necromancer-garris-elden-ring-wiki-600px.jpg',
  "Esgar, prêtre du sang": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/esgar_priest_of_blood_bosses_elden_ring_wiki_guide.jpg',
  "Adan le Voleur du feu": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/adan-thief-of-fire-1-elden-ring-wiki-guide.jpg',
  "Pat": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/patches-npc-photo-elden-ring-wiki-guide-300px-min.jpg',
  "Rogier le Sorcier": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/rogier-art-elden-ring-wiki-300px.jpg',
  "Bols, chevalier de Caria": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/bols_carian_knight_bosses_elden_ring_wiki_guide.jpg',
  "Noble sanglant": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/sanguine-noble-6-elden-ring-wiki-guide.jpg',
  "Champion de Fia": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/fias-champion-1-elden-ring-wiki-guide.jpg',
  "Lionel Cœur-de-Lion": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/lionel-the-lionhearted-invader-npc-elden-ring-wiki-guide-300px.png',

  // ============================================================
  // Astral / Space Bosses
  // ============================================================
  "Astel le Rejeton du vide": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/astel-naturalborn-of-the-void-1-elden-ring-wiki-guide.jpg',
  "Astel la Constellation des ténèbres": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/astel-stars-of-darkness-boss-elden-ring-wiki-guide.jpg',
  "Escargot mande-esprit": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/spirit-caller_snail_elden_ring_wiki_guide_300px.jpg',
  "Créature stellaire": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/fallingstar_beast_altus_plateau_enemies_elden_ring_wiki_300px.jpg',
  "Créature stellaire adulte": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/full-grown-fallingstar-beast-1-elden-ring-wiki-guide.jpg',

  // ============================================================
  // Gargoyles
  // ============================================================
  "Gargouille vaillante": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/valiant_gargoyle1-min.jpg',
  "Gargouille vaillante à la lame double": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/valiant_gargoyle1-min.jpg',
  "Duo de Gargouilles Vaillantes": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/valiant_gargoyle1-min.jpg',

  // ============================================================
  // Nox
  // ============================================================
  "Guerrier Nox": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/nox-swordstress-nox-monk_-1-elden-ring-wiki-guide.jpg',
  "Duo de Guerriers Nox": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/nox-swordstress-nox-monk_-1-elden-ring-wiki-guide.jpg',
  "Prêtresse Nox": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/nox-swordstress-nox-monk_-1-elden-ring-wiki-guide.jpg',
  "Moine nokrien": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/nox-swordstress-nox-monk_-1-elden-ring-wiki-guide.jpg',
  "Épéiste nokrienne": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/nox-swordstress-nox-monk_-1-elden-ring-wiki-guide.jpg',

  // ============================================================
  // Cleanrot Knights
  // ============================================================
  "Chevalier de la Noble putréfaction": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/cleanrot_knight_bosses_elden_ring_wiki_guide1-min.jpg',
  "Chevalier faucheur de la Noble putréfaction": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/cleanrot_knight_bosses_elden_ring_wiki_guide1-min.jpg',
  "Chevalier lancier de la Noble putréfaction": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/cleanrot_knight_bosses_elden_ring_wiki_guide1-min.jpg',
  "Duo de Chevaliers de la Putréfaction": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/cleanrot_knight_bosses_elden_ring_wiki_guide1-min.jpg',
  "Adepte de la putréfaction": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/cleanrot_knight_bosses_elden_ring_wiki_guide1-min.jpg',
  "Adepte de la putréfaction(x2)": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/cleanrot_knight_bosses_elden_ring_wiki_guide1-min.jpg',
  "Chevalier putride": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/cleanrot_knight_bosses_elden_ring_wiki_guide1-min.jpg',

  // ============================================================
  // Misbegotten
  // ============================================================
  "Chimère léonine": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/leonine_misbegotten_bosses_elden_ring_wiki_600px1.jpg',
  "Chimère écailleuse": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/scaly_misbegotten.jpg',
  "Croisé chimérique": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/misbegotten-crusader-elden-ring-wiki-guide-300px.jpeg',
  "Guerrier Mal Engendré": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/leonine_misbegotten_bosses_elden_ring_wiki_600px1.jpg',

  // ============================================================
  // Bloodhound
  // ============================================================
  "Darriwil, Chevalier-limier": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/bloodhound-knight-darriwil-boss-enemy-elden-ring-wiki-guide.jpg',
  "Chevalier-limier": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/bloodgound_knight_liurnia_bosses_elden_ring_wiki_300px.jpg',

  // ============================================================
  // Black Knife Assassins
  // ============================================================
  "Assassin des Couteaux noirs": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/black-knife-assassin-limgrave-2-min.jpg',
  "Alecto, meneuse des Couteaux noirs": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/alecto_black_knife_ringleader_bosses_elden_ring_wiki_guide_300px.jpg',

  // ============================================================
  // Catacombs / Burial
  // ============================================================
  "Veilleur de l'Arbre-Monde": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/burial_watchdog_bosses_elden_ring_wiki_600px1-min.jpg',
  "Veilleur sorcier de l'Arbre-Monde": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/burial_watchdog_bosses_elden_ring_wiki_600px1-min.jpg',
  "Veilleur épéiste de l'Arbre-Monde": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/burial_watchdog_bosses_elden_ring_wiki_600px1-min.jpg',
  "Ombre du cimetière": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/cemetery_shade_bosses_elden_ring_wiki_600px1-min.jpg',

  // ============================================================
  // Various Omen / Fell
  // ============================================================
  "Tueur de Réprouvés": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/omenkiller-3-elden-ring-wiki-guide.jpg',
  "Jumeau abominable(x2)": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/fell_twins_omen_bosses_elden_ring_wiki_600px1-min.jpg',

  // ============================================================
  // Various
  // ============================================================
  "Roi des Albinauriques": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/royal-revenant-1-elden-ring-wiki-guide.jpg',
  "Revenant Royal": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/royal-revenant-1-elden-ring-wiki-guide.jpg',
  "Spectre royal": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/royal-revenant-1-elden-ring-wiki-guide.jpg',
  "Face de ver": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/wormface-boss-elden-ring-wiki-guide-300px.jpeg',
  "Nocher diaphane": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/tibia-mariner_ground_boss_enemies_elden_ring_wiki_300px.jpg',
  "Ancien héros de Zamor": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/ancient-hero-of-zamor-weeping-evergaol-small-elden-ring-wiki-guide.jpg',
  "Homme-bête de Farum Azula": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/beastman-of-farum-azula1.jpg',
  "Homme-bête aux couteaux de Farum Azula": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/beastman-of-farum-azula1.jpg',
  "Homme-bête guerrier de Farum Azula": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/beastman-of-farum-azula1.jpg',
  "Seigneur d'onyx": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/onyx-lord-1-elden-ring-wiki-guide.jpg',
  "Seigneur d'Albâtre": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/alabaster_lord_bosses_elden_ring_wiki_guide.jpg',

  // ============================================================
  // Night / Death bosses
  // ============================================================
  "Volatile funèbre": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/death_rite_bird_bosses_elden_ring_wiki_guide1-min.jpg',
  "Rapace funeste": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/death_rite_bird_bosses_elden_ring_wiki_guide1-min.jpg',
  "Chasseur de perles cinéraires": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/bell-bearing-hunter-elden-ring.jpg',
  "Cavalier crépusculaire": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/nights_cavalry_bosses_elden_ring_wiki_guide1-min.jpg',
  "Cavalier crépusculaire au fléau": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/nights_cavalry_bosses_elden_ring_wiki_guide1-min.jpg',
  "Cavalier crépusculaire au glaive": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/nights_cavalry_bosses_elden_ring_wiki_guide1-min.jpg',

  // ============================================================
  // Demi-Humans
  // ============================================================
  "Reine Semi-Humaine": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/demi-human_queen_enemies_elden_ring_wiki_600px.jpg',
  "Chef semi-humain(x2)": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/demi-human_queen_enemies_elden_ring_wiki_600px.jpg',
  "Gilika, reine semi-humaine": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/queen-gilika-elden-ring-wiki-600px.jpg',
  "Maggie, reine semi-humaine": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/demi-human-queen-maggie-boss-elden-ring-wiki-guide-300px-min.jpeg',
  "Margot, reine semi-humaine": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/demi-human-queen-margot-boss-elden-ring-wiki-guide-300px-min.jpeg',
  "Marigga, reine semi-humaine": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/demi-human_queen_enemies_elden_ring_wiki_600px.jpg',
  "Onze, épéiste semi-humain": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/demi-human-swordmaster-onze-boss-elden-ring-shadow-of-the-erdtree-wiki-guide.jpg',

  // ============================================================
  // Animals / Creatures
  // ============================================================
  "Miranda la Fleur galeuse": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/miranda-the-blighted-bloom-field-boss-elden-ring-wiki-guide-300px.jpg',
  "Miranda la Fleur Vénéneuse": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/miranda-the-blighted-bloom-field-boss-elden-ring-wiki-guide-300px.jpg',
  "Ours Géant Ensanglanté": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/runebear_bosses_elden_ring_wiki_guide1.jpg',
  "Ours runique": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/runebear_bosses_elden_ring_wiki_guide1.jpg',
  "Chevalier du Feu Géant": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/fire_knight_bosses_elden_ring_wiki_300px.jpg',

  // ============================================================
  // Abductor Virgins
  // ============================================================
  "Vierge ravisseuse aux faucilles": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/abductor-virgins-1-elden-ring-wiki-guide.jpg',
  "Vierge ravisseuse aux rouets": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/abductor-virgins-1-elden-ring-wiki-guide.jpg',
  "Vierges Ravisseuses": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/abductor-virgins-1-elden-ring-wiki-guide.jpg',

  // ============================================================
  // DLC - Shadow of the Erdtree
  // ============================================================
  "Messmer l'Empaleur": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/messmer_the_impaler_bosses_elden_ring_wiki_300px.jpg',
  "Messmer, serpent maléfique": 'https://static1.fextralifeimages.com/wordpress/wp-content/uploads/2024/06/base_serpent_messmer_bosses_elden_ring_wiki_1200px.png',
  "Rellana, chevaleresse des Lunes jumelles": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/rellana_twin_moon_knight2_300px.jpg',
  "Lion dansant de la bête divine": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/divine_beast_dancing_lion_bosses_elden_ring_wiki_300px.jpg',
  "Comte Ymir, mère des Doigts": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/count-ymir-mother-of-fingers-boss-elden-ring-wiki-guide.jpg',
  "Metyr, mère des Doigts": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/metyr_mother_of_fingers_bosses_elden_ring_wiki_300px.jpg',
  "Midra, seigneur de la Flamme exaltée": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/midra_lord_of_frenzied_flame_bosses_elden_ring_wiki_300px.jpg',
  "Romina, sainte du bourgeon": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/romina_saint_of_the_bud_bosses_elden_ring_wiki_300px.jpg',
  "Rugalea, grand ours écarlate": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/rugalea-the-great-red-bear-boss-elden-ring-wiki-guide.jpg',
  "Ralva, grand ours écarlate": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/rugalea-the-great-red-bear-boss-elden-ring-wiki-guide.jpg',
  "Ours écarlate": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/rugalea-the-great-red-bear-boss-elden-ring-wiki-guide.jpg',
  "Bayle l'Effroyable": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/bayle_the_dread_bosses_elden_ring_wiki_300px.jpg',
  "Chevalier de la Mort": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/death-knight-elden-ring-wiki-600px.jpg',
  "Larmoyeur": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/lamenter.png',
  "Edredd, chevalier Noir": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/black_knight_bosses_elden_ring_wiki_300px.jpg',
  "Garrew, chevalier Noir": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/black_knight_bosses_elden_ring_wiki_300px.jpg',
  "Senessax, Dragon ancien": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/senessax.png',
  "Hippopotame doré": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/golden-hippopotamus-elden-ring-wiki-300px.jpg',
  "Commandant Gaïus": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/commander_gaius_bosses_elden_ring_wiki_300px.jpg',
  "Radahn, futur consort": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/radahn_consort_of_miquella_bosses_elden_ring_wiki_600px.jpg',
  "Radahn, consort de Miquella": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/radahn_consort_of_miquella_bosses_elden_ring_wiki_600px.jpg',
  "Avatar de l'Arbre-Occulte": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/scadutree_avatar_bosses_elden_ring_wiki_300px.jpg',
  "Dane Mortefeuille": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/death-knight-elden-ring-wiki-600px.jpg',
  "Danseuse de Ranah": 'https://img.game8.co/3911579/54d39d26bf2900540e5c4e573880b8e9.png/show',
  "Dragon de flammes spectrales": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/ghostflame-dragon-boss-elden-ring-shadow-of-the-erdtree-wiki-guide.jpg',
  "Dragon du Pic déchiqueté": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/jagged-peak-drake-elden-ring-wiki-600px.jpg',
  "Homme-dragon ancien": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/ancient-dragon-man-boss-eldenring-dlc-wiki-gudie-300px.jpg',
  "Jori, inquisiteur en chef": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/jori-elder-inquisitor-elden-ring-wiki-300px.jpg',
  "Rakshasa": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/rakshasa.png',
  "Leda et ses Alliés": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/needle-knight-leda_art_elden_ring_shadow_of_the_erdtree_dlc_wiki_guide.png',
  "Golem Fourneau": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/furnace-golem-elden-ring-wiki-300px.jpg',
  "Labirith l'Exécrable": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/curseblade-labirith-elden-ring-wiki-600px.jpg',
  "Chevalier de la Geôle Solitaire": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/death-knight-elden-ring-wiki-600px.jpg',
  "Logur, la Griffe Bestiale": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/beastman-of-farum-azula1.jpg',
  "Chef des démons sanglants": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/chief-bloodfiend-elden-ring-wiki-600px.jpg',
  "Sire Gideon Ofnir l'Omniscient": 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/sir_gideon_ofnir_the_all_knowing_bosses_elden_ring_wiki_guide.jpg',
};

// Normalized boss name lookup table for fuzzy matching
const NORMALIZED_MAP = {};
for (const name of Object.keys(BOSS_IMAGES)) {
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '')     // Remove special chars
    .replace(/\s+/g, ' ')
    .trim();
  NORMALIZED_MAP[normalized] = name;
}

/**
 * Get boss artwork URL by boss name.
 * Tries exact match, then case-insensitive, then fuzzy (normalized).
 * Returns URL string or null.
 */
function getEldenRingBossImage(bossName) {
  if (!bossName) return null;

  // Exact match
  if (bossName in BOSS_IMAGES) {
    return BOSS_IMAGES[bossName];
  }

  // Case-insensitive match
  const lower = bossName.toLowerCase();
  for (const [name, url] of Object.entries(BOSS_IMAGES)) {
    if (name.toLowerCase() === lower) {
      return url;
    }
  }

  // Fuzzy match (normalized: no accents, no special chars)
  const normalized = bossName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized in NORMALIZED_MAP) {
    return BOSS_IMAGES[NORMALIZED_MAP[normalized]];
  }

  // Partial match (boss name might be shortened by OCR)
  for (const [normName, origName] of Object.entries(NORMALIZED_MAP)) {
    if (normName.includes(normalized) || normalized.includes(normName)) {
      return BOSS_IMAGES[origName];
    }
  }

  return null;
}

module.exports = { getEldenRingBossImage, BOSS_IMAGES };

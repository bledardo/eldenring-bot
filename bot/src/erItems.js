// erItems.js — Base de données des objets collectibles Elden Ring
// DLC Shadow of the Erdtree + Items légendaires base game (100% succès)
// Chaque item a un champ `wiki` pointant vers la page Fextralife (screenshots + carte)

const items = {

  // ============================================================
  // ITEMS LÉGENDAIRES — JEU DE BASE (Succès Steam)
  // ============================================================

  legendaryWeapons: {
    name: "Armements légendaires",
    achievement: "Armements légendaires",
    description: "Collecter les 9 armes légendaires du jeu de base",
    items: [
      {
        name: "Espadon à Lame Greffée",
        type: "Épée colossale",
        location: "Péninsule larmoyante - Château Mourne",
        detail: "Drop du Léonin Dégénéré au sommet du Château Mourne.",
        wiki: "https://eldenring.wiki.fextralife.com/Grafted+Blade+Greatsword",
      },
      {
        name: "Épée de Nuit et de Flamme",
        type: "Épée droite",
        location: "Liurnia, contrée lacustre - Manoir de Caria",
        detail: "Coffre dans une pièce verrouillée du Manoir de Caria. Accès par les toits.",
        wiki: "https://eldenring.wiki.fextralife.com/Sword+of+Night+and+Flame",
      },
      {
        name: "Espadon des Ruines",
        type: "Épée colossale",
        location: "Caelid - Château du Lion Rouge",
        detail: "Récompense après avoir vaincu Radahn le Fléau des Astres. Coffre dans les Dunes gémissantes.",
        wiki: "https://eldenring.wiki.fextralife.com/Ruins+Greatsword",
      },
      {
        name: "Épée du Bourreau du Marais",
        type: "Espadon",
        location: "Plateau Altus - Le Bastiombre",
        detail: "Drop d'Elemer du Roncier au Bastiombre.",
        wiki: "https://eldenring.wiki.fextralife.com/Marais+Executioner's+Sword",
      },
      {
        name: "Espadon de la Lune Sombre",
        type: "Espadon",
        location: "Liurnia souterraine - Cathédrale de Manus Celes",
        detail: "Récompense de la quête complète de Ranni la Sorcière. Mettre l'anneau au doigt de Ranni.",
        wiki: "https://eldenring.wiki.fextralife.com/Dark+Moon+Greatsword",
        missable: true,
        missableReason: "Nécessite de compléter la quête de Ranni (longue, multi-étapes). La quête reste faisable jusqu'au boss final, mais ne pas tuer/rendre hostile Ranni.",
      },
      {
        name: "Trait de Gransax",
        type: "Grande lance",
        location: "Leyndell, capitale royale",
        detail: "Sur la lance géante dans Leyndell. MISSABLE : disparaît définitivement après avoir vaincu Maliketh (Leyndell → Capitale des cendres). Récupérer AVANT Farum Azula.",
        wiki: "https://eldenring.wiki.fextralife.com/Bolt+of+Gransax",
        missable: true,
        missableReason: "PERMANENT — Leyndell devient Capitale des cendres après Maliketh. L'item le plus critique à récupérer pour le 100%.",
      },
      {
        name: "Shotel de l'Éclipse",
        type: "Épée courbée",
        location: "Cimes des Géants - Solcastel, Église de l'Éclipse",
        detail: "Sur un cadavre près de l'autel dans l'Église de l'Éclipse, Château Sol.",
        wiki: "https://eldenring.wiki.fextralife.com/Eclipse+Shotel",
      },
      {
        name: "Sceptre du Dévoreur",
        type: "Marteau de guerre",
        location: "Ruines de Farum Azula / Nécrolimbe - Cabane du maître de guerre",
        detail: "Deux méthodes : (A) Tuer Bernahl à la Cabane du maître de guerre (Nécrolimbe) — toujours disponible. (B) Invasion de Bernahl à Farum Azula — nécessite d'avoir fait les contrats du Manoir du volcan + vaincu Rykard AVANT Maliketh.",
        wiki: "https://eldenring.wiki.fextralife.com/Devourer's+Scepter",
        missable: false,
        missableReason: "Non ratable car Bernahl peut toujours être tué à la Cabane du maître de guerre. La méthode Farum Azula est verrouillée par Maliketh.",
      },
      {
        name: "Espadon de l'Ordre d'Or",
        type: "Espadon",
        location: "Cimes des Géants - Grotte des parias",
        detail: "Drop du Croisé chimérique dans la Grotte des parias.",
        wiki: "https://eldenring.wiki.fextralife.com/Golden+Order+Greatsword",
      },
    ],
  },

  legendaryTalismans: {
    name: "Talismans légendaires",
    achievement: "Talismans légendaires",
    description: "Collecter les 8 talismans légendaires du jeu de base",
    items: [
      {
        name: "Sceau Meurtri de Radagon",
        effect: "+5 Vigueur/Endurance/Force/Dextérité, mais +15% dégâts subis",
        location: "Caelid - Fort Faroth",
        detail: "Fort à l'est du Tertre draconique de Greyoll. Coffre au sommet du fort.",
        wiki: "https://eldenring.wiki.fextralife.com/Radagon's+Soreseal",
      },
      {
        name: "Icône de Radagon",
        effect: "Réduit le temps d'incantation des sorts (~10%)",
        location: "Académie de Raya Lucaria",
        detail: "Coffre dans une salle après le boss Loup Cramoisi de Radagon (2e étage de l'Académie).",
        wiki: "https://eldenring.wiki.fextralife.com/Radagon+Icon",
      },
      {
        name: "Icône de Godfrey",
        effect: "Améliore les sorts et compétences chargés (~15%)",
        location: "Plateau Altus - Geôle éternelle de la lignée dorée",
        detail: "Vaincre Godefroy le Greffé dans la geôle éternelle.",
        wiki: "https://eldenring.wiki.fextralife.com/Godfrey+Icon",
      },
      {
        name: "Lune de Nokstella",
        effect: "+2 emplacements de mémoire pour les sorts",
        location: "Nokstella, Ville Éternelle",
        detail: "Coffre sous le trône dans Nokstella (accessible via l'Ainsel).",
        wiki: "https://eldenring.wiki.fextralife.com/Moon+of+Nokstella",
      },
      {
        name: "Sceau Meurtri de Marika",
        effect: "+5 Esprit/Intelligence/Foi/Ésotérisme, mais dégâts subis augmentés",
        location: "Arbre-Sacré de Miquella - Elphael",
        detail: "Derrière une porte à barrière dans Elphael, Étreinte de l'Arbre-Sacré.",
        wiki: "https://eldenring.wiki.fextralife.com/Marika's+Soreseal",
      },
      {
        name: "Talisman de Pavois Draconique",
        effect: "Augmente significativement la résistance physique (15-25%)",
        location: "Arbre-Sacré de Miquella - Elphael",
        detail: "Sur le toit de l'église, accessible via le Canal de Drainage d'Elphael.",
        wiki: "https://eldenring.wiki.fextralife.com/Dragoncrest+Greatshield+Talisman",
      },
      {
        name: "Talisman d'Ancien Seigneur",
        effect: "Augmente la durée des sorts et incantations de 30%",
        location: "Ruines de Farum Azula",
        detail: "Coffre dans une tour près du site de grâce « Abords du Grand Pont ».",
        wiki: "https://eldenring.wiki.fextralife.com/Old+Lord's+Talisman",
      },
      {
        name: "Faveur de l'Arbre-Monde +2",
        effect: "+4% PV, +9.5% endurance, +8% charge d'équipement",
        location: "Leyndell, capitale des cendres",
        detail: "Tronc brisé dans le lac asséché, gardé par 3 Esprits d'arbre ulcéreux. UNIQUEMENT disponible APRÈS avoir vaincu Maliketh (Capitale des cendres). Situation inverse du Trait de Gransax.",
        wiki: "https://eldenring.wiki.fextralife.com/Erdtree's+Favor",
        missable: false,
        missableReason: "Non ratable — apparaît après Maliketh. Mais noter : incompatible avec le Trait de Gransax sur une même fenêtre temporelle. Récupérer Gransax AVANT Maliketh, puis celui-ci APRÈS.",
      },
    ],
  },

  legendarySorceries: {
    name: "Sorcelleries et incantations légendaires",
    achievement: "Sorcelleries et incantations légendaires",
    description: "Collecter les 7 sorcelleries/incantations légendaires du jeu de base",
    items: [
      {
        name: "Comète d'Azur",
        type: "Sorcellerie",
        location: "Mont Gelmir - Primordial Azur",
        detail: "Parler au sorcier primordial Azur au Mont Gelmir (lié à la quête de Sellen).",
        wiki: "https://eldenring.wiki.fextralife.com/Comet+Azur",
      },
      {
        name: "Étoiles de la Perdition",
        type: "Sorcellerie",
        location: "Caelid - Repaire caché de Sellia",
        detail: "Nécessite le Brise-sceau de Sellia obtenu via la quête de Sellen. Parler à Sellen après avoir trouvé Azur, recevoir la clé, trouver Maître Lusat dans le Repaire caché de Sellia.",
        wiki: "https://eldenring.wiki.fextralife.com/Stars+of+Ruin",
        missable: true,
        missableReason: "Nécessite la quête de Sellen (partielle). Ne pas tuer Sellen ni la rendre hostile avant d'avoir obtenu le Brise-sceau.",
      },
      {
        name: "Étoiles d'Elden",
        type: "Sorcellerie",
        location: "Profondeurs de Fonderacine - Colonie de fourmis géantes",
        detail: "Dans les profondeurs de Fonderacine, après avoir vaincu Radahn et accédé à Nokron.",
        wiki: "https://eldenring.wiki.fextralife.com/Elden+Stars",
      },
      {
        name: "Pluie d'Étoiles Primordiale",
        type: "Sorcellerie",
        location: "Cimes des Géants - Tour de Pierre d'Éclat Scellée",
        detail: "Tour au nord-est des Cimes. Accès par des ponts invisibles.",
        wiki: "https://eldenring.wiki.fextralife.com/Founding+Rain+of+Stars",
      },
      {
        name: "Lune Noire de Ranni",
        type: "Sorcellerie",
        location: "Liurnia - Tour de Chelona, Autel lunaire",
        detail: "Coffre à la Tour de Chelona sur l'Autel lunaire. Zone accessible uniquement après avoir avancé la quête de Ranni (vaincre Astel le Rejeton du vide).",
        wiki: "https://eldenring.wiki.fextralife.com/Ranni's+Dark+Moon",
        missable: true,
        missableReason: "Nécessite la quête de Ranni (avancée jusqu'à Astel). La quête reste faisable jusqu'au boss final.",
      },
      {
        name: "Flamme du Dieu Cruel",
        type: "Incantation",
        location: "Liurnia - Geôle éternelle du scélérat (sud)",
        detail: "Vaincre Adan le Voleur du feu dans la geôle éternelle au sud de Liurnia.",
        wiki: "https://eldenring.wiki.fextralife.com/Flame+of+the+Fell+God",
      },
      {
        name: "Cri de Greyoll",
        type: "Incantation",
        location: "Caelid - Sanctuaire de la Communion Draconique",
        detail: "Échanger 3 Cœurs de Dragon au Sanctuaire (Cathédrale de la Communion Draconique). Vaincre Greyoll au Tertre draconique.",
        wiki: "https://eldenring.wiki.fextralife.com/Greyoll's+Roar",
      },
    ],
  },

  legendaryAshes: {
    name: "Cendres d'esprits légendaires",
    achievement: "Esprits légendaires",
    description: "Collecter les 6 cendres d'esprits légendaires du jeu de base",
    items: [
      {
        name: "Lhutel l'Acéphale",
        location: "Péninsule larmoyante - Catacombes de l'Épée de Tombe",
        detail: "Coffre au bout des catacombes, falaise nord d'un Arbre Mineur.",
        wiki: "https://eldenring.wiki.fextralife.com/Lhutel+the+Headless",
      },
      {
        name: "Cendres de Larme Imitatrice",
        location: "Nokron, Ville Éternelle - Sol Sacré de la Nuit",
        detail: "Coffre dans Nokron (accessible après avoir vaincu Radahn, via le cratère).",
        wiki: "https://eldenring.wiki.fextralife.com/Mimic+Tear+Ashes",
      },
      {
        name: "Kristoff, Chevalier des Dragons Anciens",
        location: "Faubourgs de la capitale - Tombe du héros canonisé",
        detail: "Nord-est des remparts de Leyndell. Vaincre l'Ancien héros de Zamor dans la tombe.",
        wiki: "https://eldenring.wiki.fextralife.com/Ancient+Dragon+Knight+Kristoff+Ashes",
      },
      {
        name: "Ogha, Chevalier du Lion Rouge",
        location: "Caelid - Catacombes des défunts valeureux",
        detail: "Nord de l'arène de Radahn. Accessible après avoir vaincu Radahn.",
        wiki: "https://eldenring.wiki.fextralife.com/Redmane+Knight+Ogha+Ashes",
      },
      {
        name: "Tiche des Couteaux Noirs",
        location: "Liurnia - Geôle éternelle de la meneuse des Couteaux noirs, Autel lunaire",
        detail: "Vaincre Alecto dans la Geôle éternelle sur l'Autel lunaire. Zone accessible uniquement via la quête de Ranni (après Astel).",
        wiki: "https://eldenring.wiki.fextralife.com/Black+Knife+Tiche+Ashes",
        missable: true,
        missableReason: "Nécessite la quête de Ranni (avancée jusqu'à Astel pour débloquer l'Autel lunaire). La quête reste faisable jusqu'au boss final.",
      },
      {
        name: "Finlay, Chevalier de la Noble Putréfaction",
        location: "Arbre-Sacré de Miquella - Elphael",
        detail: "Coffre après l'arène de Malenia, gardé par un chevalier lourd.",
        wiki: "https://eldenring.wiki.fextralife.com/Cleanrot+Knight+Finlay+Ashes",
      },
    ],
  },

  // ============================================================
  // DLC — SHADOW OF THE ERDTREE
  // ============================================================

  dlcRemembranceWeapons: {
    name: "Armes de Souvenir (DLC)",
    description: "Armes et sorts obtenus via les Souvenirs des boss du DLC",
    items: [
      {
        boss: "Lion dansant de la bête divine",
        wiki: "https://eldenring.wiki.fextralife.com/Divine+Beast+Dancing+Lion",
        rewards: [
          { name: "Talisman de la Bête divine enragée", type: "Talisman", wiki: "https://eldenring.wiki.fextralife.com/Enraged+Divine+Beast" },
          { name: "Coup de givre de la Bête divine", type: "Cendre de guerre", wiki: "https://eldenring.wiki.fextralife.com/Divine+Beast+Frost+Stomp" },
        ],
      },
      {
        boss: "Rellana, chevaleresse des Lunes jumelles",
        wiki: "https://eldenring.wiki.fextralife.com/Rellana+Twin+Moon+Knight",
        rewards: [
          { name: "Lames jumelles de Rellana", type: "Espadon léger", wiki: "https://eldenring.wiki.fextralife.com/Rellana's+Twin+Blades" },
          { name: "Les Lunes jumelles de Rellana", type: "Sorcellerie", wiki: "https://eldenring.wiki.fextralife.com/Rellana's+Twin+Moons" },
        ],
      },
      {
        boss: "Romina, sainte du bourgeon",
        wiki: "https://eldenring.wiki.fextralife.com/Romina+Saint+of+the+Bud",
        rewards: [
          { name: "Lame du Bourgeon", type: "Hallebarde", wiki: "https://eldenring.wiki.fextralife.com/Poleblade+of+the+Bud" },
          { name: "Papillons pourris", type: "Incantation", wiki: "https://eldenring.wiki.fextralife.com/Rotten+Butterflies" },
        ],
      },
      {
        boss: "Messmer l'Empaleur",
        wiki: "https://eldenring.wiki.fextralife.com/Messmer+The+Impaler",
        rewards: [
          { name: "Lance de l'Empaleur", type: "Grande lance", wiki: "https://eldenring.wiki.fextralife.com/Spear+of+the+Impaler" },
          { name: "Orbe de Messmer", type: "Incantation", wiki: "https://eldenring.wiki.fextralife.com/Messmer's+Orb" },
        ],
      },
      {
        boss: "Chevalier putride",
        wiki: "https://eldenring.wiki.fextralife.com/Putrescent+Knight",
        rewards: [
          { name: "Tranchoir de putrescence", type: "Grande hache", wiki: "https://eldenring.wiki.fextralife.com/Putrescence+Cleaver" },
          { name: "Vortex de putrescence", type: "Sorcellerie", wiki: "https://eldenring.wiki.fextralife.com/Vortex+of+Putrescence" },
        ],
      },
      {
        boss: "Commandant Gaïus",
        wiki: "https://eldenring.wiki.fextralife.com/Commander+Gaius",
        rewards: [
          { name: "Lance-épée de Gaïus", type: "Épée d'estoc lourde", wiki: "https://eldenring.wiki.fextralife.com/Sword+Lance" },
          { name: "Lames de pierre", type: "Sorcellerie", wiki: "https://eldenring.wiki.fextralife.com/Stone-Sheathed+Sword" },
        ],
      },
      {
        boss: "Avatar de l'Arbre-Occulte",
        wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Avatar",
        rewards: [
          { name: "Fleur de tournesol de l'Ombre", type: "Arme colossale", wiki: "https://eldenring.wiki.fextralife.com/Shadow+Sunflower+Blossom" },
          { name: "Terre d'Ombre", type: "Incantation", wiki: "https://eldenring.wiki.fextralife.com/Land+of+Shadow+(Incantation)" },
        ],
      },
      {
        boss: "Midra, seigneur de la Flamme exaltée",
        wiki: "https://eldenring.wiki.fextralife.com/Midra+Lord+of+Frenzied+Flame",
        rewards: [
          { name: "Espadon de la Damnation", type: "Espadon", wiki: "https://eldenring.wiki.fextralife.com/Greatsword+of+Damnation" },
          { name: "Flamme exaltée de Midra", type: "Incantation", wiki: "https://eldenring.wiki.fextralife.com/Midra's+Flame+of+Frenzy" },
        ],
      },
      {
        boss: "Metyr, mère des Doigts",
        wiki: "https://eldenring.wiki.fextralife.com/Metyr+Mother+of+Fingers",
        rewards: [
          { name: "Bâton de l'au-delà", type: "Bâton d'éclat", wiki: "https://eldenring.wiki.fextralife.com/Staff+of+the+Great+Beyond" },
          { name: "Doigt de visée", type: "Sorcellerie", wiki: "https://eldenring.wiki.fextralife.com/Gazing+Finger" },
        ],
      },
      {
        boss: "Radahn, consort de Miquella",
        wiki: "https://eldenring.wiki.fextralife.com/Promised+Consort+Radahn",
        rewards: [
          { name: "Épée de Radahn (Seigneur)", type: "Épée colossale", wiki: "https://eldenring.wiki.fextralife.com/Greatsword+of+Radahn+(Lord)" },
          { name: "Épée de Radahn (Lumière)", type: "Épée colossale", wiki: "https://eldenring.wiki.fextralife.com/Greatsword+of+Radahn+(Light)" },
          { name: "Lumière de Miquella", type: "Incantation", wiki: "https://eldenring.wiki.fextralife.com/Light+of+Miquella" },
        ],
      },
    ],
  },

  dlcLegendaryWeapons: {
    name: "Armes légendaires (DLC)",
    achievement: "Armements légendaires du Royaume des Ombres",
    description: "5 armes légendaires ajoutées par le DLC",
    items: [
      {
        name: "Espadon en Minerai Météorique Ancien",
        type: "Épée colossale",
        location: "Altus Occulte - Ruines de la Forge Météorique",
        detail: "Dans les ruines au sud-ouest d'Altus Occulte. Coffre dans un bâtiment effondré.",
        wiki: "https://eldenring.wiki.fextralife.com/Ancient+Meteoric+Ore+Greatsword",
      },
      {
        name: "Épée à Fourreau de Pierre",
        type: "Épée droite",
        location: "Ruines antiques de Rauh - Tour secrète",
        detail: "Tour cachée dans les Ruines Antiques de Rauh. Accès par les branches d'arbre.",
        wiki: "https://eldenring.wiki.fextralife.com/Stone-Sheathed+Sword",
      },
      {
        name: "Épée de Radahn (Seigneur)",
        type: "Épée colossale",
        location: "Souvenir de Radahn, consort de Miquella",
        detail: "Échanger le souvenir auprès de la Carcasse des jumelles (Table ronde).",
        wiki: "https://eldenring.wiki.fextralife.com/Greatsword+of+Radahn+(Lord)",
      },
      {
        name: "Épée de Radahn (Lumière)",
        type: "Épée colossale",
        location: "Souvenir de Radahn, consort de Miquella",
        detail: "Échanger le souvenir auprès de la Carcasse des jumelles (Table ronde).",
        wiki: "https://eldenring.wiki.fextralife.com/Greatsword+of+Radahn+(Light)",
      },
      {
        name: "Espadon de la Damnation",
        type: "Espadon",
        location: "Souvenir de Midra, seigneur de la Flamme exaltée",
        detail: "Échanger le souvenir auprès de la Carcasse des jumelles (Table ronde).",
        wiki: "https://eldenring.wiki.fextralife.com/Greatsword+of+Damnation",
      },
    ],
  },

  dlcTalismans: {
    name: "Talismans (DLC)",
    description: "Talismans notables ajoutés par Shadow of the Erdtree",
    items: [
      {
        name: "Lame de Miséricorde",
        effect: "+20% dégâts pendant 20s après un coup critique",
        location: "Plaine sépulcrale - Sommet des ruines brûlées",
        wiki: "https://eldenring.wiki.fextralife.com/Blade+of+Mercy",
      },
      {
        name: "Bouquet Flétri",
        effect: "+20% dégâts après la mort des cendres invoquées",
        location: "Plaine sépulcrale - Autel près de l'Avant-Scène",
        wiki: "https://eldenring.wiki.fextralife.com/Dried+Bouquet",
      },
      {
        name: "Colère de la Bête Sacrée",
        effect: "+10% dégâts de tempête",
        location: "Souvenir de la Bête divine Lion dansant",
        wiki: "https://eldenring.wiki.fextralife.com/Enraged+Divine+Beast",
      },
      {
        name: "Insigne de Croisade",
        effect: "+15% puissance d'attaque pendant 20s après avoir vaincu un ennemi",
        location: "Plaine sépulcrale - Église de la Croisade (vaincre Queelign)",
        wiki: "https://eldenring.wiki.fextralife.com/Crusade+Insignia",
      },
      {
        name: "Camée de Rellana",
        effect: "Améliore les attaques après avoir maintenu une posture longtemps",
        location: "Plaine sépulcrale - Château d'Ensis, autel de l'église",
        wiki: "https://eldenring.wiki.fextralife.com/Rellana's+Cameo",
      },
      {
        name: "Talisman de Rosée Bleue Bénie",
        effect: "Régénère 1 PC toutes les 2 secondes",
        location: "Plaine sépulcrale - Ruines d'église au sud",
        wiki: "https://eldenring.wiki.fextralife.com/Blessed+Blue+Dew+Talisman",
      },
      {
        name: "Médaille d'Ambre Cramoisi +3",
        effect: "Augmente considérablement le maximum de PV",
        location: "Plaine sépulcrale - Catacombes de la faille brumeuse (vaincre Chevalier de la Mort)",
        wiki: "https://eldenring.wiki.fextralife.com/Crimson+Amber+Medallion",
      },
      {
        name: "Relique de l'Ancien Dieu",
        effect: "+5 en Ésotérisme",
        location: "Plaine sépulcrale - Sommet de la Ville du Prospect",
        wiki: "https://eldenring.wiki.fextralife.com/Aged+One's+Exultation",
      },
      {
        name: "Talisman de Dragon de Feu +3",
        effect: "+22% résistance au feu",
        location: "Altus Occulte - Fort de la Réprimande, salle des cages",
        wiki: "https://eldenring.wiki.fextralife.com/Flamedrake+Talisman",
      },
      {
        name: "Talisman de Dragon de Foudre +3",
        effect: "+22% résistance à la foudre",
        location: "Altus Occulte - Entrepôt à semences, 1er étage, passage secret",
        wiki: "https://eldenring.wiki.fextralife.com/Boltdrake+Talisman",
      },
      {
        name: "Talisman de Dragon de Perle +3",
        effect: "+11% résistance à tous les éléments",
        location: "Altus Occulte - Château noir, rotation des statues (niveau 7 Entrepôt)",
        wiki: "https://eldenring.wiki.fextralife.com/Pearldrake+Talisman",
      },
      {
        name: "Tresse Dorée (Sacré +3)",
        effect: "+22% résistance aux dégâts sacrés",
        location: "Altus Occulte - Village des Chamans, arbre creux (émote requise)",
        wiki: "https://eldenring.wiki.fextralife.com/Golden+Braid",
      },
      {
        name: "Poussière d'Étoile Inestimable",
        effect: "Cast speed max (+99 Dex virtuelle), mais +30% dégâts subis",
        location: "Altus Occulte - Quête du Comte Ymir (récompense)",
        wiki: "https://eldenring.wiki.fextralife.com/Beloved+Stardust",
      },
      {
        name: "Talisman de Graine Cramoisie +1",
        effect: "+30% récupération HP de la Fiole Cramoisie",
        location: "Quête d'Ymir - Ruines des Doigts de Rhia (sonner la cloche)",
        wiki: "https://eldenring.wiki.fextralife.com/Crimson+Seed+Talisman",
      },
      {
        name: "Talisman de Graine Azur +1",
        effect: "Augmente la récupération FP de la Fiole Céruléenne",
        location: "Quête d'Ymir - Ruines des Doigts de Dhéo (sonner la cloche)",
        wiki: "https://eldenring.wiki.fextralife.com/Cerulean+Seed+Talisman",
      },
      {
        name: "Talisman de Pierre Fendue",
        effect: "Améliore la puissance des coups de pied et piétinements",
        location: "Altus Occulte - Ruines de Moorth, maison dans le gouffre",
        wiki: "https://eldenring.wiki.fextralife.com/Shattered+Stone+Talisman",
      },
      {
        name: "Talisman de Tortue à Deux Têtes",
        effect: "+22% récupération d'endurance",
        location: "Côte céruléenne - Grotte de la Rivière Ellac, derrière la cascade",
        wiki: "https://eldenring.wiki.fextralife.com/Two-Headed+Turtle+Talisman",
      },
      {
        name: "Sourire de Sainte Trina",
        effect: "Augmente la puissance d'attaque près des ennemis endormis",
        location: "Quête de Thiollier - Vaincre Thiollier au Jardin du nymphéa pourpre",
        wiki: "https://eldenring.wiki.fextralife.com/St.+Trina's+Smile",
      },
      {
        name: "Enchevêtrement de lacération",
        effect: "Améliore les attaques lacérantes",
        location: "Quête de Leda - Aider Leda contre Kérastien (marque rouge)",
        wiki: "https://eldenring.wiki.fextralife.com/Lacerating+Crossed-Tree",
      },
      {
        name: "Disque vert-de-gris",
        effect: "Augmente la défense avec un poids d'équipement élevé",
        location: "Ruines antiques de Rauh - Derrière une cascade (Clé d'Épée requise)",
        wiki: "https://eldenring.wiki.fextralife.com/Verdigris+Discus",
      },
      {
        name: "Talisman d'Épée à Deux Mains",
        effect: "+15% attaques normales/lourdes des armes tenues à 2 mains",
        location: "Ruines antiques de Rauh - Coffre au sommet des ruines",
        wiki: "https://eldenring.wiki.fextralife.com/Two-Handed+Sword+Talisman",
      },
      {
        name: "Talisman de Crucible des Créatures",
        effect: "Combine les effets de tous les Talismans de Crucible",
        location: "Ruines antiques de Rauh - Coffre accessible par un pilier",
        wiki: "https://eldenring.wiki.fextralife.com/Crucible+Feather+Talisman",
      },
      {
        name: "Médaille d'Ambre Azur +3",
        effect: "Augmente considérablement le maximum de PC (FP)",
        location: "Altus Occulte - Catacombes du Scorpion (vaincre Chevalier de la Mort)",
        wiki: "https://eldenring.wiki.fextralife.com/Cerulean+Amber+Medallion",
      },
      {
        name: "Médaille d'Ambre Viridis +3",
        effect: "Augmente considérablement l'endurance maximale",
        location: "Bois abyssaux - Catacombes de la lumière noire",
        wiki: "https://eldenring.wiki.fextralife.com/Viridian+Amber+Medallion",
      },
      {
        name: "Joie de l'Ancien",
        effect: "+20% dégâts pendant 20s quand la Folie est infligée à proximité",
        location: "Bois abyssaux - Vaincre le Primordial près de l'église en ruine",
        wiki: "https://eldenring.wiki.fextralife.com/Aged+One's+Exultation",
      },
    ],
  },

  dlcScadutree: {
    name: "Esquilles de l'Arbre-Occulte (DLC)",
    description: "50 esquilles à offrir aux Croix de Miquella pour monter la bénédiction d'Arbre-Occulte (max niv 20). C'est LE buff de dégâts/défense du DLC : sans lui, les boss font le double de dégâts.",
    items: [
      { name: "Esquille - Église de la Consolation (statue de Marika)", location: "Plaine sépulcrale - Église de la Consolation", detail: "Sur la statue de Marika à l'intérieur (x2 ici).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Croix des Trois Chemins", location: "Plaine sépulcrale - Site de grâce Croix des Trois Chemins", detail: "Au pied de la Croix de Miquella.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Camp messmérien (Devant Ensis)", location: "Plaine sépulcrale - Camp messmérien devant le Château d'Ensis", detail: "Sur la statue de Marika dans le campement.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Croix de la Porte Principale", location: "Plaine sépulcrale - Site de grâce Croix de la Porte Principale", detail: "Au pied de la Croix, devant Belurat.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Ruines Calcinées NE", location: "Plaine sépulcrale - Nord-est des Ruines Calcinées", detail: "Drop d'un Marmite-d'ombre (Shadowpot).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Terminus Route des Falaises SO", location: "Plaine sépulcrale - SO du Terminus de la Route des Falaises", detail: "Drop d'un Marmite-d'ombre.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Croix de la Voie aux Piliers", location: "Plaine sépulcrale - Site de grâce Croix de la Voie aux Piliers", detail: "Au pied de la Croix de Miquella.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Belurat (salle cachée)", location: "Belurat, colonie de la tour - Salle cachée", detail: "Salle dissimulée derrière les araignées-scorpions.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Poste de Garde Ensis", location: "Château d'Ensis - Site de grâce Poste de Garde", detail: "Au pied de la Croix de Miquella.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Croix de la Voie Royale", location: "Altus occulte - Site de grâce Croix de la Voie Royale", detail: "Au pied de la Croix de Miquella.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Porte Principale Château Noir", location: "Altus occulte - Camp messmérien devant le Château Noir", detail: "Sur l'autel du campement.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Église de la Croisade #1", location: "Altus occulte - Église de la Croisade", detail: "À l'intérieur sur la statue (x2 ici).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Église de la Croisade #2", location: "Altus occulte - Église de la Croisade", detail: "Deuxième esquille à côté de la statue de Marika.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Site de grâce Ruines de Moorth", location: "Altus occulte - Site de grâce Ruines de Moorth", detail: "Au pied de la Croix de Miquella.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Camp Ruines de Moorth", location: "Altus occulte - Camp messmérien NO des Ruines de Moorth", detail: "Sur l'autel du campement.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Sud Ruines de Moorth", location: "Altus occulte - Sud des Ruines de Moorth, près de la fissure", detail: "Drop d'un Marmite-d'ombre.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Grotte Nord Moorth", location: "Altus occulte - Devant la grotte nord des Ruines de Moorth", detail: "Sur un petit autel à l'entrée de la grotte.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Croix du Panorama Occulte", location: "Panorama occulte - Site de grâce Croix du Panorama Occulte", detail: "Au pied de la Croix de Miquella.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Ruines de la Cité du Temple", location: "Base de Rauh - Ruines de la Cité du Temple", detail: "Sur un cadavre, milieu de la plate-forme du pont.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Hippopotame doré (Château Noir) #1", location: "Château Noir - Salle de l'Hippopotame doré", detail: "Drop du boss (donne 2 esquilles).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Hippopotame doré (Château Noir) #2", location: "Château Noir - Salle de l'Hippopotame doré", detail: "Drop du boss (2e esquille).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Quartier de l'Église (Château Noir)", location: "Château Noir - Quartier de l'Église", detail: "Sur la main d'une grande statue.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Porte Arrière (Château Noir)", location: "Château Noir - Site de grâce Porte Arrière", detail: "Au sol près de la statue de Marika.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Entrepôt 4e étage", location: "Château Noir - Entrepôt à semences 4e étage", detail: "Au pied d'une Croix de Miquella.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Entrée Chambre Sombre", location: "Château Noir - Entrée de la Chambre Sombre", detail: "Devant une petite statue.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Calice de l'Arbre-Occulte #1", location: "Panorama occulte - Calice de l'Arbre-Occulte", detail: "5 esquilles au pied des racines, à ramasser une par une (1/5).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Calice de l'Arbre-Occulte #2", location: "Panorama occulte - Calice de l'Arbre-Occulte", detail: "Au pied des racines (2/5).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Calice de l'Arbre-Occulte #3", location: "Panorama occulte - Calice de l'Arbre-Occulte", detail: "Au pied des racines (3/5).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Calice de l'Arbre-Occulte #4", location: "Panorama occulte - Calice de l'Arbre-Occulte", detail: "Au pied des racines (4/5).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Calice de l'Arbre-Occulte #5", location: "Panorama occulte - Calice de l'Arbre-Occulte", detail: "Au pied des racines (5/5).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Croix de la Côte Cérulée", location: "Côte cérulée - Site de grâce Croix de la Côte Cérulée", detail: "Au pied de la Croix de Miquella.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Grotte Ouest Côte Cérulée", location: "Côte cérulée - Grotte ouest", detail: "Sur un cadavre à l'intérieur.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Croix de la Fissure", location: "Côte cérulée / Fissure - Site de grâce Croix de la Fissure", detail: "Au pied de la Croix de Miquella.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Rivière des Recluses (Amont)", location: "Tréfonds du Château Noir - Rivière des Recluses, amont", detail: "Dans un cercueil au fond de la rivière.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Hippopotame doré (Recluses) #1", location: "Tréfonds - Rivière des Recluses, aval", detail: "Drop d'Hippopotame doré (donne 2 esquilles).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Hippopotame doré (Recluses) #2", location: "Tréfonds - Rivière des Recluses, aval", detail: "Drop d'Hippopotame doré (2e esquille).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Église Abandonnée #1", location: "Bois abyssaux - Église Abandonnée", detail: "Devant l'autel (x2 ici).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Église Abandonnée #2", location: "Bois abyssaux - Église Abandonnée", detail: "Devant l'autel (2e esquille).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Site de grâce Bois abyssaux", location: "Bois abyssaux - Site de grâce principal", detail: "Sur un cadavre adossé à un arbre.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Tombe cachée de Charo (Hippopotame)", location: "Tombe cachée de Charo - Zone des Hippopotames", detail: "Drop d'un Hippopotame doré.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Pied du Pic Déchiqueté", location: "Pic Déchiqueté - Pied du pic", detail: "Sur un cadavre.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Lac aux Hippopotames (Rauh)", location: "Ruines antiques de Rauh - Lac aux Hippopotames", detail: "Drop d'un Hippopotame doré.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Première Grotte Rauh", location: "Ruines antiques de Rauh - Première grotte intérieure", detail: "Drop d'un Marmite-d'ombre.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Site de grâce Est Rauh", location: "Ruines antiques de Rauh - Site de grâce Est", detail: "Au pied de la Croix de Miquella.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Site de grâce Ouest Rauh", location: "Ruines antiques de Rauh - Site de grâce Ouest", detail: "Devant le grand autel.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Croix de l'Ascension Spiralée", location: "Enir-Ilim - Site de grâce Ascension Spiralée", detail: "Au pied de la Croix de Miquella.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Salle des Escaliers de l'Ascension", location: "Enir-Ilim - Salle des escaliers de l'Ascension Spiralée", detail: "Dans une salle avec un autel.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Antichambre Chambre de Purification", location: "Enir-Ilim - Antichambre de la Chambre de Purification", detail: "Sur l'autel.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Belurat (salle secrète, autel statue couverte)", location: "Enir-Ilim / Belurat - Salle secrète", detail: "Sur l'autel à la statue couverte (accès depuis Enir-Ilim).", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
      { name: "Esquille - Tour Extérieure Enir-Ilim", location: "Enir-Ilim - Tour extérieure", detail: "Dans une salle avec un autel.", wiki: "https://eldenring.wiki.fextralife.com/Scadutree+Fragment" },
    ],
  },

  dlcReveredAshes: {
    name: "Cendres spirituelles vénérées (DLC)",
    description: "Cendres à offrir aux Croix de Miquella pour upgrade vos Cendres d'Esprit / Torrent (max niv 10). À farmer en parallèle des Esquilles.",
    items: [
      { name: "Cendre - Plaine sépulcrale NE", location: "Plaine sépulcrale - Petit autel après l'arbre blanc aux corps suspendus", detail: "Au sol sur l'autel.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Plaine sépulcrale Est", location: "Plaine sépulcrale - Près du site Terminus Route des Falaises (étang)", detail: "Au sol sur l'autel.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Village souffrant abandonné", location: "Plaine sépulcrale - Village souffrant abandonné", detail: "Sur la statue brisée, gardée par des Hommes-Mouches.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Ruines de la Cité du Temple", location: "Base de Rauh - Sud des ruines, près du bord de la falaise", detail: "Au sol sur l'autel.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Belurat (Salle Araignées-Scorpions) #1", location: "Belurat - Salle infestée d'araignées-scorpions", detail: "Sur l'autel central (1/2).", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Belurat (Salle Araignées-Scorpions) #2", location: "Belurat - Salle infestée d'araignées-scorpions", detail: "Même autel central (2/2).", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Belurat (après Lion dansant)", location: "Belurat - Côté droit de l'arène après le Lion dansant", detail: "Ascenseur jusqu'à la grande porte, autel à proximité.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Belurat (Toits)", location: "Belurat - Toits, après les 4 Oiseaux-tombe", detail: "Drop d'un Marmite-d'ombre.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Belurat (Zone de prière)", location: "Belurat - Zone centrale avec arbre et ennemis en prière", detail: "Sur un autel face à l'arbre.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Village de Bonny", location: "Altus occulte - Village de Bonny (chemin nord depuis le pont brisé)", detail: "Sur la statue au bout du chemin.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Ruines de Moorth", location: "Altus occulte - Est des ruines, dans une petite cabane", detail: "Au sol.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Village des Mouches", location: "Altus occulte - Village des Mouches", detail: "Corps allongé sur un piédestal le long du chemin principal.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Ruines antiques de Rauh (Ouest, ennemi)", location: "Ruines antiques de Rauh - Ouest", detail: "Drop d'un Marmite-d'ombre.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Ruines antiques de Rauh (statue centrale)", location: "Ruines antiques de Rauh - Au milieu des ruines", detail: "Sur une statue.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Ruines antiques de Rauh (Est)", location: "Ruines antiques de Rauh - Ouest du site Petite Tour du Viaduc", detail: "Drop d'un Marmite-d'ombre.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Enir-Ilim Première Ascension", location: "Enir-Ilim - Escaliers depuis Première Ascension, traverser le pont", detail: "Drop d'un grand ennemi.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Enir-Ilim (statue intérieure) #1", location: "Enir-Ilim - Salle d'autel intérieure avec Hommes-Mouches", detail: "Pied de la statue (1/2).", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Enir-Ilim (statue intérieure) #2", location: "Enir-Ilim - Salle d'autel intérieure avec Hommes-Mouches", detail: "Pied de la statue (2/2).", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Enir-Ilim (petite salle)", location: "Enir-Ilim - Petite salle (attention Oiseaux-tombe)", detail: "Sur l'autel.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Ruines d'Unte", location: "Ruines antiques de Rauh / Ruines d'Unte - SE", detail: "Sur l'autel près du mur de pierre.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Grotte de la Rivière Ellac", location: "Côte cérulée - Grotte de la Rivière Ellac, près du site de grâce", detail: "Sur l'autel.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Manoir de Midra (Bibliothèque)", location: "Bois abyssaux - Manoir de Midra, bibliothèque", detail: "Drop d'un grand ennemi (sauter d'étagère en étagère jusqu'au côté opposé).", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Manoir de Midra (Lustre)", location: "Bois abyssaux - Manoir de Midra, près du site de grâce", detail: "Corps suspendu au lustre.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Château Noir (Pied de statue)", location: "Château Noir - Pied de la statue de bête", detail: "Descendre en dessous de la statue, ramasser au sol.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
      { name: "Cendre - Château Noir (7e étage)", location: "Château Noir - Site de grâce 7e étage", detail: "Sauter par-dessus les rambardes côté gauche, sur une statue suspendue.", wiki: "https://eldenring.wiki.fextralife.com/Revered+Spirit+Ash" },
    ],
  },

  dlcArmorSets: {
    name: "Ensembles d'armures (DLC)",
    description: "Armures uniques de Shadow of the Erdtree",
    items: [
      { name: "Set d'Ansbach", source: "Quête de Sir Ansbach (Enir-Ilim)", wiki: "https://eldenring.wiki.fextralife.com/Sir+Ansbach" },
      { name: "Set de Freyja", source: "Quête de Freyja (7e étage Entrepôt)", wiki: "https://eldenring.wiki.fextralife.com/Redmane+Freyja" },
      { name: "Set du Kérastien", source: "Quête de Kérastien (choix Leda ou invasion Rauh)", wiki: "https://eldenring.wiki.fextralife.com/Hornsent" },
      { name: "Set de Thiollier", source: "Quête de Thiollier (Enir-Ilim)", wiki: "https://eldenring.wiki.fextralife.com/Thiollier" },
      { name: "Set d'Igon", source: "Quête d'Igon (après Bayle, emplacement des dragons)", wiki: "https://eldenring.wiki.fextralife.com/Igon" },
      { name: "Set du Grand Prêtre", source: "Quête du Comte Ymir (vaincre Ymir)", wiki: "https://eldenring.wiki.fextralife.com/Count+Ymir,+High+Priest" },
      { name: "Set Vert-de-gris (Moore)", source: "Quête de Moore / Ruines antiques de Rauh", wiki: "https://eldenring.wiki.fextralife.com/Moore" },
      { name: "Set de Dane", source: "Quête de Dane Mortefeuille (duel)", wiki: "https://eldenring.wiki.fextralife.com/Dryleaf+Dane" },
      { name: "Set du Chevalier Noir", source: "Drop des Chevaliers Noirs (Altus Occulte)", wiki: "https://eldenring.wiki.fextralife.com/Black+Knight+Set" },
      { name: "Set de la Bête Divine", source: "Souvenir du Lion dansant de la bête divine", wiki: "https://eldenring.wiki.fextralife.com/Divine+Beast+Set" },
      { name: "Set de Rellana", source: "Château d'Ensis", wiki: "https://eldenring.wiki.fextralife.com/Rellana's+Set" },
      { name: "Set de Messmer", source: "Souvenir de Messmer / Château noir", wiki: "https://eldenring.wiki.fextralife.com/Messmer's+Set" },
      { name: "Set de Gaïus", source: "Souvenir du Commandant Gaïus", wiki: "https://eldenring.wiki.fextralife.com/Gaius's+Set" },
      { name: "Set Rakshasa", source: "Mausolée oriental sans nom (Altus Occulte)", wiki: "https://eldenring.wiki.fextralife.com/Rakshasa+Set" },
      { name: "Set de Solitude", source: "Mausolée occidental sans nom (vaincre Chevalier de la Geôle)", wiki: "https://eldenring.wiki.fextralife.com/Solitude+Set" },
      { name: "Set du Chevalier de la Mort", source: "Catacombes de la lumière noire (Bois abyssaux)", wiki: "https://eldenring.wiki.fextralife.com/Death+Knight+Set" },
      { name: "Set d'Oiseaux Divins", source: "Ruines antiques de Rauh", wiki: "https://eldenring.wiki.fextralife.com/Divine+Bird+Set" },
      { name: "Set d'Oiseaux Funéraires", source: "Plaine sépulcrale (5 pièces dispersées)", wiki: "https://eldenring.wiki.fextralife.com/Gravebird+Set" },
      { name: "Set du Soldat de Messmer", source: "Drop des soldats de Messmer", wiki: "https://eldenring.wiki.fextralife.com/Messmer+Soldier+Set" },
      { name: "Set du Chevalier de Feu", source: "Drop des Chevaliers de Feu, Château noir", wiki: "https://eldenring.wiki.fextralife.com/Fire+Knight+Set" },
      { name: "Set de Nuit", source: "Altus Occulte", wiki: "https://eldenring.wiki.fextralife.com/Night+Set" },
      { name: "Set Glorifié", source: "Plaine sépulcrale", wiki: "https://eldenring.wiki.fextralife.com/Pelt+of+Ralva" },
      { name: "Set de Rivets en Fer", source: "Plaine sépulcrale", wiki: "https://eldenring.wiki.fextralife.com/Iron+Rivet+Set" },
      { name: "Set d'Ascète", source: "Plaine sépulcrale", wiki: "https://eldenring.wiki.fextralife.com/Ascetic's+Set" },
      { name: "Set de Danseuse", source: "Belurat, colonie de la tour", wiki: "https://eldenring.wiki.fextralife.com/Dancer+Set" },
      { name: "Set de Guerrier à Cornes", source: "Drop des guerriers à cornes", wiki: "https://eldenring.wiki.fextralife.com/Horned+Warrior+Set" },
      { name: "Set du Milicien de l'Ombre", source: "Drop des miliciens de l'ombre", wiki: "https://eldenring.wiki.fextralife.com/Shadow+Militia+Set" },
      { name: "Set du Jeune Lion", source: "Lié à la quête de Radahn / Enir-Ilim", wiki: "https://eldenring.wiki.fextralife.com/Young+Lion+Set" },
    ],
  },
};


// ============================================================
// HELPERS
// ============================================================

/**
 * Récupérer une catégorie par clé
 * @param {string} key - Clé de la catégorie (ex: "legendaryWeapons")
 * @returns {object|undefined}
 */
items.getCategory = (key) => items[key];

/**
 * Récupérer toutes les catégories légendaires (succès base game)
 * @returns {object[]}
 */
items.getLegendaryCategories = () => [
  items.legendaryWeapons,
  items.legendaryTalismans,
  items.legendarySorceries,
  items.legendaryAshes,
];

/**
 * Récupérer toutes les catégories DLC
 * @returns {object[]}
 */
items.getDlcCategories = () => [
  items.dlcScadutree,
  items.dlcReveredAshes,
  items.dlcRemembranceWeapons,
  items.dlcLegendaryWeapons,
  items.dlcTalismans,
  items.dlcArmorSets,
];

/**
 * Récupérer tous les items ratables (missable: true)
 * @returns {object[]} - Liste de {category, item, reason}
 */
items.getMissableItems = () => {
  const results = [];
  for (const [catKey, catValue] of Object.entries(items)) {
    if (typeof catValue !== "object" || !catValue.items) continue;
    for (const item of catValue.items) {
      if (item.missable) {
        results.push({
          category: catValue.name,
          name: item.name,
          reason: item.missableReason || "Ratable",
          permanent: (item.missableReason || "").includes("PERMANENT"),
          wiki: item.wiki,
        });
      }
    }
  }
  return results;
};

/**
 * Chercher un item par nom (recherche partielle, insensible à la casse)
 * @param {string} query
 * @returns {object[]} - Liste de {category, item}
 */
items.search = (query) => {
  const q = query.toLowerCase();
  const results = [];
  for (const [catKey, catValue] of Object.entries(items)) {
    if (typeof catValue !== "object" || !catValue.items) continue;
    for (const item of catValue.items) {
      const name = (item.name || item.boss || "").toLowerCase();
      if (name.includes(q)) {
        results.push({ category: catValue.name, item });
      }
      // Check nested rewards (remembrance bosses)
      if (item.rewards) {
        for (const reward of item.rewards) {
          if (reward.name.toLowerCase().includes(q)) {
            results.push({ category: catValue.name, item: reward, boss: item.boss });
          }
        }
      }
    }
  }
  return results;
};

module.exports = items;

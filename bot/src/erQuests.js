// erQuests.js — Base de données complète des quêtes PNJ Elden Ring (base game + DLC)
// Pattern: array export avec helpers attachés (comme erRoute.js)

const quests = [
  // ============================================================
  // BASE GAME — QUÊTES PRINCIPALES
  // ============================================================

  {
    id: "ranni",
    name: "Ranni la Sorcière",
    npc: "Ranni",
    category: "main",
    zone: "Liurnia, contrée lacustre - Tour des Trois Sœurs",
    guide: "https://www.millenium.org/guide/387496.html",
    endingUnlocked: "Âge des Étoiles",
    relatedQuests: ["blaidd", "seluvis", "rogier"],

    steps: [
      {
        id: 1,
        description: "Rencontrer Renna à l'Église d'Elleh (nuit)",
        zone: "Nécrolimbe - Église d'Elleh",
        detail: "Apparaît de nuit après avoir obtenu Torrent au Site de Grâce Porte de la Ruine. Donne la Cloche d'invocation spirituelle et les Cendres de Loups Solitaires.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Vaincre Chevalier Loretta au Manoir Carien",
        zone: "Liurnia, contrée lacustre - Manoir Carien",
        detail: "Boss obligatoire pour accéder à la zone des Trois Tours.",
        prerequisite: { type: "boss", name: "Chevalier Loretta" },
      },
      {
        id: 3,
        description: "Parler à Ranni et accepter de la servir",
        zone: "Liurnia, contrée lacustre - Tour de Ranni",
        detail: "Monter au sommet de la tour. Rencontrer Blaidd, Iji et Seluvis en descendant.",
        prerequisite: { type: "step", questId: "ranni", stepId: 2 },
      },
      {
        id: 4,
        description: "Parler à Blaidd aux Ruines de Siofra",
        zone: "La Siofra - Rivière de Siofra",
        detail: "Blaidd attend près du Site de Grâce. Il cherche le trésor de Nokron.",
        prerequisite: { type: "step", questId: "ranni", stepId: 3 },
      },
      {
        id: 5,
        description: "Parler à Seluvis puis à Sellen",
        zone: "Liurnia, contrée lacustre - Tour de Seluvis / Repaire de Sellen",
        detail: "Seluvis vous envoie vers Sellen pour en savoir plus sur Nokron. Sellen mentionne le Général Radahn.",
        prerequisite: { type: "step", questId: "ranni", stepId: 4 },
      },
      {
        id: 6,
        description: "Vaincre le Général Radahn au festival de Caelid",
        zone: "Caelid - Château du Lion Rouge",
        detail: "Le festival doit être actif. Vaincre Radahn ouvre l'accès à Nokron via le cratère.",
        prerequisite: { type: "boss", name: "Général Radahn, Fléau des Astres" },
      },
      {
        id: 7,
        description: "Explorer Nokron et obtenir la Lame Tue-Doigt",
        zone: "Nokron - Cité Éternelle",
        detail: "Traverser Nokron, vaincre le Mimique. La Lame est dans un coffre après le pont.",
        prerequisite: { type: "step", questId: "ranni", stepId: 6 },
      },
      {
        id: 8,
        description: "Donner la Lame Tue-Doigt à Ranni",
        zone: "Liurnia, contrée lacustre - Tour de Ranni",
        detail: "Ranni repart. Parler à Iji pour savoir qu'elle est au Lac de Pourriture.",
        prerequisite: { type: "item", name: "Lame Tue-Doigt" },
      },
      {
        id: 9,
        description: "Traverser le Lac de Pourriture (Ainsel)",
        zone: "L'Ainsel - Lac de Pourriture",
        detail: "Utiliser le portail en haut de la Tour de Renna (débloqué après avoir donné la Lame Tue-Doigt). Trouver la poupée miniature de Ranni.",
        prerequisite: { type: "step", questId: "ranni", stepId: 8 },
      },
      {
        id: 10,
        description: "Vaincre l'Ombre Funeste puis Astel",
        zone: "L'Ainsel - Grand Cloître",
        detail: "Après avoir parlé à la poupée 3 fois au Site de Grâce. Vaincre l'Ombre Funeste, puis Astel, Rejeté des Étoiles.",
        prerequisite: { type: "boss", name: "Astel, Rejeté des Étoiles" },
      },
      {
        id: 11,
        description: "Atteindre la Cathédrale de Manus Celes",
        zone: "Liurnia souterraine - Cathédrale de Manus Celes",
        detail: "Après Astel, accéder à la cathédrale. Mettre l'Anneau de la Lune Obscure au doigt de Ranni.",
        prerequisite: { type: "step", questId: "ranni", stepId: 10 },
      },
    ],

    failConditions: [
      {
        trigger: "Donner la potion de Seluvis à Ranni (quête Seluvis)",
        consequence: "Ranni devient hostile et disparaît temporairement",
        severity: "recoverable",
        fix: "Utiliser Eau Céleste à l'Église des Vœux pour réinitialiser l'hostilité",
      },
      {
        trigger: "Accepter la Flamme Frénétique (Trois Doigts sous Leyndell)",
        consequence: "Fin Âge des Étoiles verrouillée — la Flamme Frénétique prend le dessus",
        severity: "recoverable",
        fix: "Utiliser l'Aiguille de Miquella dans l'arène de Dragonsuzerain Placidusax (quête Millicent)",
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Donner la Lame Tue-Doigt à Ranni",
        effect: "Seluvis meurt immédiatement — finir sa quête AVANT",
      },
    ],

    choices: [],

    rewards: ["Espadon de la Lune Obscure", "Fin : Âge des Étoiles"],
  },

  {
    id: "blaidd",
    name: "Blaidd le Demi-Loup",
    npc: "Blaidd",
    category: "main",
    zone: "Nécrolimbe - Ruines des Brumes",
    guide: "https://www.millenium.org/guide/387496.html",
    endingUnlocked: null,
    relatedQuests: ["ranni", "rogier"],

    steps: [
      {
        id: 1,
        description: "Entendre le hurlement à la Ruine des Brumes (nuit)",
        zone: "Nécrolimbe - Ruines des Brumes",
        detail: "On entend un hurlement de loup. Parler au marchand Kalé qui identifie Blaidd.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Retrouver Blaidd dans les bois de Nécrolimbe",
        zone: "Nécrolimbe - Forêt au sud d'Agheel",
        detail: "Utiliser le geste « Claquement de doigts » obtenu de Kalé. Blaidd est sur les ruines.",
        prerequisite: { type: "step", questId: "blaidd", stepId: 1 },
      },
      {
        id: 3,
        description: "Vaincre Darriwil ensemble",
        zone: "Nécrolimbe - Évergeôle de Forêtclose",
        detail: "Blaidd aide dans le combat. Parler à Blaidd après la victoire.",
        prerequisite: { type: "boss", name: "Chevalier Sanguinaire Darriwil" },
      },
      {
        id: 4,
        description: "Retrouver Blaidd au festival de Radahn",
        zone: "Caelid - Château du Lion Rouge",
        detail: "Blaidd participe au festival. Combat contre Radahn (invocable).",
        prerequisite: { type: "step", questId: "ranni", stepId: 3 },
      },
      {
        id: 5,
        description: "Blaidd emprisonné aux Ruines d'Évergeôle",
        zone: "Nécrolimbe - Évergeôle de Forêtclose",
        detail: "Après Radahn, Blaidd est emprisonné par Iji. On peut le libérer ou attendre la quête Ranni.",
        prerequisite: { type: "boss", name: "Général Radahn, Fléau des Astres" },
      },
      {
        id: 6,
        description: "Affronter Blaidd devenu fou (fin quête Ranni)",
        zone: "Liurnia, contrée lacustre - Tour de Ranni",
        detail: "Après avoir terminé la quête de Ranni, Blaidd perd la raison et attend devant la tour. Combat obligatoire.",
        prerequisite: { type: "step", questId: "ranni", stepId: 11 },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer Blaidd avant la fin de la quête Ranni",
        consequence: "Perte de ses dialogues et interactions futures",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Vaincre Radahn",
        effect: "Blaidd est emprisonné par Iji — les étapes de Siofra sont skippées",
      },
    ],

    choices: [],

    rewards: ["Armure de Blaidd (set complet)", "Espadon Givré Royal"],
  },

  {
    id: "rogier",
    name: "Rogier le Sorcier",
    npc: "Rogier",
    category: "main",
    zone: "Château de Voilorage",
    guide: "https://www.millenium.org/guide/387669.html",
    endingUnlocked: null,
    relatedQuests: ["ranni", "fia", "d-hunter"],

    steps: [
      {
        id: 1,
        description: "Rencontrer Rogier au Château de Voilorage",
        zone: "Château de Voilorage",
        detail: "Rogier est sur un balcon dans la chapelle. Il donne le Cendrier de sorcellerie.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Trouver la marque de la mort sous Voilorage",
        zone: "Château de Voilorage - Sous-sol",
        detail: "Descendre sous la zone de l'Ulcère d'arbre. Toucher le visage marqué par la mort.",
        prerequisite: null,
      },
      {
        id: 3,
        description: "Parler à Rogier à la Table Ronde",
        zone: "Table Ronde",
        detail: "Rogier a déménagé à la Table Ronde, affaibli. Il parle de la Marque de la Mort et de la Rune de Mort volée.",
        prerequisite: { type: "step", questId: "rogier", stepId: 2 },
      },
      {
        id: 4,
        description: "Obtenir le couteau de la Marque Noire (D)",
        zone: "Table Ronde",
        detail: "Parler à D puis à Rogier. Rogier demande d'enquêter sur la Marque Noire via Ranni.",
        prerequisite: { type: "step", questId: "rogier", stepId: 3 },
      },
      {
        id: 5,
        description: "Avancer la quête de Ranni, informer Rogier",
        zone: "Table Ronde",
        detail: "Après avoir servi Ranni, parler à Rogier. Il donne une lettre pour Ranni.",
        prerequisite: { type: "step", questId: "ranni", stepId: 3 },
      },
      {
        id: 6,
        description: "Rogier meurt dans son sommeil",
        zone: "Table Ronde",
        detail: "Après quelques repos, Rogier s'endort pour toujours. Il laisse sa rapière +8 et une lettre.",
        prerequisite: { type: "step", questId: "rogier", stepId: 5 },
      },
    ],

    failConditions: [
      {
        trigger: "Ne pas parler à Rogier avant qu'il ne déménage à la Table Ronde",
        consequence: "Manque le Cendrier de sorcellerie de Voilorage",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Rapière de Rogier +8", "Cendrier de sorcellerie"],
  },

  {
    id: "seluvis",
    name: "Seluvis le Précepteur",
    npc: "Seluvis",
    category: "main",
    zone: "Liurnia, contrée lacustre - Tour de Seluvis",
    guide: "https://www.millenium.org/guide/387496.html",
    endingUnlocked: null,
    relatedQuests: ["ranni", "nepheli-kenneth", "coprophage"],

    steps: [
      {
        id: 1,
        description: "Rencontrer Seluvis à sa tour",
        zone: "Liurnia, contrée lacustre - Tour de Seluvis",
        detail: "Seluvis demande de livrer une potion à Nepheli.",
        prerequisite: { type: "step", questId: "ranni", stepId: 3 },
      },
      {
        id: 2,
        description: "Choisir le destin de la potion",
        zone: "Divers",
        detail: "3 options : donner à Nepheli (la transforme en marionnette), donner à Gideon (la détruit), ou donner au Coprophage.",
        prerequisite: { type: "item", name: "Potion de Seluvis" },
      },
      {
        id: 3,
        description: "Obtenir la Larme d'Ambre Stellaire",
        zone: "Liurnia, contrée lacustre - Tour de Seluvis",
        detail: "Seluvis demande une Larme d'Ambre Stellaire en échange de son savoir sur le Trésor de Nokron.",
        prerequisite: { type: "step", questId: "seluvis", stepId: 2 },
      },
      {
        id: 4,
        description: "Découvrir le secret de Seluvis (sous-sol)",
        zone: "Liurnia, contrée lacustre - Sous-sol de la Tour de Seluvis",
        detail: "Entrée cachée dans les ruines. Collection de marionnettes — Seluvis prépare une potion pour Ranni.",
        prerequisite: { type: "step", questId: "seluvis", stepId: 3 },
      },
    ],

    failConditions: [
      {
        trigger: "Donner la potion à Ranni",
        consequence: "Ranni devient hostile. Seluvis est furieux.",
        severity: "recoverable",
        fix: "Eau Céleste à l'Église des Vœux",
      },
      {
        trigger: "Donner la Lame Tue-Doigt à Ranni (quête Ranni étape 8)",
        consequence: "Seluvis meurt immédiatement",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Donner la Lame Tue-Doigt à Ranni",
        effect: "Seluvis meurt — impossible de finir sa quête après ce point",
      },
    ],

    choices: [
      {
        description: "Destin de la potion de Seluvis",
        options: [
          { choice: "Donner à Nepheli", consequence: "Nepheli devient marionnette (sa quête échoue)", reward: "Marionnette de Nepheli (invocation)" },
          { choice: "Donner à Gideon", consequence: "Gideon détruit la potion", reward: "Aucune — protège Nepheli" },
          { choice: "Donner au Coprophage", consequence: "Le Coprophage boit la potion", reward: "Marionnette du Coprophage (invocation)" },
        ],
      },
    ],

    rewards: ["Marionnettes de Seluvis", "Sorts de sorcellerie"],
  },

  {
    id: "fia",
    name: "Fia, la Compagne mortuaire",
    npc: "Fia",
    category: "main",
    zone: "Table Ronde",
    guide: "https://www.millenium.org/guide/387417.html",
    endingUnlocked: "Naissance Crépusculaire",
    relatedQuests: ["d-hunter", "rogier"],

    steps: [
      {
        id: 1,
        description: "Se faire enlacer par Fia à la Table Ronde",
        zone: "Table Ronde",
        detail: "Fia donne la Bénédiction de la Compagne (malus de -5% HP max tant que l'objet n'est pas utilisé). Parler plusieurs fois pour avancer.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Obtenir le poignard de la Marque de Mort (Rogier)",
        zone: "Table Ronde",
        detail: "Via la quête de Rogier. Donner le poignard à Fia.",
        prerequisite: { type: "step", questId: "rogier", stepId: 4 },
      },
      {
        id: 3,
        description: "Fia donne le Poignard Maudit",
        zone: "Table Ronde",
        detail: "Fia demande de remettre ce poignard à D. Ce poignard tue D.",
        prerequisite: { type: "step", questId: "fia", stepId: 2 },
      },
      {
        id: 4,
        description: "Donner le Poignard Maudit à D",
        zone: "Table Ronde",
        detail: "D est tué. Fia disparaît de la Table Ronde.",
        prerequisite: { type: "step", questId: "fia", stepId: 3 },
      },
      {
        id: 5,
        description: "Retrouver Fia dans les Profondeurs",
        zone: "Profondeurs de Fonderacine - Devant la Porte du Tombeau",
        detail: "Accessible après les Catacombes des Cimes. Fia est devant la porte du Prince de la Mort.",
        prerequisite: { type: "zone", name: "Profondeurs" },
      },
      {
        id: 6,
        description: "Vaincre Lichdragon Fortissax (rêve de Fia)",
        zone: "Profondeurs de Fonderacine - Rêve de Fia",
        detail: "Entrer dans le rêve de Fia après lui avoir donné la Marque de la Mort Maudite. Vaincre Fortissax.",
        prerequisite: { type: "boss", name: "Lichdragon Fortissax" },
      },
      {
        id: 7,
        description: "Obtenir la Mende de Réparation de la Rune de Mort",
        zone: "Profondeurs de Fonderacine - Rêve de Fia",
        detail: "Récupérer la Mende après Fortissax. Permet la Fin Naissance Crépusculaire.",
        prerequisite: { type: "step", questId: "fia", stepId: 6 },
      },
    ],

    failConditions: [
      {
        trigger: "Ne jamais donner le poignard de Rogier à Fia",
        consequence: "Fia ne donne jamais le Poignard Maudit, quête bloquée",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Mende de Réparation de la Rune de Mort", "Fin : Naissance Crépusculaire", "Souvenir de Lichdragon Fortissax"],
  },

  {
    id: "d-hunter",
    name: "D, Traqueur des non-morts",
    npc: "D",
    category: "secondary",
    zone: "Nécrolimbe - Route de Lèvesaint",
    guide: "https://www.millenium.org/guide/387417.html",
    endingUnlocked: null,
    relatedQuests: ["fia", "gurranq"],

    steps: [
      {
        id: 1,
        description: "Rencontrer D sur la route de Lèvesaint",
        zone: "Nécrolimbe - Route vers le Château de Voilorage",
        detail: "D met en garde contre les portails de téléportation et les Marques de la Mort.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "D envoie vers Gurranq",
        zone: "Nécrolimbe - Sanctuaire de la Bête",
        detail: "D indique le portail vers le Sanctuaire Bestial de Caelid pour donner les Mortefleurs.",
        prerequisite: { type: "step", questId: "d-hunter", stepId: 1 },
      },
      {
        id: 3,
        description: "D à la Table Ronde",
        zone: "Table Ronde",
        detail: "D s'installe à la Table Ronde. Il donne des informations sur la Marque de la Mort.",
        prerequisite: { type: "step", questId: "d-hunter", stepId: 2 },
      },
      {
        id: 4,
        description: "D est tué par Fia",
        zone: "Table Ronde",
        detail: "Si on donne le Poignard Maudit de Fia à D, il meurt. Son armure peut être récupérée.",
        prerequisite: { type: "step", questId: "fia", stepId: 4 },
      },
      {
        id: 5,
        description: "Donner l'armure de D à son frère jumeau",
        zone: "La Siofra - Aqueduc de Siofra",
        detail: "Le frère de D attend dans l'Aqueduc. Lui donner l'armure de D. Il va venger son frère en tuant Fia dans les Profondeurs.",
        prerequisite: { type: "item", name: "Armure de D" },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer D soi-même",
        consequence: "Quête de D terminée prématurément, pas d'interaction avec le frère jumeau",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [],

    choices: [
      {
        description: "Donner ou garder l'armure de D",
        options: [
          { choice: "Donner au frère jumeau", consequence: "Le frère tue Fia dans les Profondeurs", reward: "Épée Sainte de l'Ordre (Fia) restituée" },
          { choice: "Garder l'armure", consequence: "Fia reste vivante dans les Profondeurs", reward: "Armure de D (set)" },
        ],
      },
    ],

    rewards: ["Armure de D", "Épée Sainte de l'Ordre"],
  },

  {
    id: "gurranq",
    name: "Gurranq, Clerc Bestial",
    npc: "Gurranq",
    category: "secondary",
    zone: "Caelid - Sanctuaire Bestial",
    guide: "https://www.jeuxvideo.com/wikis-soluce-astuces/1541057/quete-des-pnj.htm",
    endingUnlocked: null,
    relatedQuests: ["d-hunter"],

    steps: [
      {
        id: 1,
        description: "Donner la 1ère Mortefleur",
        zone: "Caelid - Sanctuaire Bestial",
        detail: "Utiliser le portail indiqué par D. Gurranq donne l'incantation Griffe Bestiale.",
        prerequisite: { type: "item", name: "Mortefleur" },
      },
      {
        id: 2,
        description: "Donner les Mortefleurs 2 à 4",
        zone: "Caelid - Sanctuaire Bestial",
        detail: "Chaque Mortefleur donnée octroie une incantation bestiale différente.",
        prerequisite: { type: "step", questId: "gurranq", stepId: 1 },
      },
      {
        id: 3,
        description: "Gurranq devient hostile (après 4 Mortefleurs)",
        zone: "Caelid - Sanctuaire Bestial",
        detail: "Gurranq attaque. Il faut le frapper jusqu'à ~50% HP, il redevient amical. NE PAS LE TUER.",
        prerequisite: { type: "step", questId: "gurranq", stepId: 2 },
      },
      {
        id: 4,
        description: "Donner les Mortefleurs 5 à 9",
        zone: "Caelid - Sanctuaire Bestial",
        detail: "Continuer à apporter des Mortefleurs. La 9ème donne le Bâton de Pierre Ancestrale.",
        prerequisite: { type: "step", questId: "gurranq", stepId: 3 },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer Gurranq quand il devient hostile",
        consequence: "Perte de toutes les incantations bestiales restantes",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [],

    choices: [],

    rewards: [
      "Griffe Bestiale", "Pierre Bestiale", "Lame Bestiale",
      "Incantation Bestiale (x9 au total)", "Bâton de Pierre Ancestrale",
    ],
  },

  {
    id: "millicent",
    name: "Millicent & Gowry",
    npc: "Millicent",
    category: "main",
    zone: "Caelid - Cabane de Gowry",
    guide: "https://www.millenium.org/guide/387558.html",
    endingUnlocked: null,
    relatedQuests: [],

    steps: [
      {
        id: 1,
        description: "Parler à Gowry dans sa cabane",
        zone: "Caelid - Cabane de Gowry",
        detail: "Gowry demande de trouver l'Aiguille d'Or Non Éclose pour sauver Millicent.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Vaincre le Commandant O'Neil et récupérer l'Aiguille",
        zone: "Caelid - Marais d'Aeonia",
        detail: "Le Commandant O'Neil garde l'Aiguille d'Or Non Éclose.",
        prerequisite: { type: "boss", name: "Commandant O'Neil" },
      },
      {
        id: 3,
        description: "Apporter l'Aiguille à Gowry puis soigner Millicent",
        zone: "Caelid - Cabane de Gowry / Église de la Peste",
        detail: "Gowry répare l'aiguille. Aller à l'Église de la Peste pour soigner Millicent.",
        prerequisite: { type: "step", questId: "millicent", stepId: 2 },
      },
      {
        id: 4,
        description: "Retrouver Millicent au Plateau d'Altus",
        zone: "Plateau Altus - Chemin d'Erdtree",
        detail: "Millicent a quitté Caelid. La retrouver et lui donner la Prothèse de Valkyrie.",
        prerequisite: { type: "item", name: "Prothèse de Valkyrie" },
      },
      {
        id: 5,
        description: "Retrouver Millicent aux Cimes des Géants",
        zone: "Cimes des Géants - Ruines anciennes",
        detail: "Millicent continue son voyage vers l'Arbre-Monde.",
        prerequisite: { type: "zone", name: "Cimes des Géants" },
      },
      {
        id: 6,
        description: "Retrouver Millicent dans l'Arbre de Miquella",
        zone: "Arbre-Sacré de Miquella - Zone de prière",
        detail: "Millicent est affaiblie par la Pourriture Écarlate mais continue.",
        prerequisite: { type: "zone", name: "Arbre-Sacré de Miquella" },
      },
      {
        id: 7,
        description: "Choisir camp : aider ou trahir Millicent",
        zone: "Arbre-Sacré de Miquella - Zone de prière",
        detail: "Deux signes d'invocation : or (aider Millicent) ou rouge (trahir Millicent). Choix crucial.",
        prerequisite: { type: "step", questId: "millicent", stepId: 6 },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer Millicent à n'importe quel moment",
        consequence: "Quête terminée, pas d'Aiguille de Miquella",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [],

    choices: [
      {
        description: "Aider ou trahir Millicent à l'Arbre-Sacré de Miquella",
        options: [
          {
            choice: "Aider Millicent (signe d'or)",
            consequence: "Millicent retire l'aiguille et meurt paisiblement",
            reward: "Aiguille de Miquella (permet d'annuler la Flamme Frénétique) + Larme Non-Éclose de Miquella",
          },
          {
            choice: "Trahir Millicent (signe rouge)",
            consequence: "Millicent meurt au combat",
            reward: "Aiguille d'Or Non Éclose de Millicent + Bourgeon de la Fleur Aeonia",
          },
        ],
      },
    ],

    rewards: ["Aiguille de Miquella", "Prothèse de Valkyrie", "Larme Non-Éclose de Miquella"],
  },

  {
    id: "alexander",
    name: "Alexander, le Guerrier-Jarre",
    npc: "Alexander",
    category: "secondary",
    zone: "Nécrolimbe - Nord du Lac Agheel",
    guide: "https://www.millenium.org/guide/387832.html",
    endingUnlocked: null,
    relatedQuests: ["jar-bairn-diallos"],

    steps: [
      {
        id: 1,
        description: "Libérer Alexander coincé dans le sol",
        zone: "Nécrolimbe - Nord du Lac Agheel",
        detail: "Frapper Alexander par derrière (ou utiliser un Pot d'huile) pour le débloquer.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Retrouver Alexander au festival de Radahn",
        zone: "Caelid - Château du Lion Rouge",
        detail: "Alexander participe au combat contre Radahn (invocable).",
        prerequisite: { type: "step", questId: "alexander", stepId: 1 },
      },
      {
        id: 3,
        description: "Alexander coincé à nouveau (Liurnia)",
        zone: "Liurnia, contrée lacustre - Derrière l'Académie",
        detail: "Utiliser un Pot d'huile pour le libérer à nouveau.",
        prerequisite: { type: "boss", name: "Général Radahn, Fléau des Astres" },
      },
      {
        id: 4,
        description: "Retrouver Alexander au Mont Gelmir",
        zone: "Mont Gelmir - Bassins de lave",
        detail: "Alexander se baigne dans la lave pour se renforcer.",
        prerequisite: { type: "step", questId: "alexander", stepId: 3 },
      },
      {
        id: 5,
        description: "Duel final aux Ruines de Farum Azula",
        zone: "Ruines de Farum Azula - Arène isolée",
        detail: "Alexander défie le joueur en duel. Le vaincre pour obtenir son talisman.",
        prerequisite: { type: "zone", name: "Ruines de Farum Azula" },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer Alexander avant le duel final",
        consequence: "Quête terminée prématurément, pas de Talisman d'Éclat de Jarre",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Talisman d'Éclat de Jarre (meilleur talisman compétences)", "Fragment de Jarre d'Alexander", "Arsenal de Jarre"],
  },

  {
    id: "jar-bairn-diallos",
    name: "Jar-Bairn & Diallos",
    npc: "Jar-Bairn",
    category: "secondary",
    zone: "Nécrolimbe - Village des Jarres",
    guide: "https://www.jeuxvideo.com/wikis-soluce-astuces/1541057/quete-des-pnj.htm",
    endingUnlocked: null,
    relatedQuests: ["alexander", "volcano-manor"],

    steps: [
      {
        id: 1,
        description: "Parler à Jar-Bairn au Village des Jarres",
        zone: "Nécrolimbe - Village des Jarres",
        detail: "Petit bocal triste. Parler plusieurs fois (repos entre chaque) pour avancer les dialogues.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Diallos arrive au Village des Jarres",
        zone: "Nécrolimbe - Village des Jarres",
        detail: "Après avoir avancé la quête du Manoir du volcan, Diallos rejoint le village comme protecteur.",
        prerequisite: { type: "step", questId: "volcano-manor", stepId: 3 },
      },
      {
        id: 3,
        description: "Attaque du village + mort de Diallos",
        zone: "Nécrolimbe - Village des Jarres",
        detail: "Après plusieurs repos, le village est attaqué. Diallos meurt en protégeant les jarres.",
        prerequisite: { type: "step", questId: "jar-bairn-diallos", stepId: 2 },
      },
      {
        id: 4,
        description: "Parler à Jar-Bairn (conclusion)",
        zone: "Nécrolimbe - Village des Jarres",
        detail: "Jar-Bairn hérite de la volonté de protéger. Donne le Talisman du Compagnon.",
        prerequisite: { type: "step", questId: "alexander", stepId: 5 },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer Diallos ou Jar-Bairn",
        consequence: "Quête terminée sans récompense",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Talisman du Compagnon", "Casque de Diallos"],
  },

  {
    id: "nepheli-kenneth",
    name: "Nepheli Loux & Kenneth Haight",
    npc: "Nepheli Loux",
    category: "secondary",
    zone: "Château de Voilorage",
    guide: "https://www.millenium.org/guide/388096.html",
    endingUnlocked: null,
    relatedQuests: ["seluvis"],

    steps: [
      {
        id: 1,
        description: "Rencontrer Nepheli au Château de Voilorage",
        zone: "Château de Voilorage",
        detail: "Nepheli aide contre Godrick. Invocable comme allié.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Parler à Nepheli à la Table Ronde",
        zone: "Table Ronde",
        detail: "Nepheli est abattue, cherche un but. Parler à Gideon aussi.",
        prerequisite: { type: "boss", name: "Godrick le Greffé" },
      },
      {
        id: 3,
        description: "Donner les Cendres de Fauconnière à Nepheli",
        zone: "Table Ronde",
        detail: "Les Cendres se trouvent dans le Village des Albinauriques (Liurnia). Nepheli retrouve sa motivation.",
        prerequisite: { type: "item", name: "Cendres de Fauconnière" },
      },
      {
        id: 4,
        description: "Rencontrer Kenneth Haight",
        zone: "Nécrolimbe - Fort Haight",
        detail: "Kenneth demande de reprendre son fort. Après ça, il cherche un souverain pour Lèvesaint.",
        prerequisite: null,
      },
      {
        id: 5,
        description: "Nepheli couronnée à Lèvesaint",
        zone: "Château de Voilorage - Salle du trône",
        detail: "Après avoir avancé dans le jeu, Nepheli et Kenneth s'installent au trône de Godrick. Kenneth la proclame souveraine.",
        prerequisite: { type: "step", questId: "nepheli-kenneth", stepId: 3 },
      },
    ],

    failConditions: [
      {
        trigger: "Donner la potion de Seluvis à Nepheli",
        consequence: "Nepheli devient une marionnette — quête échoue définitivement",
        severity: "permanent",
        fix: null,
      },
      {
        trigger: "Brûler l'Arbre-Monde avant l'étape 5",
        consequence: "Nepheli ne peut plus être couronnée",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Brûler l'Arbre-Monde (Forge des Géants)",
        effect: "Nepheli doit déjà être sur le trône de Voilorage",
      },
    ],

    choices: [],

    rewards: ["Hache de Tempête Ancestrale", "Talisman Ancestral de Nepheli"],
  },

  {
    id: "sellen",
    name: "Sorcière Sellen",
    npc: "Sellen",
    category: "secondary",
    zone: "Nécrolimbe - Repaire souterrain",
    guide: "https://www.millenium.org/guide/387734.html",
    endingUnlocked: null,
    relatedQuests: [],

    steps: [
      {
        id: 1,
        description: "Trouver Sellen dans son repaire",
        zone: "Nécrolimbe - Ruines de la Balise (sous-sol)",
        detail: "Sellen enseigne les sorcelleries de Raya Lucaria. Elle fait office de professeure.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Trouver le corps primordial de Sellen",
        zone: "Péninsule larmoyante - Repaire caché",
        detail: "Le vrai corps de Sellen est dans la cave. Obtenir le Sceau Primordial de Sellen.",
        prerequisite: { type: "step", questId: "sellen", stepId: 1 },
      },
      {
        id: 3,
        description: "Trouver Maître Azur aux Cimes du Mont Gelmir",
        zone: "Mont Gelmir - Cimes",
        detail: "Maître Azur est pétrifié. Obtenir la Comète d'Azur.",
        prerequisite: null,
      },
      {
        id: 4,
        description: "Trouver Maître Lusat au Lac de Pourriture",
        zone: "L'Ainsel - Lac de Pourriture",
        detail: "Maître Lusat est pétrifié. Obtenir les Étoiles de Ruine.",
        prerequisite: null,
      },
      {
        id: 5,
        description: "Rapporter les découvertes à Sellen",
        zone: "Nécrolimbe - Repaire souterrain",
        detail: "Sellen demande de l'aider à déplacer son âme avec le Sceau Primordial.",
        prerequisite: { type: "step", questId: "sellen", stepId: 3 },
      },
      {
        id: 6,
        description: "Transplanter Sellen dans un nouveau corps",
        zone: "Péninsule larmoyante - Repaire caché",
        detail: "Placer le Sceau Primordial dans le corps caché sous les Trois Sœurs (près de la Tour de Seluvis).",
        prerequisite: { type: "step", questId: "sellen", stepId: 5 },
      },
      {
        id: 7,
        description: "Choisir camp : Sellen ou Jerren",
        zone: "Académie de Raya Lucaria - Grand Hall",
        detail: "Deux signes d'invocation. Sellen ou Jerren — duel pour le contrôle de l'Académie.",
        prerequisite: { type: "step", questId: "sellen", stepId: 6 },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer le corps primordial de Sellen",
        consequence: "Sellen meurt définitivement",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Vaincre Radahn",
        effect: "Jerren quitte le château et se déplace vers l'Académie — nécessaire pour le duel final",
      },
    ],

    choices: [
      {
        description: "Soutenir Sellen ou Jerren à l'Académie",
        options: [
          { choice: "Aider Sellen", consequence: "Sellen prend le contrôle de l'Académie, puis se transforme en boule de visages", reward: "Chapeau de Sorcière de Sellen + Sorcelleries" },
          { choice: "Aider Jerren", consequence: "Jerren exécute Sellen", reward: "Armure de Jeu Sauvage de Jerren + Runes" },
        ],
      },
    ],

    rewards: ["Chapeau de Sorcière de Sellen", "Sorcelleries de Maîtres"],
  },

  {
    id: "corhyn-goldmask",
    name: "Frère Corhyn & Masque d'Or",
    npc: "Frère Corhyn",
    category: "main",
    zone: "Table Ronde",
    guide: "https://www.millenium.org/guide/388223.html",
    endingUnlocked: "Âge de l'Ordre",
    relatedQuests: [],

    steps: [
      {
        id: 1,
        description: "Acheter des incantations à Corhyn (Table Ronde)",
        zone: "Table Ronde",
        detail: "Corhyn est un marchand d'incantations. Parler plusieurs fois.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Retrouver Corhyn au Plateau d'Altus",
        zone: "Plateau Altus - Route principale",
        detail: "Corhyn a quitté la Table Ronde pour chercher Masque d'Or.",
        prerequisite: { type: "zone", name: "Plateau d'Altus" },
      },
      {
        id: 3,
        description: "Trouver Masque d'Or sur le pont du Plateau d'Altus",
        zone: "Plateau Altus - Grand pont",
        detail: "Masque d'Or fixe l'Arbre-Monde, ne parle pas. Informer Corhyn.",
        prerequisite: { type: "step", questId: "corhyn-goldmask", stepId: 2 },
      },
      {
        id: 4,
        description: "Corhyn et Masque d'Or à la Capitale",
        zone: "Leyndell, capitale royale - Remparts",
        detail: "Les retrouver sur les remparts de Leyndell. Utiliser le geste « Loi de Régression » devant la statue.",
        prerequisite: { type: "zone", name: "Leyndell" },
      },
      {
        id: 5,
        description: "Obtenir et rapporter la Loi de Régression",
        zone: "Leyndell, capitale royale - Statue de Radagon/Marika",
        detail: "Utiliser la Loi de Régression (incantation, 37 INT requis) devant la statue de Radagon. Révèle le secret. Informer Masque d'Or.",
        prerequisite: { type: "item", name: "Loi de Régression" },
      },
      {
        id: 6,
        description: "Retrouver le duo aux Cimes des Géants",
        zone: "Cimes des Géants - Pont à l'est",
        detail: "Corhyn et Masque d'Or près du pont. Masque d'Or a trouvé la Mende de Réparation de l'Ordre Parfait.",
        prerequisite: { type: "zone", name: "Cimes des Géants" },
      },
      {
        id: 7,
        description: "Récupérer la Mende après la mort de Masque d'Or",
        zone: "Cimes des Géants",
        detail: "Masque d'Or meurt. Récupérer la Mende de Réparation de l'Ordre Parfait sur son corps.",
        prerequisite: { type: "step", questId: "corhyn-goldmask", stepId: 6 },
      },
    ],

    failConditions: [
      {
        trigger: "Brûler l'Arbre-Monde avant d'avoir récupéré la Mende",
        consequence: "Masque d'Or et Corhyn disparaissent des Cimes",
        severity: "permanent",
        fix: null,
      },
      {
        trigger: "Tuer Corhyn ou Masque d'Or",
        consequence: "Fin Âge de l'Ordre verrouillée",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Brûler l'Arbre-Monde (Forge des Géants)",
        effect: "Corhyn et Masque d'Or doivent déjà être aux Cimes avec la Mende obtenue",
      },
      {
        event: "Vaincre Maliketh",
        effect: "Capitale Cendrée — impossible de revenir aux emplacements de Leyndell",
      },
    ],

    choices: [],

    rewards: ["Mende de Réparation de l'Ordre Parfait", "Fin : Âge de l'Ordre", "Armure de Masque d'Or"],
  },

  {
    id: "coprophage",
    name: "Le Coprophage (Dung Eater)",
    npc: "Coprophage",
    category: "main",
    zone: "Table Ronde",
    guide: "https://www.millenium.org/guide/387745.html",
    endingUnlocked: "Bénédiction du Désespoir",
    relatedQuests: ["seluvis"],

    steps: [
      {
        id: 1,
        description: "Trouver la chambre verrouillée du Coprophage (Table Ronde)",
        zone: "Table Ronde",
        detail: "Porte verrouillée dans le couloir. Le Coprophage menace à travers la porte.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Obtenir une Malédiction de Graine",
        zone: "Divers",
        detail: "Les Malédictions de Graine se trouvent sur des corps profanés dans les égouts de Leyndell.",
        prerequisite: { type: "zone", name: "Leyndell, capitale royale - Égouts" },
      },
      {
        id: 3,
        description: "Donner la Malédiction de Graine au Coprophage",
        zone: "Table Ronde",
        detail: "Le Coprophage demande plus de Malédictions pour maudire les Graines d'Arbre.",
        prerequisite: { type: "item", name: "Malédiction de Graine" },
      },
      {
        id: 4,
        description: "Trouver le Coprophage dans les égouts",
        zone: "Leyndell, capitale royale - Égouts souterrains",
        detail: "Le Coprophage est dans sa cellule dans les égouts. L'envahir dans son monde.",
        prerequisite: { type: "step", questId: "coprophage", stepId: 3 },
      },
      {
        id: 5,
        description: "Donner 5 Malédictions de Graine au total",
        zone: "Leyndell, capitale royale - Égouts souterrains",
        detail: "Apporter toutes les Malédictions. Le Coprophage donne sa Mende.",
        prerequisite: { type: "step", questId: "coprophage", stepId: 4 },
      },
      {
        id: 6,
        description: "Obtenir la Mende de Réparation du Coprophage",
        zone: "Leyndell, capitale royale - Égouts souterrains",
        detail: "Soit en terminant sa quête, soit en le tuant après avoir donné les Malédictions.",
        prerequisite: { type: "step", questId: "coprophage", stepId: 5 },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer le Coprophage trop tôt (avant les 5 Malédictions)",
        consequence: "Pas de Mende de Réparation, fin impossible",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Vaincre Maliketh",
        effect: "Leyndell → Capitale Cendrée. Accès aux égouts modifié.",
      },
    ],

    choices: [],

    rewards: ["Mende de Réparation du Coprophage", "Fin : Bénédiction du Désespoir", "Armure du Coprophage"],
  },

  {
    id: "volcano-manor",
    name: "Rya / Tanith / Manoir du volcan",
    npc: "Tanith",
    category: "secondary",
    zone: "Mont Gelmir - Manoir du volcan",
    guide: "https://www.jeuxvideo.com/wikis-soluce-astuces/1541057/quete-des-pnj.htm",
    endingUnlocked: null,
    relatedQuests: ["bernahl", "patches", "jar-bairn-diallos", "rya"],

    steps: [
      {
        id: 1,
        description: "Rejoindre le Manoir du volcan",
        zone: "Mont Gelmir - Manoir du volcan",
        detail: "Plusieurs chemins : Rya au Plateau d'Altus, Machine à roue d'Inquisiteur, ou en escaladant le Mont Gelmir.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Premier contrat d'assassinat (Vieux Chevalier Istvan)",
        zone: "Divers - Invasion",
        detail: "Tanith donne une lettre rouge. Envahir et tuer Istvan.",
        prerequisite: { type: "step", questId: "volcano-manor", stepId: 1 },
      },
      {
        id: 3,
        description: "Deuxième contrat (Rileigh l'Inactif)",
        zone: "Divers - Invasion",
        detail: "Deuxième lettre rouge. Envahir et tuer Rileigh dans le Plateau d'Altus.",
        prerequisite: { type: "step", questId: "volcano-manor", stepId: 2 },
      },
      {
        id: 4,
        description: "Troisième contrat (Juno Hoslow)",
        zone: "Divers - Invasion",
        detail: "Troisième lettre rouge. Envahir et tuer Juno Hoslow aux Cimes des Géants.",
        prerequisite: { type: "step", questId: "volcano-manor", stepId: 3 },
      },
      {
        id: 5,
        description: "Vaincre Rykard, Seigneur du Blasphème",
        zone: "Mont Gelmir - Manoir du volcan (arène secrète)",
        detail: "Utiliser la Lance du Serpent-Dieu (dans l'arène). Tanith reste après si non tuée.",
        prerequisite: { type: "boss", name: "Rykard, Seigneur du Blasphème" },
      },
    ],

    failConditions: [
      {
        trigger: "Vaincre Rykard avant de finir les contrats",
        consequence: "TOUS les contrats restants échouent définitivement. PNJ du manoir disparaissent.",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Tuer Rykard",
        effect: "Le Manoir se vide. Tous les contrats non complétés sont perdus.",
      },
    ],

    choices: [],

    rewards: ["Équipement des cibles assassinées", "Armure du Manoir du volcan", "Accès à Rykard"],
  },

  {
    id: "rya",
    name: "Rya (Zorayas)",
    npc: "Rya",
    category: "secondary",
    zone: "Liurnia, contrée lacustre - Cabane à Crevettes / Plateau d'Altus",
    guide: "https://www.jeuxvideo.com/wikis-soluce-astuces/1541057/quete-des-pnj.htm",
    endingUnlocked: null,
    relatedQuests: ["volcano-manor", "boggart"],

    steps: [
      {
        id: 1,
        description: "Rencontrer Rya au Plateau d'Altus (ou via Boggart)",
        zone: "Liurnia, contrée lacustre - Cabane à Crevettes / Plateau d'Altus",
        detail: "Rya a perdu son collier volé par Boggart. Racheter ou tuer Boggart. Rya donne un raccourci vers le Manoir.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Retrouver Rya au Manoir du volcan",
        zone: "Mont Gelmir - Manoir du volcan",
        detail: "Rya est sous forme humaine. Parler entre chaque contrat.",
        prerequisite: { type: "step", questId: "volcano-manor", stepId: 1 },
      },
      {
        id: 3,
        description: "Découvrir la vraie forme de Rya",
        zone: "Mont Gelmir - Manoir du volcan (chambre cachée)",
        detail: "Rya révèle sa forme de serpent. Elle est la fille de Tanith, née du serpent.",
        prerequisite: { type: "step", questId: "volcano-manor", stepId: 3 },
      },
      {
        id: 4,
        description: "Donner la Potion d'Amnésie de Tanith à Rya",
        zone: "Mont Gelmir - Manoir du volcan",
        detail: "Tanith demande de faire boire la potion à Rya ou de la tuer. Troisième option : ne rien faire.",
        prerequisite: { type: "step", questId: "rya", stepId: 3 },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer Rya",
        consequence: "Rya meurt, perte de sa quête et du Talisman",
        severity: "permanent",
        fix: null,
      },
      {
        trigger: "Tuer Rykard avant de finir la quête de Rya",
        consequence: "Rya disparaît avec les autres PNJ du Manoir",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Tuer Rykard",
        effect: "Rya disparaît du Manoir si sa quête n'est pas terminée",
      },
    ],

    choices: [
      {
        description: "Sort de Rya",
        options: [
          { choice: "Donner la Potion d'Amnésie", consequence: "Rya oublie tout et repart en paix", reward: "Talisman de Daedicart" },
          { choice: "La tuer (demandé par Rya)", consequence: "Rya meurt, Zorayas est libérée", reward: "Talisman de Daedicart" },
          { choice: "Ne rien faire (quitter et revenir)", consequence: "Rya part d'elle-même, en paix", reward: "Talisman de Daedicart + Lettre de Zorayas" },
        ],
      },
    ],

    rewards: ["Talisman de Daedicart", "Lettre de Zorayas"],
  },

  {
    id: "bernahl",
    name: "Bernahl le Réfractaire",
    npc: "Bernahl",
    category: "secondary",
    zone: "Table Ronde / Mont Gelmir - Manoir du volcan",
    guide: "https://www.jeuxvideo.com/wikis-soluce-astuces/1541057/quete-des-pnj.htm",
    endingUnlocked: null,
    relatedQuests: ["volcano-manor"],

    steps: [
      {
        id: 1,
        description: "Acheter des incantations à Bernahl (Table Ronde)",
        zone: "Table Ronde",
        detail: "Bernahl vend des incantations de combat. Marchand secondaire.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Retrouver Bernahl au Manoir du volcan",
        zone: "Mont Gelmir - Manoir du volcan",
        detail: "Bernahl est membre du Manoir. Aide dans les contrats.",
        prerequisite: { type: "step", questId: "volcano-manor", stepId: 1 },
      },
      {
        id: 3,
        description: "Bernahl envahit aux Ruines de Farum Azula",
        zone: "Ruines de Farum Azula",
        detail: "Bernahl envahit comme PNJ hostile. Le vaincre donne son équipement.",
        prerequisite: { type: "zone", name: "Ruines de Farum Azula" },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer Rykard avant de terminer les contrats avec Bernahl",
        consequence: "Bernahl quitte le Manoir sans interaction finale",
        severity: "recoverable",
        fix: "Il envahit quand même aux Ruines de Farum Azula",
      },
    ],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Set d'armure du Caillot de Bête", "Poings de la Flamme du Blasphème"],
  },

  {
    id: "hyetta",
    name: "Hyetta l'Aveugle",
    npc: "Hyetta",
    category: "main",
    zone: "Nécrolimbe - Lac Agheel",
    guide: "https://www.millenium.org/guide/387885.html",
    endingUnlocked: "Flamme Frénétique",
    relatedQuests: ["irina-edgar"],

    steps: [
      {
        id: 1,
        description: "Rencontrer Hyetta près du Lac Agheel",
        zone: "Nécrolimbe - Lac Agheel",
        detail: "Hyetta demande un Raisin de Néctar de Shabriri. Apparaît après la mort d'Irina.",
        prerequisite: { type: "step", questId: "irina-edgar", stepId: 3 },
      },
      {
        id: 2,
        description: "Donner 3 Raisins de Néctar de Shabriri",
        zone: "Divers",
        detail: "Hyetta se déplace. Chaque raisin fait avancer. Les raisins se trouvent sur des PNJ envahisseurs ou dans le monde.",
        prerequisite: { type: "step", questId: "hyetta", stepId: 1 },
      },
      {
        id: 3,
        description: "Donner le Raisin de Flétrissure de Shabriri",
        zone: "Leyndell, capitale royale - Remparts",
        detail: "Le raisin spécial de la Tour du Spectre. Hyetta révèle le chemin vers les Trois Doigts.",
        prerequisite: { type: "item", name: "Raisin de Flétrissure de Shabriri" },
      },
      {
        id: 4,
        description: "Descendre aux Trois Doigts (sous Leyndell)",
        zone: "Leyndell, capitale royale - Cathédrale de la Trahison (sous-sol)",
        detail: "Descendre nu dans le gouffre sous la Cathédrale. Être enlacé par les Trois Doigts. Hyetta sert de guide.",
        prerequisite: { type: "step", questId: "hyetta", stepId: 3 },
      },
    ],

    failConditions: [
      {
        trigger: "Accepter la Flamme Frénétique",
        consequence: "Verrouille TOUTES les autres fins sauf Flamme Frénétique",
        severity: "recoverable",
        fix: "Aiguille de Miquella dans l'arène de Placidusax (nécessite quête Millicent)",
      },
    ],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Yeux de la Flamme Frénétique (incantation)", "Fin : Flamme Frénétique"],
  },

  {
    id: "irina-edgar",
    name: "Irina & Edgar",
    npc: "Irina",
    category: "secondary",
    zone: "Péninsule larmoyante",
    guide: "https://www.jeuxvideo.com/wikis-soluce-astuces/1541057/quete-des-pnj.htm",
    endingUnlocked: null,
    relatedQuests: ["hyetta"],

    steps: [
      {
        id: 1,
        description: "Rencontrer Irina sur le pont de la Péninsule larmoyante",
        zone: "Péninsule larmoyante - Pont",
        detail: "Irina demande de porter une lettre à son père Edgar au Château Morne.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Vaincre le boss du Château Morne et parler à Edgar",
        zone: "Péninsule larmoyante - Château Morne",
        detail: "Vaincre la Graine Bâtarde. Edgar refuse de partir tant que le château est en danger, mais change d'avis après la lecture.",
        prerequisite: { type: "boss", name: "Graine Bâtarde" },
      },
      {
        id: 3,
        description: "Retourner voir Irina",
        zone: "Péninsule larmoyante - Pont",
        detail: "Irina est morte, tuée par les envahisseurs. Edgar jure vengeance.",
        prerequisite: { type: "step", questId: "irina-edgar", stepId: 2 },
      },
      {
        id: 4,
        description: "Edgar le Vengeur envahit",
        zone: "Liurnia, contrée lacustre - Camp de la Motte",
        detail: "Edgar envahit comme PNJ hostile, rendu fou par le chagrin. Le vaincre donne sa hallebarde.",
        prerequisite: { type: "step", questId: "irina-edgar", stepId: 3 },
      },
    ],

    failConditions: [],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Hallebarde de Bannis", "Graphe-épieu (arme d'Edgar)"],
  },

  {
    id: "yura",
    name: "Yura, Chasseur de Doigts Sanglants",
    npc: "Yura",
    category: "secondary",
    zone: "Nécrolimbe - Lac Agheel",
    guide: "https://www.jeuxvideo.com/wikis-soluce-astuces/1541057/quete-des-pnj.htm",
    endingUnlocked: null,
    relatedQuests: [],

    steps: [
      {
        id: 1,
        description: "Rencontrer Yura sous le pont d'Agheel",
        zone: "Nécrolimbe - Sous le pont du Lac Agheel",
        detail: "Yura chasse les Doigts Sanglants. Met en garde contre Sanguine Noble Nerijus.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Être envahi par Nerijus, Yura aide",
        zone: "Nécrolimbe - Rivière Agheel",
        detail: "Nerijus envahit. Yura apparaît pour aider. Parler après le combat.",
        prerequisite: { type: "step", questId: "yura", stepId: 1 },
      },
      {
        id: 3,
        description: "Retrouver Yura à l'Académie (2ème Église de Marika)",
        zone: "Liurnia, contrée lacustre -2ème Église de Marika",
        detail: "Yura demande de l'aide contre Sanguine Noble au pont.",
        prerequisite: { type: "step", questId: "yura", stepId: 2 },
      },
      {
        id: 4,
        description: "Yura / Shabriri au Plateau d'Altus",
        zone: "Plateau Altus - Caravane",
        detail: "Yura est mort. Son corps est possédé par Shabriri. Shabriri pousse vers la Flamme Frénétique.",
        prerequisite: { type: "zone", name: "Plateau d'Altus" },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer Yura",
        consequence: "Perte de ses interactions et de son katana",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Nagakiba (katana)", "Raisin de Néctar de Shabriri"],
  },

  {
    id: "latenna",
    name: "Latenna l'Albinaurique",
    npc: "Latenna",
    category: "secondary",
    zone: "Liurnia, contrée lacustre - Caverne sous les falaises",
    guide: "https://www.jeuxvideo.com/wikis-soluce-astuces/1541057/quete-des-pnj.htm",
    endingUnlocked: null,
    relatedQuests: [],

    steps: [
      {
        id: 1,
        description: "Trouver Latenna dans la caverne",
        zone: "Liurnia, contrée lacustre - Caverne sous les falaises (Village des Albinauriques)",
        detail: "Latenna est près de son loup mort. Elle demande d'être emmenée à l'Arbre-Sacré de Miquella. Nécessite la moitié du Médaillon.",
        prerequisite: { type: "item", name: "Médaillon secret de l'Haligtree (moitié droite)" },
      },
      {
        id: 2,
        description: "Trouver la moitié gauche du Médaillon",
        zone: "Cimes des Géants - Village du Sol",
        detail: "La moitié manquante est au Village du Sol. Permet d'utiliser le grand ascenseur caché de Rold.",
        prerequisite: { type: "zone", name: "Cimes des Géants" },
      },
      {
        id: 3,
        description: "Emmener Latenna à l'Arbre-Sacré de Miquella",
        zone: "Arbre-Sacré de Miquella - Liturgie de la Mère Albinaurique",
        detail: "Poser Latenna devant la grande statue Albinaurique. Elle s'y repose et meurt en paix.",
        prerequisite: { type: "zone", name: "Arbre-Sacré de Miquella" },
      },
    ],

    failConditions: [],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Cendres de Latenna (invocation archer)", "Grelot du Mineur de Pierre de Forge Sombre"],
  },

  {
    id: "varre",
    name: "Varré le Blême",
    npc: "Varré",
    category: "secondary",
    zone: "Nécrolimbe - Premier pas",
    guide: "https://www.jeuxvideo.com/wikis-soluce-astuces/1541057/quete-des-pnj.htm",
    endingUnlocked: null,
    relatedQuests: [],

    steps: [
      {
        id: 1,
        description: "Parler à Varré au premier Site de Grâce",
        zone: "Nécrolimbe - Premier pas",
        detail: "Varré accueille le joueur. L'appelle « Sans-lumière ». Indique le chemin vers Voilorage.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Retrouver Varré à la Église de la Rose",
        zone: "Liurnia, contrée lacustre - Église de la Rose",
        detail: "Varré donne des Doigts Sanglants pour envahir d'autres joueurs (5 invasions nécessaires).",
        prerequisite: { type: "zone", name: "Liurnia" },
      },
      {
        id: 3,
        description: "Compléter 3 invasions et retourner voir Varré",
        zone: "Liurnia, contrée lacustre - Église de la Rose",
        detail: "Envahir 3 mondes (victoire non requise). Varré donne le Tissu Blanc du Seigneur du Sang.",
        prerequisite: { type: "step", questId: "varre", stepId: 2 },
      },
      {
        id: 4,
        description: "Imbiber le tissu du sang d'une Fille-Vierge",
        zone: "Divers - Église (corps de Fille-Vierge)",
        detail: "Interagir avec un corps de Fille-Vierge (ex: Église de l'Inhibition). Rapporter à Varré.",
        prerequisite: { type: "step", questId: "varre", stepId: 3 },
      },
      {
        id: 5,
        description: "Obtenir le Médaillon du Sang Pur de Mohg",
        zone: "Liurnia, contrée lacustre - Église de la Rose",
        detail: "Varré donne le médaillon. Permet de se téléporter au Palais de Mohgwyn (accès anticipé).",
        prerequisite: { type: "step", questId: "varre", stepId: 4 },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer Varré à la Église de la Rose",
        consequence: "Perte de l'accès anticipé à Mohgwyn (accessible plus tard via les Terres Consacrées de Neige)",
        severity: "recoverable",
        fix: "Mohgwyn reste accessible via un portail téléporteur aux Terres Consacrées de Neige",
      },
    ],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Médaillon du Sang Pur de Mohg (téléporteur Mohgwyn)", "Bouquet de Roses de Varré"],
  },

  {
    id: "patches",
    name: "Pat l'Affranchi (Patches)",
    npc: "Patches",
    category: "secondary",
    zone: "Nécrolimbe - Caverne de Murkwater",
    guide: "https://www.jeuxvideo.com/wikis-soluce-astuces/1541057/quete-des-pnj.htm",
    endingUnlocked: null,
    relatedQuests: ["volcano-manor"],

    steps: [
      {
        id: 1,
        description: "Ouvrir le coffre de Patches (boss fight)",
        zone: "Nécrolimbe - Caverne de Murkwater",
        detail: "Patches attaque quand on ouvre son coffre. Le baisser à faible HP — il capitule. L'ÉPARGNER.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Patches devient marchand",
        zone: "Nécrolimbe - Caverne de Murkwater",
        detail: "Après l'avoir épargné, Patches vend des objets. Attention au coffre piège (téléporte à Nécrolimbe).",
        prerequisite: { type: "step", questId: "patches", stepId: 1 },
      },
      {
        id: 3,
        description: "Retrouver Patches au Manoir du volcan",
        zone: "Mont Gelmir - Manoir du volcan",
        detail: "Patches rejoint le Manoir. Donne un contrat d'assassinat bonus (le piège habituel).",
        prerequisite: { type: "step", questId: "volcano-manor", stepId: 1 },
      },
      {
        id: 4,
        description: "Patches aux Cimes des Géants",
        zone: "Cimes des Géants",
        detail: "Patches tente d'envahir mais se rend immédiatement. Donne la Chorégraphie de la Fleur de Magnolia.",
        prerequisite: { type: "zone", name: "Cimes des Géants" },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer Patches dans la caverne",
        consequence: "Patches meurt définitivement — toutes interactions perdues",
        severity: "permanent",
        fix: null,
      },
      {
        trigger: "Tuer Rykard avant que Patches ne rejoigne le Manoir",
        consequence: "Patches ne rejoint jamais le Manoir",
        severity: "recoverable",
        fix: "Patches apparaît quand même aux Cimes des Géants",
      },
    ],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Chorégraphie de la Fleur de Magnolia", "+2 Éclat de Pierre de Forge", "Objets de marchand"],
  },

  {
    id: "boc",
    name: "Boc le Couturier",
    npc: "Boc",
    category: "secondary",
    zone: "Nécrolimbe - Route côtière",
    guide: "https://www.millenium.org/guide/384458.html",
    endingUnlocked: null,
    relatedQuests: [],

    steps: [
      {
        id: 1,
        description: "Trouver Boc sous forme d'arbre",
        zone: "Nécrolimbe - Route côtière (entre l'Église d'Elleh et Voilorage)",
        detail: "Un arbre parle et demande de l'aide. Le frapper pour révéler Boc.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Récupérer le Kit de Couture de Boc",
        zone: "Nécrolimbe - Caverne côtière",
        detail: "Le kit est dans la caverne à l'ouest. Le rapporter à Boc.",
        prerequisite: { type: "step", questId: "boc", stepId: 1 },
      },
      {
        id: 3,
        description: "Boc s'installe comme couturier",
        zone: "Table Ronde / Sites de Grâce",
        detail: "Boc apparaît à divers sites de grâce, puis à la Table Ronde. Il peut modifier les armures.",
        prerequisite: { type: "step", questId: "boc", stepId: 2 },
      },
      {
        id: 4,
        description: "Boc demande à être rendu beau",
        zone: "Table Ronde",
        detail: "Boc veut utiliser une Larme de Renaissance. ATTENTION : lui dire « Tu es magnifique » (geste de Masque d'Or) ou le laisser faire.",
        prerequisite: { type: "step", questId: "boc", stepId: 3 },
      },
    ],

    failConditions: [
      {
        trigger: "Donner une Larme de Renaissance à Boc",
        consequence: "Boc est « renouvelé » mais meurt dans son sommeil",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [],

    choices: [
      {
        description: "La demande de beauté de Boc",
        options: [
          { choice: "Dire « Tu es magnifique » (geste Masque d'Or)", consequence: "Boc est heureux et continue comme couturier", reward: "Boc reste disponible" },
          { choice: "Donner une Larme de Renaissance", consequence: "Boc meurt dans son sommeil", reward: "Chapeau de Couturier de Boc" },
        ],
      },
    ],

    rewards: ["Service de couture d'armures (gratuit)", "Kit de Couture"],
  },

  {
    id: "thops",
    name: "Thops le Sorcier",
    npc: "Thops",
    category: "secondary",
    zone: "Liurnia, contrée lacustre - Église de l'Irith",
    guide: "https://www.jeuxvideo.com/wikis-soluce-astuces/1541057/quete-des-pnj.htm",
    endingUnlocked: null,
    relatedQuests: [],

    steps: [
      {
        id: 1,
        description: "Rencontrer Thops à l'Église de l'Irith",
        zone: "Liurnia, contrée lacustre - Église de l'Irith",
        detail: "Thops est un étudiant recalé de l'Académie. Il vend des sorcelleries basiques. Il veut une Clé de Pierre d'Éclat.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Donner une Clé de Pierre d'Éclat à Thops",
        zone: "Liurnia, contrée lacustre - Église de l'Irith",
        detail: "Trouver une 2ème Clé de Pierre (plusieurs emplacements). La donner à Thops.",
        prerequisite: { type: "item", name: "Clé de Pierre d'Éclat (supplémentaire)" },
      },
      {
        id: 3,
        description: "Trouver le corps de Thops à l'Académie",
        zone: "Liurnia, contrée lacustre - Académie de Raya Lucaria",
        detail: "Thops est mort dans une salle de classe. Il a laissé la Barrière de Thops (sort) et son Grelot.",
        prerequisite: { type: "step", questId: "thops", stepId: 2 },
      },
    ],

    failConditions: [],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Barrière de Thops (sorcellerie)", "Grelot de Thops (achat sorcelleries)"],
  },

  {
    id: "roderika",
    name: "Rodérika l'Harmonisatrice",
    npc: "Rodérika",
    category: "secondary",
    zone: "Château de Voilorage - Cabane de Voilorage",
    guide: "https://www.jeuxvideo.com/wikis-soluce-astuces/1541057/quete-des-pnj.htm",
    endingUnlocked: null,
    relatedQuests: [],

    steps: [
      {
        id: 1,
        description: "Rencontrer Rodérika à la cabane de Voilorage",
        zone: "Château de Voilorage - Cabane de Voilorage",
        detail: "Rodérika est effrayée. Elle donne la Méduse Spirituelle (cendres). Parler plusieurs fois.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Trouver le Memento de Chrysalide dans le château",
        zone: "Château de Voilorage (salle aux cadavres)",
        detail: "Le Memento est dans la salle avec les corps greffés. Le rapporter à Rodérika.",
        prerequisite: null,
      },
      {
        id: 3,
        description: "Rodérika s'installe à la Table Ronde",
        zone: "Table Ronde",
        detail: "Parler à Rodérika puis à Hewg le forgeron. Répéter jusqu'à ce que Rodérika devienne harmonisatrice.",
        prerequisite: { type: "step", questId: "roderika", stepId: 2 },
      },
      {
        id: 4,
        description: "Rodérika améliore les Cendres Spirituelles",
        zone: "Table Ronde",
        detail: "Rodérika est installée à côté de Hewg. Elle permet d'améliorer les Cendres Spirituelles.",
        prerequisite: { type: "step", questId: "roderika", stepId: 3 },
      },
    ],

    failConditions: [],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Méduse Spirituelle (cendres)", "Service d'amélioration des Cendres Spirituelles"],
  },

  {
    id: "boggart",
    name: "Gros Boggart",
    npc: "Boggart",
    category: "secondary",
    zone: "Liurnia, contrée lacustre - Cabane à Crevettes / Plateau d'Altus",
    guide: "https://www.millenium.org/guide/416488.html",
    endingUnlocked: null,
    relatedQuests: ["rya", "coprophage"],

    steps: [
      {
        id: 1,
        description: "Rencontrer Boggart à la Cabane à Crevettes",
        zone: "Liurnia, contrée lacustre - Cabane à Crevettes",
        detail: "Boggart a volé le collier de Rya. Le racheter (1000 runes) ou le tuer.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Boggart s'installe au Fossé du Manoir",
        zone: "Plateau Altus - Fossé du Manoir",
        detail: "Boggart vend des Crevettes et des Crabes cuits. Marchand de bouffe.",
        prerequisite: { type: "step", questId: "boggart", stepId: 1 },
      },
      {
        id: 3,
        description: "Boggart tué par le Coprophage",
        zone: "Plateau Altus - Fossé du Manoir",
        detail: "Si la quête du Coprophage avance, Boggart est retrouvé mort, maudit.",
        prerequisite: { type: "step", questId: "coprophage", stepId: 4 },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer Boggart soi-même",
        consequence: "Perte du marchand de nourriture et de l'interaction avec Rya",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Crevettes cuites (boost défense magique)", "Crabes cuits (boost défense physique)"],
  },

  // ============================================================
  // DLC — SHADOW OF THE ERDTREE
  // ============================================================

  {
    id: "leda",
    name: "Dame Leda",
    npc: "Leda",
    category: "dlc",
    zone: "Plaine sépulcrale - Croix du Repos royal",
    guide: "https://www.millenium.org/guide/414832.html",
    endingUnlocked: null,
    relatedQuests: ["ansbach", "freyja", "kerastien", "thiollier", "moore", "dane"],

    steps: [
      {
        id: 1,
        description: "Toucher le bras flétri de Miquella au Mausolée Mohgwyn",
        zone: "Mausolée de la dynastie Mohgwyn",
        detail: "Prérequis : vaincre Mohg, Seigneur du Sang + Radahn le Fléau des Astres. Toucher le bras flétri de Miquella dans le cocon pour être transporté au Royaume des Ombres. Leda se tient à côté du cocon.",
        prerequisite: { type: "boss", name: "Mohg, seigneur du sang" },
      },
      {
        id: 2,
        description: "Retrouver Leda à la Croix du Repos royal",
        zone: "Plaine sépulcrale - Croix du Repos royal",
        detail: "Leda se présente comme meneuse du groupe de fidèles de Miquella. Elle explique la mission : suivre les Croix laissées par Miquella à travers le Royaume des Ombres.",
        prerequisite: null,
      },
      {
        id: 3,
        description: "Ramasser les messages de Leda",
        zone: "Plaine sépulcrale / Château d'Ensis",
        detail: "Un message à Belurat (après le Lion Dansant), un autre au Château d'Ensis (près du Point de contrôle). Parler à Leda à la Croix de la Chaussée royale (Altus occulte) après Rellana.",
        prerequisite: { type: "boss", name: "Lion dansant de la bête divine" },
      },
      {
        id: 4,
        description: "La Grande Rune de Miquella se brise",
        zone: "Royaume des Ombres",
        detail: "Après avoir atteint suffisamment de Croix, le message « Quelque part, une grande rune s'est brisée, et un puissant charme avec elle » apparaît. Les PNJ sortent de l'emprise de Miquella.",
        prerequisite: null,
      },
      {
        id: 5,
        description: "Leda propose d'éliminer Kérastien",
        zone: "Altus Occulte - Château noir, rempart intérieur",
        detail: "Leda considère Kérastien comme un traître. Au rempart intérieur du Château noir, deux marques d'invocation apparaissent : marque rouge (aider Leda) ou marque dorée (aider Kérastien). Si vous suggérez Thiollier, Leda refuse et revient sur Kérastien.",
        prerequisite: { type: "step", questId: "leda", stepId: 4 },
      },
      {
        id: 6,
        description: "Leda cible ensuite Ansbach",
        zone: "Altus Occulte - Château noir, Entrepôt à semences",
        detail: "Si vous avez aidé Leda contre Kérastien, elle cible Ansbach. Trouver les 2 marques d'invocation au rez-de-chaussée de l'Entrepôt à semences. Marque rouge = tuer Ansbach, marque dorée = protéger Ansbach.",
        prerequisite: { type: "step", questId: "leda", stepId: 5 },
      },
      {
        id: 7,
        description: "Combat contre Leda et ses alliés à Enir-Ilim",
        zone: "Enir-Ilim - Antichambre de la salle de purification",
        detail: "Marque rouge pour défier Leda. Marques dorées pour invoquer Ansbach (Chevalier de Sang-Pur Ansbach) et Thiollier. Ordre des ennemis : Freyja → Kérastien (s'il vit) → Moore → Dane Mortefeuille → Leda en dernier. Si Ansbach est mort, le Noble Sanguinaire Nataan apparaît à sa place.",
        prerequisite: { type: "zone", name: "Enir-Ilim" },
      },
      {
        id: 8,
        description: "Vaincre Radahn, Consort de Miquella",
        zone: "Enir-Ilim - Arène finale",
        detail: "Combat final du DLC en 2 phases (Radahn futur consort → Radahn consort de Miquella). Ansbach et Thiollier peuvent être invoqués s'ils ont survécu.",
        prerequisite: { type: "boss", name: "Radahn, consort de Miquella" },
      },
    ],

    failConditions: [
      {
        trigger: "Entrer à Enir-Ilim avant d'avoir complété les quêtes des compagnons",
        consequence: "Les quêtes DLC non terminées échouent définitivement",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Entrer à Enir-Ilim",
        effect: "Toutes les quêtes DLC non terminées sont verrouillées. Point de non-retour majeur.",
      },
    ],

    choices: [
      {
        description: "Choix Kérastien (Château noir, rempart intérieur)",
        options: [
          { choice: "Marque rouge — Aider Leda", consequence: "Kérastien meurt", reward: "Talisman Enchevêtrement de lacération + Set du Kérastien" },
          { choice: "Marque dorée — Aider Kérastien", consequence: "Leda se retire sans mourir", reward: "Rune de Leda + Cendre de guerre: Taillade rapide" },
        ],
      },
      {
        description: "Choix Ansbach (Entrepôt à semences, RDC)",
        options: [
          { choice: "Marque rouge — Aider Leda", consequence: "Ansbach meurt, pas d'allié à Enir-Ilim", reward: "Équipement d'Ansbach" },
          { choice: "Marque dorée — Aider Ansbach", consequence: "Ansbach survit, invocable à Enir-Ilim", reward: "Allié pour le boss final" },
        ],
      },
    ],

    rewards: ["Épée de Leda", "Alliés pour le boss final DLC (selon choix)"],
  },

  {
    id: "ansbach",
    name: "Sir Ansbach",
    npc: "Ansbach",
    category: "dlc",
    zone: "Plaine sépulcrale - Croix de la porte principale",
    guide: "https://www.millenium.org/guide/414816.html",
    endingUnlocked: null,
    relatedQuests: ["leda", "freyja"],

    steps: [
      {
        id: 1,
        description: "Rencontrer Ansbach à la Croix de la porte principale",
        zone: "Plaine sépulcrale - Devant Belurat",
        detail: "Ansbach est un ancien serviteur de Mohg. Il demande de trouver les Croix de Miquella et de lui rapporter les découvertes.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Signaler les Croix de Miquella à Ansbach",
        zone: "Plaine sépulcrale - Diverses Croix",
        detail: "Retourner voir Ansbach régulièrement pour débloquer de nouveaux dialogues. Pas obligatoire mais enrichit le lore.",
        prerequisite: { type: "step", questId: "ansbach", stepId: 1 },
      },
      {
        id: 3,
        description: "La Grande Rune de Miquella se brise",
        zone: "Royaume des Ombres",
        detail: "Ansbach exprime ses craintes sur les véritables intentions de Miquella. Il quitte sa position initiale et se rend à l'Entrepôt à semences du Château noir.",
        prerequisite: null,
      },
      {
        id: 4,
        description: "Retrouver Ansbach à l'Entrepôt à semences (RDC)",
        zone: "Altus Occulte - Château noir, Entrepôt à semences",
        detail: "Rez-de-chaussée, première entrée à droite après les petits escaliers. IMPORTANT : NE PAS donner le Parchemin de rite secret tout de suite si vous voulez aussi compléter la quête de Freyja.",
        prerequisite: { type: "step", questId: "ansbach", stepId: 3 },
      },
      {
        id: 5,
        description: "Échange de lettres avec Freyja (via Ansbach)",
        zone: "Altus Occulte - Château noir, Entrepôt à semences",
        detail: "Parler à Freyja au 7e étage de l'Entrepôt, puis redescendre voir Ansbach. Il donne la Lettre pour Freyja. Remonter la donner à Freyja, récupérer sa réponse, la rapporter à Ansbach.",
        prerequisite: { type: "step", questId: "ansbach", stepId: 4 },
      },
      {
        id: 6,
        description: "Donner le Parchemin de rite secret à Ansbach",
        zone: "Altus Occulte - Château noir, Entrepôt à semences",
        detail: "Le parchemin est sur une table derrière de grandes étagères dans l'Entrepôt. Il révèle que Miquella utilise le corps de Mohg pour ramener un demi-dieu comme consort. Ansbach part, choqué par la révélation.",
        prerequisite: { type: "item", name: "Parchemin de rite secret" },
      },
      {
        id: 7,
        description: "Soutenir Ansbach contre Leda (si Leda le cible)",
        zone: "Altus Occulte - Château noir, Entrepôt à semences",
        detail: "Si vous avez aidé Kérastien contre Leda, Leda cible Ansbach ensuite. Choisir la marque dorée pour le protéger.",
        prerequisite: { type: "step", questId: "ansbach", stepId: 6 },
      },
      {
        id: 8,
        description: "Invoquer Ansbach à Enir-Ilim",
        zone: "Enir-Ilim",
        detail: "Ansbach est invocable (Chevalier de Sang-Pur Ansbach) pour le combat contre Leda et ses alliés, puis pour le boss final Radahn Consort.",
        prerequisite: { type: "step", questId: "ansbach", stepId: 6 },
      },
      {
        id: 9,
        description: "Récupérer l'équipement d'Ansbach",
        zone: "Enir-Ilim",
        detail: "Après le combat final contre Radahn, le corps d'Ansbach est près du Site de Grâce. Récupérer son set complet.",
        prerequisite: { type: "boss", name: "Radahn, consort de Miquella" },
      },
    ],

    failConditions: [
      {
        trigger: "Donner le Parchemin de rite secret AVANT l'échange de lettres avec Freyja",
        consequence: "Ansbach part — impossible de récupérer la Lettre pour Freyja, quête de Freyja bloquée",
        severity: "permanent",
        fix: null,
      },
      {
        trigger: "Ne pas donner le Parchemin de rite secret du tout",
        consequence: "Ansbach ne progresse pas — pas d'invocation à Enir-Ilim",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Donner le Parchemin de rite secret",
        effect: "Ansbach quitte l'Entrepôt. Compléter l'échange de lettres avec Freyja AVANT.",
      },
    ],

    choices: [],

    rewards: ["Set d'Ansbach (complet)", "Incantation Lame Furieuse d'Ansbach", "Arc long d'Ansbach", "Allié pour Enir-Ilim"],
  },

  {
    id: "freyja",
    name: "Freyja",
    npc: "Freyja",
    category: "dlc",
    zone: "Plaine sépulcrale - Croix des Trois Chemins",
    guide: "https://www.millenium.org/guide/414990.html",
    endingUnlocked: null,
    relatedQuests: ["leda", "ansbach"],

    steps: [
      {
        id: 1,
        description: "Rencontrer Freyja à la Croix des Trois Chemins",
        zone: "Plaine sépulcrale - Croix des Trois Chemins",
        detail: "Guerrière fidèle au Général Radahn, ensorcelée par Miquella. Dialogues sur sa loyauté envers Radahn.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Retrouver Freyja aux Croix de Miquella",
        zone: "Plaine sépulcrale / Altus Occulte - Diverses Croix",
        detail: "Dialogues progressifs sur ses doutes envers Miquella et son inquiétude pour Radahn.",
        prerequisite: { type: "step", questId: "freyja", stepId: 1 },
      },
      {
        id: 3,
        description: "La Grande Rune se brise — Freyja cherche des réponses",
        zone: "Altus Occulte - Château noir, Entrepôt à semences, 7e étage",
        detail: "Freyja sort du charme de Miquella. Elle se rend au 7e étage de l'Entrepôt à semences (site de grâce Entrepôt à semences, septième étage) pour chercher des documents sur le sort de Radahn.",
        prerequisite: null,
      },
      {
        id: 4,
        description: "Demander l'aide d'Ansbach pour Freyja",
        zone: "Altus Occulte - Château noir, Entrepôt à semences, RDC",
        detail: "Parler à Freyja au 7e étage (elle est bloquée), puis descendre au RDC parler à Ansbach de Freyja. Ansbach donne la Lettre pour Freyja.",
        prerequisite: { type: "step", questId: "freyja", stepId: 3 },
      },
      {
        id: 5,
        description: "Livrer la Lettre pour Freyja",
        zone: "Altus Occulte - Château noir, Entrepôt à semences, 7e étage",
        detail: "Donner la lettre à Freyja. Elle comprend ce qui va arriver à Radahn. Récompense : Bouclier léonin doré. Rapporter sa réponse à Ansbach au RDC.",
        prerequisite: { type: "item", name: "Lettre pour Freyja" },
      },
      {
        id: 6,
        description: "Freyja combat contre vous à Enir-Ilim",
        zone: "Enir-Ilim - Antichambre de la salle de purification",
        detail: "Si vous avez donné la lettre, Freyja combat CONTRE vous dans le combat « Leda et ses alliés » (1ère ennemie invoquée). Si vous ne donnez pas la lettre, elle reste à l'Entrepôt jusqu'à la fin.",
        prerequisite: { type: "step", questId: "freyja", stepId: 5 },
      },
      {
        id: 7,
        description: "Récupérer l'équipement de Freyja",
        zone: "Altus Occulte - Château noir, Entrepôt à semences, 7e étage",
        detail: "Après le combat à Enir-Ilim, retourner au 7e étage de l'Entrepôt pour récupérer le Set de Freyja et son Espadon.",
        prerequisite: { type: "step", questId: "freyja", stepId: 6 },
      },
    ],

    failConditions: [
      {
        trigger: "Donner le Parchemin de rite secret à Ansbach AVANT l'échange de lettres",
        consequence: "Ansbach part — impossible de récupérer la Lettre pour Freyja",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Donner le Parchemin de rite secret à Ansbach",
        effect: "Si l'échange de lettres n'est pas fait avant, la quête de Freyja est bloquée",
      },
    ],

    choices: [],

    rewards: ["Bouclier léonin doré", "Espadon de Freyja", "Set de Freyja (armure complète)"],
  },

  {
    id: "kerastien",
    name: "Kérastien",
    npc: "Kérastien",
    category: "dlc",
    zone: "Plaine sépulcrale - Croix des Trois Chemins",
    guide: "https://www.millenium.org/guide/414887.html",
    endingUnlocked: null,
    relatedQuests: ["leda"],

    steps: [
      {
        id: 1,
        description: "Rencontrer Kérastien à la Croix des Trois Chemins",
        zone: "Plaine sépulcrale - Croix des Trois Chemins",
        detail: "Membre du peuple kérastien, victime des purges de Messmer l'Empaleur. Haine profonde envers l'Arbre-Mère et Marika. Il donne la Carte des Croix de Miquella (Plaine sépulcrale).",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Retrouver Kérastien à la Croix de la Chaussée royale",
        zone: "Altus Occulte - Croix de la Chaussée royale",
        detail: "Après avoir vaincu Rellana au Château d'Ensis. Kérastien donne une nouvelle Carte des Croix (Altus occulte).",
        prerequisite: { type: "boss", name: "Rellana, chevaleresse des Lunes jumelles" },
      },
      {
        id: 3,
        description: "Invoquer Kérastien au Château noir",
        zone: "Altus Occulte - Château noir",
        detail: "Marque d'invocation disponible contre l'Hippopotame Doré et contre Messmer l'Empaleur. Si invoqué contre Messmer et victorieux, Kérastien est galvanisé par sa vengeance.",
        prerequisite: { type: "step", questId: "kerastien", stepId: 2 },
      },
      {
        id: 4,
        description: "Choix : Leda vs Kérastien (après brisure de la Grande Rune)",
        zone: "Altus Occulte - Château noir, rempart intérieur",
        detail: "Leda considère Kérastien comme un traître. Deux marques près de l'ascenseur menant à la Réserve de semences. Marque dorée = aider Kérastien (Leda se retire). Marque rouge = aider Leda (Kérastien meurt).",
        prerequisite: { type: "step", questId: "kerastien", stepId: 3 },
      },
      {
        id: 5,
        description: "Kérastien vous envahit (si aidé contre Leda)",
        zone: "Ruines antiques de Rauh - Avant Romina",
        detail: "Après Messmer, Kérastien veut s'en prendre à Miquella. Il vous envahit dans les Ruines anciennes de Rauh, juste avant l'arène de Romina. Le vaincre donne sa Faux et son set d'armure.",
        prerequisite: { type: "step", questId: "kerastien", stepId: 4 },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer Kérastien prématurément (hors combat scripté)",
        consequence: "Quête terminée, récompenses perdues",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Choix Leda/Kérastien au Château noir",
        effect: "Choix irréversible. Détermine les récompenses obtenues et la suite de la quête de Leda.",
      },
    ],

    choices: [
      {
        description: "Leda vs Kérastien (Château noir, rempart intérieur)",
        options: [
          { choice: "Marque dorée — Aider Kérastien", consequence: "Leda se retire. Kérastien vous envahit plus tard dans les Ruines de Rauh.", reward: "Rune de Leda + Cendre de guerre: Taillade rapide → puis Faux du Kérastien + Set du Kérastien" },
          { choice: "Marque rouge — Aider Leda", consequence: "Kérastien meurt sur le coup", reward: "Talisman Enchevêtrement de lacération + Set du Kérastien" },
        ],
      },
    ],

    rewards: ["Faux du Kérastien", "Set complet du Kérastien", "Talisman Enchevêtrement de lacération OU Rune de Leda + Taillade rapide"],
  },

  {
    id: "thiollier",
    name: "Thiollier & Sainte Trina",
    npc: "Thiollier",
    category: "dlc",
    zone: "Plaine sépulcrale - Relais de la voie des piliers",
    guide: "https://www.millenium.org/guide/414811.html",
    endingUnlocked: null,
    relatedQuests: ["moore"],

    steps: [
      {
        id: 1,
        description: "Rencontrer Thiollier au Relais de la voie des piliers",
        zone: "Plaine sépulcrale - Relais de la voie des piliers (sud)",
        detail: "Empoisonneur fanatique de Sainte Trina. Il parle de sa dévotion et de sa honte vis-à-vis de Miquella.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Obtenir la Liqueur noire de Moore",
        zone: "Plaine sépulcrale - Devant Belurat",
        detail: "Acheter la Note: Sources spirituelles scellées à Moore (1 000 runes), recharger la zone, lui reparler. Moore donne la Liqueur noire à livrer à Thiollier.",
        prerequisite: { type: "step", questId: "moore", stepId: 2 },
      },
      {
        id: 3,
        description: "Livrer la Liqueur noire à Thiollier",
        zone: "Plaine sépulcrale - Relais de la voie des piliers",
        detail: "Thiollier accepte la liqueur, parle de son désir de trouver les nymphéas pourpres au sud. Il part vers la Côte céruléenne.",
        prerequisite: { type: "item", name: "Liqueur noire" },
      },
      {
        id: 4,
        description: "Récupérer la Concoction de Thiollier",
        zone: "Plaine sépulcrale - Relais de la voie des piliers",
        detail: "IMPORTANT : Récupérer cet objet AVANT que Thiollier ne parte au Jardin du nymphéa pourpre. Sert pour la quête de la Prêtresse de la communion draconique (alternative pour tuer Bayle).",
        prerequisite: { type: "step", questId: "thiollier", stepId: 1 },
      },
      {
        id: 5,
        description: "Retrouver Thiollier au Jardin du nymphéa pourpre",
        zone: "Côte céruléenne - Jardin du nymphéa pourpre (souterrain)",
        detail: "Zone souterraine accessible via la Fissure des cercueils de pierre (presqu'île au sud de la Côte sud). Vaincre le Chevalier putride (boss) pour accéder à Thiollier.",
        prerequisite: { type: "boss", name: "Chevalier putride" },
      },
      {
        id: 6,
        description: "Trouver Sainte Trina et boire le Nectar",
        zone: "Côte céruléenne - Jardin du nymphéa pourpre",
        detail: "Sainte Trina est au fond de la zone. Choisir « Boire le nectar » tue instantanément. Répéter 4-5 fois jusqu'à entendre les paroles de Sainte Trina sur l'écran de mort.",
        prerequisite: { type: "step", questId: "thiollier", stepId: 5 },
      },
      {
        id: 7,
        description: "Rapporter les paroles de Sainte Trina à Thiollier",
        zone: "Côte céruléenne - Jardin du nymphéa pourpre",
        detail: "Choisir « Transmettre les paroles de Sainte Trina » puis « Essayer encore de transmettre les paroles ». Thiollier se met en colère.",
        prerequisite: { type: "step", questId: "thiollier", stepId: 6 },
      },
      {
        id: 8,
        description: "Vaincre Thiollier (invasion)",
        zone: "Côte céruléenne - Jardin du nymphéa pourpre",
        detail: "Se reposer au site de grâce ou boire le nectar une dernière fois. Thiollier vous envahit. Le vaincre donne le talisman Sourire de Sainte Trina.",
        prerequisite: { type: "step", questId: "thiollier", stepId: 7 },
      },
      {
        id: 9,
        description: "Parler à Thiollier après l'invasion",
        zone: "Côte céruléenne - Jardin du nymphéa pourpre",
        detail: "Il s'excuse. Il est désormais disponible comme allié pour Enir-Ilim.",
        prerequisite: { type: "step", questId: "thiollier", stepId: 8 },
      },
      {
        id: 10,
        description: "Invoquer Thiollier à Enir-Ilim",
        zone: "Enir-Ilim",
        detail: "Invocable pour le combat contre Leda et ses alliés + boss final Radahn Consort. Après le combat final, Thiollier est mort. Récupérer son set d'équipement.",
        prerequisite: { type: "step", questId: "thiollier", stepId: 9 },
      },
      {
        id: 11,
        description: "Récupérer la Fleur de Sainte Trina",
        zone: "Côte céruléenne - Jardin du nymphéa pourpre",
        detail: "Après le boss final, retourner voir Sainte Trina au Jardin du nymphéa pourpre. Elle donne la Fleur de Sainte Trina.",
        prerequisite: { type: "boss", name: "Radahn, consort de Miquella" },
      },
    ],

    failConditions: [
      {
        trigger: "Aller à Enir-Ilim AVANT d'avoir vaincu Thiollier lors de son invasion",
        consequence: "Thiollier disparaît du Jardin, quête bloquée",
        severity: "permanent",
        fix: null,
      },
      {
        trigger: "Ne pas récupérer la Concoction de Thiollier avant qu'il parte au Jardin",
        consequence: "Objet perdu définitivement (pas bloquant pour la quête principale)",
        severity: "recoverable",
        fix: null,
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Entrer à Enir-Ilim",
        effect: "Thiollier doit avoir été vaincu lors de son invasion et s'être excusé AVANT.",
      },
    ],

    choices: [],

    rewards: ["Sourire de Sainte Trina (talisman)", "Fleur de Sainte Trina", "Set de Thiollier", "Concoction de Thiollier"],
  },

  {
    id: "dane",
    name: "Dane Mortefeuille",
    npc: "Dane",
    category: "dlc",
    zone: "Altus Occulte - Ruines de Moorth",
    guide: "https://www.millenium.org/guide/414718.html",
    endingUnlocked: null,
    relatedQuests: ["leda"],

    steps: [
      {
        id: 1,
        description: "Récupérer la Missive du moine",
        zone: "Altus Occulte - Sortie du Château d'Ensis",
        detail: "Au site de grâce à la sortie du Château d'Ensis (entrée d'Altus occulte). Avec la missive, vous obtenez aussi l'émote « Que le meilleur l'emporte ».",
        prerequisite: { type: "boss", name: "Rellana, chevaleresse des Lunes jumelles" },
      },
      {
        id: 2,
        description: "Trouver Dane Mortefeuille aux Ruines de Moorth",
        zone: "Altus Occulte - Ruines de Moorth",
        detail: "Personnage encapuchonné, bras croisés, près du site de grâce des Ruines de Moorth.",
        prerequisite: { type: "step", questId: "dane", stepId: 1 },
      },
      {
        id: 3,
        description: "Effectuer l'émote « Que le meilleur l'emporte » devant Dane",
        zone: "Altus Occulte - Ruines de Moorth",
        detail: "Déclenche un duel en tête-à-tête. Dane se bat au corps à corps (arts martiaux), coups rapides, peu de poise.",
        prerequisite: { type: "step", questId: "dane", stepId: 2 },
      },
      {
        id: 4,
        description: "Vaincre Dane en duel",
        zone: "Altus Occulte - Ruines de Moorth",
        detail: "Récompenses immédiates : Arts de Mortefeuille (arme de combat rapproché), Jeu de Jambes de Dane (arme), Chapeau de Dane.",
        prerequisite: { type: "step", questId: "dane", stepId: 3 },
      },
      {
        id: 5,
        description: "Dane combat contre vous à Enir-Ilim",
        zone: "Enir-Ilim - Antichambre de la salle de purification",
        detail: "Dane apparaît TOUJOURS comme ennemi dans le combat « Leda et ses alliés », quels que soient les choix. Il est le 4e invoqué (après Moore).",
        prerequisite: { type: "zone", name: "Enir-Ilim" },
      },
    ],

    failConditions: [],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Arts de Mortefeuille (arme combat rapproché)", "Jeu de Jambes de Dane", "Chapeau de Dane"],
  },

  {
    id: "igon",
    name: "Igon le Chevalier-Dragon",
    npc: "Igon",
    category: "dlc",
    zone: "Plaine sépulcrale - Falaise au-dessus de la Forge de lave",
    guide: "https://www.millenium.org/guide/414908.html",
    endingUnlocked: null,
    relatedQuests: [],

    steps: [
      {
        id: 1,
        description: "Rencontrer Igon blessé",
        zone: "Plaine sépulcrale - Falaise au-dessus de la Forge de lave en ruine",
        detail: "En haut de la falaise surplombant la Plaine sépulcrale, au-dessus de la Forge de lave en ruine. Partir du site de grâce « Entrée du château » (après le Viaduc d'Ellac), aller vers le sud. Igon est gravement blessé et maudit Bayle.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Parler à Igon au Relais de la voie des piliers",
        zone: "Plaine sépulcrale - Relais de la voie des piliers",
        detail: "Igon gémit de douleur. Épuiser les dialogues, se reposer pour un nouveau dialogue. Chevalier draconique estropié par Bayle l'Effroyable.",
        prerequisite: { type: "step", questId: "igon", stepId: 1 },
      },
      {
        id: 3,
        description: "Parler à la Prêtresse de la communion draconique",
        zone: "Pic déchiqueté - Fosse au dragon",
        detail: "Elle veut la mort de Bayle pour le seigneur Placidusax. Accepter sa mission.",
        prerequisite: { type: "step", questId: "igon", stepId: 2 },
      },
      {
        id: 4,
        description: "Vaincre les dragons du Pic déchiqueté",
        zone: "Pic déchiqueté - Pied du Pic déchiqueté",
        detail: "Deux Dragon du Pic déchiqueté se battent au site de grâce « Pied du Pic déchiqueté ». Les vaincre. Igon vous acclame et demande d'être invoqué contre Bayle.",
        prerequisite: { type: "boss", name: "Dragon du Pic déchiqueté" },
      },
      {
        id: 5,
        description: "Escalader le Pic déchiqueté",
        zone: "Pic déchiqueté",
        detail: "Affronter le dragon ancien Senessax en chemin vers le sommet.",
        prerequisite: { type: "step", questId: "igon", stepId: 4 },
      },
      {
        id: 6,
        description: "Invoquer Igon et vaincre Bayle l'Effroyable",
        zone: "Pic déchiqueté - Sommet du Pic déchiqueté",
        detail: "Marque d'invocation d'Igon devant l'arène de Bayle. Igon crie sa rage pendant tout le combat (dialogues mémorables). Récompense : Cœur de Bayle.",
        prerequisite: { type: "step", questId: "igon", stepId: 5 },
      },
      {
        id: 7,
        description: "Retourner à la Prêtresse de la communion draconique",
        zone: "Pic déchiqueté - Fosse au dragon",
        detail: "Échanger le Cœur de Bayle contre une capacité draconique. Recevoir aussi le Cœur de prêtresse et le Marteau pétrofloral.",
        prerequisite: { type: "boss", name: "Bayle l'Effroyable" },
      },
      {
        id: 8,
        description: "Récupérer l'équipement d'Igon",
        zone: "Pic déchiqueté - Emplacement des deux dragons",
        detail: "Retourner à l'emplacement des deux dragons (après l'arène). Igon est mort. Récupérer : Set complet d'Igon, Arc géant d'Igon, Perle cinéraire d'Igon. Donner la Perle à la Carcasse des jumelles (Table ronde) pour acheter les Harpons d'Igon.",
        prerequisite: { type: "boss", name: "Bayle l'Effroyable" },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer Igon avant de vaincre Bayle",
        consequence: "Pas d'allié pour le combat contre Bayle, quête terminée prématurément",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [],

    choices: [],

    rewards: ["Cœur de Bayle (souvenir) + capacité draconique", "Arc géant d'Igon", "Set d'Igon (complet)", "Harpons d'Igon", "Cœur de prêtresse", "Marteau pétrofloral"],
  },

  {
    id: "ymir",
    name: "Comte Ymir & Jolàn",
    npc: "Comte Ymir",
    category: "dlc",
    zone: "Altus Occulte - Cathédrale de Manus Metyr",
    guide: "https://www.millenium.org/guide/414740.html",
    endingUnlocked: null,
    relatedQuests: [],

    steps: [
      {
        id: 1,
        description: "Rencontrer le Comte Ymir à la Cathédrale de Manus Metyr",
        zone: "Altus Occulte - Cathédrale de Manus Metyr",
        detail: "Derrière des portes fermées dans la cathédrale. Il est surpris de vous voir. Il donne la Carte des ruines (1ère) et le Collier troué.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Sonner la cloche aux Ruines des Doigts de Rhia",
        zone: "Ruines des Doigts de Rhia",
        detail: "Utiliser la carte, voyager aux ruines. Naviguer entre les Doigtaraches et ennemis. Sonner la cloche au centre (cercle de doigts). Récompense : Talisman de la graine pourpre +1.",
        prerequisite: { type: "item", name: "Carte des ruines (1ère)" },
      },
      {
        id: 3,
        description: "Retourner à Ymir, rencontrer Jolàn",
        zone: "Altus Occulte - Cathédrale de Manus Metyr",
        detail: "Jolàn est appuyée contre un pilier, surprise que Ymir vous fasse confiance. Ymir donne la Carte des ruines (2e) et la Poussière d'étoile bien-aimée.",
        prerequisite: { type: "step", questId: "ymir", stepId: 2 },
      },
      {
        id: 4,
        description: "Sonner la cloche aux Ruines des Doigts de Dhéo",
        zone: "Panorama occulte - Arrière-pays",
        detail: "Aller au Château noir, porte arrière. Trouver un autel avec un Fragment de l'Arbre-Occulte. Effectuer le geste « Ô Mère » devant l'autel pour révéler un passage secret vers l'Arrière-pays. Traverser la zone (2 Sentinelles de l'Arbre), invoquer Jolàn (marque dorée) avant le premier sentinelle. Sonner la cloche.",
        prerequisite: { type: "item", name: "Carte des ruines (2e)" },
      },
      {
        id: 5,
        description: "Retourner à Ymir, obtenir la 3e carte",
        zone: "Altus Occulte - Cathédrale de Manus Metyr",
        detail: "Ymir donne la Carte des ruines (3e). Lui parler de « la nature du monde ». Recharger la zone — Ymir disparaît de son trône.",
        prerequisite: { type: "step", questId: "ymir", stepId: 4 },
      },
      {
        id: 6,
        description: "Descendre aux Ruines des Doigts de Miyr",
        zone: "Altus Occulte - Sous la Cathédrale de Manus Metyr",
        detail: "Examiner le trône de Ymir — il coulisse et révèle une échelle de corde. Descendre. Vaincre l'envahisseuse Épéiste nocturne Anna (donne les Griffes de la Nuit). Sonner la cloche au fond — téléportation vers l'arène de Métyr.",
        prerequisite: { type: "step", questId: "ymir", stepId: 5 },
      },
      {
        id: 7,
        description: "Vaincre Métyr, Mère des Doigts",
        zone: "Altus Occulte - Arène de Métyr",
        detail: "Boss majeur. Récompense : 420 000 runes + Souvenir de la Mère des Doigts (échangeable contre le Bâton de l'au-delà — lance sorts ET incantations).",
        prerequisite: { type: "step", questId: "ymir", stepId: 6 },
      },
      {
        id: 8,
        description: "Confrontation finale — Vaincre le Comte Ymir",
        zone: "Altus Occulte - Cathédrale de Manus Metyr",
        detail: "Voyager ailleurs puis revenir. Examiner le trône à nouveau. L'envahisseuse Épéiste nocturne Jolàn apparaît — la vaincre, puis affronter le Comte Ymir (il utilise les pouvoirs de Métyr).",
        prerequisite: { type: "step", questId: "ymir", stepId: 7 },
      },
      {
        id: 9,
        description: "Récupérer les récompenses",
        zone: "Altus Occulte - Cathédrale de Manus Metyr",
        detail: "Set du Grand Prêtre (complet), Perle cinéraire d'Ymir, Bâton maternel, Sort Doigts Protecteurs. Pour Jolàn : choisir entre l'Épée Nocturne (katana) OU les Cendres d'invocation Épéiste nocturne Jolàn.",
        prerequisite: { type: "step", questId: "ymir", stepId: 8 },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer Ymir avant d'avoir complété les 3 ruines",
        consequence: "Quête de Ymir incomplète, boss Métyr inaccessible, lore perdu",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [],

    choices: [
      {
        description: "Choix Jolàn (après avoir vaincu Ymir)",
        options: [
          { choice: "Prendre l'Épée Nocturne", consequence: "Katana de Jolàn obtenu", reward: "Épée Nocturne (katana)" },
          { choice: "Prendre les Cendres d'invocation", consequence: "Jolàn invocable comme esprit", reward: "Cendres d'invocation Épéiste nocturne Jolàn" },
        ],
      },
    ],

    rewards: ["Talisman graine pourpre +1", "Talisman graine céruléenne +1", "Griffes de la Nuit", "Souvenir de la Mère des Doigts / Bâton de l'au-delà", "Set du Grand Prêtre", "Bâton maternel", "Sort Doigts Protecteurs", "Épée Nocturne OU Cendres Jolàn"],
  },

  {
    id: "moore",
    name: "Moore le Buveur de Broussailles",
    npc: "Moore",
    category: "dlc",
    zone: "Plaine sépulcrale - Devant Belurat",
    guide: "https://www.millenium.org/guide/414838.html",
    endingUnlocked: null,
    relatedQuests: ["leda", "thiollier"],

    steps: [
      {
        id: 1,
        description: "Rencontrer Moore devant Belurat",
        zone: "Plaine sépulcrale - Croix de la porte principale",
        detail: "Moore est un géant débonnaire, membre de la Nuée glaneuse (insectes pacifiques). Il est aussi marchand. À côté d'Ansbach.",
        prerequisite: null,
      },
      {
        id: 2,
        description: "Acheter la Note: Sources spirituelles scellées",
        zone: "Plaine sépulcrale - Croix de la porte principale",
        detail: "Coûte 1 000 runes. Débloque les dialogues de Moore. Recharger la zone (se reposer), puis lui reparler.",
        prerequisite: { type: "step", questId: "moore", stepId: 1 },
      },
      {
        id: 3,
        description: "Obtenir la Liqueur noire",
        zone: "Plaine sépulcrale - Croix de la porte principale",
        detail: "Moore donne la Liqueur noire à livrer à Thiollier (déclenche la quête de Thiollier).",
        prerequisite: { type: "step", questId: "moore", stepId: 2 },
      },
      {
        id: 4,
        description: "Collecter les Manuels de la Nuée glaneuse (1 à 6)",
        zone: "Royaume des Ombres - Divers emplacements",
        detail: "6 membres de la Nuée glaneuse sont disséminés dans le Royaume des Ombres. Parler à chacun pour obtenir un Manuel (recettes d'artisanat). Un des membres est blessé et a besoin d'une Pierre de chaleur solaire. Emplacements : marais empoisonné au nord des Ruines de Moorth, quartier religieux du Château noir, etc.",
        prerequisite: { type: "step", questId: "moore", stepId: 3 },
      },
      {
        id: 5,
        description: "Obtenir le 7e Manuel de la Nuée glaneuse",
        zone: "Plaine sépulcrale - Devant Belurat",
        detail: "Après avoir soigné le glaneur blessé et parlé aux 6 autres, retourner voir Moore. Il donne le 7e et dernier Manuel.",
        prerequisite: { type: "step", questId: "moore", stepId: 4 },
      },
      {
        id: 6,
        description: "Choix : « Tourner la page » ou « Rester triste »",
        zone: "Plaine sépulcrale - Devant Belurat",
        detail: "Après la brisure de la Grande Rune de Miquella, Moore a un choix existentiel. « Tourner la page » = Moore reste et apparaît comme ennemi à Enir-Ilim (3e invoqué). « Rester triste » = Moore et les glaneurs disparaissent. Collecter TOUS les manuels AVANT ce choix.",
        prerequisite: { type: "step", questId: "moore", stepId: 5 },
      },
      {
        id: 7,
        description: "Moore combat contre vous à Enir-Ilim (si « Tourner la page »)",
        zone: "Enir-Ilim - Antichambre de la salle de purification",
        detail: "Moore est le 3e ennemi invoqué dans le combat « Leda et ses alliés » (après Kérastien, avant Dane).",
        prerequisite: { type: "step", questId: "moore", stepId: 6 },
      },
    ],

    failConditions: [
      {
        trigger: "Tuer un membre de la Nuée glaneuse",
        consequence: "Moore vous envahit. S'il meurt, tous les glaneurs disparaissent et les manuels restants sont perdus.",
        severity: "permanent",
        fix: null,
      },
      {
        trigger: "Choisir « Rester triste » avant d'avoir tous les manuels",
        consequence: "Moore et les glaneurs disparaissent, manuels restants perdus définitivement",
        severity: "permanent",
        fix: null,
      },
    ],

    pointsOfNoReturn: [
      {
        event: "Choix « Tourner la page » / « Rester triste »",
        effect: "Détermine si Moore apparaît à Enir-Ilim ou disparaît. Collecter TOUS les manuels avant.",
      },
    ],

    choices: [
      {
        description: "Choix existentiel de Moore (après brisure de la Grande Rune)",
        options: [
          { choice: "Tourner la page", consequence: "Moore reste, apparaît comme ennemi à Enir-Ilim", reward: "Set Vert-de-gris (après combat Enir-Ilim)" },
          { choice: "Rester triste", consequence: "Moore et les glaneurs disparaissent définitivement", reward: "Set Vert-de-gris (corps au dernier emplacement)" },
        ],
      },
    ],

    rewards: ["7 Manuels de la Nuée glaneuse (recettes artisanat)", "Set Vert-de-gris (armure de Moore)", "Talisman Disque vert-de-gris", "Liqueur noire (pour Thiollier)"],
  },
];


// ============================================================
// POINTS DE NON-RETOUR GLOBAUX
// ============================================================

const globalPointsOfNoReturn = [
  {
    event: "Vaincre Radahn",
    affectedQuests: ["blaidd", "sellen"],
    warning: "Blaidd emprisonné par Iji. Jerren quitte le Château du Lion Rouge et se déplace vers l'Académie.",
  },
  {
    event: "Tuer Rykard",
    affectedQuests: ["volcano-manor", "rya", "bernahl", "patches", "jar-bairn-diallos"],
    warning: "TOUS les contrats d'assassinat restants échouent définitivement. Le Manoir se vide de ses PNJ.",
  },
  {
    event: "Brûler l'Arbre-Monde (Forge des Géants)",
    affectedQuests: ["corhyn-goldmask", "nepheli-kenneth"],
    warning: "Corhyn/Masque d'Or doivent être aux Cimes avec la Mende récupérée. Nepheli doit être sur le trône de Voilorage.",
  },
  {
    event: "Vaincre Maliketh",
    affectedQuests: ["corhyn-goldmask", "nepheli-kenneth", "coprophage"],
    warning: "Leyndell → Capitale Cendrée. Le Bolt of Gransax disparaît. Accès aux égouts modifié. Impossible de revenir aux emplacements de Leyndell.",
  },
  {
    event: "Accepter la Flamme Frénétique (Trois Doigts)",
    affectedQuests: ["ranni", "corhyn-goldmask", "fia", "coprophage"],
    warning: "Verrouille TOUTES les fins sauf Flamme Frénétique. Récupérable uniquement avec l'Aiguille de Miquella (quête Millicent, chemin or).",
  },
  {
    event: "Brûler l'Arbre Scellant (DLC)",
    affectedQuests: ["leda", "ansbach", "freyja", "kerastien", "thiollier", "moore", "dane"],
    warning: "PNJ du DLC dont les quêtes ne sont pas complétées disparaissent ou deviennent hostiles. Point de non-retour majeur du DLC.",
  },
];


// ============================================================
// HELPERS
// ============================================================

/**
 * Trouver une quête par son identifiant
 * @param {string} id - Identifiant de la quête (kebab-case)
 * @returns {object|undefined}
 */
quests.getQuestById = (id) => quests.find((q) => q.id === id);

/**
 * Filtrer les quêtes par catégorie
 * @param {"main"|"secondary"|"dlc"} cat - Catégorie
 * @returns {object[]}
 */
quests.getQuestsByCategory = (cat) => quests.filter((q) => q.category === cat);

/**
 * Trouver les quêtes liées à une fin spécifique
 * @param {string} ending - Nom de la fin (ex: "Âge des Étoiles")
 * @returns {object[]}
 */
quests.getQuestsForEnding = (ending) =>
  quests.filter((q) => q.endingUnlocked === ending);

/**
 * Obtenir toutes les quêtes liées à une quête donnée (résolution récursive 1 niveau)
 * @param {string} id - Identifiant de la quête
 * @returns {object[]}
 */
quests.getRelatedQuests = (id) => {
  const quest = quests.getQuestById(id);
  if (!quest) return [];
  return quest.relatedQuests
    .map((relId) => quests.getQuestById(relId))
    .filter(Boolean);
};

/**
 * Trouver les points de non-retour globaux affectant une quête
 * @param {string} questId - Identifiant de la quête
 * @returns {object[]}
 */
quests.getPointsOfNoReturnFor = (questId) =>
  globalPointsOfNoReturn.filter((p) => p.affectedQuests.includes(questId));

/**
 * Obtenir toutes les fail conditions de toutes les quêtes (vue globale)
 * @returns {Array<{questId: string, questName: string, ...failCondition}>}
 */
quests.getAllFailConditions = () =>
  quests.flatMap((q) =>
    q.failConditions.map((fc) => ({
      questId: q.id,
      questName: q.name,
      ...fc,
    }))
  );

quests.globalPointsOfNoReturn = globalPointsOfNoReturn;

module.exports = quests;

const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const config = require('./config');
const storage = require('./storage');
const llm = require('./llm');
const llmBettor = require('./llmBettor');
const features = require('./features');
const eldenRingTracker = require('./eldenRingTracker');
const erRoute = require('./erRoute');
const erQuests = require('./erQuests');
const { PHASE_TO_ROUTE } = require('./erConstants');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Message,
    Partials.Reaction,
  ],
});

const commands = [
  new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Définir ce salon comme salon de notifications'),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Afficher le classement des paris'),
  new SlashCommandBuilder()
    .setName('mystats')
    .setDescription('Afficher vos statistiques de paris'),
  new SlashCommandBuilder()
    .setName('give')
    .setDescription('[Admin] Donner des Runes à un utilisateur')
    .addUserOption((option) =>
      option
        .setName('utilisateur')
        .setDescription('L\'utilisateur Discord')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('montant')
        .setDescription('Montant de Runes à donner')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('[Admin] Lancer un tirage au sort')
    .addIntegerOption((option) =>
      option
        .setName('montant')
        .setDescription('Montant de Runes à gagner')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('duree')
        .setDescription('Durée en minutes')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('setbetwindow')
    .setDescription('[Admin] Définir la durée des paris')
    .addIntegerOption((option) =>
      option
        .setName('minutes')
        .setDescription('Durée en minutes (0 = désactivé)')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('setlinkedbetwindow')
    .setDescription('[Admin] Définir la durée des paris pour les joueurs liés')
    .addIntegerOption((option) =>
      option
        .setName('minutes')
        .setDescription('Durée en minutes (0 = pas de restriction)')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('setminbet')
    .setDescription('[Admin] Définir le montant minimum de pari')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('flat')
        .setDescription('Définir un minimum fixe')
        .addIntegerOption((option) =>
          option
            .setName('montant')
            .setDescription('Montant minimum en Runes (0 = désactivé)')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('percent')
        .setDescription('Définir un minimum en % du solde')
        .addIntegerOption((option) =>
          option
            .setName('pourcentage')
            .setDescription('Pourcentage du solde (0 = désactivé)')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('Afficher les paramètres actuels')
    ),
  new SlashCommandBuilder()
    .setName('setbetvisibility')
    .setDescription('[Admin] Afficher/masquer les montants dans le récap des paris')
    .addBooleanOption((option) =>
      option
        .setName('visible')
        .setDescription('Afficher les montants pariés')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('setgoldenoffer')
    .setDescription('[Admin] Configurer l\'Offre en Or')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('threshold')
        .setDescription('Définir le seuil minimum pour le bonus')
        .addIntegerOption((option) =>
          option
            .setName('montant')
            .setDescription('Montant minimum pour bénéficier du bonus')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('bonus')
        .setDescription('Définir le pourcentage de bonus')
        .addIntegerOption((option) =>
          option
            .setName('pourcentage')
            .setDescription('Bonus en % sur les gains')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('Afficher les paramètres actuels')
    ),
  new SlashCommandBuilder()
    .setName('info')
    .setDescription('Afficher les règles du système de paris'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Liste de toutes les commandes disponibles'),
  new SlashCommandBuilder()
    .setName('purge-user')
    .setDescription('[Admin] Supprimer toutes les données d\'un utilisateur (RGPD)')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('discord')
        .setDescription('Supprimer par ID Discord')
        .addUserOption((option) =>
          option
            .setName('utilisateur')
            .setDescription('L\'utilisateur Discord')
            .setRequired(true)
        )
    ),
  new SlashCommandBuilder()
    .setName('historique')
    .setDescription('[Admin] Voir l\'historique des transactions d\'un utilisateur')
    .addUserOption((option) =>
      option
        .setName('utilisateur')
        .setDescription('L\'utilisateur Discord (optionnel, vous par défaut)')
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName('limite')
        .setDescription('Nombre de transactions à afficher (défaut: 10)')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('ajuster')
    .setDescription('[Admin] Ajuster le solde d\'un utilisateur')
    .addUserOption((option) =>
      option
        .setName('utilisateur')
        .setDescription('L\'utilisateur Discord')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('montant')
        .setDescription('Montant à ajouter (négatif pour retirer)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('raison')
        .setDescription('Raison de l\'ajustement')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('llm-config')
    .setDescription('[Admin] Configurer le commentateur IA')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('mode')
        .setDescription('Définir le niveau de bavardage')
        .addStringOption((option) =>
          option
            .setName('niveau')
            .setDescription('Niveau de bavardage')
            .setRequired(true)
            .addChoices(
              { name: 'Minimal (mentions uniquement)', value: 'minimal' },
              { name: 'Normal (début/fin de partie)', value: 'normal' },
              { name: 'Bavard (+ paris, streaks)', value: 'bavard' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('context')
        .setDescription('Définir le niveau de contexte')
        .addStringOption((option) =>
          option
            .setName('niveau')
            .setDescription('Niveau de contexte')
            .setRequired(true)
            .addChoices(
              { name: 'Basique (infos partie)', value: 'basique' },
              { name: 'Enrichi (+ historique)', value: 'enrichi' },
              { name: 'Complet (+ mémoire)', value: 'complet' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('toggle')
        .setDescription('Activer/désactiver le commentateur')
        .addBooleanOption((option) =>
          option
            .setName('actif')
            .setDescription('Activer le commentateur')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('Afficher la configuration actuelle')
    ),
  new SlashCommandBuilder()
    .setName('llm-stats')
    .setDescription('Voir les stats du bot parieur'),
  new SlashCommandBuilder()
    .setName('feature')
    .setDescription('[Admin] Gérer les feature flags')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('Afficher l\'état de toutes les features')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('enable')
        .setDescription('Activer une feature')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Nom de la feature')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('disable')
        .setDescription('Désactiver une feature')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Nom de la feature')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),
  new SlashCommandBuilder()
    .setName('resetwallet')
    .setDescription('[Admin] Réinitialiser les portefeuilles')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('user')
        .setDescription('Réinitialiser le portefeuille d\'un utilisateur')
        .addUserOption((option) =>
          option
            .setName('utilisateur')
            .setDescription('L\'utilisateur Discord')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('mode')
            .setDescription('Mode de réinitialisation')
            .setRequired(true)
            .addChoices(
              { name: 'Solde de départ (5000 Runes)', value: 'depart' },
              { name: 'Zéro (0 Runes)', value: 'zero' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('all')
        .setDescription('Réinitialiser TOUS les portefeuilles')
        .addStringOption((option) =>
          option
            .setName('mode')
            .setDescription('Mode de réinitialisation')
            .setRequired(true)
            .addChoices(
              { name: 'Solde de départ (5000 Runes)', value: 'depart' },
              { name: 'Zéro (0 Runes)', value: 'zero' }
            )
        )
    ),
  new SlashCommandBuilder()
    .setName('pari')
    .setDescription('Créer un pari spontané')
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription('La question du pari (ex: Qui va gagner le 1v1 ?)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('options')
        .setDescription('Les options séparées par des virgules (ex: Alice, Bob, Charlie)')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('duree')
        .setDescription('Durée en minutes avant fermeture automatique (optionnel)')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('pari-fermer')
    .setDescription('Fermer les paris sur un pari spontané')
    .addStringOption((option) =>
      option
        .setName('id')
        .setDescription('ID du pari')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  new SlashCommandBuilder()
    .setName('pari-resoudre')
    .setDescription('Résoudre un pari spontané')
    .addStringOption((option) =>
      option
        .setName('id')
        .setDescription('ID du pari')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('gagnant')
        .setDescription('L\'option gagnante')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  new SlashCommandBuilder()
    .setName('pari-annuler')
    .setDescription('Annuler un pari spontané (rembourse tout le monde)')
    .addStringOption((option) =>
      option
        .setName('id')
        .setDescription('ID du pari')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('raison')
        .setDescription('Raison de l\'annulation')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('pari-liste')
    .setDescription('Voir les paris spontanés actifs'),
  new SlashCommandBuilder()
    .setName('setfirstbettor')
    .setDescription('[Admin] Configurer le bonus premier parieur')
    .addSubcommand((sub) =>
      sub.setName('percent')
        .setDescription('Définir le pourcentage du bonus/remboursement')
        .addIntegerOption((opt) =>
          opt.setName('pourcentage')
            .setDescription('Bonus/remboursement en %')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('linked')
        .setDescription('Autoriser le joueur lié à être premier parieur')
        .addBooleanOption((opt) =>
          opt.setName('autorise')
            .setDescription('true = le joueur lié peut être premier parieur')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('status')
        .setDescription('Afficher les paramètres actuels')
    ),
  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('[Admin] Afficher tous les paramètres de configuration'),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('[Admin] Configurer tous les paramètres du bot'),
  // Elden Ring
  new SlashCommandBuilder()
    .setName('er-setup')
    .setDescription('Configurer votre Watcher Elden Ring')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Action à effectuer')
        .setRequired(false)
        .addChoices(
          { name: 'Générer une clé API', value: 'generate' },
          { name: 'Réinitialiser la clé', value: 'reset' }
        )
    ),
  // Elden Ring Stats
  new SlashCommandBuilder()
    .setName('er-stats')
    .setDescription('Voir vos statistiques Elden Ring')
    .addUserOption(option =>
      option.setName('joueur')
        .setDescription('Voir les stats d\'un autre joueur')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('er-bosses')
    .setDescription('Liste des boss rencontrés dans Elden Ring')
    .addUserOption(option =>
      option.setName('joueur')
        .setDescription('Voir les boss d\'un autre joueur')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('er-leaderboard')
    .setDescription('Classement Elden Ring du serveur'),
  new SlashCommandBuilder()
    .setName('er-cycle')
    .setDescription('Configurer le nombre de tentatives par cycle de paris Elden Ring')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Definir le nombre de tentatives par cycle')
        .addIntegerOption(opt =>
          opt.setName('nombre')
            .setDescription('Nombre de tentatives (2-20)')
            .setRequired(true)
            .setMinValue(2)
            .setMaxValue(20)
        )
    )
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Afficher le nombre de tentatives actuel')
    ),
  new SlashCommandBuilder()
    .setName('er-reset')
    .setDescription('Reset ton historique de combats Elden Ring (fights, sessions, morts)'),
  new SlashCommandBuilder()
    .setName('er-route')
    .setDescription('Route optimisée des boss Elden Ring avec progression')
    .addUserOption(option =>
      option.setName('joueur')
        .setDescription('Voir la route d\'un autre joueur')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('er-add-kill')
    .setDescription('Ajouter manuellement un boss kill pour un joueur')
    .addUserOption(option =>
      option.setName('joueur')
        .setDescription('Le joueur à qui ajouter le kill')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('boss')
        .setDescription('Nom du boss')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
      option.setName('tentatives')
        .setDescription('Nombre de tentatives (morts avant le kill). Défaut: 1 (first try)')
        .setRequired(false)
        .setMinValue(1)
    ),
  new SlashCommandBuilder()
    .setName('er-remove-kill')
    .setDescription('Retirer un boss kill d\'un joueur')
    .addUserOption(option =>
      option.setName('joueur')
        .setDescription('Le joueur à qui retirer le kill')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('boss')
        .setDescription('Nom du boss')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  new SlashCommandBuilder()
    .setName('er-migrate-zones')
    .setDescription('Migrer tes boss kills dupliqués vers les bonnes zones'),
  new SlashCommandBuilder()
    .setName('er-nemesis')
    .setDescription('Top 10 des boss les plus meurtriers pour un joueur')
    .addUserOption(option =>
      option.setName('joueur')
        .setDescription('Voir les nemesis d\'un autre joueur')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('er-hall-of-fame')
    .setDescription('Hall of Fame Elden Ring — exploits notables du serveur'),
  new SlashCommandBuilder()
    .setName('quest')
    .setDescription('Quest Tracker Elden Ring')
    .addSubcommand(sub =>
      sub.setName('voir')
        .setDescription('Voir les détails d\'une quête')
        .addStringOption(option =>
          option.setName('quete')
            .setDescription('Nom de la quête')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('progression')
        .setDescription('Résumé de ta progression globale')
    )
    .addSubcommand(sub =>
      sub.setName('web')
        .setDescription('Obtenir ton lien personnel vers le quest tracker web')
    ),
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands.map((cmd) => cmd.toJSON()),
    });
    console.log('Slash commands registered successfully');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
}

function isAdmin(userId) {
  console.log('[DEBUG] isAdmin check:', { userId, adminUserId: config.adminUserId, match: userId === config.adminUserId });
  return userId === config.adminUserId;
}

async function handleSetChannel(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({ content: '❌ Commande réservée aux administrateurs', ephemeral: true });
  }

  storage.setNotificationChannelId(interaction.channelId);
  return interaction.reply({
    content: `✅ Les notifications seront envoyées dans ce salon`,
  });
}

async function handleLeaderboard(interaction) {
  const wealthLeaderboard = storage.getWealthLeaderboard().slice(0, 10);

  const description = wealthLeaderboard.length > 0
    ? wealthLeaderboard.map((entry, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
        return `${medal} <@${entry.odUserId}> - **${entry.balance.toLocaleString('fr-FR')} ${config.currency.symbol}**`;
      }).join('\n')
    : 'Aucune donnée disponible';

  const embed = new EmbedBuilder()
    .setTitle('💰 Classement Richesse')
    .setColor(0xffd700)
    .setDescription(description)
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}

async function handleMyStats(interaction) {
  const wallet = storage.ensureWallet(interaction.user.id);

  const wealthLeaderboard = storage.getWealthLeaderboard();
  const wealthRank = wealthLeaderboard.findIndex((e) => e.odUserId === interaction.user.id) + 1;

  const symbol = config.currency.symbol;
  let description = '';
  description += `💰 **Solde:** ${wallet.balance.toLocaleString('fr-FR')} ${symbol}\n`;
  description += `📈 **Total gagné:** ${wallet.totalWon.toLocaleString('fr-FR')} ${symbol}\n`;
  description += `📉 **Total perdu:** ${wallet.totalLost.toLocaleString('fr-FR')} ${symbol}\n`;
  description += `🏅 **Classement richesse:** #${wealthRank || 'N/A'}`;

  const embed = new EmbedBuilder()
    .setTitle(`📊 Stats de ${interaction.user.displayName}`)
    .setColor(wallet.balance >= 5000 ? 0x00ff00 : wallet.balance > 0 ? 0xffff00 : 0xff0000)
    .setThumbnail(interaction.user.displayAvatarURL())
    .setDescription(description)
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}

async function handleGive(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({ content: '❌ Commande réservée aux administrateurs', ephemeral: true });
  }

  const user = interaction.options.getUser('utilisateur');
  const amount = interaction.options.getInteger('montant');

  if (amount <= 0) {
    return interaction.reply({ content: '❌ Le montant doit être positif', ephemeral: true });
  }

  const newBalance = storage.addCoins(user.id, amount, 'ADMIN_ADJUST', {
    description: `Don admin par ${interaction.user.username}`,
    reason: 'Commande /give'
  });
  return interaction.reply({
    content: `✅ **${amount} Runes** donnés à **${user.username}**\nNouveau solde: **${newBalance} Runes**`
  });
}

async function handleGiveaway(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({ content: '❌ Commande réservée aux administrateurs', ephemeral: true });
  }

  if (!features.isEnabled('giveaways')) {
    return interaction.reply({ content: '❌ Les giveaways sont désactivés', ephemeral: true });
  }

  const amount = interaction.options.getInteger('montant');
  const duration = interaction.options.getInteger('duree');

  if (amount <= 0 || duration <= 0) {
    return interaction.reply({ content: '❌ Montant et durée doivent être positifs', ephemeral: true });
  }

  const endTime = Date.now() + duration * 60 * 1000;

  const embed = new EmbedBuilder()
    .setTitle('🎉 GIVEAWAY')
    .setColor(0xff69b4)
    .setDescription(`💰 **Prix:** ${amount} Runes\n⏱️ **Fin:** <t:${Math.floor(endTime / 1000)}:R>\n👥 **Participants:** 0\n\nCliquez 🎁 pour participer !`)
    .setTimestamp();

  const message = await interaction.reply({ embeds: [embed], fetchReply: true });
  await message.react('🎁');

  // Persist giveaway to storage
  storage.createGiveaway(message.id, message.channel.id, amount, endTime, []);

  startGiveawayCollector(message, amount, endTime);
}

function startGiveawayCollector(message, amount, endTime) {
  const remainingTime = endTime - Date.now();
  if (remainingTime <= 0) {
    // Giveaway already ended, finalize it
    finalizeGiveaway(message, amount);
    return;
  }

  const filter = (reaction, user) => reaction.emoji.name === '🎁' && !user.bot;
  const collector = message.createReactionCollector({
    filter,
    time: remainingTime,
  });

  collector.on('collect', (reaction, user) => {
    storage.addGiveawayParticipant(message.id, user.id);
    const participants = storage.getGiveawayParticipants(message.id);
    const giveaway = storage.getGiveaway(message.id);
    if (giveaway) {
      const updatedEmbed = EmbedBuilder.from(message.embeds[0])
        .setDescription(`💰 **Prix:** ${amount} Runes\n⏱️ **Fin:** <t:${Math.floor(giveaway.endTime / 1000)}:R>\n👥 **Participants:** ${participants.length}\n\nCliquez 🎁 pour participer !`);
      message.edit({ embeds: [updatedEmbed] }).catch(() => {});
    }
  });

  collector.on('end', async () => {
    await finalizeGiveaway(message, amount);
  });
}

async function finalizeGiveaway(message, amount) {
  const participants = storage.getGiveawayParticipants(message.id);
  storage.deleteGiveaway(message.id);

  if (participants.length === 0) {
    const noWinnerEmbed = new EmbedBuilder()
      .setTitle('🎉 GIVEAWAY TERMINÉ')
      .setColor(0x808080)
      .setDescription('Aucun participant 😢')
      .setTimestamp();
    await message.edit({ embeds: [noWinnerEmbed] }).catch(() => {});
    return;
  }

  const winnerId = participants[Math.floor(Math.random() * participants.length)];

  storage.addCoins(winnerId, amount, 'GIVEAWAY_WIN', {
    description: `Gagnant du giveaway - ${amount} Runes`,
    messageId: message.id
  });

  const winnerEmbed = new EmbedBuilder()
    .setTitle('🎉 GIVEAWAY TERMINÉ')
    .setColor(0x00ff00)
    .setDescription(`🏆 **Gagnant:** <@${winnerId}>\n💰 **Prix:** ${amount} Runes\n\nFélicitations !`)
    .setTimestamp();

  await message.edit({ embeds: [winnerEmbed] }).catch(() => {});

  // Send a separate message to ping the winner
  await message.channel.send(`🎉 Félicitations <@${winnerId}> ! Tu as gagné **${amount} Runes** dans le giveaway !`).catch(() => {});
}

async function handleSetBetWindow(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({ content: '❌ Commande réservée aux administrateurs', ephemeral: true });
  }

  const minutes = interaction.options.getInteger('minutes');

  if (minutes < 0) {
    return interaction.reply({ content: '❌ La durée ne peut pas être négative', ephemeral: true });
  }

  storage.setBetWindowMinutes(minutes);

  if (minutes === 0) {
    return interaction.reply({ content: '✅ Fenêtre de paris désactivée (paris ouverts jusqu\'à la fin des parties)' });
  }

  return interaction.reply({ content: `✅ Fenêtre de paris définie à **${minutes} minute(s)**` });
}

async function handleSetLinkedBetWindow(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({ content: '❌ Commande réservée aux administrateurs', ephemeral: true });
  }

  const minutes = interaction.options.getInteger('minutes');

  if (minutes < 0) {
    return interaction.reply({ content: '❌ La durée ne peut pas être négative', ephemeral: true });
  }

  storage.setLinkedPlayerBetWindowMinutes(minutes);

  if (minutes === 0) {
    return interaction.reply({ content: '✅ Restriction de paris pour joueurs liés désactivée' });
  }

  return interaction.reply({
    content: `✅ Fenêtre de paris pour joueurs liés définie à **${minutes} minute(s)**\n` +
      `ℹ️ Les joueurs qui parient sur leur propre partie ont ${minutes} min pour parier.`
  });
}

async function handleSetMinBet(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({ content: '❌ Commande réservée aux administrateurs', ephemeral: true });
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'flat') {
    const amount = interaction.options.getInteger('montant');
    if (amount < 0) {
      return interaction.reply({ content: '❌ Le montant ne peut pas être négatif', ephemeral: true });
    }
    storage.setMinBetFlat(amount);
    if (amount === 0) {
      return interaction.reply({ content: '✅ Minimum fixe désactivé' });
    }
    return interaction.reply({ content: `✅ Minimum fixe défini à **${amount} Runes**` });
  }

  if (subcommand === 'percent') {
    const percent = interaction.options.getInteger('pourcentage');
    if (percent < 0 || percent > 100) {
      return interaction.reply({ content: '❌ Le pourcentage doit être entre 0 et 100', ephemeral: true });
    }
    storage.setMinBetPercent(percent);
    if (percent === 0) {
      return interaction.reply({ content: '✅ Minimum en pourcentage désactivé' });
    }
    return interaction.reply({ content: `✅ Minimum défini à **${percent}%** du solde` });
  }

  if (subcommand === 'status') {
    const flat = storage.getMinBetFlat();
    const percent = storage.getMinBetPercent();
    let description = '**📊 Paramètres de mise minimum**\n\n';
    description += `💰 **Minimum fixe:** ${flat > 0 ? `${flat} Runes` : 'Désactivé'}\n`;
    description += `📈 **Minimum en %:** ${percent > 0 ? `${percent}% du solde` : 'Désactivé'}\n\n`;
    if (flat > 0 || percent > 0) {
      description += `_Le minimum effectif est le plus élevé des deux._`;
    }
    return interaction.reply({ content: description });
  }
}

async function handleSetBetVisibility(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({ content: '❌ Commande réservée aux administrateurs', ephemeral: true });
  }

  const visible = interaction.options.getBoolean('visible');
  storage.setShowBetAmounts(visible);

  if (visible) {
    return interaction.reply({ content: '✅ Les montants pariés seront **visibles** dans le récap' });
  }
  return interaction.reply({ content: '✅ Les montants pariés seront **masqués** dans le récap' });
}

async function handleSetGoldenOffer(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({ content: '❌ Commande réservée aux administrateurs', ephemeral: true });
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'threshold') {
    const amount = interaction.options.getInteger('montant');
    if (amount < 0) {
      return interaction.reply({ content: '❌ Le montant ne peut pas être négatif', ephemeral: true });
    }
    storage.setGoldenOfferThreshold(amount);
    return interaction.reply({ content: `✅ Seuil de l'Offre en Or défini à **${amount} Runes**` });
  }

  if (subcommand === 'bonus') {
    const percent = interaction.options.getInteger('pourcentage');
    if (percent < 0) {
      return interaction.reply({ content: '❌ Le pourcentage ne peut pas être négatif', ephemeral: true });
    }
    storage.setGoldenOfferBonus(percent);
    return interaction.reply({ content: `✅ Bonus de l'Offre en Or défini à **${percent}%**` });
  }

  if (subcommand === 'status') {
    const threshold = storage.getGoldenOfferThreshold();
    const bonus = storage.getGoldenOfferBonus();
    let description = '**🌟 Paramètres de l\'Offre en Or**\n\n';
    description += `💰 **Seuil minimum:** ${threshold} Runes\n`;
    description += `📈 **Bonus:** ${bonus}% sur les gains\n\n`;
    description += `_20% de chance d'apparition par partie._`;
    return interaction.reply({ content: description });
  }
}

async function handleInfo(interaction) {
  const betWindow = storage.getBetWindowMinutes();
  const betWindowText = betWindow > 0 ? `${betWindow} minute(s)` : 'Jusqu\'à la fin de la partie';

  const minBetFlat = storage.getMinBetFlat();
  const minBetPercent = storage.getMinBetPercent();
  let minBetText = 'Aucun';
  if (minBetFlat > 0 && minBetPercent > 0) {
    minBetText = `${minBetFlat} Runes ou ${minBetPercent}% du solde (le plus élevé)`;
  } else if (minBetFlat > 0) {
    minBetText = `${minBetFlat} Runes`;
  } else if (minBetPercent > 0) {
    minBetText = `${minBetPercent}% du solde`;
  }

  const embed = new EmbedBuilder()
    .setTitle('📖 SYSTÈME DE PARIS — RUNES')
    .setColor(0xffd700)
    .setDescription(`
**🪙 Économie**
• Monnaie: Runes
• Récompense par boss tué: ${config.bossKillReward} Runes
• Solde de départ: ${config.startingBalance} Runes

**🎲 Comment parier**
• Cliquez sur les boutons pour parier
• Entrez le montant souhaité dans la fenêtre
• Les paris ferment après ${betWindowText}
• Mise minimum: ${minBetText}

**📊 Système de cotes**
• Votre cote est **verrouillée** au moment du pari
• **Bonus minoritaire**: pariez contre la majorité pour de meilleures cotes

**💸 Calcul des gains**
• Gain = Mise × Cote verrouillée
• Exemple: 100 Runes à x3.5 = 350 Runes

**🌟 Offre en Or**
• 20% de chance par partie
• Misez ${storage.getGoldenOfferThreshold()}+ Runes pour +${storage.getGoldenOfferBonus()}% sur vos gains

_Tapez \`/help\` pour voir toutes les commandes_
    `)
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}

async function handleHelp(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📚 COMMANDES DISPONIBLES')
    .setColor(0x3498db)
    .setDescription(`
**👤 Compte & Stats**
• \`/mystats\` - Voir vos stats et solde
• \`/leaderboard\` - Classements (paris, richesse)

**🎲 Paris spontanés**
• \`/pari\` - Créer un pari spontané
• \`/pari-fermer\` - Fermer les paris
• \`/pari-resoudre\` - Déclarer le gagnant
• \`/pari-liste\` - Voir les paris actifs

**⚔️ Elden Ring**
• \`/er-setup\` - Configurer le watcher
• \`/er-stats\` - Voir vos stats Elden Ring
• \`/er-bosses\` - Liste des boss rencontrés
• \`/er-route\` - Route des boss
• \`/er-leaderboard\` - Classement Elden Ring
• \`/er-nemesis\` - Vos boss les plus meurtriers
• \`/er-hall-of-fame\` - Exploits notables
• \`/quest\` - Quest Tracker

**ℹ️ Informations**
• \`/info\` - Règles du système de paris
• \`/help\` - Cette liste de commandes

**🔧 Admin uniquement**
• \`/setchannel\` - Définir le salon de notifications
• \`/give <user> <montant>\` - Donner des Runes
• \`/giveaway <montant> <durée>\` - Lancer un tirage
• \`/setbetwindow <minutes>\` - Durée des paris
• \`/setminbet flat|percent <valeur>\` - Mise minimum
• \`/setbetvisibility <true|false>\` - Afficher montants
• \`/setgoldenoffer threshold|bonus <valeur>\` - Offre en Or
• \`/purge-user discord <user>\` - Supprimer données (RGPD)
• \`/historique [user]\` - Historique des transactions
• \`/ajuster <user> <montant> <raison>\` - Ajuster un solde
    `)
    .setFooter({ text: 'Utilisez /info pour les règles détaillées' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handlePurgeUser(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({ content: '❌ Commande réservée aux administrateurs', ephemeral: true });
  }

  const user = interaction.options.getUser('utilisateur');

  const result = storage.purgeUserDataByDiscordId(user.id);

  let summary = `🗑️ **Données supprimées pour ${user.username}** (${user.id})\n\n`;
  summary += `• Wallet: ${result.wallet ? '✅' : '❌'}\n`;
  summary += `• Participations giveaway: ${result.giveaways || 0}\n`;

  return interaction.reply({ content: summary, ephemeral: true });
}

async function handleHistorique(interaction) {
  const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
  const limit = interaction.options.getInteger('limite') || 10;

  // Si l'utilisateur demande l'historique de quelqu'un d'autre, il doit être admin
  if (targetUser.id !== interaction.user.id && !isAdmin(interaction.user.id)) {
    return interaction.reply({
      content: '❌ Seul un administrateur peut voir l\'historique d\'un autre utilisateur',
      ephemeral: true
    });
  }

  const transactions = storage.getTransactionHistory(targetUser.id, Math.min(limit, 25));

  if (transactions.length === 0) {
    return interaction.reply({
      content: `📜 Aucune transaction trouvée pour **${targetUser.username}**`,
      ephemeral: true
    });
  }

  const typeLabels = {
    'BET_PLACED': '🎲 Pari placé',
    'BET_REMOVED': '↩️ Pari annulé',
    'BET_WON': '✅ Pari gagné',
    'BET_LOST': '❌ Pari perdu',
    'BET_CANCELLED_REFUND': '⚠️ Pari annulé (remboursement)',
    'LINKED_REWARD': '🎁 Récompense joueur',
    'MISSION_BONUS': '🎯 Bonus mission',
    'SPIN_REWARD': '🎰 Roue de fortune',
    'ADMIN_ADJUST': '🔧 Ajustement admin',
    'ADMIN_RESET': '🔧 Reset wallet admin',
    'BET_CANCELLED': '⚠️ Pari annulé (système)',
    'GIVEAWAY_WIN': '🎉 Giveaway gagné',
    'FIRST_BETTOR_REFUND': '🥇 Remboursement premier parieur',
    'SPONTANEOUS_BET_PLACED': '🎲 Pari spontané placé',
    'SPONTANEOUS_BET_REMOVED': '↩️ Pari spontané annulé',
    'SPONTANEOUS_BET_WON': '✅ Pari spontané gagné',
    'SPONTANEOUS_BET_LOST': '❌ Pari spontané perdu',
    'SPONTANEOUS_BET_REFUND': '⚠️ Pari spontané remboursé',
    'TFT_BET_CANCELLED_REFUND': '⚠️ Pari TFT annulé (remboursement)',
  };

  let description = '';
  for (const txn of transactions) {
    const date = new Date(txn.timestamp);
    const dateStr = `<t:${Math.floor(date.getTime() / 1000)}:R>`;
    const typeLabel = typeLabels[txn.type] || txn.type;
    const amountStr = txn.amount >= 0 ? `+${txn.amount}` : `${txn.amount}`;
    const amountColor = txn.amount >= 0 ? '' : '';

    description += `${typeLabel}\n`;
    description += `└ **${amountStr} Runes** → Solde: ${txn.balance} Runes\n`;
    if (txn.description) {
      description += `└ _${txn.description}_\n`;
    }
    description += `└ ${dateStr}\n\n`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`📜 Historique de ${targetUser.username}`)
    .setColor(0x3498db)
    .setDescription(description)
    .setFooter({ text: `${transactions.length} transaction(s) affichée(s)` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAjuster(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({
      content: '❌ Commande réservée aux administrateurs',
      ephemeral: true
    });
  }

  const user = interaction.options.getUser('utilisateur');
  const amount = interaction.options.getInteger('montant');
  const reason = interaction.options.getString('raison');

  const result = storage.adminAdjustBalance(user.id, amount, reason);

  const amountStr = amount >= 0 ? `+${amount}` : `${amount}`;
  const embed = new EmbedBuilder()
    .setTitle('🔧 Ajustement de solde')
    .setColor(amount >= 0 ? 0x00ff00 : 0xff0000)
    .addFields(
      { name: 'Utilisateur', value: `<@${user.id}>`, inline: true },
      { name: 'Montant', value: `**${amountStr} Runes**`, inline: true },
      { name: 'Raison', value: reason, inline: false },
      { name: 'Ancien solde', value: `${result.previousBalance} Runes`, inline: true },
      { name: 'Nouveau solde', value: `${result.newBalance} Runes`, inline: true }
    )
    .setFooter({ text: `Par ${interaction.user.username}` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}

async function handleLlmConfig(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({
      content: '❌ Cette commande est réservée aux administrateurs.',
      ephemeral: true,
    });
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'mode') {
    const mode = interaction.options.getString('niveau');
    storage.setLlmMode(mode);
    const modeLabels = {
      minimal: 'Minimal (mentions uniquement)',
      normal: 'Normal (début/fin de partie)',
      bavard: 'Bavard (+ paris, streaks)',
    };
    return interaction.reply({
      content: `✅ Mode du commentateur défini sur: **${modeLabels[mode]}**`,
      ephemeral: true,
    });
  }

  if (subcommand === 'context') {
    const level = interaction.options.getString('niveau');
    storage.setLlmContextLevel(level);
    const levelLabels = {
      basique: 'Basique (infos partie)',
      enrichi: 'Enrichi (+ historique)',
      complet: 'Complet (+ mémoire)',
    };
    return interaction.reply({
      content: `✅ Niveau de contexte défini sur: **${levelLabels[level]}**`,
      ephemeral: true,
    });
  }

  if (subcommand === 'toggle') {
    const enabled = interaction.options.getBoolean('actif');
    storage.setLlmEnabled(enabled);
    return interaction.reply({
      content: enabled
        ? '✅ Commentateur IA **activé**'
        : '❌ Commentateur IA **désactivé**',
      ephemeral: true,
    });
  }

  if (subcommand === 'status') {
    const settings = storage.getLlmSettings();
    const ollamaStatus = await llm.checkOllamaHealth();
    const botStats = llmBettor.getBotStats();

    const modeLabels = {
      minimal: 'Minimal',
      normal: 'Normal',
      bavard: 'Bavard',
    };
    const contextLabels = {
      basique: 'Basique',
      enrichi: 'Enrichi',
      complet: 'Complet',
    };

    const embed = new EmbedBuilder()
      .setTitle('🤖 Configuration du Commentateur IA')
      .setColor(settings.enabled ? 0x00ff00 : 0xff0000)
      .addFields(
        { name: 'État', value: settings.enabled ? '✅ Activé' : '❌ Désactivé', inline: true },
        { name: 'Ollama', value: ollamaStatus ? '✅ Connecté' : '❌ Déconnecté', inline: true },
        { name: 'Modèle', value: config.llm.model, inline: true },
        { name: 'Mode', value: modeLabels[settings.mode] || 'Normal', inline: true },
        { name: 'Contexte', value: contextLabels[settings.contextLevel] || 'Complet', inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: '💰 Wallet Bot', value: `${botStats.balance} ${config.currency.symbol}`, inline: true },
        { name: '📊 Paris', value: `${botStats.totalWins}W / ${botStats.totalLosses}L`, inline: true },
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleLlmStats(interaction) {
  const botStats = llmBettor.getBotStats();

  const winrate = botStats.totalWins + botStats.totalLosses > 0
    ? Math.round((botStats.totalWins / (botStats.totalWins + botStats.totalLosses)) * 100)
    : 0;

  const embed = new EmbedBuilder()
    .setTitle('🤖 Stats du Bot Parieur')
    .setColor(0x9b59b6)
    .addFields(
      { name: '💰 Wallet', value: `${botStats.balance} ${config.currency.symbol}`, inline: true },
      { name: '📊 Winrate', value: `${winrate}%`, inline: true },
      { name: '📈 Total', value: `${botStats.totalWins}W / ${botStats.totalLosses}L`, inline: true },
    );

  return interaction.reply({ embeds: [embed] });
}

async function handleFeature(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({
      content: '❌ Cette commande est réservée aux administrateurs.',
      ephemeral: true,
    });
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'list') {
    const allFeatures = features.listAll();
    let description = '';
    const sourceIcons = { discord: '🔧', env: '🌍', default: '⚙️' };

    for (const [name, info] of Object.entries(allFeatures)) {
      const status = info.enabled ? '✅' : '❌';
      const sourceIcon = sourceIcons[info.source] || '⚙️';
      description += `${status} ${sourceIcon} \`${name}\`\n└ ${info.description}\n`;
    }

    description += '\n_🔧 Discord Admin | 🌍 Variable ENV | ⚙️ Par défaut_';

    const embed = new EmbedBuilder()
      .setTitle('📋 Feature Flags')
      .setDescription(description)
      .setColor(0x3498db)
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (subcommand === 'enable' || subcommand === 'disable') {
    const featureName = interaction.options.getString('name');
    const enabled = subcommand === 'enable';

    if (!features.FEATURES[featureName]) {
      return interaction.reply({
        content: `❌ Feature inconnue: \`${featureName}\``,
        ephemeral: true,
      });
    }

    const result = features.setEnabled(featureName, enabled);

    if (!result.success) {
      return interaction.reply({
        content: `❌ ${result.message}`,
        ephemeral: true,
      });
    }

    const status = enabled ? '✅ activée' : '❌ désactivée';
    return interaction.reply({
      content: `${enabled ? '✅' : '❌'} \`${featureName}\` ${status}`,
      ephemeral: true,
    });
  }
}

// ============================================
// FIRST BETTOR BONUS COMMAND
// ============================================

async function handleSetFirstBettor(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({
      content: '❌ Cette commande est réservée aux administrateurs.',
      ephemeral: true,
    });
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'percent') {
    const percent = interaction.options.getInteger('pourcentage');
    if (percent < 0 || percent > 100) {
      return interaction.reply({
        content: '❌ Le pourcentage doit être entre 0 et 100.',
        ephemeral: true,
      });
    }
    storage.setFirstBettorBonusPercent(percent);
    return interaction.reply({
      content: `✅ Bonus premier parieur défini à **${percent}%**`,
      ephemeral: true,
    });
  }

  if (subcommand === 'linked') {
    const autorise = interaction.options.getBoolean('autorise');
    storage.setFirstBettorLinkedPlayerEligible(autorise);
    return interaction.reply({
      content: autorise
        ? '✅ Les joueurs liés **peuvent** être premier parieur sur leur propre partie.'
        : '✅ Les joueurs liés **ne peuvent pas** être premier parieur sur leur propre partie.',
      ephemeral: true,
    });
  }

  if (subcommand === 'status') {
    const percent = storage.getFirstBettorBonusPercent();
    const linkedEligible = storage.getFirstBettorLinkedPlayerEligible();
    const featureEnabled = features.isEnabled('first_bettor_bonus');

    const embed = new EmbedBuilder()
      .setTitle('🎯 Bonus Premier Parieur')
      .setDescription([
        `**Feature flag:** ${featureEnabled ? '✅ Activé' : '❌ Désactivé'}`,
        `**Bonus/Remboursement:** ${percent}%`,
        `**Joueurs liés éligibles:** ${linkedEligible ? '✅ Oui' : '❌ Non'}`,
      ].join('\n'))
      .setColor(featureEnabled ? 0x2ecc71 : 0xe74c3c)
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

// ============================================
// CANCEL BET COMMAND
// ============================================

// ============================================
// SETTINGS COMMAND
// ============================================

async function handleSettings(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({
      content: '❌ Cette commande est réservée aux administrateurs.',
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('⚙️ Configuration du Bot')
    .setColor(0x3498db)
    .setTimestamp();

  // Section Paris
  const betWindow = storage.getBetWindowMinutes();
  const linkedBetWindow = storage.getLinkedPlayerBetWindowMinutes();
  const minBetFlat = storage.getMinBetFlat();
  const minBetPercent = storage.getMinBetPercent();
  const showBetAmounts = storage.getShowBetAmounts();

  let minBetText;
  if (minBetFlat > 0 && minBetPercent > 0) {
    minBetText = `${minBetFlat} ${config.currency.symbol} ou ${minBetPercent}% du wallet (le plus élevé)`;
  } else if (minBetFlat > 0) {
    minBetText = `${minBetFlat} ${config.currency.symbol}`;
  } else if (minBetPercent > 0) {
    minBetText = `${minBetPercent}% du wallet`;
  } else {
    minBetText = 'Aucun';
  }

  const bettingMode = storage.getBettingMode();
  const settingsModeLabel = bettingMode === 'pot' ? '🎰 Cagnotte (parimutuel pur)' : '📊 Cotes verrouillées';
  embed.addFields({
    name: '💰 Paris',
    value: [
      `Mode: **${settingsModeLabel}** — \`/setup\``,
      `Fenêtre de paris: **${betWindow > 0 ? betWindow + ' min' : 'Jusqu\'à fin de partie'}** — \`/setbetwindow\``,
      `Fenêtre joueurs liés: **${linkedBetWindow > 0 ? linkedBetWindow + ' min' : 'Jusqu\'à fin de partie'}** — \`/setlinkedbetwindow\``,
      `Mise minimum: **${minBetText}** — \`/setminbet\``,
      `Visibilité montants: **${showBetAmounts ? 'Oui' : 'Non'}** — \`/setbetvisibility\``,
    ].join('\n'),
    inline: false,
  });

  // Section Bonus
  const goldenThreshold = storage.getGoldenOfferThreshold();
  const goldenBonus = storage.getGoldenOfferBonus();
  const fbPercent = storage.getFirstBettorBonusPercent();
  const fbLinked = storage.getFirstBettorLinkedPlayerEligible();

  embed.addFields({
    name: '🎁 Bonus',
    value: [
      `Offre en Or: seuil **${goldenThreshold} ${config.currency.symbol}** / bonus **+${goldenBonus}%** — \`/setgoldenoffer\``,
      `Premier Parieur: **${fbPercent}%** / joueurs liés: **${fbLinked ? 'Oui' : 'Non'}** — \`/setfirstbettor\``,
    ].join('\n'),
    inline: false,
  });

  // Section Système
  embed.addFields({
    name: '🔧 Système',
    value: [
      `Solde de départ: **${storage.getStartingBalance()} ${config.currency.symbol}** — \`/setup\``,
      `Monnaie: **${config.currency.name}** (${config.currency.symbol})`,
    ].join('\n'),
    inline: false,
  });

  // Section LLM
  const llmSettings = storage.getLlmSettings();
  const llmEnabled = storage.isLlmEnabled();

  embed.addFields({
    name: '🤖 Commentateur IA',
    value: [
      `Statut: **${llmEnabled ? '✅ Activé' : '❌ Désactivé'}**`,
      `Mode: **${llmSettings.mode || 'normal'}**`,
      `Contexte: **${llmSettings.contextLevel || 'normal'}**`,
      `— \`/llm-config\``,
    ].join('\n'),
    inline: false,
  });

  // Section Feature Flags (résumé)
  const allFeatures = features.listAll();
  const sourceIcons = { discord: '🔧', env: '🌍', default: '⚙️' };
  const flagLines = Object.entries(allFeatures).map(([name, info]) => {
    const status = info.enabled ? '✅' : '❌';
    const icon = sourceIcons[info.source] || '⚙️';
    return `${status}${icon} \`${name}\``;
  });

  embed.addFields({
    name: '🚩 Feature Flags',
    value: flagLines.join('\n') + '\n\n_Détails: `/feature list`_',
    inline: false,
  });

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

// ============================================
// SETUP COMMAND
// ============================================

function buildSetupEmbed() {
  const cs = config.currency.symbol;
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Configuration Setup')
    .setColor(0x3498db)
    .setTimestamp();

  // Cotes
  embed.addFields({
    name: '📊 Cotes',
    value: [
      `Seed Pool: **${storage.getSeedPool()} ${cs}**`,
      `Marge bookmaker: **${storage.getBookmakerMarginPercent()}%**`,
      `Bonus minoritaire max: **${storage.getMaxMinorityBonusPercent()}%**`,
      `Bonus streak: **${storage.getStreakBonusPercent()}%** (seuil: ${storage.getStreakThreshold()} parties)`,
      `Winrate défaut: **${storage.getDefaultWinratePercent()}%**`,
    ].join('\n'),
    inline: false,
  });

  // Paris
  const betWindow = storage.getBetWindowMinutes();
  const linkedBetWindow = storage.getLinkedPlayerBetWindowMinutes();
  const bettingMode = storage.getBettingMode();
  const modeLabel = bettingMode === 'pot' ? '🎰 Cagnotte (parimutuel pur)' : '📊 Cotes verrouillées';
  embed.addFields({
    name: '🎰 Paris',
    value: [
      `Mode: **${modeLabel}**`,
      `Fenêtre: **${betWindow > 0 ? betWindow + ' min' : "Jusqu'à fin de partie"}**`,
      `Fenêtre joueurs liés: **${linkedBetWindow > 0 ? linkedBetWindow + ' min' : "Jusqu'à fin de partie"}**`,
      `Mise min fixe: **${storage.getMinBetFlat()} ${cs}**`,
      `Mise min %: **${storage.getMinBetPercent()}%**`,
      `Visibilité montants: **${storage.getShowBetAmounts() ? 'Oui' : 'Non'}**`,
    ].join('\n'),
    inline: false,
  });

  // Bonus
  embed.addFields({
    name: '🌟 Bonus',
    value: [
      `Offre en Or: seuil **${storage.getGoldenOfferThreshold()} ${cs}** / bonus **+${storage.getGoldenOfferBonus()}%**`,
      `Premier Parieur: **${storage.getFirstBettorBonusPercent()}%** / joueurs liés: **${storage.getFirstBettorLinkedPlayerEligible() ? 'Oui' : 'Non'}**`,
      `Solo bet: **+${storage.getSoloBetBonusPercent()}%**`,
    ].join('\n'),
    inline: false,
  });

  // Récompenses
  embed.addFields({
    name: '💰 Récompenses',
    value: [
      `Solde initial: **${storage.getStartingBalance()} ${cs}**`,
      `Récompense par partie: **${storage.getPlayerBaseReward()} ${cs}**`,
      `Part joueur sur pertes: **${storage.getPlayerCutPercent()}%**`,
    ].join('\n'),
    inline: false,
  });

  // Missions
  const dailyPrizes = storage.getDailyWheelPrizes().join(', ');
  const weeklyPrizes = storage.getWeeklyWheelPrizes().join(', ');
  embed.addFields({
    name: '🎯 Missions',
    value: [
      `Daily: **${storage.getDailyGamesRequired()} parties** | Prix: **${dailyPrizes} ${cs}**`,
      `Weekly: **${storage.getWeeklyGamesRequired()} parties** | Prix: **${weeklyPrizes} ${cs}**`,
      `Bonus chance weekly: **${storage.getWeeklyBonusChance()}%**`,
    ].join('\n'),
    inline: false,
  });

  // Boutons
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_cotes').setLabel('📊 Cotes').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_paris').setLabel('🎰 Paris').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_bonus').setLabel('🌟 Bonus').setStyle(ButtonStyle.Primary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_recompenses').setLabel('💰 Récompenses').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_missions').setLabel('🎯 Missions').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_mode').setLabel('🎰 Mode').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_reset').setLabel('🔄 Reset').setStyle(ButtonStyle.Danger),
  );

  return { embed, rows: [row1, row2] };
}

async function handleSetup(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({
      content: '❌ Cette commande est réservée aux administrateurs.',
      ephemeral: true,
    });
  }

  const { embed, rows } = buildSetupEmbed();
  return interaction.reply({
    embeds: [embed],
    components: rows,
    ephemeral: true,
  });
}

// ============================================
// RESET WALLET COMMAND
// ============================================

async function handleResetWallet(interaction) {
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({
      content: '❌ Cette commande est réservée aux administrateurs.',
      ephemeral: true,
    });
  }

  const subcommand = interaction.options.getSubcommand();
  const mode = interaction.options.getString('mode');
  const toZero = mode === 'zero';

  if (subcommand === 'user') {
    const targetUser = interaction.options.getUser('utilisateur');

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`resetwallet_confirm_${targetUser.id}_${toZero ? 'zero' : 'depart'}`)
        .setLabel('Confirmer')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('resetwallet_cancel')
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      content: `⚠️ Êtes-vous sûr de vouloir réinitialiser le portefeuille de **${targetUser.username}** à **${toZero ? '0 Runes' : config.startingBalance + ' Runes'}** ?`,
      components: [confirmRow],
      ephemeral: true,
    });
  }

  if (subcommand === 'all') {
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`resetwallet_confirm_all_${toZero ? 'zero' : 'depart'}`)
        .setLabel('Confirmer')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('resetwallet_cancel')
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      content: `⚠️ **ATTENTION** ⚠️\n\nÊtes-vous sûr de vouloir réinitialiser **TOUS** les portefeuilles à **${toZero ? '0 Runes' : config.startingBalance + ' Runes'}** ?\n\nCette action est irréversible !`,
      components: [confirmRow],
      ephemeral: true,
    });
  }
}

// ============================================
// PARIS SPONTANÉS COMMANDS
// ============================================

async function handlePariCreate(interaction) {
  if (!features.isEnabled('spontaneous_bets')) {
    return interaction.reply({
      content: '❌ Les paris spontanés sont désactivés.',
      ephemeral: true,
    });
  }

  const question = interaction.options.getString('question');
  const optionsRaw = interaction.options.getString('options');
  const duree = interaction.options.getInteger('duree');

  // Parser les options
  const options = optionsRaw.split(',').map(o => o.trim()).filter(o => o.length > 0);

  if (options.length < 2) {
    return interaction.reply({
      content: '❌ Vous devez fournir au moins 2 options séparées par des virgules.',
      ephemeral: true,
    });
  }

  // Vérifier les doublons
  const uniqueOptions = [...new Set(options.map(o => o.toLowerCase()))];
  if (uniqueOptions.length !== options.length) {
    return interaction.reply({
      content: '❌ Les options doivent être uniques.',
      ephemeral: true,
    });
  }

  // Calculer la date de fin si durée spécifiée
  let endsAt = null;
  if (duree && duree > 0) {
    endsAt = new Date(Date.now() + duree * 60 * 1000).toISOString();
  }

  // Créer le pari
  const bet = storage.createSpontaneousBet(
    interaction.user.id,
    interaction.channelId,
    question,
    options,
    endsAt
  );

  // Créer l'embed
  const embed = new EmbedBuilder()
    .setTitle('🎲 Pari Spontané')
    .setDescription(`**${question}**`)
    .setColor(0x9b59b6)
    .addFields(
      { name: '📋 Options', value: bet.options.map((o, i) => `${i + 1}. ${o.label}`).join('\n'), inline: false },
      { name: '📊 État des paris', value: 'Aucun pari pour le moment', inline: false }
    )
    .setFooter({ text: `ID: ${bet.id} • Créé par ${interaction.user.username}` })
    .setTimestamp();

  if (endsAt) {
    embed.addFields({ name: '⏰ Fermeture', value: `<t:${Math.floor(new Date(endsAt).getTime() / 1000)}:R>`, inline: true });
  }

  // Créer les boutons de pari
  const rows = [];
  let currentRow = new ActionRowBuilder();
  let buttonCount = 0;

  for (const option of bet.options) {
    if (buttonCount >= 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
      buttonCount = 0;
    }

    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`spbet_${bet.id}_${option.id}`)
        .setLabel(option.label.substring(0, 80))
        .setStyle(ButtonStyle.Primary)
    );
    buttonCount++;
  }

  // Ajouter bouton annuler son pari
  if (buttonCount >= 5) {
    rows.push(currentRow);
    currentRow = new ActionRowBuilder();
  }
  currentRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`spbet_cancel_${bet.id}`)
      .setLabel('Annuler mon pari')
      .setStyle(ButtonStyle.Secondary)
  );
  rows.push(currentRow);

  const message = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });
  storage.updateSpontaneousBetMessageId(bet.id, message.id);
}

async function handlePariFermer(interaction) {
  const betId = interaction.options.getString('id');
  const bet = storage.getSpontaneousBet(betId);

  if (!bet) {
    return interaction.reply({
      content: '❌ Pari introuvable.',
      ephemeral: true,
    });
  }

  // Vérifier les permissions (créateur ou admin)
  if (bet.creatorId !== interaction.user.id && !isAdmin(interaction.user.id)) {
    return interaction.reply({
      content: '❌ Seul le créateur du pari ou un admin peut fermer les paris.',
      ephemeral: true,
    });
  }

  if (bet.status !== 'open') {
    return interaction.reply({
      content: '❌ Les paris sont déjà fermés.',
      ephemeral: true,
    });
  }

  storage.closeSpontaneousBets(betId);
  const updatedBet = storage.getSpontaneousBet(betId);

  // Mettre à jour le message
  await updateSpontaneousBetMessage(updatedBet);

  return interaction.reply({
    content: `✅ Les paris sont maintenant fermés pour "${bet.question}"`,
  });
}

async function handlePariResoudre(interaction) {
  const betId = interaction.options.getString('id');
  const gagnantId = interaction.options.getString('gagnant');
  const bet = storage.getSpontaneousBet(betId);

  if (!bet) {
    return interaction.reply({
      content: '❌ Pari introuvable.',
      ephemeral: true,
    });
  }

  // Vérifier les permissions (créateur ou admin)
  if (bet.creatorId !== interaction.user.id && !isAdmin(interaction.user.id)) {
    return interaction.reply({
      content: '❌ Seul le créateur du pari ou un admin peut résoudre le pari.',
      ephemeral: true,
    });
  }

  if (bet.status === 'resolved') {
    return interaction.reply({
      content: '❌ Ce pari a déjà été résolu.',
      ephemeral: true,
    });
  }

  if (bet.status === 'cancelled') {
    return interaction.reply({
      content: '❌ Ce pari a été annulé.',
      ephemeral: true,
    });
  }

  const result = storage.resolveSpontaneousBet(betId, gagnantId);

  if (!result.success) {
    return interaction.reply({
      content: `❌ ${result.message}`,
      ephemeral: true,
    });
  }

  // Mettre à jour le message
  const updatedBet = storage.getSpontaneousBet(betId);
  await updateSpontaneousBetMessage(updatedBet);

  // Créer l'embed de résultat
  const embed = new EmbedBuilder()
    .setTitle('🏆 Pari Résolu !')
    .setDescription(`**${bet.question}**\n\n✅ Gagnant : **${result.winningOption}**`)
    .setColor(0x2ecc71)
    .setTimestamp();

  if (result.winners.length > 0) {
    const winnersText = result.winners.map(w => {
      let text = `<@${w.odUserId}>: +${w.profit} Runes`;
      if (w.firstBettorBonus) text += ` 🎯 +${w.firstBettorBonus} 1er`;
      return text;
    }).join('\n');
    embed.addFields({ name: `🎉 Gagnants (${result.winners.length})`, value: winnersText, inline: false });
  }

  if (result.losers.length > 0) {
    const losersText = result.losers.map(l => {
      if (l.firstBettorRefund) {
        return `<@${l.odUserId}>: -${l.loss - l.firstBettorRefund} Runes (🎯 +${l.firstBettorRefund} remboursé)`;
      }
      return `<@${l.odUserId}>: -${l.loss} Runes`;
    }).join('\n');
    embed.addFields({ name: `💸 Perdants (${result.losers.length})`, value: losersText, inline: false });
  }

  embed.addFields({ name: '💰 Pool total', value: `${result.totalPool} Runes`, inline: true });

  return interaction.reply({ embeds: [embed] });
}

async function handlePariAnnuler(interaction) {
  const betId = interaction.options.getString('id');
  const raison = interaction.options.getString('raison');
  const bet = storage.getSpontaneousBet(betId);

  if (!bet) {
    return interaction.reply({
      content: '❌ Pari introuvable.',
      ephemeral: true,
    });
  }

  // Seul l'admin peut annuler
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({
      content: '❌ Seul un admin peut annuler un pari.',
      ephemeral: true,
    });
  }

  if (bet.status === 'resolved') {
    return interaction.reply({
      content: '❌ Ce pari a déjà été résolu, impossible de l\'annuler.',
      ephemeral: true,
    });
  }

  const result = storage.cancelSpontaneousBet(betId, raison);

  if (!result.success) {
    return interaction.reply({
      content: `❌ ${result.message}`,
      ephemeral: true,
    });
  }

  // Mettre à jour le message
  const updatedBet = storage.getSpontaneousBet(betId);
  await updateSpontaneousBetMessage(updatedBet);

  return interaction.reply({
    content: `✅ Pari annulé. ${result.refundCount} parieur(s) remboursé(s).${raison ? `\nRaison : ${raison}` : ''}`,
  });
}

async function handlePariListe(interaction) {
  const activeBets = storage.getActiveSpontaneousBets();

  if (activeBets.length === 0) {
    return interaction.reply({
      content: '📋 Aucun pari spontané actif.',
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('🎲 Paris Spontanés Actifs')
    .setColor(0x9b59b6)
    .setTimestamp();

  for (const bet of activeBets.slice(0, 10)) {
    const oddsInfo = storage.calculateSpontaneousOdds(bet.id);
    const totalPool = oddsInfo?.totalPool || 0;
    const optionsText = bet.options.map(o => o.label).join(' | ');

    let value = `Options: ${optionsText}\nPool: ${totalPool} Runes`;
    if (bet.endsAt) {
      value += `\nFermeture: <t:${Math.floor(new Date(bet.endsAt).getTime() / 1000)}:R>`;
    }

    embed.addFields({
      name: `${bet.question}`,
      value: `\`${bet.id}\`\n${value}`,
      inline: false
    });
  }

  if (activeBets.length > 10) {
    embed.setFooter({ text: `Et ${activeBets.length - 10} autres...` });
  }

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function updateSpontaneousBetMessage(bet) {
  try {
    const channel = await client.channels.fetch(bet.channelId);
    if (!channel || !bet.messageId) return;

    const message = await channel.messages.fetch(bet.messageId);
    if (!message) return;

    const embed = EmbedBuilder.from(message.embeds[0]);
    const oddsInfo = storage.calculateSpontaneousOdds(bet.id);

    // Mettre à jour le statut
    let statusText = '';
    if (bet.status === 'resolved') {
      const winningOption = bet.options.find(o => o.id === bet.winningOptionId);
      statusText = `\n\n✅ **Résolu** - Gagnant : ${winningOption?.label || 'N/A'}`;
      embed.setColor(0x2ecc71);
    } else if (bet.status === 'cancelled') {
      statusText = `\n\n❌ **Annulé**${bet.cancelReason ? ` - ${bet.cancelReason}` : ''}`;
      embed.setColor(0xe74c3c);
    } else if (bet.status === 'closed') {
      statusText = '\n\n🔒 **Paris fermés** - En attente de résolution';
      embed.setColor(0xf39c12);
    }

    embed.setDescription(`**${bet.question}**${statusText}`);

    // Mettre à jour les cotes
    if (oddsInfo) {
      let oddsText = '';
      for (const option of bet.options) {
        const info = oddsInfo.odds[option.id];
        oddsText += `**${option.label}**: ${info.count} pari(s) • ${info.total} Runes • x${info.odds.toFixed(2)}\n`;
      }
      oddsText += `\n💰 Pool total: ${oddsInfo.totalPool} Runes`;

      const fields = embed.data.fields || [];
      const oddsFieldIndex = fields.findIndex(f => f.name === '📊 État des paris');
      if (oddsFieldIndex >= 0) {
        fields[oddsFieldIndex].value = oddsText;
      }
      embed.setFields(fields);
    }

    // Désactiver les boutons si fermé/résolu/annulé
    const components = bet.status === 'open' ? message.components : [];

    await message.edit({ embeds: [embed], components });
  } catch (e) {
    console.warn('Could not update spontaneous bet message:', e.message);
  }
}

function formatOddsField(oddsInfo, isTft = false) {
  if (!oddsInfo) return null;

  const winLabel = isTft ? 'Top 4' : 'Victoire';
  const loseLabel = isTft ? 'Bottom 4' : 'Défaite';
  const winEmoji = isTft ? '🏆' : '🟢';
  const loseEmoji = isTft ? '💀' : '🔴';

  // Mode cagnotte
  if (oddsInfo.mode === 'pot') {
    let text = '🎰 **Mode Cagnotte** — Les cotes varient jusqu\'à la fin de la partie\n\n';

    if (oddsInfo.win.count > 0) {
      text += `${winEmoji} ${winLabel}: ${oddsInfo.win.count} pari${oddsInfo.win.count > 1 ? 's' : ''} • ${oddsInfo.win.total} Runes\n`;
    } else {
      text += `${winEmoji} ${winLabel}: aucun pari\n`;
    }

    if (oddsInfo.lose.count > 0) {
      text += `${loseEmoji} ${loseLabel}: ${oddsInfo.lose.count} pari${oddsInfo.lose.count > 1 ? 's' : ''} • ${oddsInfo.lose.total} Runes\n`;
    } else {
      text += `${loseEmoji} ${loseLabel}: aucun pari\n`;
    }

    text += `\n💰 Pool total: ${oddsInfo.totalPool} Runes`;
    return text;
  }

  // Mode odds classique
  let text = '';

  // Affiche les infos du joueur (winrate et streak)
  if (oddsInfo.winrate !== undefined) {
    text += `📈 Winrate: ${oddsInfo.winrate}%`;
    if (oddsInfo.streak && oddsInfo.streak.count >= 2) {
      const streakEmoji = oddsInfo.streak.type === 'win' ? '🔥' : '❄️';
      const streakLabel = oddsInfo.streak.type === 'win' ? 'victoires' : 'défaites';
      text += ` • ${streakEmoji} Série: ${oddsInfo.streak.count} ${streakLabel}`;
    }
    text += '\n\n';
  }

  // Affiche les bonus actifs
  const bonuses = [];
  if (oddsInfo.minorityBonus) {
    if (oddsInfo.minorityBonus.winBonus > 0) {
      bonuses.push(`+${Math.round(oddsInfo.minorityBonus.winBonus * 100)}% ${winLabel}`);
    }
    if (oddsInfo.minorityBonus.loseBonus > 0) {
      bonuses.push(`+${Math.round(oddsInfo.minorityBonus.loseBonus * 100)}% ${loseLabel}`);
    }
  }
  if (oddsInfo.streakBonus) {
    if (oddsInfo.streakBonus.winBonus > 0) {
      bonuses.push(`+${Math.round(oddsInfo.streakBonus.winBonus * 100)}% ${winLabel} (streak)`);
    }
    if (oddsInfo.streakBonus.loseBonus > 0) {
      bonuses.push(`+${Math.round(oddsInfo.streakBonus.loseBonus * 100)}% ${loseLabel} (streak)`);
    }
  }
  if (bonuses.length > 0) {
    text += `🎁 Bonus: ${bonuses.join(' • ')}\n\n`;
  }

  // Affiche les paris
  if (oddsInfo.win.count > 0) {
    text += `${winEmoji} ${winLabel}: ${oddsInfo.win.count} pari${oddsInfo.win.count > 1 ? 's' : ''} • ${oddsInfo.win.total} Runes • **x${oddsInfo.win.odds.toFixed(2)}**\n`;
  } else {
    text += `${winEmoji} ${winLabel}: aucun pari • **x${oddsInfo.win.odds.toFixed(2)}**\n`;
  }

  if (oddsInfo.lose.count > 0) {
    text += `${loseEmoji} ${loseLabel}: ${oddsInfo.lose.count} pari${oddsInfo.lose.count > 1 ? 's' : ''} • ${oddsInfo.lose.total} Runes • **x${oddsInfo.lose.odds.toFixed(2)}**`;
  } else {
    text += `${loseEmoji} ${loseLabel}: aucun pari • **x${oddsInfo.lose.odds.toFixed(2)}**`;
  }

  return text;
}

async function updateBetEmbed(messageId, channelId, oddsInfo, isTft = false) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return;

    const message = await channel.messages.fetch(messageId);
    if (!message || message.embeds.length === 0) return;

    const embed = EmbedBuilder.from(message.embeds[0]);

    // Remove existing odds field if present
    const existingFields = embed.data.fields || [];
    const filteredFields = existingFields.filter(f => f.name !== '📊 État des paris');
    embed.setFields(filteredFields);

    // Add updated odds field
    const oddsText = formatOddsField(oddsInfo, isTft);
    if (oddsText) {
      embed.addFields({ name: '📊 État des paris', value: oddsText, inline: false });
    }

    await message.edit({ embeds: [embed] });
  } catch (e) {
    console.warn('Could not update bet embed:', e.message);
  }
}

// Elden Ring setup command handler
async function handleErSetup(interaction) {
  const action = interaction.options.getString('action') || 'generate';

  if (action === 'generate') {
    // Check if user already has a key
    const existing = storage.getEldenRingApiKey(interaction.user.id);
    if (existing) {
      return interaction.reply({
        content: '⚠️ Vous avez déjà une clé API. Utilisez `/er-setup action:Réinitialiser la clé` pour en générer une nouvelle.',
        ephemeral: true,
      });
    }

    const apiKey = eldenRingTracker.generateApiKey();
    storage.setEldenRingApiKey(interaction.user.id, {
      key: apiKey,
      created_at: new Date().toISOString(),
    });

    const keyMessage = `🎮 **Elden Ring Watcher — Clé API**\n\nVotre clé API: \`${apiKey}\`\n\nCollez-la dans votre fichier de config Watcher:\n\`~/.elden-watcher/config.toml\`\n\n\`\`\`toml\napi_key = "${apiKey}"\n\`\`\`\n\n⚠️ Ne partagez jamais cette clé.`;

    try {
      await interaction.user.send(keyMessage);
      await interaction.reply({
        content: '✓ Clé API générée et envoyée par DM ! Vérifiez vos messages privés.',
        ephemeral: true,
      });
    } catch (dmError) {
      // DMs disabled — show in ephemeral reply instead
      await interaction.reply({
        content: keyMessage + '\n\n*(Envoyé ici car vos DMs sont désactivés)*',
        ephemeral: true,
      });
    }
  } else if (action === 'reset') {
    const existing = storage.getEldenRingApiKey(interaction.user.id);
    if (!existing) {
      return interaction.reply({
        content: '❌ Aucune clé API trouvée. Utilisez `/er-setup` pour en générer une.',
        ephemeral: true,
      });
    }

    const apiKey = eldenRingTracker.generateApiKey();
    storage.setEldenRingApiKey(interaction.user.id, {
      key: apiKey,
      created_at: new Date().toISOString(),
    });

    const keyMessage = `🔄 **Elden Ring Watcher — Nouvelle Clé API**\n\nVotre nouvelle clé: \`${apiKey}\`\n\nL'ancienne clé est immédiatement invalidée.\n\nMettez à jour votre config Watcher:\n\`~/.elden-watcher/config.toml\`\n\n\`\`\`toml\napi_key = "${apiKey}"\n\`\`\``;

    try {
      await interaction.user.send(keyMessage);
      await interaction.reply({
        content: '✓ Clé API réinitialisée et envoyée par DM. L\'ancienne clé est invalidée.',
        ephemeral: true,
      });
    } catch (dmError) {
      await interaction.reply({
        content: keyMessage + '\n\n*(Envoyé ici car vos DMs sont désactivés)*',
        ephemeral: true,
      });
    }
  }
}

// --- Elden Ring Stats Helpers ---

function formatErDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '0m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const BOSSES_PER_PAGE = 10;
const TOTAL_ER_BOSSES = erRoute.length;

async function handleErStats(interaction) {
  const targetUser = interaction.options.getUser('joueur') || interaction.user;
  const stats = storage.getEldenRingPlayerStats(targetUser.id);

  if (!stats) {
    return interaction.reply({
      content: `❌ Aucune donnée Elden Ring pour ${targetUser.id === interaction.user.id ? 'vous' : targetUser.displayName}.`,
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0xC8A200)
    .setTitle(`⚔️ Stats Elden Ring — ${targetUser.displayName}`)
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      { name: '🏆 Boss vaincus', value: `${stats.bossesDefeated}/${TOTAL_ER_BOSSES}`, inline: true },
      { name: '⚔️ Éliminations', value: String(stats.totalKills), inline: true },
      { name: '💀 Morts totales', value: String(stats.totalAllDeaths), inline: true },
      { name: '💀 Morts boss', value: String(stats.totalDeaths), inline: true },
      { name: '💀 Morts hors-boss', value: String(stats.globalDeaths), inline: true },
      { name: '🎮 Temps de jeu', value: formatErDuration(stats.totalSessionTime), inline: true },
      { name: '⚔️ Temps en combat', value: formatErDuration(stats.totalFightTime), inline: true },
      { name: '👹 Boss rencontrés', value: String(stats.bossesEncountered), inline: true },
      { name: '🎯 First Try', value: String(stats.firstTryCount), inline: true },
    );

  // Recent Activity: last fight per boss, sorted by most recent
  const recentFights = [];
  for (const boss of stats.bosses) {
    if (boss.lastFight) {
      recentFights.push({
        bossName: boss.bossName,
        outcome: boss.lastFight.outcome,
        attempt_number: boss.lastFight.attempt_number,
        timestamp: boss.lastFight.timestamp,
      });
    }
  }
  recentFights.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const recent = recentFights.slice(0, 5);

  if (recent.length > 0) {
    const recentText = recent.map(f =>
      `${f.outcome === 'kill' ? '✅' : '❌'} **${formatBossName(f.bossName)}** — Tentative #${f.attempt_number}`
    ).join('\n');
    embed.addFields({ name: '📋 Activité récente', value: recentText });
  }

  embed.setFooter({ text: 'Elden Ring — Suivi de Boss' });
  embed.setTimestamp();

  return interaction.reply({ embeds: [embed] });
}

async function handleErBosses(interaction, page = 0, isUpdate = false) {
  let targetUser;
  if (isUpdate) {
    const parts = interaction.customId.split('_');
    const targetUserId = parts[2];
    targetUser = await interaction.client.users.fetch(targetUserId);
  } else {
    targetUser = interaction.options.getUser('joueur') || interaction.user;
  }

  const stats = storage.getEldenRingPlayerStats(targetUser.id);

  if (!stats || stats.bosses.length === 0) {
    const content = `❌ Aucun boss rencontré pour ${targetUser.displayName}.`;
    if (isUpdate) {
      return interaction.update({ content, embeds: [], components: [] });
    }
    return interaction.reply({ content, ephemeral: true });
  }

  // Sort by most recent encounter first
  const sortedBosses = [...stats.bosses].sort((a, b) => {
    const timeA = a.lastFight ? new Date(a.lastFight.timestamp).getTime() : 0;
    const timeB = b.lastFight ? new Date(b.lastFight.timestamp).getTime() : 0;
    return timeB - timeA;
  });

  const totalPages = Math.ceil(sortedBosses.length / BOSSES_PER_PAGE);
  page = Math.max(0, Math.min(page, totalPages - 1));

  const pageBosses = sortedBosses.slice(page * BOSSES_PER_PAGE, (page + 1) * BOSSES_PER_PAGE);

  const description = pageBosses.map((boss, i) => {
    const idx = page * BOSSES_PER_PAGE + i + 1;
    const status = boss.defeated ? '✅' : '❌';
    const firstTryTag = boss.firstTry ? ' 🎯' : '';
    const time = formatErDuration(boss.fightTime);
    return `**${idx}.** ${status} **${formatBossName(boss.bossName)}**${firstTryTag}\n    ${boss.attempts} tentative(s) · ${boss.kills} victoire(s) · ${boss.deaths} mort(s) · ${time}`;
  }).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(0xC8A200)
    .setTitle(`📜 Boss rencontrés — ${targetUser.displayName}`)
    .setDescription(description)
    .setFooter({ text: `Page ${page + 1}/${totalPages} · ${stats.bossesEncountered} boss rencontré(s)` })
    .setTimestamp();

  const components = [];
  if (totalPages > 1) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`er_bosses_${targetUser.id}_${page - 1}`)
        .setLabel('◀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`er_bosses_${targetUser.id}_${page + 1}`)
        .setLabel('▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
    );
    components.push(row);
  }

  if (isUpdate) {
    return interaction.update({ embeds: [embed], components });
  }
  return interaction.reply({ embeds: [embed], components });
}

const ROUTE_PER_PAGE = 8;

// Catégories de boss (ce qui s'affiche à l'écran quand on les tue)
// 👑 Demi-Dieu · 🏆 Légende · ✨ Dieu · ⚔️ Ennemi Majeur · 🔶 Obligatoire
const BOSS_CATEGORIES = {
  // --- Dieux ---
  "Radagon de l'Ordre d'or": "dieu",
  "Bête d'Elden": "dieu",
  "Radahn, consort de Miquella": "dieu",
  // --- Demi-Dieux ---
  "Godrick le Greffé": "demidieu",
  "Rennala, reine de la pleine lune": "demidieu",
  "Radahn le Fléau des astres": "demidieu",
  "Morgott, roi Réprouvé": "demidieu",
  "Rykard, seigneur du blasphème": "demidieu",
  "Malenia, épée de Miquella": "demidieu",
  "Malenia, déesse de la putréfaction": "demidieu",
  "Mohg, seigneur du sang": "demidieu",
  "Maliketh la Lame d'ébène": "demidieu",
  // --- Légendes ---
  "Godfrey, premier Seigneur d'Elden": "legende",
  "Hoarah Loux, le Guerrier": "legende",
  "Placidusax, seigneur draconique": "legende",
  "Fortissax la Liche draconique": "legende",
  "Géant de feu": "legende",
  "Astel le Rejeton du vide": "legende",
  "Sire Gideon Ofnir l'Omniscient": "legende",
  "Messmer l'Empaleur": "legende",
  "Romina, sainte du bourgeon": "legende",
  "Radahn, futur consort": "legende",
  "Bayle l'Effroyable": "legende",
  "Metyr, mère des Doigts": "legende",
  "Midra, seigneur de la Flamme exaltée": "legende",
  "Leda et ses Alliés": "legende",
  // --- Ennemis Majeurs ---
  "Margit le Déchu": "majeur",
  "Loup cramoisi de Radagon": "majeur",
  "Serpent dévoreur de dieux": "majeur",
  "Loretta, chevaleresse royale": "majeur",
  "Loretta, chevaleresse de l'Arbre-Sacré": "majeur",
  "Commandant Niall": "majeur",
  "Commandant O'Neil": "majeur",
  "Duo sanctechair": "majeur",
  "Sentinelle draconique de l'Arbre": "majeur",
  "Clerc Bestial": "majeur",
  "Mohg le Réprouvé": "majeur",
  "Lion dansant de la bête divine": "majeur",
  "Rellana, chevaleresse des Lunes jumelles": "majeur",
  "Commandant Gaïus": "majeur",
  "Comte Ymir, mère des Doigts": "majeur",
  "Avatar de l'Arbre-Occulte": "majeur",
};

const CATEGORY_ICONS = {
  dieu: '✨',
  demidieu: '👑',
  legende: '🏆',
  majeur: '⚔️',
};

function isRouteEntryDefeated(boss, defeatedNames, defeatedZones) {
  const isDuplicate = erRoute.getDuplicateZones(boss.name);
  if (isDuplicate) {
    return defeatedZones.has(`${boss.name}::${boss.zone}`);
  }
  return defeatedNames.has(boss.name);
}

function formatBossName(bossKey) {
  if (bossKey.includes('::')) {
    const [name, zone] = bossKey.split('::');
    return `${name} (${zone})`;
  }
  return bossKey;
}

async function handleErRoute(interaction, page = 0, isUpdate = false) {
  let targetUser;
  if (isUpdate) {
    const parts = interaction.customId.split('_');
    const targetUserId = parts[2];
    targetUser = await interaction.client.users.fetch(targetUserId);
  } else {
    targetUser = interaction.options.getUser('joueur') || interaction.user;
  }

  const stats = storage.getEldenRingPlayerStats(targetUser.id);
  const defeatedNames = new Set();  // plain names (backward compat)
  const defeatedZones = new Set();  // composite keys "name::zone"
  const bossAttempts = {};
  if (stats) {
    for (const boss of stats.bosses) {
      if (boss.defeated) {
        defeatedNames.add(boss.bossName);
        defeatedZones.add(boss.bossName);
        // Multi-phase bosses: also add the route name (e.g., "Malenia, épée de Miquella & Malenia, déesse de la putréfaction")
        const routeName = PHASE_TO_ROUTE[boss.bossName];
        if (routeName) {
          defeatedNames.add(routeName);
          defeatedZones.add(routeName);
        }
      }
      bossAttempts[boss.bossName] = boss.attempts;
      // Accumulate attempts under the route name for multi-phase bosses
      const routeName = PHASE_TO_ROUTE[boss.bossName];
      if (routeName) {
        bossAttempts[routeName] = (bossAttempts[routeName] || 0) + boss.attempts;
      }
    }
  }

  const totalPages = Math.ceil(erRoute.length / ROUTE_PER_PAGE);
  page = Math.max(0, Math.min(page, totalPages - 1));

  // Find first undefeated boss index for the "PROCHAIN" marker
  const nextBossIdx = erRoute.findIndex(b => !isRouteEntryDefeated(b, defeatedNames, defeatedZones));

  const pageBosses = erRoute.slice(page * ROUTE_PER_PAGE, (page + 1) * ROUTE_PER_PAGE);

  const defeated = erRoute.filter(b => isRouteEntryDefeated(b, defeatedNames, defeatedZones)).length;
  const required = erRoute.filter(b => b.required);
  const requiredDefeated = required.filter(b => isRouteEntryDefeated(b, defeatedNames, defeatedZones)).length;

  const description = pageBosses.map((boss, i) => {
    const globalIdx = page * ROUTE_PER_PAGE + i;
    const num = globalIdx + 1;
    const done = isRouteEntryDefeated(boss, defeatedNames, defeatedZones);
    const status = done ? '✅' : '⬜';
    const url = `https://eldenring.wiki.fextralife.com${boss.map || '/' + boss.wiki}`;
    const isNext = globalIdx === nextBossIdx;
    const nextTag = isNext ? ' ← **PROCHAIN**' : '';
    const reqIcon = boss.required ? ' 🔶' : '';
    const catIcon = CATEGORY_ICONS[BOSS_CATEGORIES[boss.name]] || '';
    const catStr = catIcon ? ` ${catIcon}` : '';
    const compositeKey = `${boss.name}::${boss.zone}`;
    const attempts = bossAttempts[compositeKey] || bossAttempts[boss.name];
    const attemptStr = attempts ? ` · ${attempts} tentative(s)` : '';
    const questStr = boss.quest ? ` · 📜 ${boss.quest}` : '';
    return `**${num}.** ${status} [${boss.name}](${url})${catStr}${reqIcon}${nextTag}\n\u2003📍 ${boss.zone} · Niv ${boss.level}${attemptStr}${questStr}`;
  }).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(0xC8A200)
    .setTitle(`🗺️ Route des Boss — ${targetUser.displayName}`)
    .setDescription(description)
    .setFooter({ text: `Page ${page + 1}/${totalPages} · ${defeated}/${erRoute.length} vaincus · ${requiredDefeated}/${required.length} obligatoires` })
    .setTimestamp();

  const components = [];
  if (totalPages > 1) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`er_route_${targetUser.id}_${page - 1}`)
        .setLabel('◀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`er_route_${targetUser.id}_${page + 1}`)
        .setLabel('▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
    );
    components.push(row);
  }

  if (isUpdate) {
    return interaction.update({ embeds: [embed], components });
  }
  return interaction.reply({ embeds: [embed], components });
}

async function handleErLeaderboard(interaction) {
  const leaderboard = storage.getEldenRingLeaderboard();
  const bossDifficulty = storage.getEldenRingBossDifficulty();

  if (leaderboard.byKills.length === 0) {
    return interaction.reply({
      content: '❌ Aucune donnée Elden Ring sur ce serveur.',
      ephemeral: true,
    });
  }

  const TOP_N = 10;
  const callerId = interaction.user.id;

  function formatRanking(entries, valueKey, formatter) {
    const top = entries.slice(0, TOP_N);
    const lines = top.map((entry, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
      const value = formatter ? formatter(entry[valueKey]) : entry[valueKey];
      return `${medal} <@${entry.discordId}> — ${value}`;
    });

    const callerIdx = entries.findIndex(e => e.discordId === callerId);
    if (callerIdx >= 0 && callerIdx >= TOP_N) {
      const callerEntry = entries[callerIdx];
      const value = formatter ? formatter(callerEntry[valueKey]) : callerEntry[valueKey];
      lines.push(`\n**#${callerIdx + 1}.** <@${callerId}> — ${value}`);
    } else if (callerIdx < 0) {
      lines.push(`\n*Vous n'avez pas encore de données*`);
    }

    return lines.join('\n') || '*Aucune donnée*';
  }

  const embed = new EmbedBuilder()
    .setColor(0xC8A200)
    .setTitle('🏆 Classement Elden Ring')
    .addFields(
      {
        name: '⚔️ Plus d\'Éliminations',
        value: formatRanking(leaderboard.byKills, 'kills'),
        inline: false,
      },
      {
        name: '💀 Plus de Morts',
        value: formatRanking(leaderboard.byDeaths, 'deaths'),
        inline: false,
      },
      {
        name: '⏱️ Plus de Temps Joué',
        value: formatRanking(leaderboard.byTime, 'totalTime', formatErDuration),
        inline: false,
      },
    );

  if (bossDifficulty.length > 0) {
    const topBosses = bossDifficulty.slice(0, 10);
    const bossLines = topBosses.map((b, i) => {
      const medal = i === 0 ? '☠️' : `**${i + 1}.**`;
      return `${medal} **${b.bossName}** — ${b.deaths} mort(s)`;
    }).join('\n');

    embed.addFields({
      name: '👹 Boss les plus mortels',
      value: bossLines,
      inline: false,
    });
  }

  embed.setFooter({ text: 'Elden Ring — Suivi de Boss · Classement du serveur' });
  embed.setTimestamp();

  return interaction.reply({ embeds: [embed] });
}

// ============================================
// /er-nemesis — top boss killers per player
// ============================================

async function handleErNemesis(interaction) {
  const targetUser = interaction.options.getUser('joueur') || interaction.user;
  const nemesis = storage.getEldenRingNemesis(targetUser.id);

  if (!nemesis || nemesis.length === 0) {
    return interaction.reply({
      content: `❌ Aucune donnée de morts pour ${targetUser.displayName}.`,
      ephemeral: true,
    });
  }

  const TOP_N = 10;
  const top = nemesis.slice(0, TOP_N);
  const totalDeaths = nemesis.reduce((sum, e) => sum + e.deaths, 0);
  const totalBosses = nemesis.length;

  const lines = top.map((entry, i) => {
    const medal = i === 0 ? '☠️' : `**${i + 1}.**`;
    const ratio = entry.attempts > 0 ? Math.round((entry.deaths / entry.attempts) * 100) : 0;
    const status = entry.defeated ? '✅' : '❌';
    return `${medal} **${entry.bossName}** — ${entry.deaths} mort${entry.deaths > 1 ? 's' : ''} / ${entry.attempts} tentative${entry.attempts > 1 ? 's' : ''} (${ratio}%) ${status}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xC8A200)
    .setTitle(`👹 Boss les plus meurtriers de ${targetUser.displayName}`)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `💀 Total : ${totalDeaths} morts sur ${totalBosses} boss` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}

// ============================================
// /er-hall-of-fame — notable achievements
// ============================================

async function handleErHallOfFame(interaction) {
  const fame = storage.getEldenRingHallOfFame();
  const fields = [];

  if (fame.mostFirstTries.length > 0) {
    const lines = fame.mostFirstTries.map((e, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      return `${medal} <@${e.discordId}> — ${e.count} first-try${e.count > 1 ? 's' : ''}`;
    });
    fields.push({ name: '🎯 First Try Kings', value: lines.join('\n'), inline: false });
  }

  if (fame.worstWall) {
    fields.push({
      name: '💀 Persévérant',
      value: `<@${fame.worstWall.discordId}> — **${fame.worstWall.deaths} morts** sur **${fame.worstWall.bossName}**`,
      inline: false,
    });
  }

  if (fame.fastestKill) {
    const secs = fame.fastestKill.duration;
    const display = secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;
    fields.push({
      name: '⚡ Speed Killer',
      value: `<@${fame.fastestKill.discordId}> — **${fame.fastestKill.bossName}** en **${display}**`,
      inline: false,
    });
  }

  if (fame.unbeatenWall) {
    fields.push({
      name: '🧱 Mur Infranchissable',
      value: `**${fame.unbeatenWall.bossName}** — ${fame.unbeatenWall.totalDeaths} mort(s) cumulées, toujours invaincu`,
      inline: false,
    });
  }

  if (fame.mostBossesDefeated.length > 0) {
    const lines = fame.mostBossesDefeated.map((e, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      return `${medal} <@${e.discordId}> — ${e.count}/${TOTAL_ER_BOSSES} boss vaincus`;
    });
    fields.push({ name: '🏆 Complétionniste', value: lines.join('\n'), inline: false });
  }

  if (fields.length === 0) {
    return interaction.reply({
      content: '❌ Aucune donnée Elden Ring sur ce serveur.',
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0xC8A200)
    .setTitle('🏛️ Hall of Fame — Elden Ring')
    .addFields(...fields)
    .setFooter({ text: 'Elden Ring — Exploits notables du serveur' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}

// ============================================
// /er-migrate-zones — migrate duplicate boss kills to zoned keys
// ============================================

function buildMigrationEmbed(bossInfo, index, total, zones) {
  const selectCount = Math.min(bossInfo.kills, zones.length);
  const embed = new EmbedBuilder()
    .setTitle('🔄 Migration des zones')
    .setDescription(`Boss **${index + 1}/${total}** : **${bossInfo.name}**\n\nTu as **${bossInfo.kills} kill${bossInfo.kills > 1 ? 's' : ''}** sous l'ancienne clé.\nChoisis **${selectCount} zone${selectCount > 1 ? 's' : ''}** :`)
    .setColor(0xD4A017);

  const zoneList = zones.map(z => `• ${z.zone} (Niv ${z.level})`).join('\n');
  embed.addFields({ name: '📍 Zones disponibles', value: zoneList });

  return embed;
}

function buildMigrationSelectMenu(userId, index, bossInfo, zones) {
  // Cap kills to number of available zones
  const selectCount = Math.min(bossInfo.kills, zones.length);
  const select = new StringSelectMenuBuilder()
    .setCustomId(`er_mig_${userId}_${index}`)
    .setPlaceholder('📍 Choisir la/les zone(s)...')
    .setMinValues(selectCount)
    .setMaxValues(selectCount)
    .addOptions(zones.map(z => ({
      label: z.zone.length > 100 ? z.zone.slice(0, 97) + '...' : z.zone,
      description: `Niv ${z.level}`,
      value: z.zone,
    })));
  return new ActionRowBuilder().addComponents(select);
}

// In-memory state for migration sessions: userId -> { bosses, currentIndex }
const _migrationSessions = new Map();

async function handleErMigrateZones(interaction) {
  const userId = interaction.user.id;
  const dupNames = erRoute.getDuplicateBossNames();
  const toMigrate = storage.getEldenRingDuplicateBossesForMigration(userId, dupNames);

  if (toMigrate.length === 0) {
    return interaction.reply({ content: '✅ Rien à migrer — tous tes boss kills sont déjà associés à une zone.', ephemeral: true });
  }

  // Store session
  _migrationSessions.set(userId, { bosses: toMigrate, currentIndex: 0 });

  const bossInfo = toMigrate[0];
  const zones = erRoute.getDuplicateZones(bossInfo.name);
  const embed = buildMigrationEmbed(bossInfo, 0, toMigrate.length, zones);
  const row = buildMigrationSelectMenu(userId, 0, bossInfo, zones);

  return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// ============================================
// QUEST TRACKER
// ============================================

async function handleQuest(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'voir') {
    const questId = interaction.options.getString('quete');
    const quest = erQuests.getQuestById(questId);
    if (!quest) {
      return interaction.reply({ content: '❌ Quête introuvable.', ephemeral: true });
    }

    const prog = storage.getQuestProgressById(interaction.user.id, questId);
    const completedSteps = prog?.completedSteps || [];

    // Page 1: Info + Steps
    const catLabel = quest.category === 'main' ? '⭐ Principale' : quest.category === 'secondary' ? '📋 Secondaire' : '🌙 DLC';

    let stepsText = quest.steps.map(s => {
      const done = completedSteps.includes(s.id) ? '✅' : '⬜';
      return `${done} **${s.id}.** ${s.description}`;
    }).join('\n');
    if (stepsText.length > 1024) stepsText = stepsText.substring(0, 1021) + '...';

    const embed1 = new EmbedBuilder()
      .setTitle(quest.name)
      .setColor(0xC8A200)
      .setDescription(`${catLabel} — PNJ: **${quest.npc}**\nZone: ${quest.zone}${quest.endingUnlocked ? `\n🏆 Fin débloquée: **${quest.endingUnlocked}**` : ''}`)
      .addFields({ name: `Étapes (${completedSteps.length}/${quest.steps.length})`, value: stepsText || 'Aucune étape' });

    if (quest.guide) {
      embed1.addFields({ name: 'Guide', value: `[Guide FR](${quest.guide})` });
    }

    // Page 2: Fail conditions + choices + rewards
    const fields2 = [];

    if (quest.failConditions.length > 0) {
      let fcText = quest.failConditions.map(fc => {
        const icon = fc.severity === 'permanent' ? '🔴' : '🟠';
        return `${icon} **${fc.trigger}**\n↳ ${fc.consequence}${fc.fix ? `\n✅ Fix: ${fc.fix}` : ''}`;
      }).join('\n\n');
      if (fcText.length > 1024) fcText = fcText.substring(0, 1021) + '...';
      fields2.push({ name: '⚠️ Conditions d\'échec', value: fcText });
    }

    if (quest.choices.length > 0) {
      let choicesText = quest.choices.map((c, ci) => {
        const selected = prog?.choicesMade?.[String(ci)];
        return `**${c.description}**\n` + c.options.map((o, oi) => {
          const icon = selected === oi ? '🔘' : '⚪';
          return `${icon} ${o.choice} → ${o.reward}`;
        }).join('\n');
      }).join('\n\n');
      if (choicesText.length > 1024) choicesText = choicesText.substring(0, 1021) + '...';
      fields2.push({ name: '🔀 Choix', value: choicesText });
    }

    if (quest.pointsOfNoReturn.length > 0) {
      let ponrText = quest.pointsOfNoReturn.map(p => `🚫 **${p.event}** — ${p.effect}`).join('\n');
      if (ponrText.length > 1024) ponrText = ponrText.substring(0, 1021) + '...';
      fields2.push({ name: '⛔ Points de non-retour', value: ponrText });
    }

    if (quest.rewards.length > 0) {
      fields2.push({ name: '🎁 Récompenses', value: quest.rewards.join(', ') });
    }

    const embed2 = new EmbedBuilder()
      .setTitle(`${quest.name} — Détails`)
      .setColor(0xC8A200);
    if (fields2.length > 0) {
      embed2.addFields(...fields2);
    } else {
      embed2.setDescription('Aucune condition d\'échec, choix ou récompense notable.');
    }

    const pages = [embed1, embed2];
    let currentPage = 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('quest_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId('quest_next').setLabel('▶').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setLabel('Guide FR').setStyle(ButtonStyle.Link).setURL(quest.guide || 'https://www.millenium.org')
    );

    const reply = await interaction.reply({ embeds: [pages[0]], components: [row], fetchReply: true });

    const collector = reply.createMessageComponentCollector({ time: 120_000 });
    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: '❌ Ce n\'est pas ta commande.', ephemeral: true });
      }
      if (i.customId === 'quest_prev') currentPage = Math.max(0, currentPage - 1);
      if (i.customId === 'quest_next') currentPage = Math.min(pages.length - 1, currentPage + 1);

      const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('quest_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
        new ButtonBuilder().setCustomId('quest_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === pages.length - 1),
        new ButtonBuilder().setLabel('Guide FR').setStyle(ButtonStyle.Link).setURL(quest.guide || 'https://www.millenium.org')
      );

      await i.update({ embeds: [pages[currentPage]], components: [newRow] });
    });
    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('quest_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('quest_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setLabel('Guide FR').setStyle(ButtonStyle.Link).setURL(quest.guide || 'https://www.millenium.org')
      );
      reply.edit({ components: [disabledRow] }).catch(() => {});
    });
    return;
  }

  if (subcommand === 'progression') {
    const allProgress = storage.getQuestProgress(interaction.user.id);

    const categories = [
      { key: 'main', label: '⭐ Base — Principales', quests: erQuests.getQuestsByCategory('main') },
      { key: 'secondary', label: '📋 Base — Secondaires', quests: erQuests.getQuestsByCategory('secondary') },
      { key: 'dlc', label: '🌙 DLC — Shadow of the Erdtree', quests: erQuests.getQuestsByCategory('dlc') },
    ];

    const embed = new EmbedBuilder()
      .setTitle('📜 Progression des Quêtes')
      .setColor(0xC8A200);

    let totalSteps = 0;
    let totalCompleted = 0;

    for (const cat of categories) {
      if (cat.quests.length === 0) continue;
      let catSteps = 0;
      let catCompleted = 0;

      const lines = cat.quests.map(q => {
        const p = allProgress[q.id];
        const done = p?.completedSteps?.length || 0;
        const total = q.steps.length;
        catSteps += total;
        catCompleted += done;
        const icon = !p || p.status === 'not_started' ? '⬜' : p.status === 'completed' || done === total ? '✅' : p.status === 'failed' ? '🔴' : '🟡';
        return `${icon} ${q.name} \`${done}/${total}\``;
      });

      totalSteps += catSteps;
      totalCompleted += catCompleted;

      const pct = catSteps > 0 ? Math.round((catCompleted / catSteps) * 100) : 0;
      const barLen = 10;
      const filled = Math.round((pct / 100) * barLen);
      const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
      const header = `[${bar}] ${catCompleted}/${catSteps} (${pct}%)`;

      let value = `${header}\n${lines.join('\n')}`;
      if (value.length > 1024) value = value.substring(0, 1021) + '...';
      embed.addFields({ name: cat.label, value });
    }

    const globalPct = totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0;
    embed.setDescription(`Progression globale: **${totalCompleted}/${totalSteps}** étapes (${globalPct}%)`);

    return interaction.reply({ embeds: [embed] });
  }

  if (subcommand === 'web') {
    const token = storage.getQuestWebToken(interaction.user.id);
    if (!token) {
      return interaction.reply({
        content: '❌ Tu n\'as pas encore de clé API Elden Ring. Utilise `/er-setup` pour en générer une.',
        ephemeral: true,
      });
    }
    const host = config.eldenRing?.publicHost || `localhost:${config.eldenRing?.apiPort || 3000}`;
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const url = `${protocol}://${host}/quests/${token}`;

    const embed = new EmbedBuilder()
      .setTitle('🌐 Quest Tracker Web')
      .setColor(0xC8A200)
      .setDescription(`Voici ton lien personnel pour tracker tes quêtes :\n\n**[Ouvrir le Quest Tracker](${url})**\n\n⚠️ Ne partage pas ce lien — il donne accès à ta progression.`)
      .setFooter({ text: 'Ce lien est permanent et unique à ton compte.' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case 'setchannel':
        await handleSetChannel(interaction);
        break;
      case 'leaderboard':
        await handleLeaderboard(interaction);
        break;
      case 'mystats':
        await handleMyStats(interaction);
        break;
      case 'give':
        await handleGive(interaction);
        break;
      case 'giveaway':
        await handleGiveaway(interaction);
        break;
      case 'setbetwindow':
        await handleSetBetWindow(interaction);
        break;
      case 'setlinkedbetwindow':
        await handleSetLinkedBetWindow(interaction);
        break;
      case 'setminbet':
        await handleSetMinBet(interaction);
        break;
      case 'setbetvisibility':
        await handleSetBetVisibility(interaction);
        break;
      case 'setgoldenoffer':
        await handleSetGoldenOffer(interaction);
        break;
      case 'info':
        await handleInfo(interaction);
        break;
      case 'help':
        await handleHelp(interaction);
        break;
      case 'purge-user':
        await handlePurgeUser(interaction);
        break;
      case 'historique':
        await handleHistorique(interaction);
        break;
      case 'ajuster':
        await handleAjuster(interaction);
        break;
      case 'llm-config':
        return handleLlmConfig(interaction);
      case 'llm-stats':
        return handleLlmStats(interaction);
      case 'feature':
        return handleFeature(interaction);
      case 'resetwallet':
        return handleResetWallet(interaction);
      case 'pari':
        return handlePariCreate(interaction);
      case 'pari-fermer':
        return handlePariFermer(interaction);
      case 'pari-resoudre':
        return handlePariResoudre(interaction);
      case 'pari-annuler':
        return handlePariAnnuler(interaction);
      case 'pari-liste':
        return handlePariListe(interaction);
      case 'setfirstbettor':
        return handleSetFirstBettor(interaction);
      case 'settings':
        return handleSettings(interaction);
      case 'setup':
        return handleSetup(interaction);
      case 'er-setup':
        return handleErSetup(interaction);
      case 'er-stats':
        return handleErStats(interaction);
      case 'er-bosses':
        return handleErBosses(interaction);
      case 'er-leaderboard':
        return handleErLeaderboard(interaction);
      case 'er-route':
        return handleErRoute(interaction);
      case 'quest':
        return handleQuest(interaction);
      case 'er-cycle': {
        const sub = interaction.options.getSubcommand();
        if (sub === 'set') {
          const nombre = interaction.options.getInteger('nombre');
          storage.setEldenRingCycleSize(nombre);
          return interaction.reply({
            content: `✅ Cycle de paris Elden Ring mis a jour: **${nombre} tentatives** par cycle.\nLes prochains cycles utiliseront cette valeur.`,
          });
        }
        if (sub === 'show') {
          const current = storage.getEldenRingCycleSize();
          return interaction.reply({
            content: `📊 Cycle de paris actuel: **${current} tentatives** par cycle.\nPari = "Victoire en ≤${current} essais ?"`,
          });
        }
        break;
      }
      case 'er-reset': {
        const success = storage.resetEldenRingPlayerStats(interaction.user.id);
        if (success) {
          return interaction.reply({
            content: '✅ Historique Elden Ring reset : fights, sessions, morts remis a zero.\nLes paris actifs ont ete rembourses.',
          });
        }
        return interaction.reply({
          content: '❌ Aucun historique Elden Ring trouve pour ton compte.',
          ephemeral: true,
        });
      }
      case 'er-add-kill': {
        const targetUser = interaction.options.getUser('joueur');
        const bossName = interaction.options.getString('boss');
        const tentatives = interaction.options.getInteger('tentatives') || 1;
        storage.ensureEldenRingPlayer(targetUser.id);
        // Archive existing fights — manual add replaces, not appends
        storage.archiveEldenRingBossData(targetUser.id, bossName);
        // Add death fights for attempts before the kill
        for (let i = 0; i < tentatives - 1; i++) {
          storage.addEldenRingFight(targetUser.id, bossName, {
            outcome: 'death',
            duration_seconds: 0,
            timestamp: new Date().toISOString(),
            manual: true,
          });
        }
        storage.addEldenRingFight(targetUser.id, bossName, {
          outcome: 'kill',
          duration_seconds: 0,
          timestamp: new Date().toISOString(),
          manual: true,
        });
        const attemptStr = tentatives === 1 ? '(first try !)' : `(${tentatives} tentatives)`;
        return interaction.reply({
          content: `✅ Boss kill ajouté : **${bossName}** pour ${targetUser.displayName} ${attemptStr}`,
        });
      }
      case 'er-remove-kill': {
        const targetUser = interaction.options.getUser('joueur');
        const bossName = interaction.options.getString('boss');
        const removed = storage.removeEldenRingBossKill(targetUser.id, bossName);
        if (removed) {
          return interaction.reply({
            content: `✅ Boss kill retiré : **${bossName}** pour ${targetUser.displayName}`,
          });
        }
        return interaction.reply({
          content: `❌ Aucun kill trouvé pour **${bossName}** chez ${targetUser.displayName}`,
          ephemeral: true,
        });
      }
      case 'er-migrate-zones':
        return handleErMigrateZones(interaction);
      case 'er-nemesis':
        return handleErNemesis(interaction);
      case 'er-hall-of-fame':
        return handleErHallOfFame(interaction);
    }
  } catch (error) {
    console.error('Error handling command:', error);
    const reply = {
      content: '❌ Une erreur est survenue lors du traitement de la commande',
      ephemeral: true,
    };
    if (interaction.deferred) {
      await interaction.editReply(reply);
    } else if (!interaction.replied) {
      await interaction.reply(reply);
    }
  }
});

// Elden Ring CYCLE embed bet counter updater
async function updateCycleEmbedBetCount(client, cycleKey) {
  const { EmbedBuilder } = require('discord.js');
  const cycle = storage.getBetCycle(cycleKey);
  if (!cycle) return;

  const channelId = cycle.channelId || storage.getNotificationChannelId();
  const channel = client.channels.cache.get(channelId);
  if (!channel) return;

  const message = await channel.messages.fetch(cycle.messageId);
  if (!message) return;

  const updatedEmbed = EmbedBuilder.from(message.embeds[0]);
  const bets = Object.values(cycle.bets || {});
  const victCount = bets.filter(b => b.prediction === 'victoire').length;
  const defCount = bets.filter(b => b.prediction === 'defaite').length;

  const fieldIdx = updatedEmbed.data.fields.findIndex(f => f.name === 'Paris');
  if (fieldIdx >= 0) {
    updatedEmbed.spliceFields(fieldIdx, 1, {
      name: 'Paris',
      value: `${victCount} Victoire / ${defCount} Defaite`,
      inline: true,
    });
  }

  await message.edit({ embeds: [updatedEmbed], components: message.components });
}

// Elden Ring encounter embed updater (used by ER bet button handler)
async function updateErEncounterEmbed(client, betData, fightId) {
  const { EmbedBuilder } = require('discord.js');

  // Re-read bet to get latest state
  const bet = storage.getEldenRingBet(fightId);
  if (!bet) return;

  const channelId = bet.channelId || storage.getNotificationChannelId();
  const channel = client.channels.cache.get(channelId);
  if (!channel) return;

  const message = await channel.messages.fetch(bet.messageId);
  if (!message) return;

  const updatedEmbed = EmbedBuilder.from(message.embeds[0]);

  // Count bets per side
  const bets = Object.values(bet.bets);
  const victCount = bets.filter(b => b.prediction === 'victoire').length;
  const defCount = bets.filter(b => b.prediction === 'defaite').length;

  // Find "Paris" field by name (not index) to avoid fragile ordering
  const fieldIdx = updatedEmbed.data.fields.findIndex(f => f.name === 'Paris');
  if (fieldIdx >= 0) {
    updatedEmbed.spliceFields(fieldIdx, 1, {
      name: 'Paris',
      value: `${victCount} Victoire / ${defCount} Defaite`,
      inline: true,
    });
  }

  await message.edit({ embeds: [updatedEmbed], components: message.components });
}

// Handle button interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  try {
  const customId = interaction.customId;

  // Elden Ring boss list pagination
  if (customId.startsWith('er_bosses_')) {
    const parts = customId.split('_');
    const page = parseInt(parts[3], 10);
    return handleErBosses(interaction, page, true);
  }

  if (customId.startsWith('er_route_')) {
    const parts = customId.split('_');
    const page = parseInt(parts[3], 10);
    return handleErRoute(interaction, page, true);
  }

  // Elden Ring CYCLE bet buttons (new system)
  if (customId.startsWith('erc_')) {
    const parts = customId.split('_');
    // erc_v_50_<shortKey> or erc_d_100_<shortKey>
    const predictionCode = parts[1]; // 'v' or 'd'
    const amount = parseInt(parts[2], 10);
    const shortKey = parts.slice(3).join('_');
    const prediction = predictionCode === 'v' ? 'victoire' : 'defaite';

    // Resolve shortKey to cycleKey
    const { _cycleKeyMap } = require('./eldenRingNotifier');
    const cycleKey = _cycleKeyMap[shortKey];
    if (!cycleKey) {
      return interaction.reply({ content: '⏱️ Ce cycle de paris a expire', ephemeral: true });
    }

    const cycle = storage.getBetCycle(cycleKey);
    if (!cycle || cycle.resolved) {
      return interaction.reply({ content: '⏱️ Les paris sont fermes pour ce cycle', ephemeral: true });
    }

    const result = storage.placeBetCycleBet(cycleKey, interaction.user.id, prediction, amount);
    if (!result.success) {
      return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
    }

    const predLabel = prediction === 'victoire' ? 'Victoire' : 'Defaite';
    await interaction.reply({
      content: `✅ Pari de **${amount} Runes** sur **${predLabel}** (cote: x${result.lockedOdds.toFixed(2)})\nPari: Victoire en ≤${cycle.cycleSize} essais\nNouveau solde: **${result.newBalance} Runes**`,
      ephemeral: true,
    });

    // Update embed bet counter
    updateCycleEmbedBetCount(client, cycleKey).catch((e) => {
      console.warn('[ER] Could not update cycle embed:', e.message);
    });
    return;
  }

  // Elden Ring bet buttons
  if (customId.startsWith('er_bet_')) {
    const parts = customId.split('_');
    // er_bet_v_50_<fightId> or er_bet_d_100_<fightId>
    const predictionCode = parts[2]; // 'v' or 'd'
    const amount = parseInt(parts[3], 10);
    const fightId = parts.slice(4).join('_');
    const prediction = predictionCode === 'v' ? 'victoire' : 'defaite';

    // Check bet exists and is open
    const bet = storage.getEldenRingBet(fightId);
    if (!bet || bet.closedAt) {
      return interaction.reply({ content: '⏱️ Les paris sont fermes pour ce combat', ephemeral: true });
    }

    // Place the bet
    const result = storage.placeEldenRingBet(fightId, interaction.user.id, prediction, amount);
    if (!result.success) {
      return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
    }

    // Reply to user with confirmation
    const predLabel = prediction === 'victoire' ? 'Victoire' : 'Defaite';
    await interaction.reply({
      content: `✅ Pari de **${amount} Runes** sur **${predLabel}** (cote: x${result.lockedOdds.toFixed(2)})\nNouveau solde: **${result.newBalance} Runes**`,
      ephemeral: true,
    });

    // Update encounter embed bet counter (fire-and-forget)
    updateErEncounterEmbed(client, bet, fightId).catch((e) => {
      console.warn('[ER] Could not update encounter embed:', e.message);
    });
    return;
  }

  // Reset wallet confirmation buttons
  if (customId.startsWith('resetwallet_confirm_')) {
    if (!isAdmin(interaction.user.id)) {
      return interaction.reply({
        content: '❌ Action non autorisée.',
        ephemeral: true,
      });
    }

    const parts = customId.replace('resetwallet_confirm_', '').split('_');
    const targetOrAll = parts[0];
    const mode = parts[1];
    const toZero = mode === 'zero';

    if (targetOrAll === 'all') {
      const result = storage.resetAllWallets(toZero);
      return interaction.update({
        content: `✅ **${result.count}** portefeuilles réinitialisés à **${result.newBalance} Runes**`,
        components: [],
      });
    } else {
      const result = storage.resetWallet(targetOrAll, toZero);
      if (!result.success) {
        return interaction.update({
          content: `❌ ${result.message}`,
          components: [],
        });
      }
      return interaction.update({
        content: `✅ Portefeuille de <@${targetOrAll}> réinitialisé: ${result.previousBalance} Runes → ${result.newBalance} Runes`,
        components: [],
      });
    }
  }

  if (customId === 'resetwallet_cancel') {
    return interaction.update({
      content: '❌ Réinitialisation annulée.',
      components: [],
    });
  }

  // Spontaneous bet buttons
  if (customId.startsWith('spbet_')) {
    if (customId.startsWith('spbet_cancel_')) {
      const betId = customId.replace('spbet_cancel_', '');
      const result = storage.removeSpontaneousBet(betId, interaction.user.id);

      if (!result.success) {
        return interaction.reply({
          content: '❌ Vous n\'avez pas de pari sur ce sujet.',
          ephemeral: true,
        });
      }

      // Mettre à jour le message
      const bet = storage.getSpontaneousBet(betId);
      if (bet) await updateSpontaneousBetMessage(bet);

      return interaction.reply({
        content: `✅ Pari annulé. ${result.refundedAmount} Runes remboursés.`,
        ephemeral: true,
      });
    }

    // Pari sur une option
    // Le betId (sbet_xxx_xxx) et l'optionId (opt_xxx) contiennent tous deux des underscores
    // On utilise une regex pour séparer correctement : tout avant "opt_" = betId, "opt_xxx" = optionId
    const fullString = customId.replace('spbet_', '');
    const match = fullString.match(/^(.+)_(opt_.+)$/);
    if (!match) {
      return interaction.reply({
        content: '❌ Format de pari invalide.',
        ephemeral: true,
      });
    }
    const betId = match[1];
    const optionId = match[2];

    const bet = storage.getSpontaneousBet(betId);
    if (!bet) {
      return interaction.reply({
        content: '❌ Pari introuvable.',
        ephemeral: true,
      });
    }

    if (bet.status !== 'open') {
      return interaction.reply({
        content: '⏱️ Les paris sont fermés pour ce sujet.',
        ephemeral: true,
      });
    }

    // Vérifier si le temps est écoulé
    if (bet.endsAt && new Date(bet.endsAt) < new Date()) {
      storage.closeSpontaneousBets(betId);
      await updateSpontaneousBetMessage(storage.getSpontaneousBet(betId));
      return interaction.reply({
        content: '⏱️ Le temps de pari est écoulé.',
        ephemeral: true,
      });
    }

    const option = bet.options.find(o => o.id === optionId);
    if (!option) {
      return interaction.reply({
        content: '❌ Option invalide.',
        ephemeral: true,
      });
    }

    const existingBet = storage.getUserSpontaneousBet(betId, interaction.user.id);
    if (existingBet && existingBet.optionId !== optionId) {
      return interaction.reply({
        content: '⚠️ Vous avez déjà parié sur une autre option.',
        ephemeral: true,
      });
    }

    const balance = storage.getBalance(interaction.user.id);
    const minBet = storage.calculateMinBet(balance);

    const modal = new ModalBuilder()
      .setCustomId(`spbm_${betId}_${optionId}`)
      .setTitle(`Parier: ${option.label.substring(0, 35)}`);

    const labelText = (minBet > 0
      ? `Montant (Solde: ${balance} Runes, Min: ${minBet} Runes)`
      : `Montant (Solde: ${balance} Runes)`).slice(0, 45);

    const amountInput = new TextInputBuilder()
      .setCustomId('bet_amount')
      .setLabel(labelText)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(minBet > 0 ? `Min: ${minBet} Runes` : 'Ex: 500')
      .setRequired(true);

    if (existingBet) {
      amountInput.setValue(String(existingBet.amount));
    } else if (minBet > 0) {
      amountInput.setValue(String(minBet));
    }

    modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
    await interaction.showModal(modal);
  }

  // Leaderboard buttons
  if (customId.startsWith('leaderboard_')) {
    const type = customId.replace('leaderboard_', '');
    await showLeaderboard(interaction, type, true);
  }

  // Setup modals
  if (customId === 'setup_cotes') {
    if (!isAdmin(interaction.user.id)) return interaction.reply({ content: '❌ Non autorisé.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId('setup_modal_cotes').setTitle('📊 Configuration des Cotes');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('seed_pool').setLabel('Seed Pool (Runes)').setStyle(TextInputStyle.Short).setValue(String(storage.getSeedPool())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('margin').setLabel('Marge bookmaker (%)').setStyle(TextInputStyle.Short).setValue(String(storage.getBookmakerMarginPercent())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('minority').setLabel('Bonus minoritaire max (%)').setStyle(TextInputStyle.Short).setValue(String(storage.getMaxMinorityBonusPercent())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('streak').setLabel('Bonus streak (%)').setStyle(TextInputStyle.Short).setValue(String(storage.getStreakBonusPercent())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('winrate_threshold').setLabel('Winrate défaut (%) / Seuil streak').setStyle(TextInputStyle.Short).setValue(`${storage.getDefaultWinratePercent()} / ${storage.getStreakThreshold()}`).setPlaceholder('50 / 3').setRequired(true)
      ),
    );
    return interaction.showModal(modal);
  }

  if (customId === 'setup_paris') {
    if (!isAdmin(interaction.user.id)) return interaction.reply({ content: '❌ Non autorisé.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId('setup_modal_paris').setTitle('🎰 Configuration des Paris');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bet_window').setLabel('Fenêtre de paris (minutes, 0=illimité)').setStyle(TextInputStyle.Short).setValue(String(storage.getBetWindowMinutes())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('linked_window').setLabel('Fenêtre joueurs liés (minutes)').setStyle(TextInputStyle.Short).setValue(String(storage.getLinkedPlayerBetWindowMinutes())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('min_flat').setLabel('Mise minimum fixe (Runes, 0=désactivé)').setStyle(TextInputStyle.Short).setValue(String(storage.getMinBetFlat())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('min_percent').setLabel('Mise minimum % du wallet (0=désactivé)').setStyle(TextInputStyle.Short).setValue(String(storage.getMinBetPercent())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('visibility').setLabel('Visibilité montants (oui/non)').setStyle(TextInputStyle.Short).setValue(storage.getShowBetAmounts() ? 'oui' : 'non').setRequired(true)
      ),
    );
    return interaction.showModal(modal);
  }

  if (customId === 'setup_bonus') {
    if (!isAdmin(interaction.user.id)) return interaction.reply({ content: '❌ Non autorisé.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId('setup_modal_bonus').setTitle('🌟 Configuration des Bonus');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('go_threshold').setLabel('Offre en Or seuil (Runes)').setStyle(TextInputStyle.Short).setValue(String(storage.getGoldenOfferThreshold())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('go_bonus').setLabel('Offre en Or bonus (%)').setStyle(TextInputStyle.Short).setValue(String(storage.getGoldenOfferBonus())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('fb_percent').setLabel('Premier Parieur bonus (%)').setStyle(TextInputStyle.Short).setValue(String(storage.getFirstBettorBonusPercent())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('fb_linked').setLabel('Premier Parieur liés éligibles (oui/non)').setStyle(TextInputStyle.Short).setValue(storage.getFirstBettorLinkedPlayerEligible() ? 'oui' : 'non').setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('solo_bet').setLabel('Bonus pari solo (%)').setStyle(TextInputStyle.Short).setValue(String(storage.getSoloBetBonusPercent())).setRequired(true)
      ),
    );
    return interaction.showModal(modal);
  }

  if (customId === 'setup_recompenses') {
    if (!isAdmin(interaction.user.id)) return interaction.reply({ content: '❌ Non autorisé.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId('setup_modal_recompenses').setTitle('💰 Récompenses');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('starting_balance').setLabel('Solde initial (Runes)').setStyle(TextInputStyle.Short).setValue(String(storage.getStartingBalance())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('base_reward').setLabel('Récompense par partie (Runes)').setStyle(TextInputStyle.Short).setValue(String(storage.getPlayerBaseReward())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('player_cut').setLabel('Part joueur sur pertes (%)').setStyle(TextInputStyle.Short).setValue(String(storage.getPlayerCutPercent())).setRequired(true)
      ),
    );
    return interaction.showModal(modal);
  }

  if (customId === 'setup_missions') {
    if (!isAdmin(interaction.user.id)) return interaction.reply({ content: '❌ Non autorisé.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId('setup_modal_missions').setTitle('🎯 Missions');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('daily_games').setLabel('Parties daily requises').setStyle(TextInputStyle.Short).setValue(String(storage.getDailyGamesRequired())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('daily_prizes').setLabel('Prix roue daily (séparés par virgules)').setStyle(TextInputStyle.Short).setValue(storage.getDailyWheelPrizes().join(',')).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('weekly_games').setLabel('Parties weekly requises').setStyle(TextInputStyle.Short).setValue(String(storage.getWeeklyGamesRequired())).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('weekly_prizes').setLabel('Prix roue weekly (séparés par virgules)').setStyle(TextInputStyle.Short).setValue(storage.getWeeklyWheelPrizes().join(',')).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bonus_chance').setLabel('Bonus chance weekly (%)').setStyle(TextInputStyle.Short).setValue(String(storage.getWeeklyBonusChance())).setRequired(true)
      ),
    );
    return interaction.showModal(modal);
  }

  // Setup mode button
  if (customId === 'setup_mode') {
    if (!isAdmin(interaction.user.id)) return interaction.reply({ content: '❌ Non autorisé.', ephemeral: true });
    const currentMode = storage.getBettingMode();
    const modal = new ModalBuilder().setCustomId('setup_modal_mode').setTitle('🎰 Mode de Paris');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('betting_mode')
          .setLabel('Mode (odds / pot)')
          .setStyle(TextInputStyle.Short)
          .setValue(currentMode)
          .setPlaceholder('odds = cotes verrouillées, pot = cagnotte')
          .setRequired(true)
      ),
    );
    return interaction.showModal(modal);
  }

  // Setup reset button
  if (customId === 'setup_reset') {
    if (!isAdmin(interaction.user.id)) return interaction.reply({ content: '❌ Non autorisé.', ephemeral: true });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('setup_reset_wallets').setLabel('Reset Wallets').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('setup_reset_all').setLabel('Reset Tout').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('setup_reset_cancel').setLabel('Annuler').setStyle(ButtonStyle.Secondary),
    );
    return interaction.reply({
      content: '⚠️ **Que voulez-vous réinitialiser ?**\n\n- **Wallets** : remet tous les wallets au solde initial\n- **Tout** : wallets + annule les paris actifs',
      components: [row],
      ephemeral: true,
    });
  }

  // Setup reset confirmation (double confirmation)
  if (customId.startsWith('setup_reset_confirm_')) {
    if (!isAdmin(interaction.user.id)) return interaction.reply({ content: '❌ Non autorisé.', ephemeral: true });
    const action = customId.replace('setup_reset_confirm_', '');

    if (action === 'wallets' || action === 'all') {
      storage.resetAllWallets(false);
    }
    if (action === 'all') {
      storage.cancelAllActiveBets();
    }

    const messages = {
      wallets: '✅ Tous les wallets ont été réinitialisés au solde initial.',
      all: '✅ Wallets et paris actifs ont été réinitialisés.',
    };
    return interaction.update({ content: messages[action], components: [] });
  }

  // Setup reset intermediary buttons (before double confirmation)
  if (customId === 'setup_reset_wallets' || customId === 'setup_reset_all') {
    if (!isAdmin(interaction.user.id)) return interaction.reply({ content: '❌ Non autorisé.', ephemeral: true });
    const action = customId.replace('setup_reset_', '');
    const labels = { wallets: 'les wallets', all: 'TOUT' };
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`setup_reset_confirm_${action}`).setLabel(`Confirmer le reset de ${labels[action]}`).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('setup_reset_cancel').setLabel('Annuler').setStyle(ButtonStyle.Secondary),
    );
    return interaction.update({
      content: `⚠️ **Êtes-vous sûr ?** Cette action va réinitialiser **${labels[action]}**. C'est irréversible !`,
      components: [row],
    });
  }

  if (customId === 'setup_reset_cancel') {
    return interaction.update({ content: '❌ Réinitialisation annulée.', components: [] });
  }

  } catch (error) {
    console.error('Error handling button interaction:', error);
    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: '❌ Une erreur est survenue', ephemeral: true });
      } else if (!interaction.replied) {
        await interaction.reply({ content: '❌ Une erreur est survenue', ephemeral: true });
      }
    } catch (e) {
      console.error('Failed to send error reply for button:', e);
    }
  }
});

// Zone select for Elden Ring duplicate bosses
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  const customId = interaction.customId;

  if (customId.startsWith('er_zone_')) {
    // Parse discordUserId and bossName from customId: er_zone_{userId}_{bossName}
    const parts = customId.split('_');
    const discordUserId = parts[2];
    const bossName = parts.slice(3).join('_');

    // Only the player can select the zone
    if (interaction.user.id !== discordUserId) {
      return interaction.reply({ content: '❌ Seul le joueur peut choisir la zone', ephemeral: true });
    }

    const selectedZone = interaction.values[0];

    // Update cycle if still active (otherwise just migrate fights)
    const cycleKey = `${discordUserId}_${bossName}`;
    const cycle = storage.getBetCycle(cycleKey);
    if (cycle) {
      storage.setBetCycleSelectedZone(cycleKey, selectedZone);
      // Flush any buffered fights to the zoned key
      const flushed = storage.flushPendingFights(cycleKey);
      if (flushed > 0) {
        console.log(`[ER] Flushed ${flushed} pending fights to ${bossName}::${selectedZone}`);
      }
    }

    // Migrate any fights stored under the plain boss name to the zoned key
    const zonedName = `${bossName}::${selectedZone}`;
    storage.migrateEldenRingFightsToZonedKey(discordUserId, bossName, zonedName);

    // Update the embed: add zone field, remove select menu
    try {
      const message = interaction.message;
      const embed = EmbedBuilder.from(message.embeds[0]);
      embed.addFields({ name: '📍 Zone', value: selectedZone, inline: true });

      // Remove the zone select row from components
      const components = message.components
        .filter(row => !row.components.some(c => c.data?.custom_id?.startsWith('er_zone_')))
        .map(row => ActionRowBuilder.from(row));

      await interaction.update({ embeds: [embed], components });
    } catch (e) {
      console.warn('[ER] Zone select update error:', e.message);
      await interaction.reply({ content: `✅ Zone sélectionnée : **${selectedZone}**`, ephemeral: true });
    }
  }

  // Migration select menu: er_mig_{userId}_{index}
  if (customId.startsWith('er_mig_')) {
    const parts = customId.split('_');
    const targetUserId = parts[2];
    const currentIndex = parseInt(parts[3], 10);

    if (interaction.user.id !== targetUserId) {
      return interaction.reply({ content: '❌ Seul le joueur peut effectuer cette migration', ephemeral: true });
    }

    const session = _migrationSessions.get(targetUserId);
    if (!session || currentIndex !== session.currentIndex) {
      return interaction.reply({ content: '❌ Session de migration expirée. Relance `/er-migrate-zones`.', ephemeral: true });
    }

    const bossInfo = session.bosses[currentIndex];
    const selectedZones = interaction.values;

    // Migrate kills to selected zones
    storage.migrateEldenRingKillsToZones(targetUserId, bossInfo.name, selectedZones);

    // Move to next boss
    session.currentIndex++;

    if (session.currentIndex >= session.bosses.length) {
      // All done
      _migrationSessions.delete(targetUserId);
      const doneEmbed = new EmbedBuilder()
        .setTitle('✅ Migration terminée')
        .setDescription('Tous tes boss kills dupliqués ont été associés aux bonnes zones.\nUtilise `/er-route` pour vérifier.')
        .setColor(0x00AA00);
      return interaction.update({ embeds: [doneEmbed], components: [] });
    }

    // Show next boss
    const nextBoss = session.bosses[session.currentIndex];
    const zones = erRoute.getDuplicateZones(nextBoss.name);
    const embed = buildMigrationEmbed(nextBoss, session.currentIndex, session.bosses.length, zones);
    const row = buildMigrationSelectMenu(targetUserId, session.currentIndex, nextBoss, zones);
    return interaction.update({ embeds: [embed], components: [row] });
  }
});

// Handle modal submissions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  try {
  const customId = interaction.customId;

  // Spontaneous bet modal
  if (customId.startsWith('spbm_')) {
    const fullString = customId.replace('spbm_', '');
    const match = fullString.match(/^(.+)_(opt_.+)$/);
    if (!match) {
      return interaction.reply({ content: '❌ Erreur: format de pari invalide', ephemeral: true });
    }
    const betId = match[1];
    const optionId = match[2];

    const amountStr = interaction.fields.getTextInputValue('bet_amount');
    const amount = parseInt(amountStr, 10);

    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({
        content: '❌ Montant invalide',
        ephemeral: true
      });
    }

    const balance = storage.getBalance(interaction.user.id);
    const minBet = storage.calculateMinBet(balance);
    if (minBet > 0 && amount < minBet) {
      return interaction.reply({
        content: `❌ Le montant minimum de pari est de **${minBet} Runes**`,
        ephemeral: true
      });
    }

    const result = storage.placeSpontaneousBet(betId, interaction.user.id, optionId, amount);

    if (!result.success) {
      return interaction.reply({
        content: `❌ ${result.message}`,
        ephemeral: true
      });
    }

    // Update embed with new odds
    const bet = storage.getSpontaneousBet(betId);
    if (bet) await updateSpontaneousBetMessage(bet);

    const option = bet.options.find(o => o.id === optionId);
    const oddsText = result.lockedOdds ? ` (cote: x${result.lockedOdds.toFixed(2)})` : '';
    return interaction.reply({
      content: `✅ Pari de **${amount} Runes** sur **${option?.label || 'N/A'}**${oddsText} enregistré !\nNouveau solde: **${result.newBalance} Runes**`,
      ephemeral: true
    });
  }

  // Setup modal: Cotes
  if (customId === 'setup_modal_cotes') {
    const seedPool = parseInt(interaction.fields.getTextInputValue('seed_pool'), 10);
    const margin = parseInt(interaction.fields.getTextInputValue('margin'), 10);
    const minority = parseInt(interaction.fields.getTextInputValue('minority'), 10);
    const streak = parseInt(interaction.fields.getTextInputValue('streak'), 10);
    const winrateThreshold = interaction.fields.getTextInputValue('winrate_threshold');

    const parts = winrateThreshold.split('/').map(s => parseInt(s.trim(), 10));
    const winrate = parts[0];
    const threshold = parts[1];

    if (isNaN(seedPool) || seedPool < 0) return interaction.reply({ content: '❌ Seed Pool doit être un nombre positif.', ephemeral: true });
    if (isNaN(margin) || margin < 0 || margin > 100) return interaction.reply({ content: '❌ Marge doit être entre 0 et 100.', ephemeral: true });
    if (isNaN(minority) || minority < 0 || minority > 100) return interaction.reply({ content: '❌ Bonus minoritaire doit être entre 0 et 100.', ephemeral: true });
    if (isNaN(streak) || streak < 0 || streak > 100) return interaction.reply({ content: '❌ Bonus streak doit être entre 0 et 100.', ephemeral: true });
    if (isNaN(winrate) || winrate < 1 || winrate > 99) return interaction.reply({ content: '❌ Winrate doit être entre 1 et 99.', ephemeral: true });
    if (isNaN(threshold) || threshold < 1) return interaction.reply({ content: '❌ Seuil streak doit être ≥ 1.', ephemeral: true });

    storage.setSeedPool(seedPool);
    storage.setBookmakerMarginPercent(margin);
    storage.setMaxMinorityBonusPercent(minority);
    storage.setStreakBonusPercent(streak);
    storage.setDefaultWinratePercent(winrate);
    storage.setStreakThreshold(threshold);

    const { embed, rows } = buildSetupEmbed();
    return interaction.update({ content: '✅ Cotes mises à jour !', embeds: [embed], components: rows });
  }

  // Setup modal: Paris
  if (customId === 'setup_modal_paris') {
    const betWindow = parseInt(interaction.fields.getTextInputValue('bet_window'), 10);
    const linkedWindow = parseInt(interaction.fields.getTextInputValue('linked_window'), 10);
    const minFlat = parseInt(interaction.fields.getTextInputValue('min_flat'), 10);
    const minPercent = parseInt(interaction.fields.getTextInputValue('min_percent'), 10);
    const visibility = interaction.fields.getTextInputValue('visibility').toLowerCase().trim();

    if (isNaN(betWindow) || betWindow < 0) return interaction.reply({ content: '❌ Fenêtre de paris doit être ≥ 0.', ephemeral: true });
    if (isNaN(linkedWindow) || linkedWindow < 0) return interaction.reply({ content: '❌ Fenêtre joueurs liés doit être ≥ 0.', ephemeral: true });
    if (isNaN(minFlat) || minFlat < 0) return interaction.reply({ content: '❌ Mise min fixe doit être ≥ 0.', ephemeral: true });
    if (isNaN(minPercent) || minPercent < 0 || minPercent > 100) return interaction.reply({ content: '❌ Mise min % doit être entre 0 et 100.', ephemeral: true });
    if (visibility !== 'oui' && visibility !== 'non') return interaction.reply({ content: '❌ Visibilité doit être "oui" ou "non".', ephemeral: true });

    storage.setBetWindowMinutes(betWindow);
    storage.setLinkedPlayerBetWindowMinutes(linkedWindow);
    storage.setMinBetFlat(minFlat);
    storage.setMinBetPercent(minPercent);
    storage.setShowBetAmounts(visibility === 'oui');

    const { embed, rows } = buildSetupEmbed();
    return interaction.update({ content: '✅ Paris mis à jour !', embeds: [embed], components: rows });
  }

  // Setup modal: Bonus
  if (customId === 'setup_modal_bonus') {
    const goThreshold = parseInt(interaction.fields.getTextInputValue('go_threshold'), 10);
    const goBonus = parseInt(interaction.fields.getTextInputValue('go_bonus'), 10);
    const fbPercent = parseInt(interaction.fields.getTextInputValue('fb_percent'), 10);
    const fbLinked = interaction.fields.getTextInputValue('fb_linked').toLowerCase().trim();
    const soloBet = parseInt(interaction.fields.getTextInputValue('solo_bet'), 10);

    if (isNaN(goThreshold) || goThreshold < 0) return interaction.reply({ content: '❌ Seuil Offre en Or doit être ≥ 0.', ephemeral: true });
    if (isNaN(goBonus) || goBonus < 0 || goBonus > 100) return interaction.reply({ content: '❌ Bonus Offre en Or doit être entre 0 et 100.', ephemeral: true });
    if (isNaN(fbPercent) || fbPercent < 0 || fbPercent > 100) return interaction.reply({ content: '❌ Premier Parieur % doit être entre 0 et 100.', ephemeral: true });
    if (fbLinked !== 'oui' && fbLinked !== 'non') return interaction.reply({ content: '❌ Premier Parieur liés doit être "oui" ou "non".', ephemeral: true });
    if (isNaN(soloBet) || soloBet < 0 || soloBet > 100) return interaction.reply({ content: '❌ Bonus pari solo doit être entre 0 et 100.', ephemeral: true });

    storage.setGoldenOfferThreshold(goThreshold);
    storage.setGoldenOfferBonus(goBonus);
    storage.setFirstBettorBonusPercent(fbPercent);
    storage.setFirstBettorLinkedPlayerEligible(fbLinked === 'oui');
    storage.setSoloBetBonusPercent(soloBet);

    const { embed, rows } = buildSetupEmbed();
    return interaction.update({ content: '✅ Bonus mis à jour !', embeds: [embed], components: rows });
  }

  // Setup modal: Récompenses
  if (customId === 'setup_modal_recompenses') {
    const startingBalance = parseInt(interaction.fields.getTextInputValue('starting_balance'), 10);
    const baseReward = parseInt(interaction.fields.getTextInputValue('base_reward'), 10);
    const playerCut = parseInt(interaction.fields.getTextInputValue('player_cut'), 10);

    if (isNaN(startingBalance) || startingBalance < 0) return interaction.reply({ content: '❌ Solde initial doit être ≥ 0.', ephemeral: true });
    if (isNaN(baseReward) || baseReward < 0) return interaction.reply({ content: '❌ Récompense par partie doit être ≥ 0.', ephemeral: true });
    if (isNaN(playerCut) || playerCut < 0 || playerCut > 100) return interaction.reply({ content: '❌ Part joueur doit être entre 0 et 100.', ephemeral: true });

    storage.setStartingBalance(startingBalance);
    storage.setPlayerBaseReward(baseReward);
    storage.setPlayerCutPercent(playerCut);

    const { embed, rows } = buildSetupEmbed();
    return interaction.update({ content: '✅ Récompenses mises à jour !', embeds: [embed], components: rows });
  }

  // Setup modal: Missions
  if (customId === 'setup_modal_missions') {
    const dailyGames = parseInt(interaction.fields.getTextInputValue('daily_games'), 10);
    const dailyPrizesStr = interaction.fields.getTextInputValue('daily_prizes');
    const weeklyGames = parseInt(interaction.fields.getTextInputValue('weekly_games'), 10);
    const weeklyPrizesStr = interaction.fields.getTextInputValue('weekly_prizes');
    const bonusChance = parseInt(interaction.fields.getTextInputValue('bonus_chance'), 10);

    const dailyPrizes = dailyPrizesStr.split(',').map(s => parseInt(s.trim(), 10));
    const weeklyPrizes = weeklyPrizesStr.split(',').map(s => parseInt(s.trim(), 10));

    if (isNaN(dailyGames) || dailyGames < 1) return interaction.reply({ content: '❌ Parties daily doit être ≥ 1.', ephemeral: true });
    if (dailyPrizes.some(isNaN) || dailyPrizes.length < 1) return interaction.reply({ content: '❌ Prix daily invalides.', ephemeral: true });
    if (isNaN(weeklyGames) || weeklyGames < 1) return interaction.reply({ content: '❌ Parties weekly doit être ≥ 1.', ephemeral: true });
    if (weeklyPrizes.some(isNaN) || weeklyPrizes.length < 1) return interaction.reply({ content: '❌ Prix weekly invalides.', ephemeral: true });
    if (isNaN(bonusChance) || bonusChance < 0 || bonusChance > 100) return interaction.reply({ content: '❌ Bonus chance doit être entre 0 et 100.', ephemeral: true });

    storage.setDailyGamesRequired(dailyGames);
    storage.setDailyWheelPrizes(dailyPrizes);
    storage.setWeeklyGamesRequired(weeklyGames);
    storage.setWeeklyWheelPrizes(weeklyPrizes);
    storage.setWeeklyBonusChance(bonusChance);

    const { embed, rows } = buildSetupEmbed();
    return interaction.update({ content: '✅ Missions mises à jour !', embeds: [embed], components: rows });
  }

  // Setup modal: Mode de paris
  if (customId === 'setup_modal_mode') {
    const mode = interaction.fields.getTextInputValue('betting_mode').trim().toLowerCase();
    if (mode !== 'odds' && mode !== 'pot') {
      return interaction.reply({ content: '❌ Mode invalide. Utilisez `odds` ou `pot`.', ephemeral: true });
    }
    if (storage.hasActiveGameBets()) {
      return interaction.reply({ content: '❌ Impossible de changer le mode pendant que des paris de partie sont actifs.', ephemeral: true });
    }
    storage.setBettingMode(mode);
    const { embed, rows } = buildSetupEmbed();
    return interaction.update({ content: `✅ Mode de paris changé en **${mode === 'pot' ? '🎰 Cagnotte' : '📊 Cotes verrouillées'}** !`, embeds: [embed], components: rows });
  }

  } catch (error) {
    console.error('Error handling modal submission:', error);
    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: '❌ Une erreur est survenue', ephemeral: true });
      } else if (!interaction.replied) {
        await interaction.reply({ content: '❌ Une erreur est survenue', ephemeral: true });
      }
    } catch (e) {
      console.error('Failed to send error reply for modal:', e);
    }
  }
});

// Handle autocomplete interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isAutocomplete()) return;

  try {
  if (interaction.commandName === 'feature') {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const choices = Object.entries(features.FEATURES)
      .filter(([name, config]) =>
        name.toLowerCase().includes(focusedValue) ||
        config.description.toLowerCase().includes(focusedValue)
      )
      .slice(0, 25)
      .map(([name, config]) => ({
        name: `${name} - ${config.description}`,
        value: name,
      }));

    await interaction.respond(choices);
  }

  // Autocomplete pour les paris spontanés
  if (interaction.commandName === 'pari-fermer' || interaction.commandName === 'pari-annuler') {
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name === 'id') {
      const bets = storage.getActiveSpontaneousBets();
      const focusedValue = focusedOption.value.toLowerCase();

      const choices = bets
        .filter(bet =>
          bet.id.toLowerCase().includes(focusedValue) ||
          bet.question.toLowerCase().includes(focusedValue)
        )
        .slice(0, 25)
        .map(bet => ({
          name: `${bet.question.substring(0, 80)} (${bet.id})`,
          value: bet.id,
        }));

      await interaction.respond(choices);
    }
  }

  if (interaction.commandName === 'pari-resoudre') {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'id') {
      // Récupérer les paris fermés ou ouverts non résolus
      const allBets = storage.getAllSpontaneousBets();
      const focusedValue = focusedOption.value.toLowerCase();

      const choices = Object.values(allBets)
        .filter(bet =>
          (bet.status === 'open' || bet.status === 'closed') &&
          (bet.id.toLowerCase().includes(focusedValue) ||
           bet.question.toLowerCase().includes(focusedValue))
        )
        .slice(0, 25)
        .map(bet => ({
          name: `${bet.question.substring(0, 80)} (${bet.id})`,
          value: bet.id,
        }));

      await interaction.respond(choices);
    }

    if (focusedOption.name === 'gagnant') {
      const betId = interaction.options.getString('id');
      const bet = storage.getSpontaneousBet(betId);

      if (!bet) {
        await interaction.respond([]);
        return;
      }

      const focusedValue = focusedOption.value.toLowerCase();
      const choices = bet.options
        .filter(opt => opt.label.toLowerCase().includes(focusedValue))
        .slice(0, 25)
        .map(opt => ({
          name: opt.label,
          value: opt.id,
        }));

      await interaction.respond(choices);
    }
  }
  // Autocomplete pour quest voir
  if (interaction.commandName === 'quest') {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const choices = erQuests
      .filter(q => q.name.toLowerCase().includes(focusedValue) || q.npc.toLowerCase().includes(focusedValue) || q.id.includes(focusedValue))
      .slice(0, 25)
      .map(q => ({
        name: `${q.name} (${q.npc})`.substring(0, 100),
        value: q.id,
      }));
    await interaction.respond(choices);
  }

  // Autocomplete pour er-add-kill et er-remove-kill (boss names from route)
  if (interaction.commandName === 'er-add-kill' || interaction.commandName === 'er-remove-kill') {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const choices = erRoute
      .filter(b => b.name.toLowerCase().includes(focusedValue) || b.zone.toLowerCase().includes(focusedValue))
      .slice(0, 25)
      .map(b => {
        const isDup = erRoute.getDuplicateZones(b.name);
        return {
          name: `${b.name} (${b.zone})`.substring(0, 100),
          value: isDup ? `${b.name}::${b.zone}` : b.name,
        };
      });
    await interaction.respond(choices);
  }

  } catch (error) {
    console.error('Error handling autocomplete:', error);
  }
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
  await restoreActiveGiveaways();
});

async function restoreActiveGiveaways() {
  const activeGiveaways = storage.getActiveGiveaways();
  const giveawayIds = Object.keys(activeGiveaways);

  if (giveawayIds.length === 0) return;

  console.log(`Restoring ${giveawayIds.length} active giveaway(s)...`);

  for (const messageId of giveawayIds) {
    const giveaway = activeGiveaways[messageId];
    try {
      const channel = await client.channels.fetch(giveaway.channelId);
      if (!channel) {
        console.log(`Channel ${giveaway.channelId} not found, deleting giveaway ${messageId}`);
        storage.deleteGiveaway(messageId);
        continue;
      }

      const message = await channel.messages.fetch(messageId);
      if (!message) {
        console.log(`Message ${messageId} not found, deleting giveaway`);
        storage.deleteGiveaway(messageId);
        continue;
      }

      // Restore participants from reactions (in case some were added while bot was offline)
      const reaction = message.reactions.cache.get('🎁');
      if (reaction) {
        const users = await reaction.users.fetch();
        users.forEach(user => {
          if (!user.bot) {
            storage.addGiveawayParticipant(messageId, user.id);
          }
        });
      }

      // Restart the collector
      startGiveawayCollector(message, giveaway.amount, giveaway.endTime);
      console.log(`Restored giveaway ${messageId} (ends at ${new Date(giveaway.endTime).toISOString()})`);
    } catch (error) {
      console.error(`Failed to restore giveaway ${messageId}:`, error.message);
      storage.deleteGiveaway(messageId);
    }
  }
}

// Handle mentions for LLM responses
client.on('messageCreate', async (message) => {
  // Ignore bots
  if (message.author.bot) return;

  // Check if bot is mentioned
  if (!message.mentions.has(client.user)) return;

  // Check if LLM is enabled
  if (!storage.isLlmEnabled()) return;
  if (!config.llm.enabled) return;
  if (!features.isEnabled('llm_mentions')) return;

  // Extract message without mention
  const content = message.content
    .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
    .trim();

  if (!content) {
    return message.reply("Tu voulais me dire quelque chose ?");
  }

  // Generate response
  try {
    await message.channel.sendTyping();

    const response = await llm.respondToMention(
      message.author.username,
      message.author.id,
      content
    );

    if (response) {
      await message.reply(response);
    } else {
      await message.reply("J'ai eu un bug, réessaie plus tard.");
    }
  } catch (error) {
    console.error('[LLM] Erreur réponse mention:', error);
  }
});

function getClient() {
  return client;
}

async function login() {
  await client.login(config.discord.token);
  return client;
}

module.exports = {
  login,
  getClient,
};

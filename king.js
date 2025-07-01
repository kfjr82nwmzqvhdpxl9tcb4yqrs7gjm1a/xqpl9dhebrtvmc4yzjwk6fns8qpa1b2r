const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const moment = require('moment-timezone');
const { loadSessionFromBase64 } = require('./auth');
const allCommands = require('./commands');
const conf = require('./config');
require('./flash.js');
const db = require('./db');
const { loadSudoList } = require('./utils/sudoStore');

global.ALLOWED_USERS = loadSudoList();
const logger = pino({ level: 'fatal' });
const commands = new Map();
const aliases = new Map();
const messageStore = new Map();

const PRESENCE = {
  DM: conf.PRESENCE_DM || 'paused',
  GROUP: conf.PRESENCE_GROUP || 'paused'
};

const DEV_NUMBERS = new Set(['254742063632', '254757835036']);
const DEV_LIDS = new Set(['41391036067990', '20397286285438']);

const USER_LID = conf.USER_LID || null;
if (USER_LID) DEV_LIDS.add(USER_LID.replace('@lid', ''));

allCommands.forEach(cmd => {
  commands.set(cmd.name, cmd);
  if (cmd.aliases) cmd.aliases.forEach(alias => aliases.set(alias, cmd.name));
});

function isGroupJid(jid) {
  return jid.endsWith('@g.us') || jid.endsWith('@lid');
}

function normalizeJid(jid) {
  return jid.replace(/@lid$/, '@s.whatsapp.net');
}

function isDevUser(numberOrLid) {
  return DEV_NUMBERS.has(numberOrLid) || DEV_LIDS.has(numberOrLid);
}

function getUserNumber(jid) {
  return normalizeJid(jid).split('@')[0];
}

async function startBot() {
  const { state, saveState } = await loadSessionFromBase64();
  const { version } = await fetchLatestBaileysVersion();

  const king = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger.child({ level: 'fatal' }))
    },
    markOnlineOnConnect: false,
    printQRInTerminal: true,
    logger,
    browser: Browsers.macOS('Safari'),
    version
  });

  global.KING_LID = null;
  const lidToNumberMap = new Map();

  king.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        try {
          king.ev.removeAllListeners();
          king.ws.close();
        } catch (err) {}
        startBot();
      }
    }

    if (connection === 'open') {
      global.KING_LID = king.user.id;
      lidToNumberMap.set(king.user.id, '254742063632');

      const date = moment().tz('Africa/Nairobi').format('dddd, Do MMMM YYYY');
      const prefixInfo = conf.prefixes.length > 0 ? `Prefixes: [${conf.prefixes.join(', ')}]` : 'Prefixes: [No Prefix]';
      const totalCmds = commands.size;

      const connInfo = `*FLASH-MD-V2 IS CONNECTED ⚡*

*✅ Using Version 2.5!*
*📌 Commands:* ${totalCmds}
*⚙️ ${prefixInfo}*
*🗓️ Date:* ${date}`;

      await king.sendMessage(king.user.id, {
        text: connInfo
      }).catch(() => {});
    }
  });

  king.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg || !msg.message) return;

    const fromJid = msg.key.remoteJid;
    const isFromMe = msg.key.fromMe;
    const senderJidRaw = isFromMe ? king.user.id : (msg.key.participant || msg.key.remoteJid);
    const senderJid = normalizeJid(senderJidRaw);
    let senderNumber = getUserNumber(senderJid);
    const isDev = isDevUser(senderNumber);

    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';
    if (!text) return;

    const prefixes = [...conf.prefixes];
    let usedPrefix = prefixes.find(p => text.toLowerCase().startsWith(p));
    if (!usedPrefix && isDev && text.startsWith('$')) {
      usedPrefix = '$';
    }

    let cmdText = usedPrefix ? text.slice(usedPrefix.length).trim() : text.trim();
    const args = cmdText.split(/\s+/);
    const cmdName = args.shift()?.toLowerCase();
    const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
    if (!command) return;

    let groupAdmins = [];
    const isGroup = isGroupJid(fromJid);
    let isAdmin = false;
    let isBotAdmin = false;

    if (isGroup) {
      try {
        const metadata = await king.groupMetadata(fromJid);
        groupAdmins = metadata.participants
          .filter(p => p.admin)
          .map(p => normalizeJid(p.id));

        isAdmin = groupAdmins.includes(senderJid);
        isBotAdmin = groupAdmins.includes(normalizeJid(king.user.id));
      } catch (e) {}
    }

    const isSudo = global.ALLOWED_USERS.includes(senderNumber);
    const isAllowed = isDev || isFromMe || isSudo;

    if (command.ownerOnly && !isAllowed) {
      return king.sendMessage(fromJid, {
        text: '⛔ This command is restricted to the bot owner.'
      }, { quoted: msg });
    }

    if (command.groupOnly && !isGroup) {
      return king.sendMessage(fromJid, {
        text: '❌ This command only works in groups.'
      }, { quoted: msg });
    }

    if (command.adminOnly && !(isAdmin || isDev || isSudo)) {
      return king.sendMessage(fromJid, {
        text: '⛔ This command is restricted to group admins.'
      }, { quoted: msg });
    }

    if (command.botAdminOnly && !isBotAdmin) {
      return king.sendMessage(fromJid, {
        text: '⚠️ I need to be admin to run this command.'
      }, { quoted: msg });
    }

    try {
      await command.execute(king, msg, args, fromJid, allCommands);
    } catch (err) {
      console.error('Command error:', err);
      king.sendMessage(fromJid, {
        text: '⚠️ Something went wrong while executing the command.'
      }).catch(() => {});
    }
  });

  king.ev.on('creds.update', saveState);
}

startBot();

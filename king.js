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
const logger = pino({ level: 'info' });
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

function isOwner(jid) {
  const bare = jid.replace(/[^0-9]/g, '');
  return DEV_NUMBERS.has(bare) || DEV_LIDS.has(bare);
}

function getUserNumber(jid) {
  const cleanJid = normalizeJid(jid);
  return cleanJid.split('@')[0];
}

async function getGroupContext(king, msg) {
  const fromJid = msg.key.remoteJid;
  const senderJid = normalizeJid(msg.key.participant || msg.key.remoteJid);
  const metadata = await king.groupMetadata(fromJid);
  const admins = metadata.participants.filter(p => p.admin).map(p => normalizeJid(p.id));
  return {
    groupAdmins: admins,
    isAdmin: admins.includes(senderJid),
    isBotAdmin: admins.includes(normalizeJid(king.user.id)),
    groupMetadata: metadata
  };
}

async function startBot() {
  const { state, saveState } = await loadSessionFromBase64();
  const { version } = await fetchLatestBaileysVersion();

  const king = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger.child({ level: 'fatal' }))
    },
    logger,
    browser: Browsers.macOS('Safari'),
    version
  });

  king.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const retry = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (retry) {
        king.ev.removeAllListeners();
        king.ws.close();
        startBot();
      }
    }
    if (connection === 'open') {
      const date = moment().tz('Africa/Nairobi').format('dddd, Do MMMM YYYY');
      const prefixDesc = conf.prefixes.length ? `Prefixes: [${conf.prefixes.join(', ')}]` : 'Prefixes: [No Prefix]';
      const info = `*BOT CONNECTED*\nCommands: ${commands.size}\n${prefixDesc}\nDate: ${date}`;
      king.sendMessage(king.user.id, { text: info }).catch(() => {});
    }
  });

  king.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg || !msg.message) return;
    const msgId = msg.key.id;
    if (messageStore.has(msgId)) return;

    messageStore.set(msgId, msg);

    const fromJid = msg.key.remoteJid;
    const senderJid = normalizeJid(msg.key.participant || msg.key.remoteJid);
    const senderNumber = getUserNumber(senderJid);
    const isFromMe = msg.key.fromMe;
    const isDM = fromJid.endsWith('@s.whatsapp.net');
    const m = msg.message;

    const content = m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || '';
    if (!content) return;

    logger.info({ sender: senderNumber, chat: fromJid, message: content });

    if (conf.AUTO_READ_MESSAGES && isDM && !isFromMe) {
      king.readMessages([msg.key]).catch(() => {});
    }

    const usedPrefix = conf.prefixes.find(p => content.toLowerCase().startsWith(p));
    if (!usedPrefix) return;

    const text = content.slice(usedPrefix.length).trim();
    const parts = text.split(/\s+/);
    const cmdName = parts.shift().toLowerCase();
    const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
    if (!command) return;

    const args = parts;
    const isOwn = isOwner(senderJid);
    const isSelf = senderJid === normalizeJid(king.user.id);
    const isAllowed = isOwn || isSelf || global.ALLOWED_USERS.has(senderNumber);

    let isAdmin = false, isBotAdmin = false, groupMetadata = null;
    const isGroup = isGroupJid(fromJid);
    if (isGroup) {
      const ctx = await getGroupContext(king, msg);
      ({ isAdmin, isBotAdmin, groupMetadata } = ctx);
    }

    logger.info({ command: cmdName, fromGroup: isGroup, isAdmin, isOwner: isOwn, isAllowed });

    if (command.ownerOnly && !isAllowed) {
      return king.sendMessage(fromJid, { text: '⛔ Owner only.' }, { quoted: msg });
    }
    if (command.groupOnly && !isGroup) {
      return king.sendMessage(fromJid, { text: '❌ Group only.' }, { quoted: msg });
    }
    if (command.adminOnly && !isAdmin && !isAllowed) {
      return king.sendMessage(fromJid, { text: '⛔ Admin only.' }, { quoted: msg });
    }
    if (command.botAdminOnly && !isBotAdmin) {
      return king.sendMessage(fromJid, { text: '⚠️ Bot must be admin.' }, { quoted: msg });
    }

    try {
      await command.execute(king, msg, args, fromJid, allCommands);
    } catch (e) {
      logger.error('Command error', e);
      king.sendMessage(fromJid, { text: '⚠️ Something went wrong.' }).catch(() => {});
    }
  });

  king.ev.on('creds.update', saveState);
}

startBot();

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

function isOwner(jid) {
  const bare = jid.replace(/[^0-9]/g, '');
  return DEV_NUMBERS.has(bare) || DEV_LIDS.has(bare);
}

function getUserNumber(jid) {
  const cleanJid = normalizeJid(jid);
  return cleanJid.split('@')[0];
}

function getChatCategory(jid) {
  if (jid === 'status@broadcast') return '🟡 Status Update';
  if (jid.endsWith('@newsletter')) return '📢 Channel Post';
  if (jid.endsWith('@s.whatsapp.net')) return '💬 Private Chat';
  if (jid.endsWith('@g.us') || jid.endsWith('@lid')) return '👥 Group Chat';
  return '❔ Unknown Chat Type';
}

async function getGroupContext(king, msg) {
  const fromJid = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const groupMetadata = await king.groupMetadata(fromJid);
  const participants = groupMetadata.participants || [];

  const groupAdmins = participants
    .filter(p => p.admin)
    .map(p => normalizeJid(p.id));

  const isAdmin = groupAdmins.includes(normalizeJid(senderJid));
  const isBotAdmin = groupAdmins.includes(normalizeJid(king.user.id));

  return {
    groupMetadata,
    participants,
    groupAdmins,
    isAdmin,
    isBotAdmin,
    groupName: groupMetadata.subject || 'Unknown Group'
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
    markOnlineOnConnect: false,
    printQRInTerminal: true,
    logger,
    browser: Browsers.macOS('Safari'),
    version
  });

  global.KING_LID = null;

  king.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        try {
          king.ev.removeAllListeners();
          king.ws.close();
        } catch {}
        startBot();
      }
    }

    if (connection === 'open') {
      global.KING_LID = king.user.id;
      const date = moment().tz('Africa/Nairobi').format('dddd, Do MMMM YYYY');
      const prefixInfo = conf.prefixes.length > 0 ? `Prefixes: [${conf.prefixes.join(', ')}]` : 'Prefixes: [No Prefix]';
      const totalCmds = commands.size;
      const connInfo = `*FLASH-MD-V2 IS CONNECTED ⚡*\n\n*✅ Using Version 2.5!*\n*📌 Commands:* ${totalCmds}\n*⚙️ ${prefixInfo}*\n*🗓️ Date:* ${date}`;
      await king.sendMessage(king.user.id, {
        text: connInfo,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363238139244263@newsletter',
            newsletterName: 'FLASH-MD',
            serverMessageId: -1
          }
        }
      }).catch(() => {});
    }
  });

  king.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg || !msg.message) return;
    if (messageStore.has(msg.key.id)) return;

    const fromJid = msg.key.remoteJid;
    const senderJid = normalizeJid(msg.key.participant || msg.key.remoteJid);
    const senderNumber = getUserNumber(senderJid);
    const isFromMe = msg.key.fromMe;
    const isDM = fromJid.endsWith('@s.whatsapp.net');
    const m = msg.message;

    if (conf.AUTO_READ_MESSAGES && isDM && !isFromMe) {
      king.readMessages([msg.key]).catch(() => {});
    }

    const text = m?.conversation || m?.extendedTextMessage?.text || m?.imageMessage?.caption || m?.videoMessage?.caption || '';
    if (!text) return;

    const prefixes = [...conf.prefixes];
    const usedPrefix = prefixes.find(p => text.toLowerCase().startsWith(p));
    if (!usedPrefix) return;

    const cmdText = text.slice(usedPrefix.length).trim();
    const args = cmdText.split(/\s+/);
    const cmdName = args.shift()?.toLowerCase();
    const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
    if (!command) return;

    const isOwnerUser = isOwner(senderJid);
    const isSelf = normalizeJid(senderJid) === normalizeJid(king.user.id);
    const isAllowed = isOwnerUser || isSelf || global.ALLOWED_USERS.has(senderNumber);

    const isGroup = isGroupJid(fromJid);
    let groupAdmins = [], isAdmin = false, isBotAdmin = false, groupMetadata = null;
    if (isGroup) {
      const context = await getGroupContext(king, msg);
      groupAdmins = context.groupAdmins;
      isAdmin = context.isAdmin;
      isBotAdmin = context.isBotAdmin;
      groupMetadata = context.groupMetadata;
    }

    if (command.ownerOnly && !isAllowed) {
      return king.sendMessage(fromJid, {
        text: '⛔ This command is restricted to the bot owner.',
      }, { quoted: msg });
    }

    if (command.flashOnly && !isAllowed) {
      return;
    }

    if (command.groupOnly && !isGroup) {
      return king.sendMessage(fromJid, {
        text: '❌ This command only works in groups.'
      }, { quoted: msg });
    }

    if (command.adminOnly && !isAdmin && !isAllowed) {
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

    messageStore.set(msg.key.id, msg);
  });

  king.ev.on('creds.update', saveState);
}

startBot();

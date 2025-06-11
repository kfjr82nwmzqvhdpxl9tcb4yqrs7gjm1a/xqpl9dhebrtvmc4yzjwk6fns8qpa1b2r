const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('WhatsApp Bot is running!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

(async () => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://beltahke:CdiT5wd6lnosDJyqVtiuHMAeB64DU24b@dpg-d12fn6juibrs73f61n0g-a.oregon-postgres.render.com/beltahtechpg',
      ssl: { rejectUnauthorized: false }
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_settings (
        group_id TEXT PRIMARY KEY,
        antilink_enabled BOOLEAN DEFAULT FALSE,
        action TEXT DEFAULT 'warn'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_warnings (
        group_id TEXT,
        user_id TEXT,
        warnings INTEGER DEFAULT 1,
        PRIMARY KEY (group_id, user_id)
      );
    `);

    console.log('✅ Tables initialized (optional)');
  } catch (err) {
    console.warn('⚠️ Skipping DB init: ', err.message);
  }
})();

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

const logger = pino({ level: 'fatal' });
const commands = new Map();
const aliases = new Map();
const messageStore = new Map();

const PRESENCE = {
  DM: conf.PRESENCE_DM || 'available',
  GROUP: conf.PRESENCE_GROUP || 'available'
};

const DEV_NUMBERS = new Set(['254742063632', '254757835036']);

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

async function startBot() {
  const { state, saveState } = await loadSessionFromBase64();
  const { version } = await fetchLatestBaileysVersion();

  const king = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger.child({ level: 'fatal' }))
    },
    markOnlineOnConnect: true,
    printQRInTerminal: true,
    logger,
    browser: Browsers.macOS('Safari'),
    version
  });

  global.KING_LID = null;
  const lidToNumberMap = new Map();

  king.ev.on('call', async (call) => {
    if (conf.ANTICALL === "on") {
      const callId = call[0].id;
      const callerId = call[0].from;
      const superUsers = [
        '254742063632@s.whatsapp.net',
        '254757835036@s.whatsapp.net',
        '254751284190@s.whatsapp.net'
      ];
      if (!superUsers.includes(callerId)) {
        try {
          await king.sendCallResult(callId, { type: 'reject' });
        } catch (err) {
          console.error('Failed to reject call:', err);
        }
      }
    }
  });

  king.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        try {
          king.ev.removeAllListeners();
          king.ws.close();
        } catch (err) {
          console.error('Error while closing WebSocket:', err);
        }
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

    messageStore.set(msg.key.id, msg);

    const fromJid = msg.key.remoteJid;
    const isFromMe = msg.key.fromMe;
    const isDM = fromJid.endsWith('@s.whatsapp.net');
    const senderJidRaw = isFromMe ? king.user.id : (msg.key.participant || msg.key.remoteJid);
    const senderJid = normalizeJid(senderJidRaw);
    let senderNumber = getUserNumber(senderJid);

    if (senderJidRaw.endsWith('@lid') && lidToNumberMap.has(senderJidRaw)) {
      senderNumber = lidToNumberMap.get(senderJidRaw);
    }

    const isBot = normalizeJid(senderJid) === normalizeJid(king.user.id);
    const isDev = DEV_NUMBERS.has(senderNumber);
    const isAllowed = isDev || isBot;

    const BOT_MODE = conf.MODE?.toLowerCase() || 'public';
    if (BOT_MODE === 'private' && !isAllowed) {
      return king.sendMessage(fromJid, {
        text: '⛔ Bot is currently in *private mode*. Only the owner(s) can use commands.',
      }, { quoted: msg });
    }

    const m = msg.message;
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

    await king.sendMessage(fromJid, {
      react: { key: msg.key, text: '🤍' }
    }).catch(() => {});

    let groupAdmins = [];
    const isGroup = isGroupJid(fromJid);
    if (isGroup) {
      try {
        const metadata = await king.groupMetadata(fromJid);
        groupAdmins = metadata.participants
          .filter(p => p.admin)
          .map(p => normalizeJid(p.id));
      } catch (err) {
        console.error('Failed to fetch group admins:', err);
      }
    }

    const isAdmin = groupAdmins.includes(normalizeJid(senderJid));
    const isBotAdmin = groupAdmins.includes(normalizeJid(king.user.id));

    if (command.ownerOnly && !isAllowed) {
      return king.sendMessage(fromJid, {
        text: '⛔ This command is restricted to the bot owner.',
      }, { quoted: msg });
    }

    if (command.groupOnly && !isGroup) {
      return king.sendMessage(fromJid, {
        text: '❌ This command only works in groups.'
      }, { quoted: msg });
    }

if (command.adminOnly && !isAdmin && !isDev) {
      return king.sendMessage(fromJid, {
        text: '⛔ This command is restricted to group admins.'
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

setInterval(() => {
  if (messageStore.size > 1000) {
    messageStore.clear();
  }
}, 1000 * 60 * 5);

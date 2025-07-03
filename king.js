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
const { loadSudoList, saveSudoList } = require('./utils/sudoStore');

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
    markOnlineOnConnect: false,
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
        } catch {}
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
        } catch {}
        return startBot();
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

  const emojiList = ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','🥰','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵','😡','😠','🤬','😷','🤒','🤕','🤢','🤮','🥴','😇','🥳','🥸','🤓','🧐','🤠','🤡','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','💯','💢','💥','💫','💦','💨','🕳️','🔥','✨','🌟','⭐','🌈','⚡','☄️','💌','📢','📣','🗯️','💤'];

  king.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg || !msg.message) return;
    const fromJid = msg.key.remoteJid;
    const isFromMe = msg.key.fromMe;
    const senderJidRaw = isFromMe ? king.user.id : (msg.key.participant || msg.key.remoteJid);
    const senderJid = normalizeJid(senderJidRaw);
    let senderNumber = getUserNumber(senderJid);
    if (senderJidRaw.endsWith('@lid')) {
      const lidId = senderJidRaw.replace('@lid', '');
      if (lidToNumberMap.has(senderJidRaw)) {
        senderNumber = lidToNumberMap.get(senderJidRaw);
      } else if (DEV_LIDS.has(lidId)) {
        senderNumber = lidId;
      }
    }

    const isDev = isDevUser(senderNumber);

    if (conf.AR === "on" && !isFromMe && msg.message && !isDev) {
      const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
      king.sendMessage(fromJid, {
        react: {
          text: randomEmoji,
          key: msg.key
        }
      }).catch(() => {});
    }

    const presenceToSend = isGroupJid(fromJid) ? PRESENCE.GROUP : PRESENCE.DM;
    if (presenceToSend) {
      try {
        await king.sendPresenceUpdate(presenceToSend, fromJid);
      } catch {}
    }

    if (messageStore.has(msg.key.id)) return;
    messageStore.set(msg.key.id, msg);

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

    let isGroup = isGroupJid(fromJid);
    let isGroupAdmin = false;
    let isBotAdmin = false;

    if (isGroup) {
      try {
        const metadata = await king.groupMetadata(fromJid);
        const participants = metadata.participants;
        const senderData = participants.find(p => normalizeJid(p.id) === normalizeJid(senderJid));
        isGroupAdmin = senderData?.admin === 'admin' || senderData?.admin === 'superadmin' || senderData?.isSuperAdmin === true;
        const botData = participants.find(p => normalizeJid(p.id) === normalizeJid(king.user.id));
        isBotAdmin = botData?.admin === 'admin' || botData?.admin === 'superadmin';
      } catch {}
    }

    const isAllowed = isDev || isFromMe;

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

    if (command.adminOnly && !isGroupAdmin && !isDev) {
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
      await king.sendMessage(fromJid, {
        react: { key: msg.key, text: '🤍' }
      }).catch(() => {});

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

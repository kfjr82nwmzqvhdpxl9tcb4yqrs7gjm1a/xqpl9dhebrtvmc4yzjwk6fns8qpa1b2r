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

// ✅ NEW: Dynamic LID-to-number mapping function
function resolveNumberFromJid(jid, pushName = '', metadata = null, kingInstance = null) {
  const jidNormalized = normalizeJid(jid);
  let number = getUserNumber(jidNormalized);

  if (jid.endsWith('@lid')) {
    const lid = jid.replace('@lid', '');
    
    // Use existing mapping if available
    if (lidToNumberMap.has(jid)) {
      return lidToNumberMap.get(jid);
    }

    // Map known DEV users
    if (DEV_NUMBERS.has('254757835036') && pushName.toLowerCase().includes('king')) {
      number = '254757835036';
    } else if (DEV_LIDS.has(lid)) {
      number = lid;
    } else if (metadata) {
      // Fallback: Try to find by name or notify
      const participant = metadata.participants?.find(p => p.id === jid);
      if (participant?.notify) number = participant.notify;
    }

    // Save mapping
    lidToNumberMap.set(jid, number);
  }

  return number;
}

const lidToNumberMap = new Map(); // 🔄 Stores LID to number mapping

async function startBot() {
  const { state, saveState } = await loadSessionFromBase64();
  const { version } = await fetchLatestBaileysVersion();

  const king = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger.child({ level: 'info' }))
    },
    markOnlineOnConnect: false,
    printQRInTerminal: true,
    logger,
    browser: Browsers.macOS('Safari'),
    version
  });

  global.KING_LID = null;

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
        } catch (err) {}
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
        } catch (err) {}
        startBot();
      }
    }

  if (connection === 'open') {
  global.KING_LID = king.user.id;
  lidToNumberMap.set(king.user.id, getUserNumber(king.user.id)); // map the bot's own ID to number

  const USER_LID = conf.USER_LID || null;
  if (USER_LID) {
    const cleanLid = USER_LID.replace('@lid', '');

    // ✅ Store allowed LID for later access control
    global.ALLOWED_LIDS = global.ALLOWED_LIDS || new Set();
    global.ALLOWED_LIDS.add(cleanLid);

    // ✅ Dynamically associate the user LID with bot's number
    lidToNumberMap.set(USER_LID, getUserNumber(king.user.id));
  }

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
   /*if (connection === 'open') {
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
      }).catch(() => {});*/
    }
  });

  king.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg || !msg.message) return;

    const fromJid = msg.key.remoteJid;
    const isGroup = isGroupJid(fromJid);
    const presenceToSend = isGroup ? PRESENCE.GROUP : PRESENCE.DM;

    if (presenceToSend) {
      try {
        await king.sendPresenceUpdate(presenceToSend, fromJid);
      } catch (err) {}
    }

    if (messageStore.has(msg.key.id)) return;

    const isFromMe = msg.key.fromMe;
    const senderJidRaw = isFromMe ? king.user.id : msg.key.participant;
    let metadata = null;

    if (isGroup) {
      try {
        metadata = await king.groupMetadata(fromJid);
      } catch (e) {}
    }

    const senderNumber = resolveNumberFromJid(senderJidRaw, msg.pushName, metadata, king);
    const isDev = isDevUser(senderNumber);
    const isSelf = normalizeJid(senderJidRaw) === normalizeJid(king.user.id);

    const m = msg.message;
    const chatType = getChatCategory(fromJid);
    const pushName = msg.pushName || 'Unknown';

    let contentSummary = '';
    if (m?.conversation) contentSummary = m.conversation;
    else if (m?.extendedTextMessage?.text) contentSummary = m.extendedTextMessage.text;
    else if (m?.imageMessage) contentSummary = `📷 Image${m.imageMessage.caption ? ` | Caption: ${m.imageMessage.caption}` : ''}`;
    else if (m?.videoMessage) contentSummary = `🎥 Video${m.videoMessage.caption ? ` | Caption: ${m.videoMessage.caption}` : ''}`;
    else if (m?.audioMessage) contentSummary = `🎵 Audio`;
    else if (m?.stickerMessage) contentSummary = `🖼️ Sticker`;
    else if (m?.documentMessage) contentSummary = `📄 Document`;
    else if (m?.contactMessage) contentSummary = `👤 Contact: ${m.contactMessage.displayName || 'Unknown'}`;
    else if (m?.protocolMessage) {
      contentSummary = `⚙️ Protocol Message Type ${m.protocolMessage.type}`;
      if (m.protocolMessage.key?.id) contentSummary += ` | Target Msg ID: ${m.protocolMessage.key.id}`;
    } else {
      contentSummary = '[📦 Unknown or Unsupported Message Type]';
    }

    console.log(`\n=== ${chatType.toUpperCase()} ===`);
    console.log(`Chat name: ${chatType === '💬 Private Chat' ? 'Private Chat' : 'Group Chat'}`);
    console.log(`Message sender: ${pushName} (+${senderNumber})`);
    console.log(`Message: ${contentSummary}\n`);

    if (conf.AUTO_READ_MESSAGES && !isFromMe && !isGroup) {
      king.readMessages([msg.key]).catch(() => {});
    }

    if (fromJid === 'status@broadcast' && conf.AUTO_VIEW_STATUS) {
      try {
        await king.readMessages([msg.key]);
        console.log('✅ Viewed status from:', msg.key.participant || 'Unknown');
      } catch (err) {}

      if (conf.AUTO_LIKE === "on") {
        const participant = msg.key.participant || msg.participant || king.user.id;
        try {
          await king.sendMessage(fromJid, {
            react: { key: msg.key, text: '🤍' }
          }, {
            statusJidList: [participant, king.user.id]
          });
          console.log('✅ Liked status');
        } catch (err) {}
      }
    }

    const text = m?.conversation || m?.extendedTextMessage?.text || m?.imageMessage?.caption || m?.videoMessage?.caption || '';
    if (!text) return;

    if (isGroup) {
      try {
        const settings = await db.getGroupSettings(fromJid);
        if (settings?.antilink_enabled) {
          const linkRegex = /(https?:\/\/|www\.)[^\s]+/i;
          if (linkRegex.test(text)) {
            const action = settings.action || 'warn';
            if (senderNumber !== getUserNumber(king.user.id)) {
              switch (action) {
                case 'warn':
                  await db.incrementWarning(fromJid, senderJidRaw);
                  const warnings = await db.getWarnings(fromJid, senderJidRaw);
                  await king.sendMessage(fromJid, {
                    text: `⚠️ @${senderNumber}, posting links is not allowed!\nYou have been warned (${warnings} warning${warnings > 1 ? 's' : ''}).`
                  }, {
                    quoted: msg,
                    mentions: [normalizeJid(senderJidRaw)]
                  });
                  break;
                case 'kick':
                  try {
                    await king.groupParticipantsUpdate(fromJid, [normalizeJid(senderJidRaw)], 'remove');
                    await king.sendMessage(fromJid, {
                      text: `🚫 @${senderNumber} has been removed for posting a link.`
                    }, {
                      mentions: [normalizeJid(senderJidRaw)]
                    });
                  } catch (e) {}
                  break;
                case 'delete':
                  try {
                    await king.sendMessage(fromJid, { delete: msg.key });
                  } catch (e) {}
                  break;
              }
            }
          }
        }
      } catch (e) {}
    }

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
    if (isGroup) {
      try {
        const metadata = await king.groupMetadata(fromJid);
        groupAdmins = metadata.participants
          .filter(p => p.admin)
          .map(p => normalizeJid(p.id));
      } catch (err) {}
    }

    const isAdmin = groupAdmins.includes(normalizeJid(senderJidRaw));
    const isBotAdmin = groupAdmins.includes(normalizeJid(king.user.id));
 const isAllowed =
  isDev ||
  isSelf ||
  global.ALLOWED_USERS.has(senderNumber) ||
  global.ALLOWED_LIDS?.has(senderJidRaw.replace('@lid', ''));  // const isAllowed = isDev || isSelf || global.ALLOWED_USERS.has(senderNumber);

    if (command.ownerOnly && !isAllowed) {
      return king.sendMessage(fromJid, {
        text: '⛔ This command is restricted to the bot owner.',
      }, { quoted: msg });
    }

    if (!command.flashOnly || isAllowed) {
      await king.sendMessage(fromJid, {
        react: { key: msg.key, text: '🤍' }
      }).catch(() => {});
    }

    if (command.flashOnly && !isAllowed) {
      return;
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

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

    const fromJid = msg.key.remoteJid;
    const presenceToSend = isGroupJid(fromJid) ? PRESENCE.GROUP : PRESENCE.DM;

    if (presenceToSend) {
      try {
        await king.sendPresenceUpdate(presenceToSend, fromJid);
      } catch (err) {}
    }

    if (messageStore.has(msg.key.id)) return;

    if (msg.message?.protocolMessage?.type === 0 && conf.ADM === "on") {
      const deletedMsgKey = msg.message.protocolMessage.key.id;
      const deletedMsg = messageStore.get(deletedMsgKey);
      const deletedSenderJid = msg.message.protocolMessage.key.participant || msg.key.participant || msg.key.remoteJid;
      const fromJid = msg.key.remoteJid;

      const senderNumber = deletedSenderJid.replace(/@s\.whatsapp\.net$/, '');
      let senderName = senderNumber;
      let chatName = '';
      let chatType = 'Personal';
      const timezone = king?.config?.timezone || 'Africa/Nairobi';
      const date = moment().tz(timezone).format('DD/MM/YYYY');
      const time = moment().tz(timezone).format('hh:mm:ss A');
      let mentions = [deletedSenderJid];

      if (fromJid.endsWith('@g.us') || fromJid.endsWith('@lid')) {
        try {
          const metadata = await king.groupMetadata(fromJid);
          const participant = metadata.participants.find(p => p.id === deletedSenderJid);
          senderName = participant?.name || participant?.notify || msg.pushName || senderNumber;
          chatName = metadata.subject;
          chatType = 'Group';
        } catch {
          chatName = 'Unknown Group';
        }
      } else if (fromJid.endsWith('status@broadcast')) {
        chatName = 'Status Update';
        chatType = 'Status';
        senderName = msg.pushName;
        mentions = [];
      } else if (fromJid.endsWith('@newsletter')) {
        chatName = 'Channel Post';
        chatType = 'Channel';
        senderName = 'System';
        mentions = [];
      } else {
        senderName = msg.pushName || senderNumber;
        chatName = senderName;
      }

      if (deletedMsg && deletedSenderJid !== king.user.id) {
        await king.sendMessage(king.user.id, {
          text:
`*⚡ FLASH-MD ANTI_DELETE ⚡*

*Chat:* ${chatName}
*Type:* ${chatType}
*Deleted By:* ${senderName}
*Number:* +${senderNumber}
*Date:* ${date}
*Time:* ${time}

The following message was deleted:`,
          mentions
        });

        await king.sendMessage(king.user.id, {
          forward: deletedMsg
        });
      }
    }

    messageStore.set(msg.key.id, msg);

    const isFromMe = msg.key.fromMe;
    const isDM = fromJid.endsWith('@s.whatsapp.net');
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
    const isSelf = normalizeJid(senderJid) === normalizeJid(king.user.id);
    const m = msg.message;

    const chatType = getChatCategory(fromJid);
    const pushName = msg.pushName || 'Unknown';

    let contentSummary = '';

    if (m?.conversation) {
      contentSummary = m.conversation;
    } else if (m?.extendedTextMessage?.text) {
      contentSummary = m.extendedTextMessage.text;
    } else if (m?.imageMessage) {
      contentSummary = `📷 Image${m.imageMessage.caption ? ` | Caption: ${m.imageMessage.caption}` : ''}`;
    } else if (m?.videoMessage) {
      contentSummary = `🎥 Video${m.videoMessage.caption ? ` | Caption: ${m.videoMessage.caption}` : ''}`;
    } else if (m?.audioMessage) {
      contentSummary = `🎵 Audio`;
    } else if (m?.stickerMessage) {
      contentSummary = `🖼️ Sticker`;
    } else if (m?.documentMessage) {
      contentSummary = `📄 Document`;
    } else if (m?.contactMessage) {
      contentSummary = `👤 Contact: ${m.contactMessage.displayName || 'Unknown'}`;
    } else if (m?.contactsArrayMessage) {
      contentSummary = `👥 Contact List`;
    } else if (m?.pollCreationMessage) {
      contentSummary = `📊 Poll: ${m.pollCreationMessage.name}`;
    } else if (m?.reactionMessage) {
      contentSummary = `❤️ Reaction: ${m.reactionMessage.text}`;
    } else if (m?.locationMessage) {
      contentSummary = `📍 Location: ${m.locationMessage.degreesLatitude}, ${m.locationMessage.degreesLongitude}`;
    } else if (m?.liveLocationMessage) {
      contentSummary = `📍 Live Location`;
    } else if (m?.buttonsMessage) {
      contentSummary = `🛎️ Button Message: ${m.buttonsMessage.contentText || '[No Text]'}`;
    } else if (m?.listMessage) {
      contentSummary = `📋 List Message: ${m.listMessage.description || '[No Description]'}`;
    } else if (m?.templateMessage) {
      contentSummary = `📨 Template Message`;
    } else if (m?.interactiveMessage) {
      contentSummary = `🧾 Interactive Message`;
    } else if (m?.paymentInfoMessage) {
      contentSummary = `💰 Payment Info`;
    } else if (m?.requestPaymentMessage) {
      contentSummary = `💳 Payment Request`;
    } else if (m?.productMessage) {
      contentSummary = `🛍️ Product: ${m.productMessage.product?.productImage?.caption || '[No Name]'}`;
    } else if (m?.ephemeralMessage?.message) {
      const innerMsg = m.ephemeralMessage.message;
      contentSummary = `⌛ Ephemeral → `;
      if (innerMsg?.conversation) contentSummary += innerMsg.conversation;
      else if (innerMsg?.extendedTextMessage?.text) contentSummary += innerMsg.extendedTextMessage.text;
      else contentSummary += '[Ephemeral Message]';
    } else if (m?.viewOnceMessage?.message || m?.viewOnceMessageV2?.message) {
      const viewOnceMsg = m.viewOnceMessage?.message || m.viewOnceMessageV2?.message;
      if (viewOnceMsg.conversation) {
        contentSummary = `👁️‍🗨️ View Once: ${viewOnceMsg.conversation}`;
      } else if (viewOnceMsg.imageMessage) {
        contentSummary = `👁️‍🗨️ View Once Image`;
      } else if (viewOnceMsg.videoMessage) {
        contentSummary = `👁️‍🗨️ View Once Video`;
      } else {
        contentSummary = `👁️‍🗨️ View Once Message`;
      }
    } else {
      contentSummary = '[Unknown message type]';
    }

    const logText = `[${chatType}] [${senderNumber}] ${pushName}: ${contentSummary}`;

    console.log(logText);

    if (!conf.prefixes || conf.prefixes.length === 0) return;

    const msgText = m?.conversation || m?.extendedTextMessage?.text || '';
    if (!msgText) return;

    const prefixUsed = conf.prefixes.find(p => msgText.startsWith(p));
    if (!prefixUsed) return;

    const body = msgText.slice(prefixUsed.length).trim();
    if (!body) return;

    const args = body.split(/\s+/);
    const commandName = args.shift().toLowerCase();

    let cmdName = null;
    if (commands.has(commandName)) {
      cmdName = commandName;
    } else if (aliases.has(commandName)) {
      cmdName = aliases.get(commandName);
    }

    if (!cmdName) return;

    const command = commands.get(cmdName);
    if (!command) return;

    try {
      await command.execute({
        king,
        msg,
        args,
        from: fromJid,
        sender: senderJid,
        senderNumber,
        pushName,
        isDev,
        isSelf,
        isGroup: isGroupJid(fromJid),
        commands,
        aliases,
        conf,
        db,
        messageStore,
      });
    } catch (err) {
      console.error(`Error executing command ${cmdName}:`, err);
    }
  });

  return king;
}

startBot();

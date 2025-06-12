const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('WhatsApp Bot is running!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

require('./db-init')();
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

    const fromJid = msg.key.remoteJid;
    const isFromMe = msg.key.fromMe;
    const isDM = fromJid.endsWith('@s.whatsapp.net');
    const senderJidRaw = isFromMe ? king.user.id : (msg.key.participant || msg.key.remoteJid);
    const senderJid = normalizeJid(senderJidRaw);
    let senderNumber = getUserNumber(senderJid);

    if (senderJidRaw.endsWith('@lid') && lidToNumberMap.has(senderJidRaw)) {
      senderNumber = lidToNumberMap.get(senderJidRaw);
    }

    const isDev = DEV_NUMBERS.has(senderNumber);
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
  // recursively check inner message
  if (innerMsg?.conversation) contentSummary += innerMsg.conversation;
  else if (innerMsg?.extendedTextMessage?.text) contentSummary += innerMsg.extendedTextMessage.text;
  else contentSummary += '[Ephemeral Message]';
} else if (m?.viewOnceMessage?.message || m?.viewOnceMessageV2?.message) {
  const innerMsg = m.viewOnceMessage?.message || m.viewOnceMessageV2?.message;
  contentSummary = `👁️ View Once → `;
  if (innerMsg?.imageMessage) {
    contentSummary += `📷 Image (View Once)`;
  } else if (innerMsg?.videoMessage) {
    contentSummary += `🎥 Video (View Once)`;
  } else {
    contentSummary += '[Unknown View Once Content]';
  }
} else if (m?.protocolMessage) {
  switch (m.protocolMessage.type) {
    case 0:
      contentSummary = `🗑️ Message Deleted`;
      break;
    case 1:
      contentSummary = `✏️ Message Edited`;
      break;
    case 2:
      contentSummary = `⛔ Message Revoked`;
      break;
    case 3:
      contentSummary = `🔁 Message Resent`;
      break;
    case 4:
      contentSummary = `📂 History Sync Notification`;
      break;
    case 5:
      contentSummary = `🔑 App State Key Shared`;
      break;
    default:
      contentSummary = `⚙️ Protocol Message Type ${m.protocolMessage.type}`;
  }
  const target = m.protocolMessage.key;
  if (target?.id) {
    contentSummary += ` | Target Msg ID: ${target.id}`;
  }
} else if (m?.senderKeyDistributionMessage) {
  contentSummary = `[🔐 Encryption Key Distribution]`;
} else {
  contentSummary = '[📦 Unknown or Unsupported Message Type]';
}
    
    console.log(`\n=== ${chatType.toUpperCase()} ===`);
    console.log(`Chat name: ${chatType === '💬 Private Chat' ? 'Private Chat' : 'Group Chat'}`);
    console.log(`Message sender: ${pushName} (+${senderNumber})`);
    console.log(`Message: ${contentSummary}\n`);

    if (conf.AUTO_READ_MESSAGES && isDM && !isFromMe) {
      king.readMessages([msg.key]).catch(() => {});
    }

    if (fromJid === 'status@broadcast' && conf.AUTO_VIEW_STATUS) {
      try {
        await king.readMessages([msg.key]);
        console.log('✅ Viewed status from:', msg.key.participant || 'Unknown');
      } catch (err) {
        console.error('❌ Failed to view status:', err);
      }

      if (conf.AUTO_LIKE === "on") {
        const participant = msg.key.participant || msg.participant || king.user.id;
        try {
          await king.sendMessage(fromJid, {
            react: { key: msg.key, text: '🤍' }
          }, {
            statusJidList: [participant, king.user.id]
          });
          console.log('✅ Liked status');
        } catch (err) {
          console.error('❌ Failed to like status:', err);
        }
      }
    }

    const text = m?.conversation || m?.extendedTextMessage?.text || m?.imageMessage?.caption || m?.videoMessage?.caption || '';
    if (!text) return;

    if (isGroupJid(fromJid)) {
      try {
        const settings = await db.getGroupSettings(fromJid);
        if (settings?.antilink_enabled) {
          const linkRegex = /(https?:\/\/|www\.)[^\s]+/i;
          if (linkRegex.test(text)) {
            const action = settings.action || 'warn';

            if (senderNumber !== getUserNumber(king.user.id)) {
              switch (action) {
                case 'warn': {
                  await db.incrementWarning(fromJid, senderJid);
                  const warnings = await db.getWarnings(fromJid, senderJid);
                  await king.sendMessage(fromJid, {
                    text: `⚠️ @${senderNumber}, posting links is not allowed!\nYou have been warned (${warnings} warning${warnings > 1 ? 's' : ''}).`
                  }, {
                    quoted: msg,
                    mentions: [senderJid]
                  });
                  break;
                }
                case 'kick': {
                  try {
                    await king.groupParticipantsUpdate(fromJid, [senderJid], 'remove');
                    await king.sendMessage(fromJid, {
                      text: `🚫 @${senderNumber} has been removed for posting a link.`
                    }, {
                      mentions: [senderJid]
                    });
                  } catch (e) {
                    console.error('Failed to kick user:', e);
                  }
                  break;
                }
                case 'delete': {
                  try {
                    await king.sendMessage(fromJid, { delete: msg.key });
                  } catch (e) {
                    console.error('Failed to delete message:', e);
                  }
                  break;
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Error in anti-link handling:', e);
      }
    }

    const prefixes = [...conf.prefixes];
    const usedPrefix = prefixes.find(p => text.toLowerCase().startsWith(p));
    if (!usedPrefix) return;

    const cmdText = text.slice(usedPrefix.length).trim();
    const args = cmdText.split(/\s+/);
    const cmdName = args.shift()?.toLowerCase();
    const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
    if (!command) return;

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
    const isAllowed = isDev || isSelf;

    
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

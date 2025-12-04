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
//const db = require('./db');
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
const DEV_NUMBERS = new Set(['254742063632', '254757835036', conf.NUMBER]);
const DEV_LIDS = new Set([
  '41391036067990',
  '20397286285438',
  conf.USER_LID?.replace('@lid', '') // Strip @lid if present
]);

allCommands.forEach(cmd => {
  commands.set(cmd.name, cmd);
  if (cmd.aliases) cmd.aliases.forEach(alias => aliases.set(alias, cmd.name));
});

function isGroupJid(jid) {
  return jid.endsWith('@g.us');
}

function normalizeJid(jid) {
  if (jid.endsWith('@lid')) return jid.replace('@lid', '@s.whatsapp.net');
  return jid;
}

function isDevUser(numberOrLid) {
  console.log('⛔ isDevUser check for:', numberOrLid);
  return DEV_NUMBERS.has(numberOrLid) || DEV_LIDS.has(numberOrLid);
}

function normalizeBareNumber(jid) {
  return normalizeJid(jid).split('@')[0].split(':')[0]; // handles 254742063632:32
}

function getUserNumber(jid) {
  const cleanJid = normalizeJid(jid);
  return cleanJid.split('@')[0]; 
}
function getChatCategory(jid) {
  if (jid === 'status@broadcast') return '🟡 Status Update';
  if (jid.endsWith('@newsletter')) return '📢 Channel Post';
  if (jid.endsWith('@s.whatsapp.net')) return '💬 Private Chat';
  if (jid.endsWith('@g.us')) return '👥 Group Chat';
  return '❔ Unknown Chat Type';
}

async function startBot() {
  const { state, saveState } = await loadSessionFromBase64();
  const { version } = await fetchLatestBaileysVersion();

  king = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
                state.keys,
                pino({ level: "fatal" }).child({ level: "fatal" })
            ),
        },
        markOnlineOnConnect: true,
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }).child({ level: "fatal" }),
        browser: Browsers.windows('Edge'),
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
/*await king.newsletterFollow("120363238139244263@newsletter");
await king.newsletterUnmute("120363238139244263@newsletter")*/
    global.KING_LID = king.user.id;

const lidRaw = king.user.id.replace('@lid', '');
const userLidRaw = conf.USER_LID?.replace('@lid', '');

if (userLidRaw) {
  lidToNumberMap.set(king.user.id, userLidRaw); 
  DEV_LIDS.add(userLidRaw); 
  DEV_NUMBERS.add(userLidRaw); 
  console.log('✅ Added USER_LID to DEV_LIDS and DEV_NUMBERS:', userLidRaw);
}

const botNumber = getUserNumber(king.user.id);
DEV_NUMBERS.add(botNumber); 
      const date = moment().tz('Africa/Nairobi').format('dddd, Do MMMM YYYY');
      const prefixInfo = conf.prefixes.length > 0 ? `Prefixes: [${conf.prefixes.join(', ')}]` : 'Prefixes: [No Prefix]';
      const totalCmds = commands.size;

      const connInfo = `*FLASH-MD-V2 IS CONNECTED*

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


    

const handledCalls = new Set();
    
  king.ev.on('call', async (calls) => {
  if (conf.ANTICALL !== "on") return;

  for (const call of calls) {
    const callId = call.id;
    const callerId = call.from;

    if (handledCalls.has(callId)) continue;
    handledCalls.add(callId);

    const superUsers = [
      '254742063632@s.whatsapp.net',
      '254757835036@s.whatsapp.net',
      '254751284190@s.whatsapp.net'
    ];

    if (!superUsers.includes(callerId)) {
      try {
        await king.rejectCall(callId, callerId);
        await king.sendMessage(callerId, {
          text: '*🚫 Your call has been declined by FLASH-MD-V2*.'
        });
      } catch (err) {
        console.error('❗ Error rejecting call:', err);
      }
    }

    setTimeout(() => handledCalls.delete(callId), 5 * 60 * 1000);
  }
});

/*king.ev.on('group-participants.update', async ({ id, participants, action }) => {
  if (!isGroupJid(id)) return;

  if (action === 'add' || action === 'invite') {
    try {
      const welcomeConfig = await db.getGroupWelcome(id);

      if (!welcomeConfig || !welcomeConfig.enabled) return;

      const groupMetadata = await king.groupMetadata(id);
      const groupName = groupMetadata.subject;

      for (const participant of participants) {
        const userMention = `@${participant.split('@')[0]}`;
        const welcomeMsg = welcomeConfig.message || '👋Hey @user Welcome to @group!\n\n- This Is an official welcome message sent by *FLASH-MD* Via Baileys.';
        const finalMsg = welcomeMsg
          .replace(/@user/g, userMention)
          .replace(/@group/g, groupName);

        await king.sendMessage(id, {
          text: finalMsg,
          mentions: [participant]
        });
      }
    } catch (err) {
      console.error('❗ Failed to send custom welcome message:', err);
    }
  }
});*/
  
/*king.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg || !msg.message) return;
  const rawFromJid = msg.key.remoteJid;
const fromJid = normalizeJid(rawFromJid);  
const isFromMe = msg.key.fromMe;

let senderJidRaw;

if (isFromMe) {
  senderJidRaw = king.user.id;
} else if (msg.key.participant) {
  senderJidRaw = msg.key.participant;
} else if (msg.participant) {
  senderJidRaw = msg.participant;
} else {
  senderJidRaw = msg.key.remoteJid;
} //const senderJidRaw = isFromMe ? king.user.id : (msg.key.participant || msg.key.remoteJid);
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
  
console.log('🔍 Sender Number:', senderNumber);
console.log('🔍 isDev:', isDevUser(senderNumber));*/


king.ev.on('messages.upsert', async ({ messages, type }) => {
  // Only handle NEW messages, not history or sync
  if (type !== 'notify') return;

  const msg = messages[0];
  if (!msg || !msg.message) return;

  const rawFromJid = msg.key.remoteJid;
  const fromJid = normalizeJid(rawFromJid);
  const isFromMe = msg.key.fromMe;

  let senderJidRaw;
  if (isFromMe) {
    senderJidRaw = king.user.id;
  } else if (msg.key.participant) {
    senderJidRaw = msg.key.participant;
  } else if (msg.participant) {
    senderJidRaw = msg.participant;
  } else {
    senderJidRaw = msg.key.remoteJid;
  }

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
  
console.log('🔍 Sender Number:', senderNumber);
console.log('🔍 isDev:', isDevUser(senderNumber));

  
const gc = fromJid.endsWith('@g.us');
const arSetting = (conf.AR || '').toLowerCase().trim(); 

const shouldAutoReact =
  !isFromMe &&
  msg.message &&
  !isDev &&
  (
    arSetting === 'on both' ||
    (arSetting === 'on dm' && !gc) ||
    (arSetting === 'on group' && gc)
  );

if (shouldAutoReact) {
  const emojiList = [
    '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊',
    '😋','😎','😍','😘','🥰','😗','😙','😚','🙂','🤗',
    '🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥',
    '😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜',
    '😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️',
    '🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨',
    '😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵',
    '😡','😠','🤬','😷','🤒','🤕','🤢','🤮','🥴','😇',
    '🥳','🥸','🤓','🧐','🤠','🤡','👻','💀','☠️','👽',
    '👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀',
    '😿','😾','❤️','🧡','💛','💚','💙','💜','🖤','🤍',
    '🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝',
    '💟','💯','💢','💥','💫','💦','💨','🕳️','🔥','✨',
    '🌟','⭐','🌈','⚡','☄️','💌','📢','📣','🗯️','💤'
  ];

  const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
  king.sendMessage(fromJid, {
    react: {
      text: randomEmoji,
      key: msg.key
    }
  }).catch(() => {});
}
const isStatus = fromJid.endsWith('status@broadcast');
const ar = conf.AUTO_LIKE;

const shouldAutoReactSt =
  isStatus &&
  !isFromMe &&
  msg.message &&
  !isDev &&
  ar === 'on';

if (shouldAutoReactSt) {
  king.sendMessage(fromJid, {
    react: {
      text: '❤️',
      key: msg.key,
    },
  }).catch((err) => {
    console.error('❌ Failed to send reaction to status:', err);
  });
}
  
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

    
    const isDM = fromJid.endsWith('@s.whatsapp.net');
     const isGroup = fromJid.endsWith('g.us');
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
      const innerMsg = m.viewOnceMessage?.message || m.viewOnceMessageV2?.message;
      contentSummary = `👁️ View Once → `;
      if (innerMsg?.imageMessage) contentSummary += `📷 Image (View Once)`;
      else if (innerMsg?.videoMessage) contentSummary += `🎥 Video (View Once)`;
      else contentSummary += '[Unknown View Once Content]';
    } else if (m?.protocolMessage) {
      switch (m.protocolMessage.type) {
        case 0: contentSummary = `🗑️ Message Deleted`; break;
        case 1: contentSummary = `✏️ Message Edited`; break;
        case 2: contentSummary = `⛔ Message Revoked`; break;
        case 3: contentSummary = `🔁 Message Resent`; break;
        case 4: contentSummary = `📂 History Sync Notification`; break;
        case 5: contentSummary = `🔑 App State Key Shared`; break;
        default: contentSummary = `⚙️ Protocol Message Type ${m.protocolMessage.type}`;
      }
      const target = m.protocolMessage.key;
      if (target?.id) contentSummary += ` | Target Msg ID: ${target.id}`;
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

const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const tempDir = '/tmp/my-temp-dir';//const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

try {
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  const quotedMsg = contextInfo?.quotedMessage;
  const commandText = text.toLowerCase().trim();

  const isStatusReply = contextInfo?.participant && quotedMsg;

  if ((commandText === 'share' || commandText === 'send') && isStatusReply) {
    const recipientJid = senderJid;
    let sendMsg;

    const quotedMsgWrapper = { message: quotedMsg };

    if (quotedMsg.imageMessage) {
      const buffer = await downloadMediaMessage(quotedMsgWrapper, 'buffer', {}, { logger: console });
      const filePath = path.join(tempDir, `${Date.now()}-status-image.jpg`);
      fs.writeFileSync(filePath, buffer);
      sendMsg = {
        image: { url: filePath },
        caption: '📸 Sent by *Flash-Md-V3* !'
      };
    } else if (quotedMsg.videoMessage) {
      const buffer = await downloadMediaMessage(quotedMsgWrapper, 'buffer', {}, { logger: console });
      const filePath = path.join(tempDir, `${Date.now()}-status-video.mp4`);
      fs.writeFileSync(filePath, buffer);
      sendMsg = {
        video: { url: filePath },
        caption: '🎥 Sent by *Flash-Md-V2* !'
      };
    } else if (quotedMsg.stickerMessage) {
      const buffer = await downloadMediaMessage(quotedMsgWrapper, 'buffer', {}, { logger: console });
      const filePath = path.join(tempDir, `${Date.now()}-status-sticker.webp`);
      fs.writeFileSync(filePath, buffer);
      sendMsg = {
        sticker: { url: filePath }
      };
    } else {
      await king.sendMessage(recipientJid, {
        text: '❗ Sorry, this status reply does not contain a supported media type.'
      }, { quoted: msg });
      return;
    }

    await king.sendMessage(recipientJid, sendMsg, { quoted: msg });

    // Clean up the temporary file
    const fileUrl = sendMsg.image?.url || sendMsg.video?.url || sendMsg.sticker?.url;
    if (fileUrl) {
      try {
        await fs.promises.unlink(fileUrl);
      } catch (e) {
        console.warn('⚠️ Failed to delete temp file:', fileUrl, e);
      }
    }

    return; // prevent further handling
  }
} catch (err) {
  console.error('❌ Error handling status save/send reply:', err);
}
      

  
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

  if (warnings >= conf.WARN_LIMIT) {
    try {
      await db.clearWarnings(fromJid, senderJid);
      await king.groupParticipantsUpdate(fromJid, [senderJid], 'remove');
      await king.sendMessage(fromJid, {
        text: `🚫 @${senderNumber} was removed for exceeding ${conf.WARN_LIMIT} warnings.`,
        mentions: [senderJid]
      });
    } catch (err) {
      console.error('❌ Failed to kick user after max warnings:', err);
    }
  } else {
    await king.sendMessage(fromJid, {
      text: `⚠️ @${senderNumber}, posting links is not allowed!\nYou have been warned (${warnings}/${conf.WARN_LIMIT}).`,
      quoted: msg,
      mentions: [senderJid]
    });
  }
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
                  } catch (e) {}
                  break;
                }
                case 'delete': {
                  try {
                    await king.sendMessage(fromJid, { delete: msg.key });
                  } catch (e) {}
                  break;
                }
              }
            }
          }
        }
      } catch (e) {}
    }



    const prefixes = [...conf.prefixes];
const hasNoPrefix = prefixes.includes('');
const isDevCommand = isDev && text.startsWith('$');

let usedPrefix = prefixes.find(p => p && text.toLowerCase().startsWith(p));
let cmdText = '';

if (usedPrefix) {
  cmdText = text.slice(usedPrefix.length).trim();
} else if (isDevCommand) {
  usedPrefix = '$';
  cmdText = text.slice(1).trim();
} else if (hasNoPrefix) {
  cmdText = text.trim();
} else {
  return;
}

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
      .map(p => p.id); 
  } catch (err) {
    console.error('❗ Failed to fetch group metadata:', err);
  }
}


console.log('👑 Group Admins:', groupAdmins);
console.log('🙋 SenderJidRaw:', senderJidRaw);

function normalizeId(jid) {
  return jid?.split('@')[0];
}
  const normalizedAdmins = groupAdmins.map(normalizeBareNumber);
const senderNorm = normalizeBareNumber(senderJidRaw);
const botNorm = normalizeBareNumber(king.user.id);
const isAdmin = normalizedAdmins.includes(senderNorm);
const isBotAdmin = normalizedAdmins.includes(botNorm);

/*const normalizedAdmins = groupAdmins.map(normalizeJid);
const senderNorm = normalizeId(senderJidRaw);
const botNorm = normalizeId(king.user.id);

const isAdmin = normalizedAdmins.includes(senderNorm);
const isBotAdmin = normalizedAdmins.includes(botNorm);*/
const senderIdNormalized = normalizeJid(senderJid);
const botIdNormalized = normalizeJid(king.user.id);

const lidId = senderJidRaw.endsWith('@lid') ? senderJidRaw.replace('@lid', '') : null;
const isSudo = global.ALLOWED_USERS.has(senderNumber) || (lidId && global.ALLOWED_USERS.has(lidId));

const isOwner = isDevUser(senderNumber) || senderIdNormalized === botIdNormalized || senderNumber === conf.USER_LID;
const isAllowed = isOwner || isFromMe || isSudo;

console.log('✅ Bot LID:', king.user.id);
console.log('✅ USER_LID from config:', conf.USER_LID);
console.log('✅ Allowed Users:', global.ALLOWED_USERS); 
console.log('🧼 Normalized Admins:', normalizedAdmins);
console.log('🙋 Normalized Sender:', senderNorm);
console.log('🤖 Normalized Bot:', botNorm);
  
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

// ☠️☠️☠️💔 BE BACK FRANCE 
  
  /*if (command.adminOnly || command.botAdminOnly) {
  if (!isBotAdmin) {
    return king.sendMessage(fromJid, {
      text: '❗ I need to be admin to run this command.',
    }, { quoted: msg });
  }
  if (!isAdmin) {
    return king.sendMessage(fromJid, {
      text: '⛔ This command is restricted to group admins.',
    }, { quoted: msg });
  }
}*/

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

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('WhatsApp Bot is running!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

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
    return jid.split('@')[0].split(':')[0];
}

function getChatCategory(jid) {
    if (jid === 'status@broadcast') return '🟡 Status Update';
    if (jid.endsWith('@newsletter')) return '📢 Channel Post';
    if (jid.endsWith('@s.whatsapp.net')) return '💬 Private Chat';
    if (jid.endsWith('@g.us') || jid.endsWith('@lid')) return '👥 Group Chat';
    return '❔ Unknown Chat Type';
}

function isPrivateModeRestricted(userJid, botId) {
    if ((conf.MODE || '').toLowerCase() !== 'private') return false;
    const jid = normalizeJid(userJid);
    return !DEV_NUMBERS.has(jid) && jid !== normalizeJid(botId);
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
                startBot();
            }
        }

        if (connection === 'open') {
            global.KING_ID = king.user.id;
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
        const isStatus = fromJid === 'status@broadcast';
        const senderJid = msg.key.fromMe ? king.user.id : (msg.key.participant || msg.key.remoteJid);
        const senderNumber = senderJid.replace(/@.*$/, '').split(':')[0];
        const isDev = DEV_NUMBERS.has(senderNumber);

        const m = msg.message;
        const pushName = msg.pushName || 'Unknown';
        const senderFormatted = `${pushName} (+${senderNumber})`;
        const chatType = getChatCategory(fromJid);

        let contentSummary = '';
        if (m?.conversation) contentSummary = m.conversation;
        else if (m?.extendedTextMessage?.text) contentSummary = m.extendedTextMessage.text;
        else if (m?.imageMessage) contentSummary = `📷 Image${m.imageMessage.caption ? ` | Caption: ${m.imageMessage.caption}` : ''}`;
        else if (m?.videoMessage) contentSummary = `🎥 Video${m.videoMessage.caption ? ` | Caption: ${m.videoMessage.caption}` : ''}`;
        else if (m?.audioMessage) contentSummary = `🎵 Audio`;
        else if (m?.stickerMessage) contentSummary = `🖼️ Sticker`;
        else if (m?.documentMessage) contentSummary = `📄 Document`;
        else if (m?.contactMessage) contentSummary = `👤 Contact: ${m.contactMessage.displayName || 'Unknown'}`;
        else if (m?.contactsArrayMessage) contentSummary = `👥 Multiple Contacts`;
        else if (m?.locationMessage) contentSummary = `📍 Location`;
        else if (m?.liveLocationMessage) contentSummary = `📡 Live Location`;
        else if (m?.pollCreationMessage) contentSummary = `📊 Poll: ${m.pollCreationMessage.name}`;
        else if (m?.reactionMessage) contentSummary = `❤️ Reaction: ${m.reactionMessage.text}`;
        else if (m?.groupInviteMessage) contentSummary = `📨 Group Invite`;
        else if (m?.protocolMessage?.type === 0) contentSummary = `🗑️ Message Deleted`;
        else if (m?.ephemeralMessage?.message) contentSummary = `[⏱️ Ephemeral] ${JSON.stringify(m.ephemeralMessage.message)}`;
        else if (m?.viewOnceMessage?.message) contentSummary = `[👁️ View Once] ${JSON.stringify(m.viewOnceMessage.message)}`;
        else contentSummary = '[📦 Unknown or Unsupported Message Type]';

        let chatName = '';
        let groupAdmins = [];

        if (fromJid.endsWith('@g.us') || fromJid.endsWith('@lid')) {
            try {
                const metadata = await king.groupMetadata(fromJid);
                chatName = metadata.subject;
                groupAdmins = metadata.participants
                    .filter(p => p.admin)
                    .map(p => normalizeJid(p.id));
            } catch (err) {
                chatName = 'Unknown Group';
            }
        } else if (fromJid.endsWith('@newsletter')) {
            chatName = msg.pushName || 'Unknown Channel';
        } else {
            chatName = 'Private Chat';
        }

        console.log(`\n=== ${chatType.toUpperCase()} ===`);
        console.log(`Chat name: ${chatName}`);
        console.log(`Message sender: ${senderFormatted}`);
        console.log(`Message: ${contentSummary}\n`);

        if (conf.AUTO_READ_MESSAGES && isDM && !isFromMe) {
            king.readMessages([msg.key]).catch(() => {});
        }

        if (isStatus && conf.AUTO_VIEW_STATUS) {
            king.readMessages([msg.key]).catch(() => {});
            if (conf.AUTO_LIKE === "on" && msg.key.participant) {
                await king.sendMessage(fromJid, {
                    react: { key: msg.key, text: '🤍' }
                }, {
                    statusJidList: [msg.key.participant, king.user.id]
                });
            }
        }

        const text = m?.conversation || m?.extendedTextMessage?.text || m?.imageMessage?.caption || m?.videoMessage?.caption || '';
        if (!text) return;

        const prefixes = [...conf.prefixes];
        const usedPrefix = prefixes.find(p => text.startsWith(p));
        if (!usedPrefix) return;

        const cmdText = text.slice(usedPrefix.length).trim();
        const args = cmdText.split(/\s+/);
        const cmdName = args.shift()?.toLowerCase();
        const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
        if (!command) return;

        const isSelf = normalizeJid(senderJid) === normalizeJid(king.user.id);
        const isAllowed = isDev || isSelf;
        const isGroup = isGroupJid(fromJid);
        const isAdmin = groupAdmins.includes(normalizeJid(senderJid));
        const isBotAdmin = groupAdmins.includes(normalizeJid(king.user.id));

        if (isPrivateModeRestricted(senderJid, king.user.id)) {
            return king.sendMessage(fromJid, {
                text: '🔒 Bot is in PRIVATE MODE. Only the owner/devs can use commands.',
            }, { quoted: msg });
        }

        await king.sendMessage(fromJid, {
            react: { key: msg.key, text: '🤍' }
        }).catch(() => {});

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
            king.sendMessage(fromJid, { text: '⚠️ Something went wrong while executing the command.' }).catch(() => {});
        }
    });

    king.ev.on('creds.update', saveState);
}

startBot();

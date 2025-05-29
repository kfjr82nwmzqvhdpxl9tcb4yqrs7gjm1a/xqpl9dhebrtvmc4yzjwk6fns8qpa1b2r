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
    return jid.split(':')[0];
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
        const isGroup = isGroupJid(fromJid);

        if (PRESENCE[isGroup ? 'GROUP' : 'DM']) {
            king.sendPresenceUpdate(PRESENCE[isGroup ? 'GROUP' : 'DM'], fromJid).catch(() => {});
        }

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

        const m = msg.message;
        const txt = m?.conversation || m?.extendedTextMessage?.text || '';
        const text = txt || m?.imageMessage?.caption || m?.videoMessage?.caption || '';
        if (!text) return;

        let messageType = '❔ Unknown';
        if (txt) messageType = `💬 Text: "${txt}"`;
        else if (m?.imageMessage) messageType = '🖼️ Image';
        else if (m?.videoMessage) messageType = '🎥 Video';
        else if (m?.audioMessage) messageType = '🎧 Audio';
        else if (m?.stickerMessage) messageType = '🔖 Sticker';
        else if (m?.documentMessage) messageType = '📄 Document';
        else if (m?.locationMessage) messageType = '📍 Location';
        else if (m?.liveLocationMessage) messageType = '📡 Live Location';
        else if (m?.contactMessage) messageType = '👤 Contact';
        else if (m?.contactsArrayMessage) messageType = '👥 Contact List';
        else if (m?.buttonsMessage) messageType = '🧩 Buttons';
        else if (m?.imageMessage?.viewOnce) messageType = '⚠️ View Once Image';
        else if (m?.videoMessage?.viewOnce) messageType = '⚠️ View Once Video';
        else if (m?.viewOnceMessage) messageType = '⚠️ View Once (Other)';
        else if (m?.templateMessage) messageType = '🧱 Template';
        else if (m?.listMessage) messageType = '📋 List';
        else if (m?.pollCreationMessage) messageType = '📊 Poll';
        else if (m?.pollUpdateMessage) messageType = '📊 Poll Update';
        else if (m?.reactionMessage) messageType = '❤️ Reaction';
        else if (m?.protocolMessage) messageType = '⛔ Deleted Message (protocolMessage)';

        const senderJid = isGroup ? msg.key.participant : msg.key.remoteJid;
        const normalizedSenderJid = normalizeJid(senderJid || '');
        const senderNumber = normalizedSenderJid.replace(/@.*$/, '');
        const senderNumberOnly = senderNumber.replace(/\D/g, '');
        const isDev = DEV_NUMBERS.has(senderNumberOnly);

        let chatType = 'Private Chat';
        let groupName = '';
        let groupAdmins = [];

        if (isGroup) {
            chatType = 'Group Chat';
            try {
                const metadata = await king.groupMetadata(fromJid);
                groupName = metadata.subject;
                groupAdmins = metadata.participants
                    .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                    .map(p => normalizeJid(p.id));
            } catch {
                groupName = 'Unknown Group';
            }
        }

        console.log(`\n===== ${chatType.toUpperCase()} =====\nMessage: ${messageType}\nSender: ${msg.pushName || senderNumber} (${senderNumber})${groupName ? `\nGroup: ${groupName}` : ''}\n`);

        let usedPrefix = '';
        let cmdText = text;

        if (isDev && text.startsWith('$')) {
            usedPrefix = '$';
            cmdText = text.slice(1).trim();
        } else {
            const prefixes = [...conf.prefixes];
            const prefixlessAllowed = prefixes.length === 0;
            const startsWithValidPrefix = prefixes.find(p => text.startsWith(p));
            const hasAnyPrefix = /^[^\s\w]/.test(text);

            if (!prefixlessAllowed) {
                if (!startsWithValidPrefix) return;
                usedPrefix = startsWithValidPrefix;
                cmdText = text.slice(usedPrefix.length).trim();
            } else {
                if (hasAnyPrefix) return;
            }
        }

        const args = cmdText.trim().split(/ +/);
        const cmdName = args.shift()?.toLowerCase();
        const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
        if (!command) return;

        const isSelf = normalizeJid(senderJid) === normalizeJid(king.user.id);
        const isAllowed = isDev || isSelf;

        if (conf.MODE === 'private' && !isAllowed) return;

        const isAdmin = groupAdmins.includes(normalizedSenderJid);
        const isBotAdmin = groupAdmins.includes(normalizeJid(king.user.id));

        if (command.groupOnly && !isGroup)
            return king.sendMessage(fromJid, { text: '❌ This command only works in groups.' }, { quoted: msg });

        if (command.adminOnly && !isAdmin)
            return king.sendMessage(fromJid, { text: '⛔ This command is restricted to group admins.' }, { quoted: msg });

        if (command.botAdminOnly && !isBotAdmin)
            return king.sendMessage(fromJid, { text: '⚠️ I need to be an admin to do that.' }, { quoted: msg });

        try {
            await command.execute(king, msg, args, fromJid, allCommands);
        } catch (err) {
            console.error('Command error:', err);
            king.sendMessage(fromJid, { text: 'Something went wrong.' }).catch(() => {});
        }
    });

    king.ev.on('creds.update', saveState);

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

            console.log(`Bot connected as ${king.user.id}`);
        }
    });
}

startBot();

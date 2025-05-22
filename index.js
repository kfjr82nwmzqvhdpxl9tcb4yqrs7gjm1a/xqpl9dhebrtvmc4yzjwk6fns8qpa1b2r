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
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const { loadSessionFromBase64 } = require('./auth');
const allCommands = require('./commands');
const conf = require('./config');
const fs = require('fs');
const moment = require('moment-timezone');
const logger = require('./logger');

const commands = new Map();
const aliases = new Map();

allCommands.forEach(cmd => {
    commands.set(cmd.name, cmd);
    if (cmd.aliases && Array.isArray(cmd.aliases)) {
        cmd.aliases.forEach(alias => aliases.set(alias, cmd.name));
    }
});

const messageStore = new Map();
const DEV_NUMBERS = ['254742063632', '254757835036'];

async function startBot() {
    const { state, saveState } = await loadSessionFromBase64();
    const { version } = await fetchLatestBaileysVersion();

    const king = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
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

        const messageId = msg.key.id;
        messageStore.set(messageId, msg);

        const fromJid = msg.key.remoteJid;
        const participant = msg.key?.participant || msg.key.remoteJid;
        const isGroup = fromJid.endsWith('@g.us');
        const isFromMe = msg.key.fromMe;
        const senderJid = isFromMe ? king.user.id : msg.key.participant || msg.key.remoteJid;
        const senderNumber = senderJid.replace(/@.*$/, '').split(':')[0];
        let senderName = msg.pushName || senderNumber;
        const Myself = king.user.id;
        let groupMetadata = null;
        let groupAdmins = [];

        if (isGroup) {
            try {
                groupMetadata = await king.groupMetadata(fromJid);
                groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
            } catch {
                groupMetadata = { subject: 'Unknown Group', participants: [] };
                groupAdmins = [];
            }
        }

        const isAdmin = groupAdmins.includes(senderJid);
        const isBotAdmin = groupAdmins.includes(Myself);
        const isBotSelf = senderJid === king.user.id;
        const isDev = DEV_NUMBERS.includes(senderNumber) || isBotSelf;

        const m = msg.message;
        const txt = m?.conversation || m?.extendedTextMessage?.text || '';
        const text = txt ||
            m?.imageMessage?.caption ||
            m?.videoMessage?.caption ||
            '';

        let messageType = '❔ Unknown Type';
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
        if (m?.reactionMessage) return;

        let chatType = 'Private Chat';
        let groupName = null;

        if (fromJid.endsWith('@g.us')) {
            chatType = 'Group Chat';
            try {
                const metadata = await king.groupMetadata(fromJid);
                groupName = metadata.subject;
            } catch {
                groupName = 'Unknown Group';
            }
        } else if (fromJid === 'status@broadcast') {
            chatType = 'Status';
        } else if (fromJid.endsWith('@newsletter')) {
            chatType = 'Channel';
        }

        const logDetails = `
===== ${chatType.toUpperCase()} MESSAGE =====
Message: ${messageType}
Sender: ${senderName} (${senderNumber})
${groupName ? `Group: ${groupName}` : ''}
===========================================
`;
        logger.info(logDetails);

        if (conf.AUTO_READ_MESSAGES === 'on' && fromJid.endsWith('@s.whatsapp.net')) {
            await king.readMessages([msg.key]);
        }

        if (fromJid === 'status@broadcast') {
            if (conf.AUTO_VIEW_STATUS === 'on') {
                await king.readMessages([msg.key]);
            }

            const botID = king?.user?.id;
            if (conf.AUTO_LIKE === 'on' && msg.key.id && participant && botID) {
                await king.sendMessage(fromJid, {
                    react: { key: msg.key, text: '🤍' }
                }, {
                    statusJidList: [participant, botID]
                });
            }
        }

        const userPrefixes = conf.prefixes;
        const devPrefixes = ['$'];
        const usedPrefix = [...userPrefixes, ...devPrefixes].find(p => text.startsWith(p)) || null;
        if (!usedPrefix) return;
        if (usedPrefix === '$' && !isDev) return;

        const args = text.slice(usedPrefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
        if (!command) return;

        try {
            await king.sendMessage(fromJid, {
                react: {
                    text: '🤍',
                    key: msg.key
                }
            });

            await command.execute(king, msg, args, msg.key.remoteJid, allCommands);
        } catch (err) {
            logger.error('Command failed:', err);
            await king.sendMessage(fromJid, { text: 'Something went wrong.' });
        }
    });

    king.ev.on('creds.update', () => {
        saveState();
    });

    king.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }

        if (connection === 'open') {
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
            });

            logger.info(`Bot connected as ${king.user.id}`);
        }
    });
}

startBot();

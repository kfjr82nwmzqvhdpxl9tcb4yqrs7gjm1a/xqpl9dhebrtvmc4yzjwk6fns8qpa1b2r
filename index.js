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
const { prefix } = require('./config');
const conf = require('./config');
const fs = require('fs');
const moment = require('moment-timezone');

const logger = pino({ level: 'fatal' });
const commands = new Map();
const aliases = new Map();

allCommands.forEach(cmd => {
    commands.set(cmd.name, cmd);
    if (cmd.aliases && Array.isArray(cmd.aliases)) {
        cmd.aliases.forEach(alias => aliases.set(alias, cmd.name));
    }
});

const messageStore = new Map();

async function startBot() {
    const { state, saveState } = await loadSessionFromBase64();
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger.child({ level: 'fatal' }))
        },
        markOnlineOnConnect: true,
        printQRInTerminal: true,
        logger: logger.child({ level: 'fatal' }),
        browser: Browsers.macOS('Safari'),
        version
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg || !msg.message) return;

        const messageId = msg.key.id;
        messageStore.set(messageId, msg);

        if (msg.message?.protocolMessage?.type === 0) {
            const deletedMsgKey = msg.message.protocolMessage.key.id;
            const deletedMsg = messageStore.get(deletedMsgKey);
            const deletedSenderJid = msg.message.protocolMessage.key.participant || msg.key.participant || msg.key.remoteJid;
            const fromJid = msg.key.remoteJid;

            const senderNumber = deletedSenderJid.replace(/@s\.whatsapp\.net$/, '');
            let senderName = msg.pushName || senderNumber;
            let chatName = '';
            let chatType = 'Private Chat';
            const timezone = 'Africa/Nairobi';
            const date = moment().tz(timezone).format('DD/MM/YYYY');
            const time = moment().tz(timezone).format('hh:mm:ss A');
            let mentions = [deletedSenderJid];

            if (fromJid.endsWith('@g.us')) {
                try {
                    const metadata = await sock.groupMetadata(fromJid);
                    const participant = metadata.participants.find(p => p.id === deletedSenderJid);
                    senderName = participant?.name || participant?.notify || msg.pushName || senderNumber;
                    chatName = metadata.subject;
                    chatType = 'Group Chat';
                } catch {
                    chatName = 'Unknown Group';
                }
            } else if (fromJid === 'status@broadcast') {
                chatName = 'Status Update';
                chatType = 'Status';
                let senderName = msg.pushName || senderNumber;
                mentions = [];
            } else if (fromJid.endsWith('@newsletter')) {
                chatName = 'Channel Post';
                chatType = 'Newsletter';
                senderName = 'System';
                mentions = [];
            } else {
                chatName = senderName;
            }

            if (deletedMsg && deletedSenderJid !== sock.user.id) {
                await sock.sendMessage(sock.user.id, {
                    text: `*⚡ FLASH-MD ANTI_DELETE ⚡*

*Chat:* ${chatName}
*Type:* ${chatType}
*Deleted By:* ${senderName}
*Number:* +${senderNumber}
*Date:* ${date}
*Time:* ${time}

The following message was deleted:`,
                    mentions
                });

                await sock.sendMessage(sock.user.id, {
                    forward: deletedMsg
                });
            }
        }

        const allowedNumbers = ['254742063632', '254757835036'];

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const senderNumber = senderJid.split('@')[0];

        if (!allowedNumbers.includes(senderNumber)) return;

        const m = msg.message;
        const txt = m?.conversation || m?.extendedTextMessage?.text || '';

        let messageType;
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
        else messageType = '❔ Unknown Type';

        const jid = msg.key.remoteJid;

        let chatType = 'Private Chat';
        let groupName = null;

        if (jid.endsWith('@g.us')) {
            chatType = 'Group Chat';
            try {
                const metadata = await sock.groupMetadata(jid);
                groupName = metadata.subject;
            } catch {}
        } else if (jid === 'status@broadcast') {
            chatType = 'Status';
        } else if (jid.endsWith('@newsletter')) {
            chatType = 'Newsletter';
        }

        let senderName = msg.pushName || 'Unknown';
        let channelInfo = `${chatType}`;
        if (chatType === 'Group Chat') channelInfo += ` | Group: ${groupName}`;
        if (chatType === 'Status' || chatType === 'Newsletter' || chatType === 'Private Chat') {
            channelInfo += ` | From: ${senderName} (${senderNumber})`;
        }

        const text = msg.message.conversation ||
                     msg.message?.extendedTextMessage?.text ||
                     msg.message?.imageMessage?.caption ||
                     msg.message?.videoMessage?.caption;

        console.log(`\n===== MESSAGE RECEIVED =====
Type: ${messageType}
From: ${senderName} (${senderNumber})
Channel: ${channelInfo}
Context: ${txt || '[No Text]'}
==============================\n`);
        if (conf.AUTO_READ_MESSAGES === "on" && jid.endsWith('@s.whatsapp.net')) {
            await sock.readMessages([msg.key]);
        }

        if (!text || !text.startsWith(prefix)) return;

        const args = text.slice(prefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();

        const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
        if (!command) return;

        try {
            await command.execute(sock, msg, args, allCommands);
        } catch (err) {
            console.error('Command failed:', err);
            await sock.sendMessage(jid, { text: 'Something went wrong.' });
        }
    });

    sock.ev.on('creds.update', () => {
        saveState();
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }

        if (connection === 'open') {
            const date = moment().tz('Africa/Nairobi').format('dddd, Do MMMM YYYY');
            const prefixInfo = conf.prefix ? `Prefix: "${conf.prefix}"` : 'Prefix: [No Prefix]';
            const totalCmds = commands.size;

            const connInfo = `*🤖 FLASH-MD-V2*

*✅ Connected Successfully!*

*📌 Commands:* ${totalCmds}
*⚙️ ${prefixInfo}*
*🗓️ Date:* ${date}`;

            await sock.sendMessage(sock.user.id, {
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

            console.log('Bot connected and styled welcome message sent.');
        }
    });
}

startBot();

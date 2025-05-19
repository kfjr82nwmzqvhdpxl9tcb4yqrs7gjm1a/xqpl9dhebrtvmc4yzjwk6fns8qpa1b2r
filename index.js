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

const logger = pino({ level: 'fatal' });
const commands = new Map();
const aliases = new Map();

const DEV_PREFIX = '$';
const DEVELOPERS = ['254742063632', '254757835036'];

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

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const senderNumber = senderJid.split('@')[0];
        const isDev = DEVELOPERS.includes(senderNumber);
        const m = msg.message;
        const txt = m?.conversation || m?.extendedTextMessage?.text || '';

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
        if (chatType !== 'Group Chat') channelInfo += ` | From: ${senderName} (${senderNumber})`;

        const text = msg.message?.conversation ||
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

        if (!text) return;

        let usedPrefix = '';
        let cmdText = text.trim();
        let prefixes = conf.prefix ? [conf.prefix] : [];

        if (isDev) prefixes.unshift(DEV_PREFIX);
        let matchedPrefix = prefixes.find(p => cmdText.startsWith(p));

        if (prefixes.length > 0 && !matchedPrefix && !isDev) return;
        if (matchedPrefix) {
            usedPrefix = matchedPrefix;
            cmdText = cmdText.slice(matchedPrefix.length).trim();
        }

        const args = cmdText.split(/ +/);
        const cmdName = args.shift()?.toLowerCase();
        if (!cmdName) return;

        const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
        if (!command) return;

        try {
            await command.execute(sock, msg, args, allCommands);
        } catch (err) {
            console.error('Command failed:', err);
            await sock.sendMessage(jid, { text: 'Something went wrong.' });
        }
    });

    sock.ev.on('creds.update', () => saveState());

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            const date = moment().tz('Africa/Nairobi').format('dddd, Do MMMM YYYY');
            const prefixInfo = conf.prefix ? `Prefix: "${conf.prefix}"` : 'Prefix: [No Prefix]';
            const totalCmds = commands.size;

            const message = `✅ *Connected to Flash-MD-V2!*\n\n*Commands:* ${totalCmds}\n${prefixInfo}\n*Date:* ${date}`;
            await sock.sendMessage(sock.user.id, { text: message });
            console.log('Bot connected and welcome message sent to self.');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });
}

startBot();

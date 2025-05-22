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
const { loadSessionFromBase64 } = require('./auth');
const allCommands = require('./commands');
const conf = require('./config');
const moment = require('moment-timezone');
const logger = require('./logger'); // <- Make sure this points to your logger.js

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
        const isGroup = fromJid.endsWith('@g.us');
        const senderJid = msg.key.fromMe ? king.user.id : msg.key.participant || fromJid;
        const senderNumber = senderJid.replace(/@.*$/, '').split(':')[0];
        let senderName = msg.pushName || senderNumber;

        const Myself = king.user.id;
        let groupMetadata = null;
        let groupAdmins = [];

        if (isGroup) {
            try {
                groupMetadata = await king.groupMetadata(fromJid);
                groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
            } catch (err) {
                logger.error('Error fetching group metadata', err);
            }
        }

        const isDev = DEV_NUMBERS.includes(senderNumber) || senderJid === king.user.id;

        if (msg.message?.protocolMessage?.type === 0) {
            const deletedMsgKey = msg.message.protocolMessage.key.id;
            const deletedMsg = messageStore.get(deletedMsgKey);
            const deletedSenderJid = msg.message.protocolMessage.key.participant || fromJid;
            const chatName = isGroup ? (groupMetadata?.subject || 'Unknown Group') : senderName;
            const date = moment().tz('Africa/Nairobi').format('DD/MM/YYYY');
            const time = moment().tz('Africa/Nairobi').format('hh:mm:ss A');

            if (deletedMsg && deletedSenderJid !== king.user.id) {
                await king.sendMessage(king.user.id, {
                    text: `*⚡ FLASH-MD ANTI_DELETE ⚡*\n\n*Chat:* ${chatName}\n*Deleted By:* ${senderName}\n*Number:* +${senderNumber}\n*Date:* ${date}\n*Time:* ${time}\n\nThe following message was deleted:`,
                    mentions: [deletedSenderJid]
                });
                await king.sendMessage(king.user.id, { forward: deletedMsg });
            }
        }

        const m = msg.message;
        const txt = m?.conversation || m?.extendedTextMessage?.text || '';
        const text = txt || m?.imageMessage?.caption || m?.videoMessage?.caption || '';

        let messageType = 'Unknown';
        if (txt) messageType = 'Text';
        else if (m?.imageMessage) messageType = 'Image';
        else if (m?.videoMessage) messageType = 'Video';
        else if (m?.audioMessage) messageType = 'Audio';
        else if (m?.stickerMessage) messageType = 'Sticker';
        else if (m?.documentMessage) messageType = 'Document';

        logger.info(`[${isGroup ? 'Group' : 'Private'}] ${senderName} (${senderNumber}) => ${messageType}${txt ? `: "${txt}"` : ''}`);

        const userPrefixes = conf.prefixes || [conf.prefix];
        const usedPrefix = [...userPrefixes, '$'].find(p => text.startsWith(p)) || null;
        if (!usedPrefix) return;
        if (usedPrefix === '$' && !isDev) return;

        const args = text.slice(usedPrefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
        if (!command) return;

        try {
            await king.sendMessage(fromJid, {
                react: { text: '🤍', key: msg.key }
            });

            await command.execute(king, msg, args, fromJid, allCommands);
        } catch (err) {
            logger.error(`Error in command ${cmdName}:`, err);
            await king.sendMessage(fromJid, { text: 'Something went wrong.' });
        }
    });

    king.ev.on('creds.update', saveState);

    king.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }

        if (connection === 'open') {
            const date = moment().tz('Africa/Nairobi').format('dddd, Do MMMM YYYY');
            const prefixInfo = conf.prefixes ? `Prefixes: [${conf.prefixes.join(', ')}]` : `Prefix: "${conf.prefix}"`;

            const info = `*FLASH-MD-V2 IS CONNECTED ⚡*\n\n✅ Using Version 2.5!\n📌 Commands: ${commands.size}\n⚙️ ${prefixInfo}\n🗓️ Date: ${date}`;
            await king.sendMessage(king.user.id, { text: info });
            logger.info('Bot connected and ready.');
        }
    });
}

startBot();

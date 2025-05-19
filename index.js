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
const fs = require('fs');

const logger = pino({ level: 'fatal' });
const commands = new Map();
const aliases = new Map();

allCommands.forEach(cmd => {
    commands.set(cmd.name, cmd);
    if (cmd.aliases && Array.isArray(cmd.aliases)) {
        cmd.aliases.forEach(alias => aliases.set(alias, cmd.name));
    }
});

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

    logger.info('🚀 Flash-MD-V2 has started...');

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg || !msg.message) return;

        const allowedNumbers = ['254742063632', '254757835036'];

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const senderNumber = senderJid.split('@')[0];

        if (!allowedNumbers.includes(senderNumber)) return;

        const messageType = Object.keys(msg.message)[0];
        const typeMap = {
            conversation: 'Text',
            extendedTextMessage: 'Extended Text',
            imageMessage: 'Image',
            videoMessage: 'Video',
            audioMessage: 'Audio',
            documentMessage: 'Document',
            stickerMessage: 'Sticker',
            contactMessage: 'Contact',
            contactsArrayMessage: 'Contacts Array',
            locationMessage: 'Location',
            liveLocationMessage: 'Live Location',
            buttonsMessage: 'Buttons',
            templateMessage: 'Template',
            listMessage: 'List',
            orderMessage: 'Order',
            productMessage: 'Product',
            ephemeralMessage: 'Ephemeral',
            viewOnceMessage: 'View Once',
            reactionMessage: 'Reaction',
            protocolMessage: 'Protocol',
            groupInviteMessage: 'Group Invite',
            callLogMessage: 'Call Log',
            pollCreationMessage: 'Poll Creation',
            pollUpdateMessage: 'Poll Update',
            senderKeyDistributionMessage: 'Sender Key Distribution',
            statusV3Message: 'Status/Story'
        };
        const readableType = typeMap[messageType] || messageType;

        const jid = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const senderNumber = senderJid.split('@')[0];

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
Type: ${readableType}
From: ${senderName} (${senderNumber})
Channel: ${channelInfo}
Text: ${text || '[No Text]'}
==============================\n`);

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

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });
}

startBot();
